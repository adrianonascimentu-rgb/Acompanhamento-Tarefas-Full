'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, Tag, Plus, Search, Trash2, Copy, Check, Download, Upload, 
  ExternalLink, Package, DollarSign, BarChart3, RefreshCw, AlertCircle, CheckCircle2, X 
} from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

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
    full_price: 255.55,
    segundo_preco: 235.00,
    cod_adicional_2: '',
    cod_adicional_3: '',
    cod_adicional_4: '',
    cod_adicional_5: '',
    codigo_barras: '7891129254787',
    nome_fabricante: 'WHIRLPOOL',
    link_campos: 'https://www.mercadolivre.com.br',
    link_vd_mais: 'https://www.mercadolivre.com.br',
    vd_mais_segundo_pr: null
  },
  {
    segmento_ml: 'Brastemp',
    codigo: '211616',
    nome: 'RECIPIENTE P/COMPRESSOR CARCAÇA ALTA',
    cod_adicional_1: 'REBC',
    estoque: 8,
    vds_6m: 16,
    a_vista_cp: 25.82,
    liq_ml_envios: 25.88,
    pr_cp_ml: 36.80,
    pr_vende_mais: 29.99,
    liq_ml_full: null,
    full_price: 29.99,
    segundo_preco: 29.99,
    cod_adicional_2: 'W10585857',
    cod_adicional_3: '',
    cod_adicional_4: '',
    cod_adicional_5: '',
    codigo_barras: '',
    nome_fabricante: 'DISTRIBUID',
    link_campos: 'https://www.mercadolivre.com.br',
    link_vd_mais: 'https://www.mercadolivre.com.br',
    vd_mais_segundo_pr: null
  },
  {
    segmento_ml: 'Brastemp',
    codigo: '311662',
    nome: 'TAMPA DA GAVETA LEGUMES BRM38/BRM39+ BRASTEMP',
    cod_adicional_1: 'W10287527',
    estoque: 5,
    vds_6m: 4,
    a_vista_cp: 198.04,
    liq_ml_envios: 198.42,
    pr_cp_ml: 326.50,
    pr_vende_mais: 148.00,
    liq_ml_full: null,
    full_price: 99.76,
    segundo_preco: 190.12,
    cod_adicional_2: '',
    cod_adicional_3: '',
    cod_adicional_4: '',
    cod_adicional_5: '',
    codigo_barras: '7891129254770',
    nome_fabricante: 'WHIRLPOOL',
    link_campos: 'https://www.mercadolivre.com.br',
    link_vd_mais: 'https://www.mercadolivre.com.br',
    vd_mais_segundo_pr: null
  },
  {
    segmento_ml: 'Consul',
    codigo: '311666',
    nome: 'TAMPA DA GAVETA LEGUMES CRC30/CRA30+ CONSUL',
    cod_adicional_1: 'W10212441',
    estoque: 18,
    vds_6m: 6,
    a_vista_cp: 35.76,
    liq_ml_envios: 35.99,
    pr_cp_ml: 51.50,
    pr_vende_mais: 46.49,
    liq_ml_full: null,
    full_price: null,
    segundo_preco: null,
    cod_adicional_2: '',
    cod_adicional_3: '',
    cod_adicional_4: '',
    cod_adicional_5: '',
    codigo_barras: '7891129259850',
    nome_fabricante: 'WHIRLPOOL',
    link_campos: 'https://www.mercadolivre.com.br',
    link_vd_mais: 'https://www.mercadolivre.com.br',
    vd_mais_segundo_pr: null
  },
  {
    segmento_ml: 'Electrolux',
    codigo: '212086',
    nome: 'TAMPA DA GAVETA LEGUMES DF42/DFN42+ ELECTROLUX',
    cod_adicional_1: 'A99338503',
    estoque: 18,
    vds_6m: 11,
    a_vista_cp: 112.80,
    liq_ml_envios: 112.86,
    pr_cp_ml: 189.50,
    pr_vende_mais: 117.14,
    liq_ml_full: null,
    full_price: null,
    segundo_preco: 70201022,
    cod_adicional_2: '41019674',
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

export default function MercadoLivreResearchPage() {
  const { isDarkMode } = useTheme();
  const [items, setItems] = useState<MLItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [segmentFilter, setSegmentFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [missingTableInfo, setMissingTableInfo] = useState<{ missing: boolean; sql?: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  const [formData, setFormData] = useState({
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
  });

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/mercado-livre');
      const json = await res.json();
      if (res.ok && json.data) {
        setItems(json.data);
        setMissingTableInfo(null);
      } else if (json.missing_table) {
        setMissingTableInfo({ missing: true, sql: json.create_sql });
        setItems([]);
      }
    } catch (err) {
      console.error('Erro ao buscar dados do Mercado Livre:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleSeedSample = async () => {
    if (!confirm('Deseja popular a pesquisa com os itens de exemplo da planilha do Mercado Livre?')) return;
    setLoading(true);
    try {
      for (const sample of SAMPLE_ITEMS) {
        await fetch('/api/mercado-livre', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sample)
        });
      }
      await fetchItems();
    } catch (err) {
      console.error('Erro ao popular exemplos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/mercado-livre', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const json = await res.json();
      if (res.ok) {
        setIsModalOpen(false);
        setFormData({
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
        });
        fetchItems();
      } else if (json.missing_table) {
        setMissingTableInfo({ missing: true, sql: json.create_sql });
        alert(json.error);
      } else {
        alert(json.error || 'Erro ao salvar');
      }
    } catch (err: any) {
      alert('Erro de conexão: ' + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este item da pesquisa?')) return;
    try {
      const res = await fetch(`/api/mercado-livre?id=${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setItems(prev => prev.filter(i => i.id !== id));
      } else {
        const json = await res.json();
        alert(json.error || 'Erro ao excluir');
      }
    } catch (err) {
      alert('Erro ao excluir item.');
    }
  };

  const uniqueSegments = useMemo(() => {
    const s = new Set<string>();
    items.forEach(i => { if (i.segmento_ml) s.add(i.segmento_ml); });
    return Array.from(s).sort();
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchSearch = 
        (item.nome || '').toLowerCase().includes(search.toLowerCase()) ||
        (item.codigo || '').toLowerCase().includes(search.toLowerCase()) ||
        (item.codigo_barras || '').toLowerCase().includes(search.toLowerCase()) ||
        (item.cod_adicional_1 || '').toLowerCase().includes(search.toLowerCase());
      
      const matchSegment = segmentFilter === 'ALL' || item.segmento_ml === segmentFilter;

      return matchSearch && matchSegment;
    });
  }, [items, search, segmentFilter]);

  const formatCurrency = (val: number | null) => {
    if (val === null || val === undefined || isNaN(val)) return '-';
    return Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className={`min-h-screen pb-16 transition-colors ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      {/* Top Header */}
      <header className={`sticky top-0 z-30 border-b backdrop-blur-md ${isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-slate-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link 
              href="/social-media" 
              className={`p-2 rounded-xl border transition-colors flex items-center gap-1.5 text-xs font-semibold ${isDarkMode ? 'border-slate-800 bg-slate-800/50 hover:bg-slate-800 text-slate-300' : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'}`}
              title="Voltar para Site"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Voltar para Site</span>
            </Link>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
              <Tag className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Pesquisa de Preços - Mercado Livre</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Gerenciador e comparador de preços e concorrentes do Mercado Livre</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {items.length === 0 && (
              <button
                onClick={handleSeedSample}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-medium text-xs sm:text-sm shadow-sm transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Carregar Exemplo da Planilha
              </button>
            )}
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs sm:text-sm shadow-sm transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Adicionar Item
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[98%] mx-auto px-2 sm:px-4 lg:px-6 pt-6">
        {/* Missing Table Warning */}
        {missingTableInfo?.missing && (
          <div className="mb-6 p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 font-bold">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                <span>A tabela 'mercado_livre_research' não foi encontrada no banco de dados Supabase.</span>
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

          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Total de registros: <strong className="text-slate-900 dark:text-white">{filteredItems.length}</strong></span>
            <button
              onClick={fetchItems}
              disabled={loading}
              className={`p-2 rounded-xl border transition-colors ${
                isDarkMode ? 'border-slate-800 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'
              }`}
              title="Atualizar"
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
                  <th className="p-3 border-r dark:border-slate-700 text-right bg-blue-500/10 text-blue-600 dark:text-blue-400">Pr. Vende+</th>
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
                  <th className="p-3 text-center">Ações</th>
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
                        <button
                          onClick={handleSeedSample}
                          className="px-4 py-2 rounded-xl bg-amber-500 text-white font-medium text-xs hover:bg-amber-600 transition-colors"
                        >
                          Carregar Exemplos da Planilha
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item, idx) => (
                    <tr 
                      key={item.id} 
                      className={`transition-colors hover:bg-blue-500/5 ${
                        idx % 2 === 0 
                          ? (isDarkMode ? 'bg-slate-900/40' : 'bg-white') 
                          : (isDarkMode ? 'bg-slate-900/80' : 'bg-slate-50/50')
                      }`}
                    >
                      <td className="p-3 border-r dark:border-slate-800 font-medium">{item.segmento_ml || '-'}</td>
                      <td className="p-3 border-r dark:border-slate-800 font-mono text-blue-600 dark:text-blue-400 font-semibold">{item.codigo || '-'}</td>
                      <td className="p-3 border-r dark:border-slate-800 font-medium max-w-[320px] truncate" title={item.nome || ''}>{item.nome || '-'}</td>
                      <td className="p-3 border-r dark:border-slate-800 font-mono text-slate-500">{item.cod_adicional_1 || '-'}</td>
                      <td className="p-3 border-r dark:border-slate-800 text-center font-semibold">{item.estoque ?? 0}</td>
                      <td className="p-3 border-r dark:border-slate-800 text-center">{item.vds_6m ?? 0}</td>
                      <td className="p-3 border-r dark:border-slate-800 text-right">{formatCurrency(item.a_vista_cp)}</td>
                      <td className="p-3 border-r dark:border-slate-800 text-right">{formatCurrency(item.liq_ml_envios)}</td>
                      <td className="p-3 border-r dark:border-slate-800 text-right">{formatCurrency(item.pr_cp_ml)}</td>
                      <td className="p-3 border-r dark:border-slate-800 text-right font-bold bg-blue-500/5 text-blue-600 dark:text-blue-400">{formatCurrency(item.pr_vende_mais)}</td>
                      <td className="p-3 border-r dark:border-slate-800 text-right">{formatCurrency(item.liq_ml_full)}</td>
                      <td className="p-3 border-r dark:border-slate-800 text-right font-medium">{formatCurrency(item.full_price)}</td>
                      <td className="p-3 border-r dark:border-slate-800 text-right">{formatCurrency(item.segundo_preco)}</td>
                      <td className="p-3 border-r dark:border-slate-800 font-mono text-slate-500">{item.cod_adicional_2 || '-'}</td>
                      <td className="p-3 border-r dark:border-slate-800 font-mono text-slate-500">{item.cod_adicional_3 || '-'}</td>
                      <td className="p-3 border-r dark:border-slate-800 font-mono text-slate-500">{item.cod_adicional_4 || '-'}</td>
                      <td className="p-3 border-r dark:border-slate-800 font-mono text-slate-500">{item.cod_adicional_5 || '-'}</td>
                      <td className="p-3 border-r dark:border-slate-800 font-mono">{item.codigo_barras || '-'}</td>
                      <td className="p-3 border-r dark:border-slate-800">{item.nome_fabricante || '-'}</td>
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
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal Adicionar Item */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl border p-6 ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-600 text-white">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Novo Item de Pesquisa Mercado Livre</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Preencha os campos da pesquisa de preço</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
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

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
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
                  <label className="block text-xs font-semibold mb-1">Estoque</label>
                  <input
                    type="number"
                    value={formData.estoque}
                    onChange={e => setFormData({ ...formData, estoque: e.target.value })}
                    className={`w-full px-3 py-2 text-sm rounded-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Vds 6M</label>
                  <input
                    type="number"
                    value={formData.vds_6m}
                    onChange={e => setFormData({ ...formData, vds_6m: e.target.value })}
                    className={`w-full px-3 py-2 text-sm rounded-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                  />
                </div>
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
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
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
                  <label className="block text-xs font-semibold mb-1">Pr. Vende+ (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.pr_vende_mais}
                    onChange={e => setFormData({ ...formData, pr_vende_mais: e.target.value })}
                    className={`w-full px-3 py-2 text-sm rounded-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                  />
                </div>
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
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">FULL (R$)</label>
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
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">Cód. Adicional 4</label>
                  <input
                    type="text"
                    value={formData.cod_adicional_4}
                    onChange={e => setFormData({ ...formData, cod_adicional_4: e.target.value })}
                    className={`w-full px-3 py-2 text-sm rounded-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                  />
                </div>
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
                  <label className="block text-xs font-semibold mb-1">Código de Barras</label>
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">Link Campos</label>
                  <input
                    type="text"
                    value={formData.link_campos}
                    onChange={e => setFormData({ ...formData, link_campos: e.target.value })}
                    placeholder="https://..."
                    className={`w-full px-3 py-2 text-sm rounded-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Link Vd+</label>
                  <input
                    type="text"
                    value={formData.link_vd_mais}
                    onChange={e => setFormData({ ...formData, link_vd_mais: e.target.value })}
                    placeholder="https://..."
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

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-sm"
                >
                  Salvar Registro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
