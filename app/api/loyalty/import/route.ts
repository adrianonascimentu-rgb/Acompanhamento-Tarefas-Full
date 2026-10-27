import { NextRequest, NextResponse } from 'next/server';
import {
  LoyaltyClient,
  LoyaltyPurchaseRecord,
  getInitialLoyaltyClients,
} from '@/lib/loyaltyData';
import PDFParser from 'pdf2json';
import * as XLSX from 'xlsx';

export const config = {
  api: {
    bodyParser: false,
  },
};

function parseDateBR(dStr?: string | null): number {
  if (!dStr) return 0;
  const [d, m, y] = dStr.split('/').map(Number);
  return new Date(y, m - 1, d).getTime();
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const currentClientsRaw = formData.get('currentClients') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
    }

    let baseClients: LoyaltyClient[] = getInitialLoyaltyClients();
    if (currentClientsRaw) {
      try {
        const parsed = JSON.parse(currentClientsRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          baseClients = parsed;
        }
      } catch {
        // fallback to getInitialLoyaltyClients
      }
    }

    const fileName = file.name.toLowerCase();
    const buffer = Buffer.from(await file.arrayBuffer());

    let parsedClients: LoyaltyClient[] = [];

    if (fileName.endsWith('.pdf')) {
      parsedClients = await parsePdfBuffer(buffer, baseClients);
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) {
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
      message: `${parsedClients.length} clientes fidelidade processados e cruzados com sucesso!`,
    });
  } catch (error: any) {
    console.error('Error importing loyalty file:', error);
    return NextResponse.json(
      { error: error?.message || 'Falha ao processar o arquivo de fidelidade.' },
      { status: 500 }
    );
  }
}

function parsePdfBuffer(buffer: Buffer, baseClients: LoyaltyClient[]): Promise<LoyaltyClient[]> {
  return new Promise((resolve, reject) => {
    const pdfParser = new (PDFParser as any)();

    pdfParser.on('pdfParser_dataError', (errData: any) => {
      reject(new Error(errData?.parserError || 'Erro ao processar PDF'));
    });

    pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
      try {
        // First detect if this PDF is a "Vendas Agrupada por Vendedor" report
        let isSalesBySellerReport = false;
        for (let p = 0; p < Math.min(3, pdfData.Pages.length); p++) {
          const page = pdfData.Pages[p];
          if (!page.Texts) continue;
          for (const t of page.Texts) {
            const txt = decodeURIComponent(t.R[0].T).trim();
            if (txt === 'Vendedor' || txt.includes('Total do Vendedor:')) {
              isSalesBySellerReport = true;
              break;
            }
          }
          if (isSalesBySellerReport) break;
        }

        if (isSalesBySellerReport) {
          let currentVendedorCodigo = '';
          let currentVendedorNome = '';
          const salesByClient = new Map<string, LoyaltyPurchaseRecord[]>();
          const salesBySeq = new Map<string, LoyaltyPurchaseRecord>();

          for (let pageIdx = 0; pageIdx < pdfData.Pages.length; pageIdx++) {
            const page = pdfData.Pages[pageIdx];
            if (!page.Texts || page.Texts.length === 0) continue;

            const sortedTexts = [...page.Texts].sort(
              (a: any, b: any) => a.y - b.y || a.x - b.x
            );
            const lines: { y: number; items: { x: number; text: string }[] }[] = [];

            for (const t of sortedTexts) {
              const decoded = decodeURIComponent(t.R[0].T).trim();
              if (!decoded) continue;
              const lastLine = lines[lines.length - 1];
              if (lastLine && Math.abs(lastLine.y - t.y) < 0.35) {
                lastLine.items.push({ x: t.x, text: decoded });
              } else {
                lines.push({ y: t.y, items: [{ x: t.x, text: decoded }] });
              }
            }

            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              if (line.items[0]?.text === 'Vendedor' && line.items[1]) {
                const vendStr = line.items.slice(1).map((it) => it.text).join(' ');
                const m = vendStr.match(/^(\d+)\s*-\s*(.+)$/);
                if (m) {
                  currentVendedorCodigo = m[1].trim();
                  currentVendedorNome = m[2].trim();
                }
                continue;
              }

              const first = line.items[0];
              if (first && /^\d{2}\/\d{2}\/\d{4}$/.test(first.text)) {
                const data = first.text;
                let seq = '';
                let doc = '';
                let operacao = '';
                let clienteRaw = '';
                let valorRaw = '';

                for (let j = 1; j < line.items.length; j++) {
                  const it = line.items[j];
                  if (it.x >= 5.0 && it.x < 8.5) seq = it.text;
                  else if (it.x >= 8.5 && it.x < 13.5) doc = it.text;
                  else if (it.x >= 17.5 && it.x < 19.0) operacao = it.text;
                  else if (it.x >= 19.0 && it.x < 30.0) {
                    clienteRaw += (clienteRaw ? ' ' : '') + it.text;
                  } else if (it.x >= 30.0) {
                    valorRaw = it.text;
                  }
                }

                if (i + 1 < lines.length) {
                  const nextLine = lines[i + 1];
                  if (
                    nextLine.items.length === 1 &&
                    nextLine.items[0].x >= 19.0 &&
                    nextLine.items[0].x < 30.0
                  ) {
                    clienteRaw += ' ' + nextLine.items[0].text;
                  }
                }

                const cliMatch = clienteRaw.match(/^(\d+)\s*-\s*(.+)$/);
                if (cliMatch && valorRaw) {
                  const codigo = cliMatch[1].trim();
                  const valor =
                    parseFloat(valorRaw.replace(/\./g, '').replace(',', '.')) || 0;
                  const record: LoyaltyPurchaseRecord = {
                    data,
                    seq,
                    documento: doc,
                    operacao,
                    valor,
                    vendedorCodigo: currentVendedorCodigo,
                    vendedorNome: currentVendedorNome,
                  };
                  salesBySeq.set(seq, record);
                  if (!salesByClient.has(codigo)) salesByClient.set(codigo, []);
                  salesByClient.get(codigo)!.push(record);
                }
              }
            }
          }

          // Cross-reference with baseClients
          const updatedClients = baseClients.map((c) => {
            const cleanCode = String(c.codigo).replace(/\D/g, '');
            const purchases = salesByClient.get(cleanCode) || [];
            const transacoes = (c.transacoes || []).map((tx) => {
              const m = tx.descricao.match(/(?:Saída|Entrada)\s+(\d+)/i);
              if (m && salesBySeq.has(m[1])) {
                const s = salesBySeq.get(m[1])!;
                return {
                  ...tx,
                  vendedorCodigo: s.vendedorCodigo,
                  vendedorNome: s.vendedorNome,
                  valorNota: s.valor,
                  documento: s.documento,
                };
              }
              return tx;
            });

            if (purchases.length > 0) {
              const sorted = [...purchases].sort((a, b) => {
                const dDiff = parseDateBR(b.data) - parseDateBR(a.data);
                if (dDiff !== 0) return dDiff;
                return (parseInt(b.seq, 10) || 0) - (parseInt(a.seq, 10) || 0);
              });
              const positiveSales = sorted.filter(
                (p) => p.valor > 0 && p.operacao !== '49'
              );
              const lastSale =
                positiveSales.length > 0 ? positiveSales[0] : sorted[0];
              const totalCompradoBruto = positiveSales.reduce(
                (acc, p) => acc + p.valor,
                0
              );
              const totalLiquido = sorted.reduce((acc, p) => acc + p.valor, 0);

              return {
                ...c,
                transacoes,
                ultimoVendedor: lastSale.vendedorNome,
                ultimoVendedorCodigo: lastSale.vendedorCodigo,
                dataUltimaCompra: lastSale.data,
                valorUltimaCompra: Number(lastSale.valor.toFixed(2)),
                seqUltimaCompra: lastSale.seq,
                documentoUltimaCompra: lastSale.documento,
                totalComprado: Number(totalCompradoBruto.toFixed(2)),
                totalCompradoLiquido: Number(totalLiquido.toFixed(2)),
                quantidadeCompras: positiveSales.length,
                historicoCompras: sorted,
              };
            }
            return { ...c, transacoes };
          });

          resolve(updatedClients);
          return;
        }

        // Standard Loyalty Statement PDF parsing
        const existingMap = new Map<string, LoyaltyClient>();
        for (const bc of baseClients) {
          existingMap.set(String(bc.codigo).replace(/\D/g, ''), bc);
        }

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
            const prev = existingMap.get(clientCode.replace(/\D/g, ''));
            clientsMap.set(clientCode, {
              id: clientCode,
              codigo: clientCode,
              nome: clientName || prev?.nome || '',
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
              ultimoVendedor: prev?.ultimoVendedor ?? null,
              ultimoVendedorCodigo: prev?.ultimoVendedorCodigo ?? null,
              dataUltimaCompra: prev?.dataUltimaCompra ?? null,
              valorUltimaCompra: prev?.valorUltimaCompra ?? 0,
              seqUltimaCompra: prev?.seqUltimaCompra ?? null,
              documentoUltimaCompra: prev?.documentoUltimaCompra ?? null,
              totalComprado: prev?.totalComprado ?? 0,
              totalCompradoLiquido: prev?.totalCompradoLiquido ?? 0,
              quantidadeCompras: prev?.quantidadeCompras ?? 0,
              historicoCompras: prev?.historicoCompras ?? [],
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
