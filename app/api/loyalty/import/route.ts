import { NextRequest, NextResponse } from 'next/server';
import { LoyaltyClient } from '@/lib/loyaltyData';
import PDFParser from 'pdf2json';
import * as XLSX from 'xlsx';

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    const buffer = Buffer.from(await file.arrayBuffer());

    let parsedClients: LoyaltyClient[] = [];

    if (fileName.endsWith('.pdf')) {
      // Parse PDF using pdf2json
      parsedClients = await parsePdfBuffer(buffer);
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) {
      // Parse Excel or CSV using xlsx
      parsedClients = parseExcelBuffer(buffer);
    } else {
      return NextResponse.json(
        { error: 'Formato não suportado. Por favor envie um arquivo PDF, Excel (.xlsx, .xls) ou CSV.' },
        { status: 400 }
      );
    }

    if (parsedClients.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum cliente ou movimentação de fidelidade pôde ser extraído do arquivo.' },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      count: parsedClients.length,
      clients: parsedClients,
      message: `${parsedClients.length} clientes fidelidade importados com sucesso!`,
    });
  } catch (error: any) {
    console.error('Error importing loyalty file:', error);
    return NextResponse.json(
      { error: error?.message || 'Falha ao processar o arquivo de fidelidade.' },
      { status: 500 }
    );
  }
}

function parsePdfBuffer(buffer: Buffer): Promise<LoyaltyClient[]> {
  return new Promise((resolve, reject) => {
    const pdfParser = new (PDFParser as any)();

    pdfParser.on('pdfParser_dataError', (errData: any) => {
      reject(new Error(errData?.parserError || 'Erro ao processar PDF'));
    });

    pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
      try {
        const clientsMap = new Map<string, LoyaltyClient>();

        for (let pageIdx = 0; pageIdx < pdfData.Pages.length; pageIdx++) {
          const page = pdfData.Pages[pageIdx];
          if (!page.Texts || page.Texts.length === 0) continue;

          const sortedTexts = [...page.Texts].sort(
            (a: any, b: any) => a.y - b.y || a.x - b.x
          );
          const lines: { y: number; items: { x: number; text: string }[] }[] = [];

          for (const t of sortedTexts) {
            const decoded = decodeURIComponent(t.R[0].T);
            const lastLine = lines[lines.length - 1];
            if (lastLine && Math.abs(lastLine.y - t.y) < 0.35) {
              lastLine.items.push({ x: t.x, text: decoded });
            } else {
              lines.push({ y: t.y, items: [{ x: t.x, text: decoded }] });
            }
          }

          let clientCode: string | null = null;
          let clientName: string | null = null;
          let branchBalance: number | null = null;

          for (const line of lines) {
            const lineStr = line.items.map((it) => it.text).join(' ');
            const clientMatch = lineStr.match(/Cliente\s*:\s*([0-9\.\-]+)\s+(.+)/i);
            if (clientMatch) {
              clientCode = clientMatch[1].trim();
              clientName = clientMatch[2].trim();
            }

            const branchMatch = lineStr.match(
              /Total\s+de\s+Todas\s+as\s+Filiais\s*:\s*([\-0-9\.]+)/i
            );
            if (branchMatch) {
              branchBalance = parseInt(branchMatch[1].replace(/\./g, ''), 10);
            }
          }

          if (!clientCode) continue;

          if (!clientsMap.has(clientCode)) {
            clientsMap.set(clientCode, {
              id: clientCode,
              codigo: clientCode,
              nome: clientName || '',
              saldoPontos: 0,
              pontosExpiradosTotal: 0,
              pontosConvertidosTotal: 0,
              totalCreditos: 0,
              totalDebitos: 0,
              primeiraTransacao: null,
              ultimaTransacao: null,
              proximoVencimento: null,
              pontosAVencerProximo: 0,
              transacoes: [],
            });
          }

          const client = clientsMap.get(clientCode)!;
          if (clientName && (!client.nome || client.nome.length < clientName.length)) {
            client.nome = clientName;
          }
          if (branchBalance !== null) {
            client.saldoPontos = branchBalance;
          }

          for (const line of lines) {
            const firstItem = line.items[0];
            if (!firstItem || !/^\d{2}\/\d{2}\/\d{4}$/.test(firstItem.text)) continue;

            const data = firstItem.text;
            const descParts: string[] = [];
            let anterior = 0;
            let debito = 0;
            let credito = 0;
            let saldoFinal = 0;
            let validade: string | undefined = undefined;

            for (let i = 1; i < line.items.length; i++) {
              const it = line.items[i];
              const x = it.x;
              const txt = it.text.trim();

              if (x < 18.0) {
                descParts.push(txt);
              } else if (x >= 18.0 && x < 21.5) {
                anterior = parseFloat(txt.replace(/\./g, '')) || 0;
              } else if (x >= 21.5 && x < 24.5) {
                debito = parseFloat(txt.replace(/\./g, '')) || 0;
              } else if (x >= 24.5 && x < 27.5) {
                credito = parseFloat(txt.replace(/\./g, '')) || 0;
              } else if (x >= 27.5 && x < 31.5) {
                saldoFinal = parseFloat(txt.replace(/\./g, '')) || 0;
              } else if (x >= 31.5) {
                if (/^\d{2}\/\d{2}\/\d{4}$/.test(txt)) {
                  validade = txt;
                }
              }
            }

            const desc = descParts.join(' ');
            if (desc.toLowerCase().includes('expirado')) {
              client.pontosExpiradosTotal += debito;
            }
            if (desc.toLowerCase().includes('convertido')) {
              client.pontosConvertidosTotal += debito;
            }
            client.totalCreditos += credito;
            client.totalDebitos += debito;

            client.transacoes.push({
              data,
              descricao: desc,
              anterior,
              debito,
              credito,
              saldoFinal,
              validade,
            });
          }
        }

        for (const client of clientsMap.values()) {
          if (client.saldoPontos === 0 && client.transacoes.length > 0) {
            client.saldoPontos =
              client.transacoes[client.transacoes.length - 1].saldoFinal;
          }

          if (client.transacoes.length > 0) {
            client.primeiraTransacao = client.transacoes[0].data;
            client.ultimaTransacao =
              client.transacoes[client.transacoes.length - 1].data;
          }

          const upcomingValidities = client.transacoes
            .filter((t) => t.validade && t.credito > 0)
            .sort((a, b) => {
              const [d1, m1, y1] = (a.validade || '').split('/').map(Number);
              const [d2, m2, y2] = (b.validade || '').split('/').map(Number);
              return (
                new Date(y1, m1 - 1, d1).getTime() - new Date(y2, m2 - 1, d2).getTime()
              );
            });

          if (upcomingValidities.length > 0) {
            client.proximoVencimento = upcomingValidities[0].validade || null;
            client.pontosAVencerProximo = upcomingValidities[0].credito || 0;
          }
        }

        const clientsArray = Array.from(clientsMap.values()).sort(
          (a, b) => b.saldoPontos - a.saldoPontos
        );
        resolve(clientsArray);
      } catch (err) {
        reject(err);
      }
    });

    pdfParser.parseBuffer(buffer);
  });
}

function parseExcelBuffer(buffer: Buffer): LoyaltyClient[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  const clientsMap = new Map<string, LoyaltyClient>();

  for (let idx = 0; idx < rows.length; idx++) {
    const r = rows[idx];

    // Try finding code and name
    const code = String(
      r['Cliente'] ||
        r['Codigo'] ||
        r['Código'] ||
        r['Cod'] ||
        r['COD'] ||
        r['ID'] ||
        idx + 1
    ).trim();

    const name = String(
      r['Nome'] ||
        r['Cliente_Nome'] ||
        r['Razão Social'] ||
        r['Razao_Social'] ||
        r['Descricao'] ||
        `Cliente ${code}`
    ).trim();

    const balance =
      parseFloat(
        String(
          r['Saldo'] ||
            r['Saldo Final'] ||
            r['Saldo_Final'] ||
            r['Pontos'] ||
            r['Total'] ||
            0
        ).replace(',', '.')
      ) || 0;

    const validade = String(
      r['Validade'] || r['Vencimento'] || r['Data_Validade'] || ''
    ).trim();

    if (!clientsMap.has(code)) {
      clientsMap.set(code, {
        id: code,
        codigo: code,
        nome: name,
        saldoPontos: balance,
        pontosExpiradosTotal: 0,
        pontosConvertidosTotal: 0,
        totalCreditos: balance > 0 ? balance : 0,
        totalDebitos: 0,
        primeiraTransacao: null,
        ultimaTransacao: null,
        proximoVencimento: validade || null,
        pontosAVencerProximo: balance,
        transacoes: [],
      });
    } else {
      const existing = clientsMap.get(code)!;
      if (balance > 0) existing.saldoPontos = balance;
      if (validade) existing.proximoVencimento = validade;
    }
  }

  return Array.from(clientsMap.values()).sort((a, b) => b.saldoPontos - a.saldoPontos);
}
