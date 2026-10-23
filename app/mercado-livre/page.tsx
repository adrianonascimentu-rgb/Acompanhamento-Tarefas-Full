'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, Tag, Plus, Search, Trash2, Copy, Check, Download, Upload, 
  ExternalLink, Package, DollarSign, BarChart3, RefreshCw, AlertCircle, 
  CheckCircle2, X, Edit2, Save, FileSpreadsheet, Layers, Store
} from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { useUI } from '@/hooks/useUI';
import { authFetch } from '@/lib/authFetch';
import * as XLSX from 'xlsx';
import {
  parseWorkbookToMLItems,
  reconcileMercadoLivreItems,
} from '@/lib/mercadoLivreUpsert';

interface MLItem {
  id: string;
  created_at: string;
  segmento_ml: string;
  codigo: string;
  nome: string;
  cod_adicional_1: string;
  estoque: number;
  vds_6m: number;
  a_vista_cp: number | null;
  liq_ml_envios: number | null;
  pr_cp_ml: number | null;
  pr_vende_mais: number | null;
  liq_ml_full: number | null;
  full_price: number | null;
  segundo_preco: number | null;
  cod_adicional_2: string;
  cod_adicional_3: string;
  cod_adicional_4: string;
  cod_adicional_5: string;
  codigo_barras: string;
  nome_fabricante: string;
  link_campos: string;
  link_vd_mais: string;
  vd_mais_segundo_pr: number | null;
}

const SAMPLE_ITEMS = [
  {
    segmento_ml: 'Brastemp',
    codigo: '212445',
    nome: 'FRONTAL DA GAVETA LEGUMES BRM38/BRM39+ BRASTEMP',
    cod_adicional_1: 'W10287547',
    estoque: 7,
    vds_6m: 2,
    a_vista_cp: 172.80,
    liq_ml_envios: 172.74,
    pr_cp_ml: 253.00,
    pr_vende_mais: 205.90,
    liq_ml_full: null,
    full_price: null,
    segundo_preco: null,
    cod_adicional_2: '',
    cod_adicional_3: '',
    cod_adicional_4: '',
    cod_adicional_5: '',
    codigo_barras: '7891129202875',
    nome_fabricante: 'WHIRLPOOL',
    link_campos: 'https://www.mercadolivre.com.br',
    link_vd_mais: '',
    vd_mais_segundo_pr: null
  },
  {
    segmento_ml: 'Electrolux',
    codigo: '104322',
    nome: 'PLACA POTENCIA REFRIGERADOR ELECTROLUX DFW52/DW52X 127V/220V',
    cod_adicional_1: '64502391',
    estoque: 15,
    vds_6m: 8,
    a_vista_cp: 210.00,
    liq_ml_envios: 205.50,
    pr_cp_ml: 310.00,
    pr_vende_mais: 280.00,
    liq_ml_full: 215.00,
    full_price: 325.00,
    segundo_preco: 299.90,
    cod_adicional_2: '',
    cod_adicional_3: '',
    cod_adicional_4: '',
    cod_adicional_5: '',
    codigo_barras: '7909569060285',
    nome_fabricante: 'ELECTROLUX',
    link_campos: 'https://www.mercadolivre.com.br',
    link_vd_mais: '',
    vd_mais_segundo_pr: null
  }
];

const EMPTY_FORM = {
  id: '',
  segmento_ml: '',
  codigo: '',
  nome: '',
  cod_adicional_1: '',
  estoque: '0',
  vds_6m: '0',
  a_vista_cp: '',
  liq_ml_envios: '',
  pr_cp_ml: '',
  pr_vende_mais: '',
  liq_ml_full: '',
  full_price: '',
  segundo_preco: '',
  cod_adicional_2: '',
  cod_adicional_3: '',
  cod_adicional_4: '',
  cod_adicional_5: '',
  codigo_barras: '',
  nome_fabricante: '',
  link_campos: '',
  link_vd_mais: '',
  vd_mais_segundo_pr: ''
};

export default function MercadoLivreResearchPage() {
  const { isDarkMode } = useTheme();
  const { showToast, showConfirm } = useUI();
  const [items, setItems] = useState<MLItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [segmentFilter, setSegmentFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
  const [inlineFormData, setInlineFormData] = useState<any>({});
  const [missingTableInfo, setMissingTableInfo] = useState<{ missing: boolean; sql?: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [importSummary, setImportSummary] = useState<{
    fileName: string;
    totalRead: number;
    updatedCount: number;
    insertedCount: number;
    unchangedCount: number;
    duplicatesRemovedCount: number;
  } | null>(null);
  const [updatedRowIds, setUpdatedRowIds] = useState<Set<string>>(new Set());
  const [insertedRowIds, setInsertedRowIds] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState(EMPTY_FORM);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/mercado-livre');
      const json = await res.json();
      if (res.ok && json.data) {
        setItems(json.data);
        localStorage.setItem('mercado_livre_items', JSON.stringify(json.data));
        setMissingTableInfo(null);
        setLoading(false);
        return;
      }
    } catch (err) {
      console.warn('API indisponível, carregando do armazenamento local...', err);
    }

    // Fallback to localStorage
    try {
      const local = localStorage.getItem('mercado_livre_items');
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setItems(parsed);
          setLoading(false);
          return;
        }
      }
    } catch (e) {}

    // Default sample items
    const defaults = SAMPLE_ITEMS.map((s, idx) => ({
      id: `sample_${idx}_${Date.now()}`,
      created_at: new Date().toISOString(),
      ...s
    }));
    setItems(defaults);
    localStorage.setItem('mercado_livre_items', JSON.stringify(defaults));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleSeedSample = async () => {
    setLoading(true);
    try {
      await authFetch('/api/mercado-livre', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(SAMPLE_ITEMS)
      });
      await fetchItems();
      showToast('Itens de exemplo carregados com sucesso!', 'success');
    } catch (err) {
      console.error('Erro ao popular exemplos:', err);
      showToast('Erro ao carregar exemplos.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openNewModal = () => {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const openEditModal = (item: MLItem) => {
    setEditingId(item.id);
    setFormData({
      id: item.id,
      segmento_ml: item.segmento_ml || '',
      codigo: item.codigo || '',
      nome: item.nome || '',
      cod_adicional_1: item.cod_adicional_1 || '',
      estoque: String(item.estoque ?? 0),
      vds_6m: String(item.vds_6m ?? 0),
      a_vista_cp: item.a_vista_cp !== null ? String(item.a_vista_cp) : '',
      liq_ml_envios: item.liq_ml_envios !== null ? String(item.liq_ml_envios) : '',
      pr_cp_ml: item.pr_cp_ml !== null ? String(item.pr_cp_ml) : '',
      pr_vende_mais: item.pr_vende_mais !== null ? String(item.pr_vende_mais) : '',
      liq_ml_full: item.liq_ml_full !== null ? String(item.liq_ml_full) : '',
      full_price: item.full_price !== null ? String(item.full_price) : '',
      segundo_preco: item.segundo_preco !== null ? String(item.segundo_preco) : '',
      cod_adicional_2: item.cod_adicional_2 || '',
      cod_adicional_3: item.cod_adicional_3 || '',
      cod_adicional_4: item.cod_adicional_4 || '',
      cod_adicional_5: item.cod_adicional_5 || '',
      codigo_barras: item.codigo_barras || '',
      nome_fabricante: item.nome_fabricante || '',
      link_campos: item.link_campos || '',
      link_vd_mais: item.link_vd_mais || '',
      vd_mais_segundo_pr: item.vd_mais_segundo_pr !== null ? String(item.vd_mais_segundo_pr) : ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEdit = Boolean(editingId);
      const url = '/api/mercado-livre';
      const method = isEdit ? 'PUT' : 'POST';

      const payload = isEdit ? { id: editingId, ...formData } : formData;

      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (res.ok) {
        setIsModalOpen(false);
        setEditingId(null);
        setFormData(EMPTY_FORM);
        showToast(isEdit ? 'Item atualizado com sucesso!' : 'Item salvo com sucesso!', 'success');
        fetchItems();
      } else if (json.missing_table) {
        setMissingTableInfo({ missing: true, sql: json.create_sql });
        showToast(json.error || 'Tabela não encontrada no Supabase.', 'warning');
      } else {
        showToast(json.error || 'Erro ao salvar registro.', 'error');
      }
    } catch (err: any) {
      showToast('Erro de conexão: ' + err.message, 'error');
    }
  };

  const startInlineEdit = (item: MLItem) => {
    setInlineEditingId(item.id);
    setInlineFormData({ ...item });
  };

  const cancelInlineEdit = () => {
    setInlineEditingId(null);
    setInlineFormData({});
  };

  const saveInlineEdit = async () => {
    if (!inlineEditingId) return;
    try {
      const res = await authFetch('/api/mercado-livre', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: inlineEditingId, ...inlineFormData })
      });
      if (res.ok) {
        setInlineEditingId(null);
        setInlineFormData({});
        showToast('Alterações salvas com sucesso!', 'success');
        fetchItems();
      } else {
        const json = await res.json();
        showToast(json.error || 'Erro ao salvar alteração inline.', 'error');
      }
    } catch (err: any) {
      showToast('Erro ao salvar: ' + err.message, 'error');
    }
  };

  const handleDelete = async (id: string) => {
    showConfirm({
      title: 'Excluir Item',
      message: 'Deseja realmente excluir este item da pesquisa do Mercado Livre?',
      confirmLabel: 'Excluir',
      type: 'danger',
      onConfirm: async () => {
        try {
          const res = await authFetch(`/api/mercado-livre?id=${id}`, {
            method: 'DELETE'
          });
          if (res.ok) {
            setItems(prev => {
              const next = prev.filter(i => i.id !== id);
              localStorage.setItem('mercado_livre_items', JSON.stringify(next));
              return next;
            });
            showToast('Item removido da pesquisa.', 'success');
          } else {
            const json = await res.json().catch(() => ({}));
            // Fallback local delete if item is local-only
            setItems(prev => {
              const next = prev.filter(i => i.id !== id);
              localStorage.setItem('mercado_livre_items', JSON.stringify(next));
              return next;
            });
            if (json.error) {
              console.warn('Delete API warning:', json.error);
            }
          }
        } catch (err) {
          showToast('Erro ao excluir item.', 'error');
        }
      }
    });
  };

  // Exportar Excel
  const handleExportExcel = () => {
    if (filteredItems.length === 0) {
      showToast('Nenhum registro para exportar.', 'warning');
      return;
    }

    const exportData = filteredItems.map(item => ({
      'Segmento ML': item.segmento_ml || '',
      'Código': item.codigo || '',
      'Nome': item.nome || '',
      'Cód. Adicional 1': item.cod_adicional_1 || '',
      'Estoque': item.estoque ?? 0,
      'Vds 6M': item.vds_6m ?? 0,
      'À Vista CP': item.a_vista_cp ?? '',
      'Liq. ML Envios': item.liq_ml_envios ?? '',
      'Pr. CP ML': item.pr_cp_ml ?? '',
      'Pr. Vende+': item.pr_vende_mais ?? '',
      'Liq. ML Full': item.liq_ml_full ?? '',
      'FULL': item.full_price ?? '',
      '2º Preço': item.segundo_preco ?? '',
      'Cód. Adic. 2': item.cod_adicional_2 || '',
      'Cód. Adic. 3': item.cod_adicional_3 || '',
      'Cód. Adic. 4': item.cod_adicional_4 || '',
      'Cód. Adic. 5': item.cod_adicional_5 || '',
      'Código Barras': item.codigo_barras || '',
      'Nome Fabricante': item.nome_fabricante || '',
      'Link Campos': item.link_campos || '',
      'Link Vd+': item.link_vd_mais || '',
      'Vd+ 2º Pr.': item.vd_mais_segundo_pr ?? ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Pesquisa Mercado Livre');
    XLSX.writeFile(workbook, `Pesquisa_Mercado_Livre_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Importar Excel / CSV com sincronização inteligente por Código
  const handleTriggerImport = () => {
    fileInputRef.current?.click();
  };

  const processSpreadsheetFile = async (file: File, inputEl?: HTMLInputElement | null) => {
    setImporting(true);
    setLoading(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        showToast('Não foi possível ler o conteúdo do arquivo.', 'error');
        return;
      }

      const data = new Uint8Array(arrayBuffer);
      const isPdf =
        file.name.toLowerCase().endsWith('.pdf') ||
        (data.length >= 4 &&
          data[0] === 0x25 &&
          data[1] === 0x50 &&
          data[2] === 0x44 &&
          data[3] === 0x46);

      let parsedItems: any[] = [];

      if (!isPdf) {
        try {
          const wb = XLSX.read(data, { type: 'array' });
          if (wb.SheetNames && wb.SheetNames.length > 0) {
            parsedItems = parseWorkbookToMLItems(wb);
          }
        } catch (xlsxErr) {
          console.warn('Leitura local via XLSX falhou, tentando parser no servidor:', xlsxErr);
        }
      }

      // Server-side parser for PDF files or fallback if local XLSX yielded 0 items
      if (isPdf || !parsedItems || parsedItems.length === 0) {
        const fd = new FormData();
        fd.append('file', file);
        const parseRes = await authFetch('/api/mercado-livre/parse-file', {
          method: 'POST',
          body: fd,
        });
        const parseJson = await parseRes.json().catch(() => null);
        if (parseRes.ok && Array.isArray(parseJson?.items)) {
          parsedItems = parseJson.items;
        } else if (parseJson?.error) {
          throw new Error(parseJson.error);
        }
      }

      if (!parsedItems || parsedItems.length === 0) {
        showToast(
          'Não foram encontradas linhas válidas de produtos no arquivo. Verifique se o arquivo contém as colunas Código e Nome.',
          'warning'
        );
        return;
      }

      let existingList: MLItem[] = [...items];
      if (existingList.length === 0) {
        try {
          const stored = JSON.parse(localStorage.getItem('mercado_livre_items') || '[]');
          if (Array.isArray(stored)) existingList = stored;
        } catch {}
      }

      const localReconciled = reconcileMercadoLivreItems(existingList, parsedItems);

      let apiSucceeded = false;
      try {
        const res = await authFetch('/api/mercado-livre', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parsedItems),
        });
        const json = await res.json().catch(() => null);

        if (res.ok && json?.success) {
          apiSucceeded = true;
          const finalData = Array.isArray(json.data) ? json.data : localReconciled.mergedList;
          setItems(finalData);
          localStorage.setItem('mercado_livre_items', JSON.stringify(finalData));

          setUpdatedRowIds(new Set(json.updatedIds || localReconciled.stats.updatedIds));
          setInsertedRowIds(new Set(json.insertedIds || localReconciled.stats.insertedIds));

          const summary = {
            fileName: file.name,
            totalRead: parsedItems.length,
            updatedCount: json.updatedCount ?? localReconciled.stats.updatedCount,
            insertedCount: json.insertedCount ?? localReconciled.stats.insertedCount,
            unchangedCount: json.unchangedCount ?? localReconciled.stats.unchangedCount,
            duplicatesRemovedCount: json.duplicatesRemovedCount ?? localReconciled.stats.duplicatesRemovedCount,
          };
          setImportSummary(summary);
          showToast(
            `Arquivo sincronizado: ${summary.updatedCount} atualizado(s) e ${summary.insertedCount} novo(s) incluído(s).`,
            'success'
          );
        } else if (json?.missing_table) {
          setMissingTableInfo({ missing: true, sql: json.create_sql });
        }
      } catch (apiErr) {
        console.warn('API POST falhou, aplicando sincronização localmente:', apiErr);
      }

      if (!apiSucceeded) {
        localStorage.setItem('mercado_livre_items', JSON.stringify(localReconciled.mergedList));
        setItems(localReconciled.mergedList as MLItem[]);
        setUpdatedRowIds(new Set(localReconciled.stats.updatedIds));
        setInsertedRowIds(new Set(localReconciled.stats.insertedIds));

        const summary = {
          fileName: file.name,
          totalRead: parsedItems.length,
          updatedCount: localReconciled.stats.updatedCount,
          insertedCount: localReconciled.stats.insertedCount,
          unchangedCount: localReconciled.stats.unchangedCount,
          duplicatesRemovedCount: localReconciled.stats.duplicatesRemovedCount,
        };
        setImportSummary(summary);
        showToast(
          `Arquivo sincronizado: ${summary.updatedCount} atualizado(s) e ${summary.insertedCount} novo(s) incluído(s).`,
          'success'
        );
      }

      setIsImportModalOpen(false);
      setImportFile(null);
    } catch (err: any) {
      console.error('Erro ao processar arquivo:', err);
      showToast('Erro ao processar arquivo: ' + (err?.message || err), 'error');
    } finally {
      setImporting(false);
      setLoading(false);
      if (inputEl) {
        inputEl.value = '';
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputEl = e.target;
    const file = inputEl.files?.[0];
    if (!file) return;
    processSpreadsheetFile(file, inputEl);
  };

  const handleExecuteImport = async () => {
    if (!importFile) {
      showToast('Por favor, selecione um arquivo Excel (.xlsx, .xls) ou CSV.', 'warning');
      return;
    }
    await processSpreadsheetFile(importFile);
  };

  const existingDuplicatesCount = useMemo(() => {
    if (items.length <= 1) return 0;
    return reconcileMercadoLivreItems(items, []).stats.duplicatesRemovedCount;
  }, [items]);

  const handleConsolidateDuplicates = async () => {
    setLoading(true);
    try {
      const localReconciled = reconcileMercadoLivreItems(items, []);
      let apiSucceeded = false;

      try {
        const res = await authFetch('/api/mercado-livre', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'deduplicate' }),
        });
        const json = await res.json().catch(() => null);
        if (res.ok && json?.success && Array.isArray(json.data)) {
          apiSucceeded = true;
          setItems(json.data);
          localStorage.setItem('mercado_livre_items', JSON.stringify(json.data));
        }
      } catch (e) {
        console.warn('Falha ao consolidar duplicados na API, consolidando localmente:', e);
      }

      if (!apiSucceeded) {
        setItems(localReconciled.mergedList as MLItem[]);
        localStorage.setItem('mercado_livre_items', JSON.stringify(localReconciled.mergedList));
      }

      showToast(
        `${localReconciled.stats.duplicatesRemovedCount} registro(s) duplicado(s) foram consolidados com sucesso!`,
        'success'
      );
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const q = search.toLowerCase().trim();
      const matchesSearch = !q || 
        (item.nome && String(item.nome).toLowerCase().includes(q)) ||
        (item.codigo && String(item.codigo).toLowerCase().includes(q)) ||
        (item.segmento_ml && String(item.segmento_ml).toLowerCase().includes(q)) ||
        (item.codigo_barras && String(item.codigo_barras).toLowerCase().includes(q)) ||
        (item.cod_adicional_1 && String(item.cod_adicional_1).toLowerCase().includes(q));

      const matchesSegment = segmentFilter === 'ALL' || item.segmento_ml === segmentFilter;

      return matchesSearch && matchesSegment;
    });
  }, [items, search, segmentFilter]);

  const uniqueSegments = useMemo(() => {
    const set = new Set<string>();
    items.forEach(i => { if (i.segmento_ml) set.add(String(i.segmento_ml)); });
    return Array.from(set).sort();
  }, [items]);

  const formatCurrency = (val: number | null) => {
    if (val === null || val === undefined) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  type PriceRankColor = 'green' | 'yellow' | 'red' | null;

  const getRowPriceComparison = (item: Pick<MLItem, 'a_vista_cp' | 'pr_vende_mais' | 'segundo_preco'>): {
    a_vista_cp: PriceRankColor;
    pr_vende_mais: PriceRankColor;
    segundo_preco: PriceRankColor;
  } => {
    const entries: Array<{ key: 'a_vista_cp' | 'pr_vende_mais' | 'segundo_preco'; val: number }> = [];
    const fields: Array<'a_vista_cp' | 'pr_vende_mais' | 'segundo_preco'> = [
      'a_vista_cp',
      'pr_vende_mais',
      'segundo_preco',
    ];

    for (const key of fields) {
      const raw = item[key];
      if (raw !== null && raw !== undefined && raw !== ('' as unknown)) {
        const num = Number(raw);
        if (Number.isFinite(num) && num > 0) {
          entries.push({ key, val: Math.round(num * 100) / 100 });
        }
      }
    }

    const result: {
      a_vista_cp: PriceRankColor;
      pr_vende_mais: PriceRankColor;
      segundo_preco: PriceRankColor;
    } = {
      a_vista_cp: null,
      pr_vende_mais: null,
      segundo_preco: null,
    };

    if (entries.length === 0) return result;

    const uniqueSorted = Array.from(new Set(entries.map(e => e.val))).sort((a, b) => a - b);

    for (const entry of entries) {
      const rankIndex = uniqueSorted.indexOf(entry.val);
      if (rankIndex === 0) {
        result[entry.key] = 'green';
      } else if (rankIndex === 1) {
        result[entry.key] = 'yellow';
      } else {
        result[entry.key] = 'red';
      }
    }

    return result;
  };

  const getPriceCellStyles = (rank: PriceRankColor) => {
    if (rank === 'green') {
      return {
        td: 'bg-emerald-500/15 dark:bg-emerald-500/20',
        badge:
          'inline-flex items-center justify-end px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 border border-emerald-500/40 font-bold',
      };
    }
    if (rank === 'yellow') {
      return {
        td: 'bg-amber-500/15 dark:bg-amber-500/20',
        badge:
          'inline-flex items-center justify-end px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-800 dark:text-amber-200 border border-amber-500/40 font-bold',
      };
    }
    if (rank === 'red') {
      return {
        td: 'bg-rose-500/15 dark:bg-rose-500/20',
        badge:
          'inline-flex items-center justify-end px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-800 dark:text-rose-200 border border-rose-500/40 font-bold',
      };
    }
    return {
      td: '',
      badge: 'text-slate-600 dark:text-slate-300',
    };
  };

  return (
    <div className={`min-h-screen pb-16 ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      {/* Hidden File Input for Import */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        accept=".xlsx, .xls, .csv, .pdf, .ods" 
        className="hidden" 
      />

      {/* Header Bar */}
      <div className="max-w-[98%] mx-auto px-2 sm:px-4 lg:px-6 pt-4">
        <div className="flex items-center gap-2 p-1.5 bg-slate-200/80 dark:bg-slate-800/80 rounded-2xl w-fit">
          <Link
            href="/price-research"
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-2"
          >
            <Tag className="w-4 h-4" />
            <span>Pesquisa Concorrentes</span>
          </Link>
          <Link
            href="/mercado-livre"
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-white dark:bg-slate-900 text-amber-500 shadow-xs flex items-center gap-2"
          >
            <Store className="w-4 h-4" />
            <span>Mercado Livre</span>
          </Link>
        </div>
      </div>

      <header className={`sticky top-0 z-30 border-b backdrop-blur-md ${
        isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-slate-200'
      }`}>
        <div className="max-w-[98%] mx-auto px-2 sm:px-4 lg:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className={`p-2 rounded-xl border transition-colors ${
                isDarkMode ? 'border-slate-800 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'
              }`}
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30">
                  MERCADO LIVRE
                </span>
                <h1 className="text-xl font-bold tracking-tight">Pesquisa de Preços Mercado Livre</h1>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Planilha comparativa e precificação oficial Mercado Livre
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {existingDuplicatesCount > 0 && (
              <button
                onClick={handleConsolidateDuplicates}
                className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm shadow-xs transition-colors flex items-center gap-2"
                title="Consolidar registros com mesmo código"
              >
                <Layers className="w-4 h-4" />
                <span>Unificar Duplicados ({existingDuplicatesCount})</span>
              </button>
            )}

            {/* Importar Excel / CSV / PDF */}
            <label
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              title="Importar planilha Excel (.xlsx, .xls), CSV ou PDF (atualiza códigos existentes e inclui novos)"
            >
              <Upload className="w-4 h-4 text-white" />
              <span>Importar Planilha</span>
              <input
                type="file"
                onChange={handleFileUpload}
                accept=".xlsx, .xls, .csv, .pdf, .ods"
                className="hidden"
              />
            </label>

            {/* Exportar Excel */}
            <button
              onClick={handleExportExcel}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs sm:text-sm shadow-xs transition-colors flex items-center gap-2"
              title="Exportar registros filtrados para Excel"
            >
              <Download className="w-4 h-4" />
              <span>Exportar Excel</span>
            </button>

            {items.length === 0 && (
              <button
                onClick={handleSeedSample}
                className="px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 font-medium text-xs sm:text-sm transition-colors flex items-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Carregar Exemplos</span>
              </button>
            )}

            <button
              onClick={openNewModal}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs sm:text-sm shadow-xs transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Item</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[98%] mx-auto px-2 sm:px-4 lg:px-6 pt-6">
        {/* Import Summary Feedback Banner */}
        {importSummary && (
          <div className={`mb-6 p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
            isDarkMode ? 'bg-slate-900/90 border-emerald-500/30 text-slate-100' : 'bg-emerald-50/70 border-emerald-200 text-slate-800'
          }`}>
            <div className="flex items-start sm:items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-500 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-bold">
                    Sincronização de Planilha Concluída ({importSummary.fileName})
                  </h3>
                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-500/10 text-slate-500 dark:text-slate-400 font-semibold">
                    {importSummary.totalRead} linha(s) lida(s)
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-amber-600 dark:text-amber-400">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    {importSummary.updatedCount} item(ns) existente(s) atualizado(s)
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    {importSummary.insertedCount} novo(s) código(s) incluído(s)
                  </span>
                  {importSummary.unchangedCount > 0 && (
                    <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                      <span className="w-2 h-2 rounded-full bg-slate-400" />
                      {importSummary.unchangedCount} sem alterações
                    </span>
                  )}
                  {importSummary.duplicatesRemovedCount > 0 && (
                    <span className="inline-flex items-center gap-1.5 font-semibold text-rose-500">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      {importSummary.duplicatesRemovedCount} duplicado(s) unificado(s)
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => setImportSummary(null)}
              className="self-end sm:self-center p-1.5 rounded-lg text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
              title="Fechar resumo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Missing Table Warning */}
        {missingTableInfo?.missing && (
          <div className="mb-6 p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 font-bold">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                <span>A tabela &apos;mercado_livre_research&apos; não foi encontrada no banco de dados Supabase.</span>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(missingTableInfo.sql || '');
                  setCopiedSql(true);
                  setTimeout(() => setCopiedSql(false), 3000);
                }}
                className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-semibold text-xs flex items-center gap-1.5 hover:bg-amber-700 transition-colors"
              >
                {copiedSql ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiedSql ? 'SQL Copiado!' : 'Copiar SQL para o Supabase'}
              </button>
            </div>
            <p className="text-xs text-amber-700/80 dark:text-amber-300/80">
              Copie o comando abaixo e execute-o no Editor SQL do seu projeto Supabase para criar a tabela com todos os campos necessários:
            </p>
            <pre className="p-3 rounded-xl bg-slate-900 text-slate-200 overflow-x-auto font-mono text-xs leading-relaxed">
              {missingTableInfo.sql}
            </pre>
          </div>
        )}

        {/* Filters and Search */}
        <div className={`p-4 rounded-2xl border shadow-xs mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 ${
          isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
            <div className="relative flex-1 sm:max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por código, nome, código de barras..."
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isDarkMode 
                    ? 'bg-slate-800/80 border-slate-700 text-slate-100 placeholder-slate-500' 
                    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                }`}
              />
            </div>

            <select
              value={segmentFilter}
              onChange={(e) => setSegmentFilter(e.target.value)}
              className={`px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDarkMode 
                  ? 'bg-slate-800 border-slate-700 text-slate-100' 
                  : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <option value="ALL">Todos os Segmentos</option>
              {uniqueSegments.map(seg => (
                <option key={seg} value={seg}>{seg}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/50">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Comparativo (À Vista CP / Pr. Vende+ / 2º Preço):</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 font-bold text-[10px]">
                1º Menor
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 font-bold text-[10px]">
                2º Menor
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/40 font-bold text-[10px]">
                3º Maior
              </span>
            </div>
            <span>Total de registros: <strong className="text-slate-900 dark:text-white">{filteredItems.length}</strong></span>
            <button
              onClick={fetchItems}
              disabled={loading}
              className={`p-2 rounded-xl border transition-colors ${
                isDarkMode ? 'border-slate-800 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'
              }`}
              title="Atualizar dados"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Spreadsheet Table View */}
        <div className={`rounded-2xl border shadow-xs overflow-hidden ${
          isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="overflow-x-auto max-h-[75vh]">
            <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
              <thead>
                <tr className={`border-b sticky top-0 z-20 font-semibold ${
                  isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-100 border-slate-200 text-slate-700'
                }`}>
                  <th className="p-3 border-r dark:border-slate-700">Segmento ML</th>
                  <th className="p-3 border-r dark:border-slate-700">Código</th>
                  <th className="p-3 border-r dark:border-slate-700 min-w-[280px]">Nome</th>
                  <th className="p-3 border-r dark:border-slate-700">Cód. Adicional 1</th>
                  <th className="p-3 border-r dark:border-slate-700 text-center">Estoque</th>
                  <th className="p-3 border-r dark:border-slate-700 text-center">Vds 6M</th>
                  <th className="p-3 border-r dark:border-slate-700 text-right">À Vista CP</th>
                  <th className="p-3 border-r dark:border-slate-700 text-right">Liq. ML Envios</th>
                  <th className="p-3 border-r dark:border-slate-700 text-right">Pr. CP ML</th>
                  <th className="p-3 border-r dark:border-slate-700 text-right">Pr. Vende+</th>
                  <th className="p-3 border-r dark:border-slate-700 text-right">Liq. ML Full</th>
                  <th className="p-3 border-r dark:border-slate-700 text-right">FULL</th>
                  <th className="p-3 border-r dark:border-slate-700 text-right">2º Preço</th>
                  <th className="p-3 border-r dark:border-slate-700">Cód. Adic. 2</th>
                  <th className="p-3 border-r dark:border-slate-700">Cód. Adic. 3</th>
                  <th className="p-3 border-r dark:border-slate-700">Cód. Adic. 4</th>
                  <th className="p-3 border-r dark:border-slate-700">Cód. Adic. 5</th>
                  <th className="p-3 border-r dark:border-slate-700">Código Barras</th>
                  <th className="p-3 border-r dark:border-slate-700">Nome Fabricante</th>
                  <th className="p-3 border-r dark:border-slate-700">Link Campos</th>
                  <th className="p-3 border-r dark:border-slate-700">Link Vd+</th>
                  <th className="p-3 border-r dark:border-slate-700 text-right">Vd+ 2º Pr.</th>
                  <th className="p-3 text-center sticky right-0 z-30 bg-slate-800 dark:bg-slate-800 text-slate-100">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={23} className="text-center py-12 text-slate-500">
                      Carregando dados da pesquisa...
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={23} className="text-center py-16 text-slate-500">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <Tag className="w-10 h-10 text-slate-400" />
                        <p className="font-medium text-sm">Nenhum registro encontrado.</p>
                        <div className="flex gap-2">
                          <label
                            className="px-3.5 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold flex items-center gap-1.5 hover:bg-amber-700 transition-colors cursor-pointer shadow-sm"
                          >
                            <Upload className="w-3.5 h-3.5 text-white" />
                            Importar Planilha
                            <input
                              type="file"
                              onChange={handleFileUpload}
                              accept=".xlsx, .xls, .csv, .pdf, .ods"
                              className="hidden"
                            />
                          </label>
                          <button
                            onClick={openNewModal}
                            className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-medium flex items-center gap-1.5 hover:bg-blue-700 transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Cadastrar Item
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const isInlineEditing = inlineEditingId === item.id;

                    if (isInlineEditing) {
                      return (
                        <tr key={item.id} className="bg-amber-500/10 dark:bg-amber-500/20 font-medium">
                          {/* Segmento ML */}
                          <td className="p-1 border-r dark:border-slate-800">
                            <input
                              type="text"
                              value={inlineFormData.segmento_ml || ''}
                              onChange={e => setInlineFormData({ ...inlineFormData, segmento_ml: e.target.value })}
                              className="w-full px-2 py-1 text-xs rounded border border-amber-500/50 bg-slate-900 text-white"
                            />
                          </td>
                          {/* Código */}
                          <td className="p-1 border-r dark:border-slate-800">
                            <input
                              type="text"
                              value={inlineFormData.codigo || ''}
                              onChange={e => setInlineFormData({ ...inlineFormData, codigo: e.target.value })}
                              className="w-24 px-2 py-1 text-xs rounded border border-amber-500/50 bg-slate-900 text-white"
                            />
                          </td>
                          {/* Nome */}
                          <td className="p-1 border-r dark:border-slate-800 min-w-[280px]">
                            <input
                              type="text"
                              value={inlineFormData.nome || ''}
                              onChange={e => setInlineFormData({ ...inlineFormData, nome: e.target.value })}
                              className="w-full px-2 py-1 text-xs rounded border border-amber-500/50 bg-slate-900 text-white"
                            />
                          </td>
                          {/* Cód Adicional 1 */}
                          <td className="p-1 border-r dark:border-slate-800">
                            <input
                              type="text"
                              value={inlineFormData.cod_adicional_1 || ''}
                              onChange={e => setInlineFormData({ ...inlineFormData, cod_adicional_1: e.target.value })}
                              className="w-24 px-2 py-1 text-xs rounded border border-amber-500/50 bg-slate-900 text-white"
                            />
                          </td>
                          {/* Estoque */}
                          <td className="p-1 border-r dark:border-slate-800">
                            <input
                              type="number"
                              value={inlineFormData.estoque ?? 0}
                              onChange={e => setInlineFormData({ ...inlineFormData, estoque: e.target.value })}
                              className="w-16 px-2 py-1 text-xs text-center rounded border border-amber-500/50 bg-slate-900 text-white"
                            />
                          </td>
                          {/* Vds 6M */}
                          <td className="p-1 border-r dark:border-slate-800">
                            <input
                              type="number"
                              value={inlineFormData.vds_6m ?? 0}
                              onChange={e => setInlineFormData({ ...inlineFormData, vds_6m: e.target.value })}
                              className="w-16 px-2 py-1 text-xs text-center rounded border border-amber-500/50 bg-slate-900 text-white"
                            />
                          </td>
                          {/* À Vista CP */}
                          <td className="p-1 border-r dark:border-slate-800">
                            <input
                              type="number"
                              step="0.01"
                              value={inlineFormData.a_vista_cp ?? ''}
                              onChange={e => setInlineFormData({ ...inlineFormData, a_vista_cp: e.target.value })}
                              className="w-24 px-2 py-1 text-xs text-right rounded border border-amber-500/50 bg-slate-900 text-white"
                            />
                          </td>
                          {/* Liq ML Envios */}
                          <td className="p-1 border-r dark:border-slate-800">
                            <input
                              type="number"
                              step="0.01"
                              value={inlineFormData.liq_ml_envios ?? ''}
                              onChange={e => setInlineFormData({ ...inlineFormData, liq_ml_envios: e.target.value })}
                              className="w-24 px-2 py-1 text-xs text-right rounded border border-amber-500/50 bg-slate-900 text-white"
                            />
                          </td>
                          {/* Pr CP ML */}
                          <td className="p-1 border-r dark:border-slate-800">
                            <input
                              type="number"
                              step="0.01"
                              value={inlineFormData.pr_cp_ml ?? ''}
                              onChange={e => setInlineFormData({ ...inlineFormData, pr_cp_ml: e.target.value })}
                              className="w-24 px-2 py-1 text-xs text-right rounded border border-amber-500/50 bg-slate-900 text-white"
                            />
                          </td>
                          {/* Pr Vende+ */}
                          <td className="p-1 border-r dark:border-slate-800">
                            <input
                              type="number"
                              step="0.01"
                              value={inlineFormData.pr_vende_mais ?? ''}
                              onChange={e => setInlineFormData({ ...inlineFormData, pr_vende_mais: e.target.value })}
                              className="w-24 px-2 py-1 text-xs text-right rounded border border-blue-500/50 bg-slate-900 text-white font-bold"
                            />
                          </td>
                          {/* Liq ML Full */}
                          <td className="p-1 border-r dark:border-slate-800">
                            <input
                              type="number"
                              step="0.01"
                              value={inlineFormData.liq_ml_full ?? ''}
                              onChange={e => setInlineFormData({ ...inlineFormData, liq_ml_full: e.target.value })}
                              className="w-24 px-2 py-1 text-xs text-right rounded border border-amber-500/50 bg-slate-900 text-white"
                            />
                          </td>
                          {/* FULL */}
                          <td className="p-1 border-r dark:border-slate-800">
                            <input
                              type="number"
                              step="0.01"
                              value={inlineFormData.full_price ?? ''}
                              onChange={e => setInlineFormData({ ...inlineFormData, full_price: e.target.value })}
                              className="w-24 px-2 py-1 text-xs text-right rounded border border-amber-500/50 bg-slate-900 text-white"
                            />
                          </td>
                          {/* 2º Preço */}
                          <td className="p-1 border-r dark:border-slate-800">
                            <input
                              type="number"
                              step="0.01"
                              value={inlineFormData.segundo_preco ?? ''}
                              onChange={e => setInlineFormData({ ...inlineFormData, segundo_preco: e.target.value })}
                              className="w-24 px-2 py-1 text-xs text-right rounded border border-amber-500/50 bg-slate-900 text-white"
                            />
                          </td>
                          {/* Cód Adic 2 */}
                          <td className="p-1 border-r dark:border-slate-800">
                            <input
                              type="text"
                              value={inlineFormData.cod_adicional_2 || ''}
                              onChange={e => setInlineFormData({ ...inlineFormData, cod_adicional_2: e.target.value })}
                              className="w-24 px-2 py-1 text-xs rounded border border-amber-500/50 bg-slate-900 text-white"
                            />
                          </td>
                          {/* Cód Adic 3 */}
                          <td className="p-1 border-r dark:border-slate-800">
                            <input
                              type="text"
                              value={inlineFormData.cod_adicional_3 || ''}
                              onChange={e => setInlineFormData({ ...inlineFormData, cod_adicional_3: e.target.value })}
                              className="w-24 px-2 py-1 text-xs rounded border border-amber-500/50 bg-slate-900 text-white"
                            />
                          </td>
                          {/* Cód Adic 4 */}
                          <td className="p-1 border-r dark:border-slate-800">
                            <input
                              type="text"
                              value={inlineFormData.cod_adicional_4 || ''}
                              onChange={e => setInlineFormData({ ...inlineFormData, cod_adicional_4: e.target.value })}
                              className="w-24 px-2 py-1 text-xs rounded border border-amber-500/50 bg-slate-900 text-white"
                            />
                          </td>
                          {/* Cód Adic 5 */}
                          <td className="p-1 border-r dark:border-slate-800">
                            <input
                              type="text"
                              value={inlineFormData.cod_adicional_5 || ''}
                              onChange={e => setInlineFormData({ ...inlineFormData, cod_adicional_5: e.target.value })}
                              className="w-24 px-2 py-1 text-xs rounded border border-amber-500/50 bg-slate-900 text-white"
                            />
                          </td>
                          {/* Código Barras */}
                          <td className="p-1 border-r dark:border-slate-800">
                            <input
                              type="text"
                              value={inlineFormData.codigo_barras || ''}
                              onChange={e => setInlineFormData({ ...inlineFormData, codigo_barras: e.target.value })}
                              className="w-32 px-2 py-1 text-xs rounded border border-amber-500/50 bg-slate-900 text-white"
                            />
                          </td>
                          {/* Fabricante */}
                          <td className="p-1 border-r dark:border-slate-800">
                            <input
                              type="text"
                              value={inlineFormData.nome_fabricante || ''}
                              onChange={e => setInlineFormData({ ...inlineFormData, nome_fabricante: e.target.value })}
                              className="w-28 px-2 py-1 text-xs rounded border border-amber-500/50 bg-slate-900 text-white"
                            />
                          </td>
                          {/* Link Campos */}
                          <td className="p-1 border-r dark:border-slate-800">
                            <input
                              type="text"
                              value={inlineFormData.link_campos || ''}
                              onChange={e => setInlineFormData({ ...inlineFormData, link_campos: e.target.value })}
                              className="w-36 px-2 py-1 text-xs rounded border border-amber-500/50 bg-slate-900 text-white"
                            />
                          </td>
                          {/* Link Vd+ */}
                          <td className="p-1 border-r dark:border-slate-800">
                            <input
                              type="text"
                              value={inlineFormData.link_vd_mais || ''}
                              onChange={e => setInlineFormData({ ...inlineFormData, link_vd_mais: e.target.value })}
                              className="w-36 px-2 py-1 text-xs rounded border border-amber-500/50 bg-slate-900 text-white"
                            />
                          </td>
                          {/* Vd+ 2º Pr. */}
                          <td className="p-1 border-r dark:border-slate-800">
                            <input
                              type="number"
                              step="0.01"
                              value={inlineFormData.vd_mais_segundo_pr ?? ''}
                              onChange={e => setInlineFormData({ ...inlineFormData, vd_mais_segundo_pr: e.target.value })}
                              className="w-24 px-2 py-1 text-xs text-right rounded border border-amber-500/50 bg-slate-900 text-white"
                            />
                          </td>
                          {/* Inline Save / Cancel */}
                          <td className="p-1 text-center sticky right-0 z-30 bg-slate-900 shadow-md">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={saveInlineEdit}
                                className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                                title="Salvar Alterações"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={cancelInlineEdit}
                                className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
                                title="Cancelar"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    const isRowUpdated = updatedRowIds.has(item.id);
                    const isRowInserted = insertedRowIds.has(item.id);
                    const priceRanks = getRowPriceComparison(item);
                    const aVistaStyle = getPriceCellStyles(priceRanks.a_vista_cp);
                    const prVendeMaisStyle = getPriceCellStyles(priceRanks.pr_vende_mais);
                    const segundoPrecoStyle = getPriceCellStyles(priceRanks.segundo_preco);

                    return (
                      <tr 
                        key={item.id} 
                        className={`hover:bg-slate-500/5 transition-colors group ${
                          isRowInserted
                            ? 'bg-emerald-500/5'
                            : isRowUpdated
                              ? 'bg-amber-500/5'
                              : isDarkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="p-3 border-r dark:border-slate-800 font-semibold text-amber-500">{item.segmento_ml || '-'}</td>
                        <td className="p-3 border-r dark:border-slate-800 font-mono text-slate-400">
                          <div className="flex items-center gap-1.5">
                            <span>{item.codigo || '-'}</span>
                            {isRowUpdated && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30">
                                ATUALIZADO
                              </span>
                            )}
                            {isRowInserted && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                                NOVO
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 border-r dark:border-slate-800 font-medium text-slate-900 dark:text-slate-100 min-w-[280px]">
                          {item.nome || '-'}
                        </td>
                        <td className="p-3 border-r dark:border-slate-800 font-mono text-slate-400">{item.cod_adicional_1 || '-'}</td>
                        <td className="p-3 border-r dark:border-slate-800 text-center font-bold">{item.estoque ?? 0}</td>
                        <td className="p-3 border-r dark:border-slate-800 text-center font-bold text-slate-400">{item.vds_6m ?? 0}</td>
                        <td className={`p-3 border-r dark:border-slate-800 text-right ${aVistaStyle.td}`}>
                          <span className={aVistaStyle.badge}>{formatCurrency(item.a_vista_cp)}</span>
                        </td>
                        <td className="p-3 border-r dark:border-slate-800 text-right">{formatCurrency(item.liq_ml_envios)}</td>
                        <td className="p-3 border-r dark:border-slate-800 text-right">{formatCurrency(item.pr_cp_ml)}</td>
                        <td className={`p-3 border-r dark:border-slate-800 text-right ${prVendeMaisStyle.td}`}>
                          <span className={prVendeMaisStyle.badge}>{formatCurrency(item.pr_vende_mais)}</span>
                        </td>
                        <td className="p-3 border-r dark:border-slate-800 text-right">{formatCurrency(item.liq_ml_full)}</td>
                        <td className="p-3 border-r dark:border-slate-800 text-right font-semibold text-amber-500">{formatCurrency(item.full_price)}</td>
                        <td className={`p-3 border-r dark:border-slate-800 text-right ${segundoPrecoStyle.td}`}>
                          <span className={segundoPrecoStyle.badge}>{formatCurrency(item.segundo_preco)}</span>
                        </td>
                        <td className="p-3 border-r dark:border-slate-800 font-mono text-slate-500">{item.cod_adicional_2 || '-'}</td>
                        <td className="p-3 border-r dark:border-slate-800 font-mono text-slate-500">{item.cod_adicional_3 || '-'}</td>
                        <td className="p-3 border-r dark:border-slate-800 font-mono text-slate-500">{item.cod_adicional_4 || '-'}</td>
                        <td className="p-3 border-r dark:border-slate-800 font-mono text-slate-500">{item.cod_adicional_5 || '-'}</td>
                        <td className="p-3 border-r dark:border-slate-800 font-mono text-slate-400">{item.codigo_barras || '-'}</td>
                        <td className="p-3 border-r dark:border-slate-800 text-slate-400">{item.nome_fabricante || '-'}</td>
                        <td className="p-3 border-r dark:border-slate-800">
                          {item.link_campos ? (
                            <a href={item.link_campos} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex items-center gap-1">
                              Link <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : '-'}
                        </td>
                        <td className="p-3 border-r dark:border-slate-800">
                          {item.link_vd_mais ? (
                            <a href={item.link_vd_mais} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex items-center gap-1">
                              Link <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : '-'}
                        </td>
                        <td className="p-3 border-r dark:border-slate-800 text-right">{formatCurrency(item.vd_mais_segundo_pr)}</td>
                        {/* Actions column */}
                        <td className="p-3 text-center sticky right-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs">
                          <div className="flex items-center justify-center gap-1">
                            {/* Fast Inline Edit */}
                            <button
                              onClick={() => startInlineEdit(item)}
                              className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-500/10 transition-colors"
                              title="Editar na Tabela"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Full Edit Modal */}
                            <button
                              onClick={() => openEditModal(item)}
                              className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-500/10 transition-colors"
                              title="Editar em Formulário"
                            >
                              <Save className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete */}
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors"
                              title="Excluir"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal Adicionar / Editar Item */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl border p-6 my-8 ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${editingId ? 'bg-amber-500 text-slate-950' : 'bg-blue-600 text-white'}`}>
                  {editingId ? <Edit2 className="w-5 h-5" /> : <Tag className="w-5 h-5" />}
                </div>
                <div>
                  <h2 className="text-lg font-bold">
                    {editingId ? 'Editar Item de Pesquisa Mercado Livre' : 'Novo Item de Pesquisa Mercado Livre'}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {editingId ? 'Edite os campos e salve as alterações no banco' : 'Preencha os campos da pesquisa de preço'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Seção 1: Identificação */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b pb-1 dark:border-slate-800">
                  Identificação do Produto
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Segmento ML</label>
                    <input
                      type="text"
                      value={formData.segmento_ml}
                      onChange={e => setFormData({ ...formData, segmento_ml: e.target.value })}
                      placeholder="Ex: Brastemp"
                      className={`w-full px-3 py-2 text-sm rounded-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Código</label>
                    <input
                      type="text"
                      value={formData.codigo}
                      onChange={e => setFormData({ ...formData, codigo: e.target.value })}
                      placeholder="Ex: 212445"
                      className={`w-full px-3 py-2 text-sm rounded-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Nome do Produto</label>
                    <input
                      type="text"
                      value={formData.nome}
                      onChange={e => setFormData({ ...formData, nome: e.target.value })}
                      placeholder="Ex: FRONTAL DA GAVETA..."
                      className={`w-full px-3 py-2 text-sm rounded-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                    />
                  </div>
                </div>
              </div>

              {/* Seção 2: Códigos Adicionais e Fabricante */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b pb-1 dark:border-slate-800">
                  Códigos Adicionais & Fabricante
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Cód. Adicional 1</label>
                    <input
                      type="text"
                      value={formData.cod_adicional_1}
                      onChange={e => setFormData({ ...formData, cod_adicional_1: e.target.value })}
                      className={`w-full px-3 py-2 text-sm rounded-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Cód. Adicional 2</label>
                    <input
                      type="text"
                      value={formData.cod_adicional_2}
                      onChange={e => setFormData({ ...formData, cod_adicional_2: e.target.value })}
                      className={`w-full px-3 py-2 text-sm rounded-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Cód. Adicional 3</label>
                    <input
                      type="text"
                      value={formData.cod_adicional_3}
                      onChange={e => setFormData({ ...formData, cod_adicional_3: e.target.value })}
                      className={`w-full px-3 py-2 text-sm rounded-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Cód. Adicional 4</label>
                    <input
                      type="text"
                      value={formData.cod_adicional_4}
                      onChange={e => setFormData({ ...formData, cod_adicional_4: e.target.value })}
                      className={`w-full px-3 py-2 text-sm rounded-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Cód. Adicional 5</label>
                    <input
                      type="text"
                      value={formData.cod_adicional_5}
                      onChange={e => setFormData({ ...formData, cod_adicional_5: e.target.value })}
                      className={`w-full px-3 py-2 text-sm rounded-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Código de Barras (EAN)</label>
                    <input
                      type="text"
                      value={formData.codigo_barras}
                      onChange={e => setFormData({ ...formData, codigo_barras: e.target.value })}
                      className={`w-full px-3 py-2 text-sm rounded-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Nome Fabricante</label>
                    <input
                      type="text"
                      value={formData.nome_fabricante}
                      onChange={e => setFormData({ ...formData, nome_fabricante: e.target.value })}
                      className={`w-full px-3 py-2 text-sm rounded-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                    />
                  </div>
                </div>
              </div>

              {/* Seção 3: Estoque e Vendas */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b pb-1 dark:border-slate-800">
                  Estoque & Vendas
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Estoque</label>
                    <input
                      type="number"
                      value={formData.estoque}
                      onChange={e => setFormData({ ...formData, estoque: e.target.value })}
                      className={`w-full px-3 py-2 text-sm rounded-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Vds 6M (Vendas 6 Meses)</label>
                    <input
                      type="number"
                      value={formData.vds_6m}
                      onChange={e => setFormData({ ...formData, vds_6m: e.target.value })}
                      className={`w-full px-3 py-2 text-sm rounded-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                    />
                  </div>
                </div>
              </div>

              {/* Seção 4: Valores e Precificação */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b pb-1 dark:border-slate-800">
                  Preços & Liquidez Mercado Livre (R$)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1">À Vista CP (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.a_vista_cp}
                      onChange={e => setFormData({ ...formData, a_vista_cp: e.target.value })}
                      className={`w-full px-3 py-2 text-sm rounded-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Liq. ML Envios (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.liq_ml_envios}
                      onChange={e => setFormData({ ...formData, liq_ml_envios: e.target.value })}
                      className={`w-full px-3 py-2 text-sm rounded-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Pr. CP ML (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.pr_cp_ml}
                      onChange={e => setFormData({ ...formData, pr_cp_ml: e.target.value })}
                      className={`w-full px-3 py-2 text-sm rounded-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-blue-500 font-bold">Pr. Vende+ (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.pr_vende_mais}
                      onChange={e => setFormData({ ...formData, pr_vende_mais: e.target.value })}
                      className={`w-full px-3 py-2 text-sm font-bold rounded-xl border border-blue-500/50 ${isDarkMode ? 'bg-slate-800 text-white' : 'bg-blue-50/50 text-blue-900'}`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Liq. ML Full (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.liq_ml_full}
                      onChange={e => setFormData({ ...formData, liq_ml_full: e.target.value })}
                      className={`w-full px-3 py-2 text-sm rounded-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">FULL Price (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.full_price}
                      onChange={e => setFormData({ ...formData, full_price: e.target.value })}
                      className={`w-full px-3 py-2 text-sm rounded-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">2º Preço (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.segundo_preco}
                      onChange={e => setFormData({ ...formData, segundo_preco: e.target.value })}
                      className={`w-full px-3 py-2 text-sm rounded-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Vd+ 2º Pr. (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.vd_mais_segundo_pr}
                      onChange={e => setFormData({ ...formData, vd_mais_segundo_pr: e.target.value })}
                      className={`w-full px-3 py-2 text-sm rounded-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                    />
                  </div>
                </div>
              </div>

              {/* Seção 5: Links */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b pb-1 dark:border-slate-800">
                  Links Externos
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Link Campos (Mercado Livre)</label>
                    <input
                      type="text"
                      value={formData.link_campos}
                      onChange={e => setFormData({ ...formData, link_campos: e.target.value })}
                      placeholder="https://www.mercadolivre.com.br/..."
                      className={`w-full px-3 py-2 text-sm rounded-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Link Vd+ (Vende Mais)</label>
                    <input
                      type="text"
                      value={formData.link_vd_mais}
                      onChange={e => setFormData({ ...formData, link_vd_mais: e.target.value })}
                      placeholder="https://www.mercadolivre.com.br/..."
                      className={`w-full px-3 py-2 text-sm rounded-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-md transition-colors flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {editingId ? 'Salvar Alterações' : 'Cadastrar Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className={`w-full max-w-lg rounded-3xl p-6 shadow-2xl border ${isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"}`}>
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="size-10 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold">Importar Planilha do Mercado Livre</h2>
                  <p className="text-xs text-slate-400">Selecione um arquivo Excel (.xlsx, .xls) ou CSV</p>
                </div>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-6 space-y-4">
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 text-center hover:border-amber-500 transition-colors">
                <input
                  type="file"
                  id="ml-file-input"
                  onChange={e => setImportFile(e.target.files?.[0] || null)}
                  accept=".xlsx, .xls, .csv, .pdf, .ods"
                  className="hidden"
                />
                <label
                  htmlFor="ml-file-input"
                  className="cursor-pointer flex flex-col items-center gap-3"
                >
                  <div className="size-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                      Clique para escolher o arquivo
                    </span>
                    <p className="text-xs text-slate-400 mt-1">
                      {importFile ? importFile.name : "Nenhum arquivo selecionado"}
                    </p>
                  </div>
                </label>
              </div>

              {importFile && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center justify-between">
                  <span className="font-medium">Arquivo pronto: {importFile.name} ({Math.round(importFile.size / 1024)} KB)</span>
                  <button
                    onClick={() => setImportFile(null)}
                    className="text-rose-500 hover:underline font-bold"
                  >
                    Remover
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!importFile || importing}
                onClick={handleExecuteImport}
                className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-bold shadow-md transition-colors flex items-center gap-2"
              >
                {importing ? (
                  <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                <span>Processar e Importar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
