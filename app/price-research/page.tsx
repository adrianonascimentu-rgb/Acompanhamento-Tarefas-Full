'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, Tag, Search, Trash2, RefreshCw, PlusCircle, Store, Calendar, 
  DollarSign, Package, Filter, SlidersHorizontal, RotateCcw, X, Upload, 
  Download, Edit2, Check, Save, FileSpreadsheet
} from 'lucide-react';
import PriceResearchForm from '@/components/PriceResearchForm';
import PriceEvolutionChart from '@/components/PriceEvolutionChart';
import * as XLSX from 'xlsx';

interface PriceResearchItem {
  id: string;
  created_at: string;
  product_code: string | null;
  product_name: string | null;
  full_price: number | null;
  cash_price: number | null;
  store_name: string | null;
}

export default function PriceResearchPage() {
  const [items, setItems] = useState<PriceResearchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Estados de Edição Inline
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
  const [inlineFormData, setInlineFormData] = useState<any>({});

  // Estados dos Filtros Avançados
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedStoreFilter, setSelectedStoreFilter] = useState('ALL');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(true);

  // Estados para Destaque Interativo pela Legenda na Tabela
  const [legendHighlight, setLegendHighlight] = useState<'all' | 'min' | 'max' | 'regular'>('all');
  const [hoveredLegend, setHoveredLegend] = useState<'min' | 'max' | 'regular' | null>(null);
  const [focusedProductCode, setFocusedProductCode] = useState<string | null>(null);
  const [hoveredProductCode, setHoveredProductCode] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/competitor-prices');
      const json = await res.json();
      if (res.ok && json.data) {
        setItems(json.data);
      }
    } catch (err) {
      console.error('Erro ao buscar histórico de preços:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente remover esta pesquisa de preço?')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/competitor-prices?id=${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setItems(prev => prev.filter(item => item.id !== id));
      } else {
        alert(`Não foi possível excluir: ${json.error || 'Erro ao excluir'}`);
      }
    } catch (err: any) {
      alert('Erro de conexão: ' + (err?.message || 'O servidor não respondeu.'));
    } finally {
      setDeletingId(null);
    }
  };

  // Exportar Excel
  const handleExportExcel = () => {
    if (filteredItems.length === 0) {
      alert('Nenhum registro para exportar.');
      return;
    }

    const exportData = filteredItems.map(item => ({
      'Data/Hora': item.created_at ? new Date(item.created_at).toLocaleString('pt-BR') : '',
      'Código': item.product_code || '',
      'Produto': item.product_name || '',
      'Preço Cheio': item.full_price ?? '',
      'Preço À Vista': item.cash_price ?? '',
      'Loja Concorrente': item.store_name || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Pesquisa de Preços');
    XLSX.writeFile(workbook, `Pesquisa_Precos_Concorrentes_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Importar Excel / CSV
  const handleTriggerImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawData = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' });

        if (rawData.length === 0) {
          alert('O arquivo selecionado está vazio ou não possui linhas válidas.');
          return;
        }

        const mapped = rawData.map(row => {
          const getVal = (...keys: string[]) => {
            for (const k of keys) {
              const foundKey = Object.keys(row).find(rk => rk.trim().toLowerCase() === k.trim().toLowerCase());
              if (foundKey && row[foundKey] !== undefined && row[foundKey] !== '') {
                return row[foundKey];
              }
            }
            return null;
          };

          return {
            product_code: getVal('Código', 'Codigo', 'product_code', 'cod'),
            product_name: getVal('Produto', 'Nome', 'product_name', 'descricao'),
            full_price: getVal('Preço Cheio', 'Preco Cheio', 'full_price', 'preco_tabela'),
            cash_price: getVal('Preço À Vista', 'Preco A Vista', 'cash_price', 'a_vista'),
            store_name: getVal('Loja Concorrente', 'Loja', 'Concorrente', 'store_name')
          };
        });

        if (!confirm(`Foram encontrados ${mapped.length} registros no arquivo. Deseja importar para a pesquisa de preços?`)) {
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }

        setLoading(true);
        const res = await fetch('/api/competitor-prices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mapped)
        });

        const json = await res.json();
        if (res.ok) {
          alert(`Importação concluída com sucesso! ${json.count || mapped.length} itens adicionados.`);
          fetchItems();
        } else {
          alert(json.error || 'Erro ao importar arquivo.');
        }
      } catch (err: any) {
        alert('Erro ao processar arquivo: ' + err.message);
      } finally {
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  // Funções de Edição Inline na Tabela
  const startInlineEdit = (item: PriceResearchItem) => {
    setInlineEditingId(item.id);
    setInlineFormData({
      id: item.id,
      product_code: item.product_code || '',
      product_name: item.product_name || '',
      full_price: item.full_price !== null ? String(item.full_price) : '',
      cash_price: item.cash_price !== null ? String(item.cash_price) : '',
      store_name: item.store_name || ''
    });
  };

  const cancelInlineEdit = () => {
    setInlineEditingId(null);
    setInlineFormData({});
  };

  const saveInlineEdit = async () => {
    if (!inlineEditingId) return;
    try {
      const res = await fetch('/api/competitor-prices', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inlineFormData)
      });
      if (res.ok) {
        setInlineEditingId(null);
        setInlineFormData({});
        fetchItems();
      } else {
        const json = await res.json();
        alert(json.error || 'Erro ao salvar alteração.');
      }
    } catch (err: any) {
      alert('Erro ao salvar: ' + err.message);
    }
  };

  const uniqueStores = useMemo(() => {
    const set = new Set<string>();
    items.forEach(i => {
      if (i.store_name) set.add(i.store_name);
    });
    return Array.from(set).sort();
  }, [items]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setStartDate('');
    setEndDate('');
    setSelectedStoreFilter('ALL');
    setMinPrice('');
    setMaxPrice('');
  };

  const hasActiveFilters = Boolean(
    searchQuery || startDate || endDate || (selectedStoreFilter && selectedStoreFilter !== 'ALL') || minPrice || maxPrice
  );

  const getItemPriceExtremes15Days = useCallback(
    (targetItem: PriceResearchItem) => {
      const codeKey = (targetItem.product_code || targetItem.product_name || 'SEM_CODIGO')
        .trim()
        .toLowerCase();
      if (!codeKey) {
        return { isMinCash: false, isMaxCash: false, isMinFull: false, isMaxFull: false };
      }

      const targetDate = new Date(targetItem.created_at).getTime();
      const fifteenDaysMs = 15 * 24 * 60 * 60 * 1000;

      const groupItems = items.filter(i => {
        const k = (i.product_code || i.product_name || 'SEM_CODIGO').trim().toLowerCase();
        if (k !== codeKey) return false;
        const d = new Date(i.created_at).getTime();
        return Math.abs(targetDate - d) <= fifteenDaysMs;
      });

      if (groupItems.length <= 1) {
        return { isMinCash: false, isMaxCash: false, isMinFull: false, isMaxFull: false };
      }

      const cashPrices = groupItems.map(i => i.cash_price).filter((p): p is number => p !== null && p !== undefined);
      const minCash = cashPrices.length > 0 ? Math.min(...cashPrices) : null;
      const maxCash = cashPrices.length > 0 ? Math.max(...cashPrices) : null;

      const fullPrices = groupItems.map(i => i.full_price).filter((p): p is number => p !== null && p !== undefined);
      const minFull = fullPrices.length > 0 ? Math.min(...fullPrices) : null;
      const maxFull = fullPrices.length > 0 ? Math.max(...fullPrices) : null;

      const isMinCash = targetItem.cash_price !== null && minCash !== null && targetItem.cash_price === minCash && minCash !== maxCash;
      const isMaxCash = targetItem.cash_price !== null && maxCash !== null && targetItem.cash_price === maxCash && minCash !== maxCash;
      const isMinFull = targetItem.full_price !== null && minFull !== null && targetItem.full_price === minFull && minFull !== maxFull;
      const isMaxFull = targetItem.full_price !== null && maxFull !== null && targetItem.full_price === maxFull && minFull !== maxFull;

      return { isMinCash, isMaxCash, isMinFull, isMaxFull };
    },
    [items]
  );

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        (item.product_name && item.product_name.toLowerCase().includes(q)) ||
        (item.product_code && item.product_code.toLowerCase().includes(q)) ||
        (item.store_name && item.store_name.toLowerCase().includes(q));

      const matchStore =
        selectedStoreFilter === 'ALL' ||
        (item.store_name && item.store_name.toLowerCase() === selectedStoreFilter.toLowerCase());

      let matchDate = true;
      if (startDate) {
        const itemDate = new Date(item.created_at).toISOString().split('T')[0];
        if (itemDate < startDate) matchDate = false;
      }
      if (endDate && matchDate) {
        const itemDate = new Date(item.created_at).toISOString().split('T')[0];
        if (itemDate > endDate) matchDate = false;
      }

      let matchPrice = true;
      const effectivePrice = item.cash_price !== null ? item.cash_price : item.full_price;
      if (minPrice && effectivePrice !== null) {
        if (effectivePrice < parseFloat(minPrice)) matchPrice = false;
      }
      if (maxPrice && effectivePrice !== null && matchPrice) {
        if (effectivePrice > parseFloat(maxPrice)) matchPrice = false;
      }

      return matchQuery && matchStore && matchDate && matchPrice;
    });
  }, [items, searchQuery, selectedStoreFilter, startDate, endDate, minPrice, maxPrice]);

  const legendCounts = useMemo(() => {
    let minCount = 0;
    let maxCount = 0;
    let regularCount = 0;

    filteredItems.forEach(item => {
      const { isMinCash, isMaxCash, isMinFull, isMaxFull } = getItemPriceExtremes15Days(item);
      if (isMinCash || isMinFull) {
        minCount++;
      } else if (isMaxCash || isMaxFull) {
        maxCount++;
      } else {
        regularCount++;
      }
    });

    return { minCount, maxCount, regularCount };
  }, [filteredItems, getItemPriceExtremes15Days]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 md:p-6 space-y-6">
      {/* Hidden file input for import */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        accept=".xlsx, .xls, .csv" 
        className="hidden" 
      />

      {/* Tabs de Navegação entre Módulos de Pesquisa */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-200/80 dark:bg-slate-800/80 rounded-2xl w-fit">
        <Link
          href="/price-research"
          className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs flex items-center gap-2"
        >
          <Tag className="w-4 h-4" />
          <span>Pesquisa Concorrentes</span>
        </Link>
        <Link
          href="/mercado-livre"
          className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-2"
        >
          <Store className="w-4 h-4" />
          <span>Mercado Livre</span>
        </Link>
      </div>

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            title="Voltar ao Painel"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h1 className="text-xl font-extrabold tracking-tight">Pesquisa de Preços de Concorrentes</h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Registre, importe e acompanhe preços praticados por concorrentes no mercado.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Botão Importar */}
          <button
            onClick={handleTriggerImport}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold border border-slate-700 shadow-xs transition-colors flex items-center gap-2"
            title="Importar de arquivo Excel ou CSV"
          >
            <Upload className="w-4 h-4 text-amber-400" />
            <span>Importar</span>
          </button>

          {/* Botão Exportar Excel */}
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-2"
            title="Exportar pesquisas filtradas para Excel"
          >
            <Download className="w-4 h-4" />
            <span>Exportar Excel</span>
          </button>

          {/* Alternar Formulário */}
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2.5 text-xs font-bold rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            {showForm ? 'Ocultar Formulário' : 'Nova Pesquisa'}
          </button>

          {/* Atualizar */}
          <button
            onClick={fetchItems}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-slate-600 dark:text-slate-300"
            title="Atualizar Dados"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Form Section */}
      {showForm && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-200">
          <PriceResearchForm onSuccess={fetchItems} />
        </div>
      )}

      {/* History Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-6">
        <PriceEvolutionChart 
          items={filteredItems} 
          title="Variação de Preços por Produto ao Longo do Tempo"
          subtitle="Gráfico com a evolução histórica de preços para os produtos filtrados"
        />

        {/* Painel de Filtros Avançados */}
        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700/60 pb-2.5">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Filtros Avançados de Pesquisa
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <button
                  onClick={handleClearFilters}
                  className="px-2.5 py-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-900/50 transition-colors flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  Limpar Filtros
                </button>
              )}
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              >
                {showAdvancedFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
              </button>
            </div>
          </div>

          {showAdvancedFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
              {/* Intervalo de Datas */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-blue-500" />
                  Intervalo de Datas
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    title="Data Inicial"
                  />
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    title="Data Final"
                  />
                </div>
              </div>

              {/* Filtro por Loja */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <Store className="w-3 h-3 text-purple-500" />
                  Loja Concorrente
                </label>
                <select
                  value={selectedStoreFilter}
                  onChange={e => setSelectedStoreFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="ALL">Todas as Lojas</option>
                  {uniqueStores.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>

              {/* Faixa de Preço */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <DollarSign className="w-3 h-3 text-emerald-500" />
                  Faixa de Preço (R$)
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    type="number"
                    step="0.01"
                    value={minPrice}
                    onChange={e => setMinPrice(e.target.value)}
                    placeholder="Mín"
                    className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={maxPrice}
                    onChange={e => setMaxPrice(e.target.value)}
                    placeholder="Máx"
                    className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Busca de Texto */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <Search className="w-3 h-3 text-amber-500" />
                  Busca por Código/Nome
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Ex: 104322 ou Placa..."
                    className="w-full pl-7 pr-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <Search className="w-3 h-3 absolute left-2 top-2 text-slate-400" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Título do Histórico e Legenda */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div>
            <h2 className="text-base font-bold tracking-tight">
              Histórico de Pesquisas Registradas ({filteredItems.length})
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {hasActiveFilters ? 'Exibindo pesquisas filtradas pelo painel acima.' : 'Últimas pesquisas enviadas pela equipe comercial.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setLegendHighlight(prev => prev === 'min' ? 'all' : 'min')}
              onMouseEnter={() => setHoveredLegend('min')}
              onMouseLeave={() => setHoveredLegend(null)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                legendHighlight === 'min' || hoveredLegend === 'min'
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/30'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Menor Preço (15 dias)</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-600 text-white font-bold">
                {legendCounts.minCount}
              </span>
            </button>

            <button
              onClick={() => setLegendHighlight(prev => prev === 'max' ? 'all' : 'max')}
              onMouseEnter={() => setHoveredLegend('max')}
              onMouseLeave={() => setHoveredLegend(null)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                legendHighlight === 'max' || hoveredLegend === 'max'
                  ? 'bg-rose-500/20 border-rose-500 text-rose-700 dark:text-rose-300 ring-2 ring-rose-500/30'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300 hover:bg-rose-500/20'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span>Maior Preço (15 dias)</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-600 text-white font-bold">
                {legendCounts.maxCount}
              </span>
            </button>
          </div>
        </div>

        {/* Table / List */}
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500 dark:text-slate-400 flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
            Carregando pesquisas gravadas...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            <Package className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
            {searchQuery ? 'Nenhuma pesquisa encontrada com este filtro.' : 'Nenhuma pesquisa de preço registrada ainda.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="pb-3 px-2">Data/Hora</th>
                  <th className="pb-3 px-2">Código</th>
                  <th className="pb-3 px-2">Produto</th>
                  <th className="pb-3 px-2 text-right">Preço Cheio</th>
                  <th className="pb-3 px-2 text-right">Preço À Vista</th>
                  <th className="pb-3 px-2">Loja Concorrente</th>
                  <th className="pb-3 px-2 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredItems.map(item => {
                  const isEditing = inlineEditingId === item.id;
                  const { isMinCash, isMaxCash, isMinFull, isMaxFull } = getItemPriceExtremes15Days(item);
                  const itemCode = (item.product_code || item.product_name || 'SEM_CODIGO').trim();

                  if (isEditing) {
                    return (
                      <tr key={item.id} className="bg-amber-500/10 dark:bg-amber-500/20 font-medium">
                        <td className="py-2 px-2 text-slate-400">
                          {new Date(item.created_at).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={inlineFormData.product_code || ''}
                            onChange={e => setInlineFormData({ ...inlineFormData, product_code: e.target.value })}
                            className="w-24 px-2 py-1 text-xs rounded border border-amber-500/50 bg-slate-900 text-white"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={inlineFormData.product_name || ''}
                            onChange={e => setInlineFormData({ ...inlineFormData, product_name: e.target.value })}
                            className="w-full px-2 py-1 text-xs rounded border border-amber-500/50 bg-slate-900 text-white"
                          />
                        </td>
                        <td className="py-2 px-2 text-right">
                          <input
                            type="number"
                            step="0.01"
                            value={inlineFormData.full_price || ''}
                            onChange={e => setInlineFormData({ ...inlineFormData, full_price: e.target.value })}
                            className="w-24 px-2 py-1 text-xs text-right rounded border border-amber-500/50 bg-slate-900 text-white"
                          />
                        </td>
                        <td className="py-2 px-2 text-right">
                          <input
                            type="number"
                            step="0.01"
                            value={inlineFormData.cash_price || ''}
                            onChange={e => setInlineFormData({ ...inlineFormData, cash_price: e.target.value })}
                            className="w-24 px-2 py-1 text-xs text-right rounded border border-amber-500/50 bg-slate-900 text-white font-bold"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={inlineFormData.store_name || ''}
                            onChange={e => setInlineFormData({ ...inlineFormData, store_name: e.target.value })}
                            className="w-32 px-2 py-1 text-xs rounded border border-amber-500/50 bg-slate-900 text-white"
                          />
                        </td>
                        <td className="py-2 px-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={saveInlineEdit}
                              className="p-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                              title="Salvar"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={cancelInlineEdit}
                              className="p-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
                              title="Cancelar"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="py-3 px-2 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {new Date(item.created_at).toLocaleString('pt-BR', {
                            dateStyle: 'short',
                            timeStyle: 'short'
                          })}
                        </div>
                      </td>

                      <td className="py-3 px-2 font-mono text-slate-900 dark:text-slate-100 font-medium">
                        {item.product_code ? (
                          <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800/80 font-bold border border-slate-200 dark:border-slate-700">
                            {item.product_code}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">-</span>
                        )}
                      </td>

                      <td className="py-3 px-2 font-medium text-slate-900 dark:text-slate-100">
                        {item.product_name || <span className="text-slate-400 italic">Não informado</span>}
                      </td>

                      <td className="py-3 px-2 text-right">
                        {item.full_price !== null && item.full_price !== undefined ? (
                          <span className={isMinFull ? 'text-emerald-600 font-bold' : isMaxFull ? 'text-rose-600 font-bold' : ''}>
                            R$ {item.full_price.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">-</span>
                        )}
                      </td>

                      <td className="py-3 px-2 text-right">
                        {item.cash_price !== null && item.cash_price !== undefined ? (
                          <span className={isMinCash ? 'text-emerald-600 font-bold' : isMaxCash ? 'text-rose-600 font-bold' : 'font-bold'}>
                            R$ {item.cash_price.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">-</span>
                        )}
                      </td>

                      <td className="py-3 px-2 text-slate-700 dark:text-slate-300 font-medium">
                        {item.store_name ? (
                          <span className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-300">
                            <Store className="w-3 h-3 text-purple-500" />
                            {item.store_name}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">-</span>
                        )}
                      </td>

                      <td className="py-3 px-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => startInlineEdit(item)}
                            className="p-1.5 rounded text-amber-500 hover:bg-amber-500/10 transition-colors"
                            title="Editar Linha"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            disabled={deletingId === item.id}
                            className="p-1.5 rounded text-rose-500 hover:bg-rose-500/10 transition-colors disabled:opacity-50"
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
