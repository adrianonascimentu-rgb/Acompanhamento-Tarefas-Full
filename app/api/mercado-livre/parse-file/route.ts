import { NextResponse } from 'next/server';
import PDFParser from 'pdf2json';
import * as XLSX from 'xlsx';
import {
  MLFieldKey,
  MLResearchRecord,
  matchHeaderToField,
  parseWorkbookToMLItems,
  parseStr,
  parseLinkStr,
  parseNum,
  parseOptionalInt,
  normalizeHeaderKey,
} from '@/lib/mercadoLivreUpsert';

interface PdfCell {
  x: number;
  y: number;
  str: string;
}

interface PdfRow {
  y: number;
  cells: PdfCell[];
}

function extractPdfRowsFromBuffer(buffer: Buffer): Promise<PdfRow[]> {
  return new Promise((resolve, reject) => {
    try {
      const pdfParser = new (PDFParser as any)(null, 1);

      pdfParser.on('pdfParser_dataError', (errData: any) => {
        const msg = errData?.parserError || errData?.message || 'Erro ao ler PDF';
        reject(new Error(typeof msg === 'string' ? msg : JSON.stringify(msg)));
      });

      pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
        try {
          const allRows: PdfRow[] = [];
          const pages = pdfData?.Pages || [];

          for (const page of pages) {
            const items: PdfCell[] = [];
            for (const t of page.Texts || []) {
              const rawStr = (t.R || [])
                .map((r: any) => {
                  try {
                    return decodeURIComponent(r.T || '');
                  } catch {
                    return r.T || '';
                  }
                })
                .join('')
                .trim();

              if (!rawStr || rawStr === 'R$') continue;
              items.push({ x: Number(t.x || 0), y: Number(t.y || 0), str: rawStr });
            }

            items.sort((a, b) => a.y - b.y || a.x - b.x);
            const pageRows: PdfRow[] = [];

            for (const item of items) {
              let row = pageRows.find(r => Math.abs(r.y - item.y) <= 0.065);
              if (!row) {
                row = { y: item.y, cells: [] };
                pageRows.push(row);
              }
              row.cells.push(item);
            }

            pageRows.forEach(r => r.cells.sort((a, b) => a.x - b.x));
            allRows.push(...pageRows);
          }

          resolve(allRows);
        } catch (err) {
          reject(err);
        }
      });

      pdfParser.parseBuffer(buffer);
    } catch (err) {
      reject(err);
    }
  });
}

function parsePdfRowsToMLItems(rows: PdfRow[]): MLResearchRecord[] {
  if (!rows || rows.length === 0) return [];

  // Find header row
  let headerRowIdx = -1;
  let bestScore = 0;

  for (let i = 0; i < Math.min(15, rows.length); i++) {
    let score = 0;
    for (const c of rows[i].cells) {
      if (matchHeaderToField(c.str)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      headerRowIdx = i;
    }
  }

  interface ColDef {
    field: MLFieldKey;
    x: number;
    minX: number;
    maxX: number;
  }

  const colDefs: ColDef[] = [];

  if (bestScore >= 3 && headerRowIdx >= 0) {
    const rawHeaders: Array<{ field: MLFieldKey; x: number }> = [];
    for (const c of rows[headerRowIdx].cells) {
      const f = matchHeaderToField(c.str);
      if (f && !rawHeaders.some(h => h.field === f)) {
        rawHeaders.push({ field: f, x: c.x });
      }
    }
    rawHeaders.sort((a, b) => a.x - b.x);

    for (let i = 0; i < rawHeaders.length; i++) {
      const curr = rawHeaders[i];
      const prev = i > 0 ? rawHeaders[i - 1] : null;
      const next = i < rawHeaders.length - 1 ? rawHeaders[i + 1] : null;

      let minX = prev ? (prev.x + curr.x) / 2 : 0;
      let maxX = next ? (curr.x + next.x) / 2 : 999;

      // Special adjustment for "codigo" vs "nome" because "Nome" header is centered in a wide column
      if (curr.field === 'codigo' && next?.field === 'nome') {
        maxX = curr.x + 0.18;
      } else if (curr.field === 'nome' && prev?.field === 'codigo') {
        minX = prev.x + 0.18;
        if (next) {
          maxX = next.x - 0.12;
        }
      } else if (curr.field === 'cod_adicional_1' && prev?.field === 'nome') {
        minX = curr.x - 0.12;
      }

      colDefs.push({ field: curr.field, x: curr.x, minX, maxX });
    }
  }

  const dataRows = headerRowIdx >= 0 ? rows.slice(headerRowIdx + 1) : rows;
  const results: MLResearchRecord[] = [];

  for (const row of dataRows) {
    // Skip repeated header rows
    let headerHits = 0;
    for (const c of row.cells) {
      if (matchHeaderToField(c.str)) headerHits++;
    }
    if (headerHits >= 4) continue;

    const fieldValues: Partial<Record<MLFieldKey, string>> = {};
    const urlValues: string[] = [];

    for (const cell of row.cells) {
      const val = cell.str.trim();
      if (!val || val === 'R$') continue;

      // Check if it's a URL
      if (/^h?ttps?:\/\//i.test(val) || val.includes('mercadolivre.com')) {
        urlValues.push(val.startsWith('ttps://') ? 'h' + val : val);
        continue;
      }

      if (colDefs.length > 0) {
        // Find matching column by X range
        let matchedCol = colDefs.find(col => cell.x >= col.minX && cell.x < col.maxX);
        if (!matchedCol) {
          // Fallback to closest header X
          let minDist = Infinity;
          for (const col of colDefs) {
            const d = Math.abs(cell.x - col.x);
            if (d < minDist) {
              minDist = d;
              matchedCol = col;
            }
          }
        }

        if (matchedCol && matchedCol.field !== 'link_campos' && matchedCol.field !== 'link_vd_mais') {
          if (fieldValues[matchedCol.field]) {
            fieldValues[matchedCol.field] += ' ' + val;
          } else {
            fieldValues[matchedCol.field] = val;
          }
        }
      }
    }

    if (urlValues.length >= 1) fieldValues.link_campos = urlValues[0];
    if (urlValues.length >= 2) fieldValues.link_vd_mais = urlValues[1];

    const codigoVal = parseStr(fieldValues.codigo);
    const nomeVal = parseStr(fieldValues.nome);
    const codAdic1Val = parseStr(fieldValues.cod_adicional_1);

    if (!codigoVal && !nomeVal && !codAdic1Val) {
      continue;
    }

    if (
      normalizeHeaderKey(codigoVal) === 'codigo' &&
      normalizeHeaderKey(nomeVal) === 'nome'
    ) {
      continue;
    }

    const parsedEstoque = parseOptionalInt(fieldValues.estoque);
    const parsedVds6m = parseOptionalInt(fieldValues.vds_6m);

    results.push({
      segmento_ml: parseStr(fieldValues.segmento_ml),
      codigo: codigoVal,
      nome: nomeVal,
      cod_adicional_1: codAdic1Val,
      estoque: parsedEstoque,
      vds_6m: parsedVds6m,
      a_vista_cp: parseNum(fieldValues.a_vista_cp),
      liq_ml_envios: parseNum(fieldValues.liq_ml_envios),
      pr_cp_ml: parseNum(fieldValues.pr_cp_ml),
      pr_vende_mais: parseNum(fieldValues.pr_vende_mais),
      liq_ml_full: parseNum(fieldValues.liq_ml_full),
      full_price: parseNum(fieldValues.full_price),
      segundo_preco: parseNum(fieldValues.segundo_preco),
      cod_adicional_2: parseStr(fieldValues.cod_adicional_2),
      cod_adicional_3: parseStr(fieldValues.cod_adicional_3),
      cod_adicional_4: parseStr(fieldValues.cod_adicional_4),
      cod_adicional_5: parseStr(fieldValues.cod_adicional_5),
      codigo_barras: parseStr(fieldValues.codigo_barras),
      nome_fabricante: parseStr(fieldValues.nome_fabricante),
      link_campos: parseLinkStr(fieldValues.link_campos),
      link_vd_mais: parseLinkStr(fieldValues.link_vd_mais),
      vd_mais_segundo_pr: parseNum(fieldValues.vd_mais_segundo_pr),
      _has_estoque: parsedEstoque !== null,
      _has_vds_6m: parsedVds6m !== null,
    });
  }

  return results;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileName = (file.name || '').toLowerCase();

    // Check if file is PDF by extension or magic bytes (%PDF)
    const isPdf =
      fileName.endsWith('.pdf') ||
      (buffer.length >= 4 &&
        buffer[0] === 0x25 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x44 &&
        buffer[3] === 0x46);

    if (isPdf) {
      const pdfRows = await extractPdfRowsFromBuffer(buffer);
      const items = parsePdfRowsToMLItems(pdfRows);
      return NextResponse.json({
        success: true,
        items,
        count: items.length,
        format: 'pdf',
      });
    }

    // Otherwise parse as Excel / CSV / ODS workbook
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const items = parseWorkbookToMLItems(wb);

    return NextResponse.json({
      success: true,
      items,
      count: items.length,
      format: 'spreadsheet',
    });
  } catch (err: any) {
    console.error('Erro ao interpretar arquivo Mercado Livre:', err);
    return NextResponse.json(
      { error: err.message || 'Não foi possível ler os itens do arquivo enviado.' },
      { status: 500 }
    );
  }
}
