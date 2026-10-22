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

export function normalizeHeaderKey(str: any): string {
  return String(str ?? '')
    .replace(/\+/g, 'mais')
    .replace(/[º°]/g, 'o')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function normCode(val: any): string {
  if (val === null || val === undefined) return '';
  const s = String(val).trim();
  if (!s || s === '-' || s.includes('#')) return '';
  if (/^\d+$/.test(s)) {
    return s.replace(/^0+/, '') || '0';
  }
  return s.toLowerCase();
}

export function normName(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseStr(val: any): string | null {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  if (!s || s === '-' || s.includes('####')) return null;
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
  const raw = String(val).trim();
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
  const raw = String(val).trim();
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
  // Matches Excel scientific notation like "2E+05", "3E+05", "1.5E+05"
  if (/^\d+([.,]\d+)?e[+-]?\d+$/i.test(s)) return true;

  const nc = normCode(s);
  if (!nc) return true;

  // Check if Excel exported "2E+05" and a parser turned it into "200000" or "300000" across multiple distinct items
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

const HEADER_ALIASES: Record<keyof Omit<MLResearchRecord, 'id' | 'created_at' | 'company_id' | 'created_by' | '_has_estoque' | '_has_vds_6m'>, string[]> = {
  segmento_ml: ['segmentoml', 'segmento', 'categoria'],
  codigo: ['codigo', 'cod', 'sku', 'codigoproduto', 'codproduto', 'coditem'],
  nome: ['nome', 'nomedoproduto', 'nomeproduto', 'produto', 'descricao', 'descricaoproduto'],
  cod_adicional_1: ['codadicional1', 'codadic1', 'codigoadicional1', 'referencia', 'ref'],
  estoque: ['estoque', 'qtd', 'quantidade', 'saldo', 'est'],
  vds_6m: ['vds6m', 'vendas6m', 'vds6meses', 'vendas6meses'],
  a_vista_cp: ['avistacp', 'avista', 'precoavista', 'pravista', 'valoravista'],
  liq_ml_envios: ['liqmlenvios', 'liquidoenvios', 'liqenvios', 'liquidomlenvios'],
  pr_cp_ml: ['prcpml', 'cp', 'precocp', 'prcp', 'precocpml', 'cpml'],
  pr_vende_mais: ['prvendemais', 'prvende', 'vendemais', 'precovendemais', 'precovende'],
  liq_ml_full: ['liqmlfull', 'liquidofull', 'liqfull', 'liquidomlfull'],
  full_price: ['full', 'fullprice', 'precofull', 'prfull'],
  segundo_preco: ['2opreco', '2preco', 'segundopreco', 'preco2'],
  cod_adicional_2: ['codadicional2', 'codadic2', 'codigoadicional2'],
  cod_adicional_3: ['codadicional3', 'codadic3', 'codigoadicional3'],
  cod_adicional_4: ['codadicional4', 'codadic4', 'codigoadicional4'],
  cod_adicional_5: ['codadicional5', 'codadic5', 'codigoadicional5'],
  codigo_barras: ['codigobarras', 'codigodebarras', 'codbarras', 'ean', 'gtin'],
  nome_fabricante: ['nomefabricante', 'fabricante', 'marca'],
  link_campos: ['linkcampos', 'urlcampos', 'linkmercadolivre'],
  link_vd_mais: ['linkvdmais', 'linkvd', 'linkvendemais', 'linkvende'],
  vd_mais_segundo_pr: ['vdmais2opr', 'vd2opr', 'vd2pr', 'vdmaissegundopr', 'vdmais2opreco', 'vd2preco'],
};

export function parseWorkbookToMLItems(wb: XLSX.WorkBook): MLResearchRecord[] {
  if (!wb.SheetNames || wb.SheetNames.length === 0) return [];

  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return [];

  const rawRows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '', raw: true });
  const fmtRows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '', raw: false });

  if (!rawRows || rawRows.length === 0) return [];

  // Find the header row within the first 20 rows
  let headerRowIdx = 0;
  let bestScore = -1;

  const allKnownHeaders = new Set(Object.values(HEADER_ALIASES).flat());

  for (let r = 0; r < Math.min(20, rawRows.length); r++) {
    const row = fmtRows[r] || rawRows[r] || [];
    let score = 0;
    for (const cell of row) {
      const nk = normalizeHeaderKey(cell);
      if (nk && allKnownHeaders.has(nk)) {
        score++;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      headerRowIdx = r;
    }
  }

  const headerRow = fmtRows[headerRowIdx] || rawRows[headerRowIdx] || [];
  const colIndexByField: Partial<Record<keyof typeof HEADER_ALIASES, number>> = {};

  headerRow.forEach((cell: any, colIdx: number) => {
    const nk = normalizeHeaderKey(cell);
    if (!nk) return;

    for (const [field, aliases] of Object.entries(HEADER_ALIASES) as Array<[keyof typeof HEADER_ALIASES, string[]]>) {
      if (colIndexByField[field] !== undefined) continue;
      if (aliases.includes(nk)) {
        colIndexByField[field] = colIdx;
        break;
      }
    }
  });

  const results: MLResearchRecord[] = [];

  for (let r = headerRowIdx + 1; r < rawRows.length; r++) {
    const rawRow = rawRows[r] || [];
    const fmtRow = fmtRows[r] || [];

    const getCell = (field: keyof typeof HEADER_ALIASES): { raw: any; fmt: any } => {
      const idx = colIndexByField[field];
      if (idx === undefined) return { raw: null, fmt: null };
      return { raw: rawRow[idx], fmt: fmtRow[idx] };
    };

    // Extract codigo carefully: if raw is a real integer (e.g. 212445) while fmt was "2E+05", prefer the full raw number!
    // If fmt is "2E+05" and raw is 200000 (from CSV), keep "2E+05" so we know it was scientific notation.
    const codCell = getCell('codigo');
    let codigoVal: string | null = null;
    const fmtCodStr = String(codCell.fmt ?? '').trim();
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

    const getBestVal = (field: keyof typeof HEADER_ALIASES): any => {
      const { raw, fmt } = getCell(field);
      if (typeof raw === 'number' && Number.isFinite(raw)) {
        return raw;
      }
      if (raw !== undefined && raw !== null && String(raw).trim() !== '' && !String(raw).includes('####')) {
        return raw;
      }
      return fmt;
    };

    const getBestStr = (field: keyof typeof HEADER_ALIASES): string | null => {
      const { raw, fmt } = getCell(field);
      // Avoid scientific notation for barcodes/additional codes if raw is an exact number
      if (typeof raw === 'number' && Number.isFinite(raw)) {
        return String(Math.trunc(raw));
      }
      return parseStr(fmt ?? raw);
    };

    const nomeVal = parseStr(getBestVal('nome'));
    const codAdic1Val = getBestStr('cod_adicional_1');

    // Skip completely empty rows
    if (!codigoVal && !nomeVal && !codAdic1Val) {
      continue;
    }

    const rawEstoque = getBestVal('estoque');
    const rawVds6m = getBestVal('vds_6m');
    const parsedEstoque = parseOptionalInt(rawEstoque);
    const parsedVds6m = parseOptionalInt(rawVds6m);

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
      link_campos: parseLinkStr(getBestVal('link_campos')),
      link_vd_mais: parseLinkStr(getBestVal('link_vd_mais')),
      vd_mais_segundo_pr: parseNum(getBestVal('vd_mais_segundo_pr')),
      _has_estoque: parsedEstoque !== null,
      _has_vds_6m: parsedVds6m !== null,
    });
  }

  return results;
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
      // Absorb any missing fields from the duplicate record into existingMatch
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
      // Update codigo if incoming has a real specific code, or if match didn't have one
      if (!isGen(inc.codigo, true)) {
        match.codigo = inc.codigo;
      } else if (!match.codigo && inc.codigo) {
        match.codigo = inc.codigo;
      }

      // Update string fields when incoming provides a non-empty value
      for (const f of STRING_FIELDS) {
        const val = inc[f] as string | null;
        if (val !== null && val !== undefined && val.trim() !== '') {
          (match as any)[f] = val.trim();
        }
      }

      // Update integer fields if present in spreadsheet
      if (inc._has_estoque && inc.estoque !== null) {
        match.estoque = inc.estoque;
      }
      if (inc._has_vds_6m && inc.vds_6m !== null) {
        match.vds_6m = inc.vds_6m;
      }

      // Update numeric price fields when incoming provides a valid number
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
      // Brand new item code
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
