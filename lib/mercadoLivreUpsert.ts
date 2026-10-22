import * as XLSX from 'xlsx';

export interface MLResearchRecord {
  id?: string;
  created_at?: string;
  segmento_ml: string | null;
  codigo: string | null;
  nome: string | null;
  cod_adicional_1: string | null;
  estoque: number | null;
  vds_6m: number | null;
  a_vista_cp: number | null;
  liq_ml_envios: number | null;
  pr_cp_ml: number | null;
  pr_vende_mais: number | null;
  liq_ml_full: number | null;
  full_price: number | null;
  segundo_preco: number | null;
  cod_adicional_2: string | null;
  cod_adicional_3: string | null;
  cod_adicional_4: string | null;
  cod_adicional_5: string | null;
  codigo_barras: string | null;
  nome_fabricante: string | null;
  link_campos: string | null;
  link_vd_mais: string | null;
  vd_mais_segundo_pr: number | null;
  company_id?: string | null;
  created_by?: string | null;
  _has_estoque?: boolean;
  _has_vds_6m?: boolean;
}

export type MLFieldKey = keyof Omit<
  MLResearchRecord,
  'id' | 'created_at' | 'company_id' | 'created_by' | '_has_estoque' | '_has_vds_6m'
>;

export function fixMojibake(str: string): string {
  if (!str) return '';
  if (!/Ã.|Â.|\uFFFD/.test(str)) return str;
  try {
    const bytes = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) {
      bytes[i] = str.charCodeAt(i) & 0xff;
    }
    const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return decoded;
  } catch {
    return str
      .replace(/CÃ³d/gi, 'Cod')
      .replace(/C\uFFFDd/gi, 'Cod')
      .replace(/Ã\x80/g, 'A')
      .replace(/Âº/g, 'o')
      .replace(/PreÃ§o/gi, 'Preco')
      .replace(/Pre\uFFFDo/gi, 'Preco');
  }
}

export function normalizeHeaderKey(str: any): string {
  const fixed = fixMojibake(String(str ?? ''));
  return fixed
    .replace(/\+/g, 'mais')
    .replace(/[º°ª]/g, 'o')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function normCode(val: any): string {
  if (val === null || val === undefined) return '';
  const s = fixMojibake(String(val)).trim();
  if (!s || s === '-' || s.includes('#')) return '';
  if (/^\d+$/.test(s)) {
    return s.replace(/^0+/, '') || '0';
  }
  return s.toLowerCase();
}

export function normName(val: any): string {
  if (val === null || val === undefined) return '';
  return fixMojibake(String(val))
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseStr(val: any): string | null {
  if (val === null || val === undefined) return null;
  const s = fixMojibake(String(val)).trim();
  if (!s || s === '-' || s.includes('####') || /^r\$\s*-?$/i.test(s)) return null;
  return s;
}

export function parseLinkStr(val: any): string | null {
  const s = parseStr(val);
  if (!s) return null;
  if (/^ttps:\/\//i.test(s)) {
    return 'h' + s;
  }
  return s;
}

export function parseNum(val: any): number | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') {
    return Number.isFinite(val) ? Math.round(val * 100) / 100 : null;
  }
  const raw = fixMojibake(String(val)).trim();
  if (!raw || raw === '-' || raw.includes('#') || /^r\$\s*-?$/i.test(raw)) {
    return null;
  }
  let cleaned = raw.replace(/^r\$\s*/i, '').replace(/\s+/g, '');
  if (!cleaned || cleaned === '-') return null;

  // Reject strings that contain letters (e.g. "C/ 4 unid. Internet")
  if (/[a-zA-Z]/.test(cleaned)) {
    return null;
  }

  if (cleaned.includes(',') && cleaned.includes('.')) {
    if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (cleaned.includes(',')) {
    cleaned = cleaned.replace(',', '.');
  }

  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) {
    return null;
  }

  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? Math.round(num * 100) / 100 : null;
}

export function parseOptionalInt(val: any): number | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') {
    return Number.isFinite(val) ? Math.round(val) : null;
  }
  const raw = fixMojibake(String(val)).trim();
  if (!raw || raw === '-' || raw.includes('#')) return null;
  if (/[a-zA-Z]/.test(raw)) return null;
  const cleaned = raw.replace(/\./g, '').replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  const num = parseInt(cleaned, 10);
  return Number.isFinite(num) ? num : null;
}

export function isScientificOrGenericCode(
  code: any,
  codeFrequencyMap?: Map<string, number>
): boolean {
  if (code === null || code === undefined) return true;
  const s = String(code).trim();
  if (!s || s === '-' || s.includes('#')) return true;
  if (/^(item-\d+|sample_\d+)/i.test(s)) return true;
  if (/^\d+([.,]\d+)?e[+-]?\d+$/i.test(s)) return true;

  const nc = normCode(s);
  if (!nc) return true;

  if (codeFrequencyMap && /^[1-9]00000$/.test(nc) && (codeFrequencyMap.get(nc) || 0) > 1) {
    return true;
  }

  return false;
}

export function buildCodeFrequencyMap(items: any[]): Map<string, number> {
  const map = new Map<string, Set<string>>();
  for (const item of items) {
    const nc = normCode(item?.codigo);
    if (!nc) continue;
    const subIdentity = `${normCode(item?.cod_adicional_1)}|${normName(item?.nome)}`;
    if (!map.has(nc)) {
      map.set(nc, new Set());
    }
    map.get(nc)!.add(subIdentity);
  }
  const freq = new Map<string, number>();
  map.forEach((set, key) => {
    freq.set(key, set.size);
  });
  return freq;
}

const HEADER_ALIASES: Record<MLFieldKey, string[]> = {
  segmento_ml: ['segmentoml', 'segmento', 'categoria', 'linha', 'marca'],
  codigo: ['codigo', 'cdigo', 'cadigo', 'cod', 'sku', 'codigoproduto', 'codproduto', 'coditem', 'codigoitem'],
  nome: ['nome', 'nomedoproduto', 'nomeproduto', 'produto', 'descricao', 'descricaoproduto', 'desc', 'titulo'],
  cod_adicional_1: ['codadicional1', 'cdadicional1', 'cadadicional1', 'codadic1', 'cdadic1', 'codigoadicional1', 'referencia', 'ref'],
  estoque: ['estoque', 'qtd', 'quantidade', 'saldo', 'est'],
  vds_6m: ['vds6m', 'vendas6m', 'vds6meses', 'vendas6meses', 'vds'],
  a_vista_cp: ['avistacp', 'vistacp', 'avista', 'vista', 'precoavista', 'pravista', 'valoravista'],
  liq_ml_envios: ['liqmlenvios', 'liquidomlenvios', 'liquidoenvios', 'liqenvios'],
  pr_cp_ml: ['prcpml', 'cp', 'precocp', 'prcp', 'precocpml', 'cpml'],
  pr_vende_mais: ['prvendemais', 'prvende', 'vendemais', 'precovendemais', 'precovende'],
  liq_ml_full: ['liqmlfull', 'liquidomlfull', 'liquidofull', 'liqfull'],
  full_price: ['full', 'fullprice', 'precofull', 'prfull'],
  segundo_preco: ['2opreco', '2preco', '2preo', '2opreo', '2aopreaao', 'segundopreco', 'preco2'],
  cod_adicional_2: ['codadicional2', 'cdadicional2', 'cadadicional2', 'codadic2', 'cdadic2', 'codigoadicional2'],
  cod_adicional_3: ['codadicional3', 'cdadicional3', 'cadadicional3', 'codadic3', 'cdadic3', 'codigoadicional3'],
  cod_adicional_4: ['codadicional4', 'cdadicional4', 'cadadicional4', 'codadic4', 'cdadic4', 'codigoadicional4'],
  cod_adicional_5: ['codadicional5', 'cdadicional5', 'cadadicional5', 'codadic5', 'cdadic5', 'codigoadicional5'],
  codigo_barras: ['codigobarras', 'cdigobarras', 'cadigobarras', 'codigodebarras', 'codbarras', 'ean', 'gtin'],
  nome_fabricante: ['nomefabricante', 'fabricante', 'fornecedor'],
  link_campos: ['linkcampos', 'urlcampos', 'linkmercadolivre', 'linkml'],
  link_vd_mais: ['linkvdmais', 'linkvd', 'linkvendemais', 'linkvende'],
  vd_mais_segundo_pr: ['vdmais2opr', 'vd2opr', 'vd2pr', 'vdmaissegundopr', 'vdmais2opreco', 'vd2preco', 'vdmais2preo'],
};

export function matchHeaderToField(rawCell: any): MLFieldKey | null {
  const nk = normalizeHeaderKey(rawCell);
  if (!nk) return null;

  // Tier 1: Exact alias match
  for (const [field, aliases] of Object.entries(HEADER_ALIASES) as Array<[MLFieldKey, string[]]>) {
    if (aliases.includes(nk)) {
      return field;
    }
  }

  // Tier 2: Fuzzy / substring match (order matters to avoid collisions)
  if (nk.includes('segmento')) return 'segmento_ml';
  if ((nk.includes('adicional') || nk.includes('adic')) && nk.includes('1')) return 'cod_adicional_1';
  if ((nk.includes('adicional') || nk.includes('adic')) && nk.includes('2')) return 'cod_adicional_2';
  if ((nk.includes('adicional') || nk.includes('adic')) && nk.includes('3')) return 'cod_adicional_3';
  if ((nk.includes('adicional') || nk.includes('adic')) && nk.includes('4')) return 'cod_adicional_4';
  if ((nk.includes('adicional') || nk.includes('adic')) && nk.includes('5')) return 'cod_adicional_5';
  if (nk.includes('barra') || nk.includes('ean') || nk.includes('gtin')) return 'codigo_barras';
  if (nk.includes('fabricante')) return 'nome_fabricante';
  if ((nk.includes('vd') || nk.includes('vende')) && (nk.includes('2') || nk.includes('seg')) && !nk.includes('link')) {
    return 'vd_mais_segundo_pr';
  }
  if (nk.includes('link') && (nk.includes('vd') || nk.includes('vende'))) return 'link_vd_mais';
  if (nk.includes('link') || nk.includes('campos')) return 'link_campos';
  if ((nk.includes('vende') || nk.includes('vdmais')) && !nk.includes('link')) return 'pr_vende_mais';
  if (nk.includes('vista')) return 'a_vista_cp';
  if (nk.includes('liq') && nk.includes('env')) return 'liq_ml_envios';
  if (nk.includes('liq') && nk.includes('full')) return 'liq_ml_full';
  if (nk.includes('full')) return 'full_price';
  if (nk === 'cp' || (nk.includes('cp') && (nk.includes('pr') || nk.includes('ml')))) return 'pr_cp_ml';
  if ((nk.includes('2') || nk.includes('seg')) && (nk.includes('pr') || nk.includes('pre'))) return 'segundo_preco';
  if (nk.includes('estoque') || nk.includes('quant') || nk.includes('qtd')) return 'estoque';
  if (nk.includes('vds') || nk.includes('6m') || nk.includes('venda')) return 'vds_6m';
  if (nk.includes('cod') || nk.includes('cdig') || nk.includes('cadig') || nk.includes('sku')) return 'codigo';
  if (nk.includes('nome') || nk.includes('prod') || nk.includes('desc')) return 'nome';

  return null;
}

function parseSheetRowsToMLItems(rawRows: any[][], fmtRows: any[][]): MLResearchRecord[] {
  if (!rawRows || rawRows.length === 0) return [];

  let headerRowIdx = -1;
  let bestScore = 0;

  for (let r = 0; r < Math.min(30, rawRows.length); r++) {
    const row = fmtRows[r] || rawRows[r] || [];
    let score = 0;
    const matchedFields = new Set<string>();
    for (const cell of row) {
      const matched = matchHeaderToField(cell);
      if (matched && !matchedFields.has(matched)) {
        matchedFields.add(matched);
        score++;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      headerRowIdx = r;
    }
  }

  const colIndexByField: Partial<Record<MLFieldKey, number>> = {};
  let dataStartRow = 0;

  if (bestScore >= 2 && headerRowIdx >= 0) {
    dataStartRow = headerRowIdx + 1;
    const headerRow = fmtRows[headerRowIdx] || rawRows[headerRowIdx] || [];
    headerRow.forEach((cell: any, colIdx: number) => {
      const field = matchHeaderToField(cell);
      if (field && colIndexByField[field] === undefined) {
        colIndexByField[field] = colIdx;
      }
    });
  } else {
    // Fallback positional mapping if spreadsheet has no header row
    dataStartRow = 0;
    const sampleRow = rawRows.find(r => r && r.filter(c => String(c ?? '').trim() !== '').length >= 3) || [];
    if (sampleRow.length >= 20) {
      // 22-column full layout
      colIndexByField.segmento_ml = 0;
      colIndexByField.codigo = 1;
      colIndexByField.nome = 2;
      colIndexByField.cod_adicional_1 = 3;
      colIndexByField.estoque = 4;
      colIndexByField.vds_6m = 5;
      colIndexByField.a_vista_cp = 6;
      colIndexByField.liq_ml_envios = 7;
      colIndexByField.pr_cp_ml = 8;
      colIndexByField.pr_vende_mais = 9;
      colIndexByField.liq_ml_full = 10;
      colIndexByField.full_price = 11;
      colIndexByField.segundo_preco = 12;
      colIndexByField.cod_adicional_2 = 13;
      colIndexByField.cod_adicional_3 = 14;
      colIndexByField.cod_adicional_4 = 15;
      colIndexByField.cod_adicional_5 = 16;
      colIndexByField.codigo_barras = 17;
      colIndexByField.nome_fabricante = 18;
      colIndexByField.link_campos = 19;
      colIndexByField.link_vd_mais = 20;
      colIndexByField.vd_mais_segundo_pr = 21;
    } else {
      // 18-column compact layout (from Analise_Valores_Produtos_ML)
      colIndexByField.segmento_ml = 0;
      colIndexByField.codigo = 1;
      colIndexByField.nome = 2;
      colIndexByField.cod_adicional_1 = 3;
      colIndexByField.estoque = 4;
      colIndexByField.vds_6m = 5;
      colIndexByField.a_vista_cp = 6;
      colIndexByField.pr_vende_mais = 7;
      colIndexByField.segundo_preco = 8;
      colIndexByField.cod_adicional_2 = 9;
      colIndexByField.cod_adicional_3 = 10;
      colIndexByField.cod_adicional_4 = 11;
      colIndexByField.cod_adicional_5 = 12;
      colIndexByField.codigo_barras = 13;
      colIndexByField.nome_fabricante = 14;
      colIndexByField.link_campos = 15;
      colIndexByField.link_vd_mais = 16;
      colIndexByField.vd_mais_segundo_pr = 17;
    }
  }

  const results: MLResearchRecord[] = [];

  for (let r = dataStartRow; r < rawRows.length; r++) {
    const rawRow = rawRows[r] || [];
    const fmtRow = fmtRows[r] || rawRow;

    const getCell = (field: MLFieldKey): { raw: any; fmt: any } => {
      const idx = colIndexByField[field];
      if (idx === undefined) return { raw: null, fmt: null };
      return { raw: rawRow[idx], fmt: fmtRow[idx] };
    };

    const codCell = getCell('codigo');
    let codigoVal: string | null = null;
    const fmtCodStr = fixMojibake(String(codCell.fmt ?? '')).trim();
    const rawCod = codCell.raw;

    if (typeof rawCod === 'number' && Number.isFinite(rawCod)) {
      if (/^\d+([.,]\d+)?e[+-]?\d+$/i.test(fmtCodStr) && Number(fmtCodStr.replace(',', '.')) === rawCod) {
        codigoVal = fmtCodStr.toUpperCase();
      } else {
        codigoVal = String(Math.round(rawCod));
      }
    } else {
      codigoVal = parseStr(fmtCodStr || rawCod);
    }

    const getBestVal = (field: MLFieldKey): any => {
      const { raw, fmt } = getCell(field);
      if (typeof raw === 'number' && Number.isFinite(raw)) {
        return raw;
      }
      if (raw !== undefined && raw !== null && String(raw).trim() !== '' && !String(raw).includes('####')) {
        return raw;
      }
      return fmt;
    };

    const getBestStr = (field: MLFieldKey): string | null => {
      const { raw, fmt } = getCell(field);
      if (typeof raw === 'number' && Number.isFinite(raw)) {
        return String(Math.trunc(raw));
      }
      return parseStr(fmt ?? raw);
    };

    let nomeVal = parseStr(getBestVal('nome'));
    let codAdic1Val = getBestStr('cod_adicional_1');

    // Fallback if codigo and nome weren't in mapped columns but row has data
    if (!codigoVal && !nomeVal && !codAdic1Val) {
      const nonEmptyCells = rawRow
        .map((c, idx) => ({ val: parseStr(fmtRow[idx] ?? c), raw: c, idx }))
        .filter(x => x.val !== null);
      if (nonEmptyCells.length < 2) {
        continue;
      }
      // Check if it's a repeated header row
      let headerMatchCount = 0;
      for (const cell of nonEmptyCells) {
        if (matchHeaderToField(cell.val)) headerMatchCount++;
      }
      if (headerMatchCount >= 2) continue;

      if (colIndexByField.codigo === undefined && rawRow.length >= 3) {
        codigoVal = parseStr(fmtRow[1] ?? rawRow[1]);
        nomeVal = parseStr(fmtRow[2] ?? rawRow[2]);
        codAdic1Val = parseStr(fmtRow[3] ?? rawRow[3]);
      }
    }

    if (!codigoVal && !nomeVal && !codAdic1Val) {
      continue;
    }

    // Skip if row is just a duplicate header row inside the sheet
    if (
      normalizeHeaderKey(codigoVal) === 'codigo' &&
      normalizeHeaderKey(nomeVal) === 'nome'
    ) {
      continue;
    }

    const rawEstoque = getBestVal('estoque');
    const rawVds6m = getBestVal('vds_6m');
    const parsedEstoque = parseOptionalInt(rawEstoque);
    const parsedVds6m = parseOptionalInt(rawVds6m);

    // Also auto-detect links if link columns were shifted
    let linkCamposVal = parseLinkStr(getBestVal('link_campos'));
    let linkVdMaisVal = parseLinkStr(getBestVal('link_vd_mais'));
    if (!linkCamposVal && !linkVdMaisVal) {
      const urlCells = rawRow
        .map((c, idx) => parseLinkStr(fmtRow[idx] ?? c))
        .filter((s): s is string => Boolean(s && /^https?:\/\//i.test(s)));
      if (urlCells.length >= 1) linkCamposVal = urlCells[0];
      if (urlCells.length >= 2) linkVdMaisVal = urlCells[1];
    }

    results.push({
      segmento_ml: parseStr(getBestVal('segmento_ml')),
      codigo: codigoVal,
      nome: nomeVal,
      cod_adicional_1: codAdic1Val,
      estoque: parsedEstoque,
      vds_6m: parsedVds6m,
      a_vista_cp: parseNum(getBestVal('a_vista_cp')),
      liq_ml_envios: parseNum(getBestVal('liq_ml_envios')),
      pr_cp_ml: parseNum(getBestVal('pr_cp_ml')),
      pr_vende_mais: parseNum(getBestVal('pr_vende_mais')),
      liq_ml_full: parseNum(getBestVal('liq_ml_full')),
      full_price: parseNum(getBestVal('full_price')),
      segundo_preco: parseNum(getBestVal('segundo_preco')),
      cod_adicional_2: getBestStr('cod_adicional_2'),
      cod_adicional_3: getBestStr('cod_adicional_3'),
      cod_adicional_4: getBestStr('cod_adicional_4'),
      cod_adicional_5: getBestStr('cod_adicional_5'),
      codigo_barras: getBestStr('codigo_barras'),
      nome_fabricante: parseStr(getBestVal('nome_fabricante')),
      link_campos: linkCamposVal,
      link_vd_mais: linkVdMaisVal,
      vd_mais_segundo_pr: parseNum(getBestVal('vd_mais_segundo_pr')),
      _has_estoque: parsedEstoque !== null,
      _has_vds_6m: parsedVds6m !== null,
    });
  }

  return results;
}

export function parseWorkbookToMLItems(wb: XLSX.WorkBook): MLResearchRecord[] {
  if (!wb || !wb.SheetNames || wb.SheetNames.length === 0) return [];

  const allItems: MLResearchRecord[] = [];

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    if (!ws) continue;

    const rawRows = XLSX.utils.sheet_to_json<any[]>(ws, {
      header: 1,
      defval: '',
      raw: true,
      blankrows: false,
    });
    const fmtRows = XLSX.utils.sheet_to_json<any[]>(ws, {
      header: 1,
      defval: '',
      raw: false,
      blankrows: false,
    });

    const sheetItems = parseSheetRowsToMLItems(rawRows, fmtRows);
    if (sheetItems.length > 0) {
      allItems.push(...sheetItems);
    }
  }

  return allItems;
}

export function sanitizeIncomingItem(item: any): MLResearchRecord {
  const parsedEstoque = parseOptionalInt(item.estoque);
  const parsedVds6m = parseOptionalInt(item.vds_6m);

  return {
    id: item.id,
    created_at: item.created_at,
    segmento_ml: parseStr(item.segmento_ml),
    codigo: parseStr(item.codigo),
    nome: parseStr(item.nome),
    cod_adicional_1: parseStr(item.cod_adicional_1),
    estoque: parsedEstoque,
    vds_6m: parsedVds6m,
    a_vista_cp: parseNum(item.a_vista_cp),
    liq_ml_envios: parseNum(item.liq_ml_envios),
    pr_cp_ml: parseNum(item.pr_cp_ml),
    pr_vende_mais: parseNum(item.pr_vende_mais),
    liq_ml_full: parseNum(item.liq_ml_full),
    full_price: parseNum(item.full_price),
    segundo_preco: parseNum(item.segundo_preco),
    cod_adicional_2: parseStr(item.cod_adicional_2),
    cod_adicional_3: parseStr(item.cod_adicional_3),
    cod_adicional_4: parseStr(item.cod_adicional_4),
    cod_adicional_5: parseStr(item.cod_adicional_5),
    codigo_barras: parseStr(item.codigo_barras),
    nome_fabricante: parseStr(item.nome_fabricante),
    link_campos: parseLinkStr(item.link_campos),
    link_vd_mais: parseLinkStr(item.link_vd_mais),
    vd_mais_segundo_pr: parseNum(item.vd_mais_segundo_pr),
    company_id: item.company_id || null,
    created_by: item.created_by || null,
    _has_estoque: item._has_estoque !== undefined ? Boolean(item._has_estoque) : parsedEstoque !== null,
    _has_vds_6m: item._has_vds_6m !== undefined ? Boolean(item._has_vds_6m) : parsedVds6m !== null,
  };
}

export function toDbPayload(rec: MLResearchRecord) {
  return {
    segmento_ml: rec.segmento_ml ?? null,
    codigo: rec.codigo ?? null,
    nome: rec.nome ?? null,
    cod_adicional_1: rec.cod_adicional_1 ?? null,
    estoque: rec.estoque ?? 0,
    vds_6m: rec.vds_6m ?? 0,
    a_vista_cp: rec.a_vista_cp ?? null,
    liq_ml_envios: rec.liq_ml_envios ?? null,
    pr_cp_ml: rec.pr_cp_ml ?? null,
    pr_vende_mais: rec.pr_vende_mais ?? null,
    liq_ml_full: rec.liq_ml_full ?? null,
    full_price: rec.full_price ?? null,
    segundo_preco: rec.segundo_preco ?? null,
    cod_adicional_2: rec.cod_adicional_2 ?? null,
    cod_adicional_3: rec.cod_adicional_3 ?? null,
    cod_adicional_4: rec.cod_adicional_4 ?? null,
    cod_adicional_5: rec.cod_adicional_5 ?? null,
    codigo_barras: rec.codigo_barras ?? null,
    nome_fabricante: rec.nome_fabricante ?? null,
    link_campos: rec.link_campos ?? null,
    link_vd_mais: rec.link_vd_mais ?? null,
    vd_mais_segundo_pr: rec.vd_mais_segundo_pr ?? null,
  };
}

const STRING_FIELDS: Array<keyof MLResearchRecord> = [
  'segmento_ml',
  'nome',
  'cod_adicional_1',
  'cod_adicional_2',
  'cod_adicional_3',
  'cod_adicional_4',
  'cod_adicional_5',
  'codigo_barras',
  'nome_fabricante',
  'link_campos',
  'link_vd_mais',
];

const NUM_FIELDS: Array<keyof MLResearchRecord> = [
  'a_vista_cp',
  'liq_ml_envios',
  'pr_cp_ml',
  'pr_vende_mais',
  'liq_ml_full',
  'full_price',
  'segundo_preco',
  'vd_mais_segundo_pr',
];

export function getChangedFields(before: MLResearchRecord, after: MLResearchRecord): string[] {
  const changes: string[] = [];

  if ((before.codigo || '') !== (after.codigo || '')) {
    changes.push('codigo');
  }

  for (const f of STRING_FIELDS) {
    const b = (before[f] as string | null) ?? '';
    const a = (after[f] as string | null) ?? '';
    if (b.trim() !== a.trim()) {
      changes.push(String(f));
    }
  }

  if ((before.estoque ?? 0) !== (after.estoque ?? 0)) {
    changes.push('estoque');
  }
  if ((before.vds_6m ?? 0) !== (after.vds_6m ?? 0)) {
    changes.push('vds_6m');
  }

  for (const f of NUM_FIELDS) {
    const b = before[f] !== null && before[f] !== undefined ? Number(before[f]) : null;
    const a = after[f] !== null && after[f] !== undefined ? Number(after[f]) : null;
    if (b !== a) {
      changes.push(String(f));
    }
  }

  return changes;
}

export interface ReconcileResult {
  toInsert: Array<ReturnType<typeof toDbPayload>>;
  toUpdate: Array<{ id: string; payload: ReturnType<typeof toDbPayload>; changes: string[] }>;
  duplicateIdsToDelete: string[];
  mergedList: any[];
  stats: {
    totalRead: number;
    updatedCount: number;
    insertedCount: number;
    unchangedCount: number;
    duplicatesRemovedCount: number;
    updatedIds: string[];
    insertedIds: string[];
  };
}

export function reconcileMercadoLivreItems(
  existingRaw: any[],
  incomingRaw: any[]
): ReconcileResult {
  const existingFreq = buildCodeFrequencyMap(existingRaw);
  const incomingFreq = buildCodeFrequencyMap(incomingRaw);

  const canonicalList: MLResearchRecord[] = [];
  const byCode = new Map<string, MLResearchRecord>();
  const byAddCode1 = new Map<string, MLResearchRecord>();
  const byName = new Map<string, MLResearchRecord>();

  const duplicateIdsToDelete: string[] = [];
  const absorbedDuplicateIds = new Set<string>();

  const isGen = (code: any, isInc: boolean) =>
    isScientificOrGenericCode(code, isInc ? incomingFreq : existingFreq);

  const findMatch = (item: MLResearchRecord, isInc: boolean): MLResearchRecord | null => {
    const itemHasRealCode = !isGen(item.codigo, isInc);
    const cKey = itemHasRealCode ? normCode(item.codigo) : '';
    const aKey = normCode(item.cod_adicional_1);
    const nKey = normName(item.nome);

    // 1. Primary Match: By Item Code (Código)
    if (cKey && byCode.has(cKey)) {
      return byCode.get(cKey)!;
    }

    // 2. Secondary Match: By Cód. Adicional 1 when either code is generic/scientific (e.g. 2E+05) or codes match
    if (aKey && byAddCode1.has(aKey)) {
      const cand = byAddCode1.get(aKey)!;
      const candHasRealCode = !isGen(cand.codigo, false);
      const candCKey = candHasRealCode ? normCode(cand.codigo) : '';
      if (!cKey || !candCKey || cKey === candCKey) {
        return cand;
      }
    }

    // 3. Tertiary Match: By Product Name when code is generic/scientific and Cód. Adicional 1 is empty
    if (!cKey && !aKey && nKey && byName.has(nKey)) {
      const cand = byName.get(nKey)!;
      const candHasRealCode = !isGen(cand.codigo, false);
      const candAKey = normCode(cand.cod_adicional_1);
      if (!candHasRealCode && !candAKey) {
        return cand;
      }
    }

    return null;
  };

  const indexRecord = (rec: MLResearchRecord, isInc: boolean) => {
    const hasRealCode = !isGen(rec.codigo, isInc);
    const cKey = hasRealCode ? normCode(rec.codigo) : '';
    const aKey = normCode(rec.cod_adicional_1);
    const nKey = normName(rec.nome);

    if (cKey) byCode.set(cKey, rec);
    if (aKey) byAddCode1.set(aKey, rec);
    if (nKey) byName.set(nKey, rec);
  };

  // Step 1: Deduplicate & index existing records
  for (const raw of existingRaw) {
    const rec = sanitizeIncomingItem(raw);
    rec.estoque = rec.estoque ?? 0;
    rec.vds_6m = rec.vds_6m ?? 0;

    const existingMatch = findMatch(rec, false);
    if (!existingMatch) {
      canonicalList.push(rec);
      indexRecord(rec, false);
    } else {
      if (isGen(existingMatch.codigo, false) && !isGen(rec.codigo, false)) {
        existingMatch.codigo = rec.codigo;
      }
      for (const f of STRING_FIELDS) {
        if (!existingMatch[f] && rec[f]) {
          (existingMatch as any)[f] = rec[f];
        }
      }
      for (const f of NUM_FIELDS) {
        if (existingMatch[f] === null && rec[f] !== null) {
          (existingMatch as any)[f] = rec[f];
        }
      }
      indexRecord(existingMatch, false);
      if (rec.id && rec.id !== existingMatch.id) {
        duplicateIdsToDelete.push(rec.id);
        if (existingMatch.id) absorbedDuplicateIds.add(existingMatch.id);
      }
    }
  }

  // Snapshot original state of existing records to detect alterations accurately
  const originalSnapshots = new Map<string, MLResearchRecord>();
  const existingIdSet = new Set<string>();
  for (const rec of canonicalList) {
    if (rec.id) {
      originalSnapshots.set(rec.id, { ...rec });
      existingIdSet.add(rec.id);
    }
  }

  const touchedExistingIds = new Set<string>();
  const newRecords: MLResearchRecord[] = [];

  // Step 2: Reconcile incoming items from spreadsheet
  incomingRaw.forEach((rawInc, idx) => {
    const inc = sanitizeIncomingItem(rawInc);
    if (!inc.codigo && !inc.nome && !inc.cod_adicional_1) {
      return;
    }

    const match = findMatch(inc, true);

    if (match) {
      if (!isGen(inc.codigo, true)) {
        match.codigo = inc.codigo;
      } else if (!match.codigo && inc.codigo) {
        match.codigo = inc.codigo;
      }

      for (const f of STRING_FIELDS) {
        const val = inc[f] as string | null;
        if (val !== null && val !== undefined && val.trim() !== '') {
          (match as any)[f] = val.trim();
        }
      }

      if (inc._has_estoque && inc.estoque !== null) {
        match.estoque = inc.estoque;
      }
      if (inc._has_vds_6m && inc.vds_6m !== null) {
        match.vds_6m = inc.vds_6m;
      }

      for (const f of NUM_FIELDS) {
        const val = inc[f] as number | null;
        if (val !== null && val !== undefined && Number.isFinite(val)) {
          (match as any)[f] = val;
        }
      }

      indexRecord(match, false);
      if (match.id && existingIdSet.has(match.id)) {
        touchedExistingIds.add(match.id);
      }
    } else {
      const newRec: MLResearchRecord = {
        ...inc,
        id: inc.id && !existingIdSet.has(inc.id) ? inc.id : `ml_imp_${Date.now()}_${idx}`,
        created_at: inc.created_at || new Date().toISOString(),
        estoque: inc.estoque ?? 0,
        vds_6m: inc.vds_6m ?? 0,
      };
      canonicalList.push(newRec);
      newRecords.push(newRec);
      indexRecord(newRec, true);
    }
  });

  // Step 3: Build toUpdate and toInsert lists
  const toUpdate: ReconcileResult['toUpdate'] = [];
  const updatedIds: string[] = [];
  let updatedCount = 0;
  let unchangedCount = 0;

  const allCandidateExistingIds = new Set<string>([
    ...Array.from(touchedExistingIds),
    ...Array.from(absorbedDuplicateIds),
  ]);

  for (const id of allCandidateExistingIds) {
    const current = canonicalList.find(r => r.id === id);
    const original = originalSnapshots.get(id);
    if (!current || !original) continue;

    const changes = getChangedFields(original, current);
    if (changes.length > 0) {
      toUpdate.push({
        id,
        payload: toDbPayload(current),
        changes,
      });
      updatedIds.push(id);
      if (touchedExistingIds.has(id)) {
        updatedCount++;
      }
    } else if (absorbedDuplicateIds.has(id)) {
      toUpdate.push({
        id,
        payload: toDbPayload(current),
        changes: ['deduplicated'],
      });
      if (touchedExistingIds.has(id)) {
        unchangedCount++;
      }
    } else if (touchedExistingIds.has(id)) {
      unchangedCount++;
    }
  }

  const toInsert = newRecords.map(r => toDbPayload(r));
  const insertedIds = newRecords.map(r => r.id || '');

  const mergedList = canonicalList.map(r => ({
    id: r.id || `ml_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    created_at: r.created_at || new Date().toISOString(),
    ...toDbPayload(r),
  }));

  return {
    toInsert,
    toUpdate,
    duplicateIdsToDelete,
    mergedList,
    stats: {
      totalRead: incomingRaw.length,
      updatedCount,
      insertedCount: newRecords.length,
      unchangedCount,
      duplicatesRemovedCount: duplicateIdsToDelete.length,
      updatedIds,
      insertedIds,
    },
  };
}
