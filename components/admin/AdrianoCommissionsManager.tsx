'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  DollarSign, TrendingUp, TrendingDown, Calendar, ShieldCheck, 
  RotateCcw, Download, Printer, Plus, Edit2, CheckCircle2, 
  Clock, AlertCircle, FileSpreadsheet, Lock, Sparkles, 
  Share2, ArrowUpDown, ChevronRight, X, Save, RefreshCw,
  ExternalLink, BarChart3, LayoutGrid, Table as TableIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AdrianoMonthCommission, 
  INITIAL_ADRIANO_COMMISSIONS, 
  AcordoComissaoRow, 
  RedeSocialRow, 
  recalculateMonth, 
  formatCurrencyBRL 
} from '@/lib/initialAdrianoCommissions';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  LineChart, 
  Line, 
  ReferenceLine 
} from 'recharts';

interface AdrianoCommissionsManagerProps {
  isDarkMode?: boolean;
}

const LOCAL_STORAGE_KEY = 'agentx_adriano_commissions_data';

export default function AdrianoCommissionsManager({ isDarkMode = false }: AdrianoCommissionsManagerProps) {
  // Inicialização com localStorage para garantir disponibilidade instantânea offline e persistência
  const [months, setMonths] = useState<AdrianoMonthCommission[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return INITIAL_ADRIANO_COMMISSIONS;
  });

  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table' | 'chart'>('cards');
  const [editingMonth, setEditingMonth] = useState<AdrianoMonthCommission | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'positive' | 'negative' | 'paid' | 'pending'>('all');

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Sincronizar com localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(months));
    } catch {}
  }, [months]);

  // Carregar do servidor se disponível
  const fetchServerData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/commissions-adriano');
      const data = await res.json();
      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        setMonths(data.data);
      }
    } catch (err) {
      console.warn('Usando dados em cache/locais:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServerData();
  }, []);

  // Totais e Métricas Anuais
  const metrics = useMemo(() => {
    let totalComissoes = 0;
    let totalAlcancado = 0;
    let totalAcessoriaRedes = 0;
    let mesesPositivosCount = 0;
    let mesesNegativosCount = 0;
    let countPagas = 0;
    let countPendentes = 0;

    months.forEach(m => {
      totalComissoes += Number(m.total_comissao) || 0;
      if (m.total_comissao > 0) mesesPositivosCount++;
      else if (m.total_comissao < 0) mesesNegativosCount++;

      if (m.pago) countPagas++;
      else countPendentes++;

      m.acordo.forEach(a => {
        totalAlcancado += Number(a.valor_alcancado) || 0;
      });

      m.redes_sociais.forEach(rs => {
        totalAcessoriaRedes += Number(rs.acessoria) || 0;
      });
    });

    return {
      totalComissoes,
      totalAlcancado,
      totalAcessoriaRedes,
      mesesPositivosCount,
      mesesNegativosCount,
      countPagas,
      countPendentes,
      mediaMensal: totalComissoes / 12
    };
  }, [months]);

  // Filtragem de Meses
  const filteredMonths = useMemo(() => {
    return months.filter(m => {
      if (selectedFilter === 'positive') return m.total_comissao > 0;
      if (selectedFilter === 'negative') return m.total_comissao < 0;
      if (selectedFilter === 'paid') return !!m.pago;
      if (selectedFilter === 'pending') return !m.pago;
      return true;
    });
  }, [months, selectedFilter]);

  // Abertura do Modal de Edição
  const handleOpenEdit = (month: AdrianoMonthCommission) => {
    // Clone profundo para edição segura
    setEditingMonth(JSON.parse(JSON.stringify(month)));
    setIsModalOpen(true);
  };

  // Alternar Status de Pagamento
  const handleTogglePago = async (monthId: string) => {
    const updatedMonths = months.map(m => {
      if (m.id === monthId) {
        const nextPago = !m.pago;
        return {
          ...m,
          pago: nextPago,
          data_pagamento: nextPago ? (m.data_pagamento || new Date().toLocaleDateString('pt-BR')) : ''
        };
      }
      return m;
    });

    setMonths(updatedMonths);

    try {
      await fetch('/api/admin/commissions-adriano', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedMonths)
      });
      showToast('Status de pagamento atualizado!', 'success');
    } catch {}
  };

  // Salvar Mês Editado
  const handleSaveMonth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMonth) return;

    const recalculated = recalculateMonth(editingMonth);
    const updatedList = months.map(m => m.id === recalculated.id ? recalculated : m);
    setMonths(updatedList);
    setIsModalOpen(false);

    try {
      await fetch('/api/admin/commissions-adriano', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedList)
      });
      showToast(`Mês de ${recalculated.mes} salvo com sucesso!`, 'success');
    } catch {
      showToast('Salvo localmente no dispositivo.', 'info');
    }
  };

  // Restaurar dados originais da planilha do Adriano
  const handleReset = async () => {
    if (!confirm('Deseja recarregar e restaurar todas as 12 planilhas mensais com os valores originais fornecidos?')) return;
    setMonths(INITIAL_ADRIANO_COMMISSIONS);
    try {
      await fetch('/api/admin/commissions-adriano', { method: 'PATCH' });
    } catch {}
    showToast('Planilhas originais restauradas com sucesso!', 'success');
  };

  // Exportar para CSV
  const handleExportCSV = () => {
    const headers = [
      'Mês', 'Item Acordo', 'Valor Base', 'Valor Alcançado', 'Diferença', '% Acordo', 'Comissão Acordo',
      'Rede Social', 'Valor Nota RS', 'Nº NF', 'Acessoria RS', 'Total Mês', 'Status'
    ];

    const rows: string[][] = [];

    months.forEach(m => {
      const maxRows = Math.max(m.acordo.length, m.redes_sociais.length, 1);
      for (let i = 0; i < maxRows; i++) {
        const ac = m.acordo[i];
        const rs = m.redes_sociais[i];

        rows.push([
          `"${m.mes}"`,
          ac ? `"${i + 1}"` : '""',
          ac ? `"${ac.valor_base.toFixed(2).replace('.', ',')}"` : '""',
          ac ? `"${ac.valor_alcancado.toFixed(2).replace('.', ',')}"` : '""',
          ac ? `"${ac.diferenca.toFixed(2).replace('.', ',')}"` : '""',
          ac ? `"${(ac.percentual * 100).toFixed(1).replace('.', ',')}%"` : '""',
          ac ? `"${ac.comissao.toFixed(2).replace('.', ',')}"` : '""',
          rs ? `"${rs.rede}"` : '""',
          rs ? `"${rs.valor_nota.toFixed(2).replace('.', ',')}"` : '""',
          rs ? `"${rs.numero_nf}"` : '""',
          rs ? `"${rs.acessoria.toFixed(2).replace('.', ',')}"` : '""',
          i === 0 ? `"${m.total_comissao.toFixed(2).replace('.', ',')}"` : '""',
          i === 0 ? `"${m.pago ? 'Pago' : 'Pendente'}"` : '""'
        ]);
      }
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `comissoes_adriano_nascimento_${new Date().getFullYear()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Planilha CSV gerada com sucesso!', 'success');
  };

  // Imprimir ou gerar PDF
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-sm font-bold border backdrop-blur-md ${
              toastMessage.type === 'error'
                ? 'bg-rose-500/90 text-white border-rose-600'
                : toastMessage.type === 'info'
                  ? 'bg-blue-600/90 text-white border-blue-700'
                  : 'bg-emerald-600/90 text-white border-emerald-700'
            }`}
          >
            {toastMessage.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
            <span>{toastMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Security & User Identification Banner */}
      <div className={`p-4 md:p-5 rounded-3xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
        isDarkMode 
          ? 'bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border-emerald-800/40' 
          : 'bg-gradient-to-r from-emerald-50 via-white to-emerald-50/40 border-emerald-200 shadow-sm'
      }`}>
        <div className="flex items-center gap-3.5">
          <div className="size-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-lg shadow-emerald-600/25 shrink-0">
            <ShieldCheck size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base md:text-lg font-black tracking-tight text-slate-900 dark:text-white">
                Comissões &bull; Adriano Nascimento
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25">
                Espaço Exclusivo
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
              <Lock size={12} className="text-emerald-500" />
              <span>Visualização restrita ao usuário: <strong>adrianonascimentu@gmail.com</strong></span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Switcher */}
          <div className={`p-1 rounded-xl border flex items-center ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'cards' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <LayoutGrid size={14} />
              <span>Planilhas Mensais</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'table' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <TableIcon size={14} />
              <span>Tabela Geral</span>
            </button>
            <button
              onClick={() => setViewMode('chart')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'chart' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BarChart3 size={14} />
              <span>Evolução</span>
            </button>
          </div>

          <button
            onClick={handleReset}
            title="Restaurar valores originais da planilha"
            className={`p-2 rounded-xl border transition-colors ${
              isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white' : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
            }`}
          >
            <RotateCcw size={16} />
          </button>

          <button
            onClick={handleExportCSV}
            title="Exportar Planilha CSV"
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-colors ${
              isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Download size={14} className="text-emerald-500" />
            <span className="hidden sm:inline">CSV</span>
          </button>

          <button
            onClick={handlePrint}
            title="Imprimir Resumo"
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-colors ${
              isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Printer size={14} className="text-blue-500" />
            <span className="hidden sm:inline">Imprimir</span>
          </button>
        </div>
      </div>

      {/* Executive Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className={`p-4 rounded-3xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Líquido Anual</span>
            {metrics.totalComissoes >= 0 ? (
              <TrendingUp size={16} className="text-emerald-500" />
            ) : (
              <TrendingDown size={16} className="text-rose-500" />
            )}
          </div>
          <p className={`text-xl font-black mt-2 tracking-tight ${
            metrics.totalComissoes >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
          }`}>
            {formatCurrencyBRL(metrics.totalComissoes)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Saldo consolidado (12 meses)</p>
        </div>

        <div className={`p-4 rounded-3xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Faturamento Alcançado</span>
            <Sparkles size={16} className="text-blue-500" />
          </div>
          <p className="text-xl font-black mt-2 tracking-tight text-slate-900 dark:text-white">
            {formatCurrencyBRL(metrics.totalAlcancado)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Soma de vendas alcançadas no ano</p>
        </div>

        <div className={`p-4 rounded-3xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Desempenho por Mês</span>
            <Calendar size={16} className="text-amber-500" />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black text-xs">
              {metrics.mesesPositivosCount} Positivos
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 font-black text-xs">
              {metrics.mesesNegativosCount} Negativos
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5">Média mensal: {formatCurrencyBRL(metrics.mediaMensal)}</p>
        </div>

        <div className={`p-4 rounded-3xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Redes Sociais (Acessoria)</span>
            <Share2 size={16} className="text-purple-500" />
          </div>
          <p className="text-xl font-black mt-2 tracking-tight text-purple-600 dark:text-purple-400">
            {formatCurrencyBRL(metrics.totalAcessoriaRedes)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Google Ads / Facebook (Agosto: NF 38742348)</p>
        </div>
      </div>

      {/* Filter Tabs (Meses Positivos / Negativos / Pagos) */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {[
            { id: 'all', label: 'Todos os Meses (12)' },
            { id: 'positive', label: `Comissão Positiva (${metrics.mesesPositivosCount})` },
            { id: 'negative', label: `Comissão Negativa (${metrics.mesesNegativosCount})` },
            { id: 'paid', label: `Quitados (${metrics.countPagas})` },
            { id: 'pending', label: `Pendentes (${metrics.countPendentes})` }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                selectedFilter === tab.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : isDarkMode
                  ? 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <span className="text-[11px] font-medium text-slate-400">
          Exibindo {filteredMonths.length} de {months.length} meses
        </span>
      </div>

      {/* VIEW MODE 1: MONTH SPREADSHEET CARDS (IDENTICAL TO PHOTO) */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredMonths.map((m) => {
            const isNegative = m.total_comissao < 0;

            return (
              <div 
                key={m.id}
                className={`rounded-2xl border overflow-hidden transition-all duration-200 shadow-sm ${
                  isDarkMode 
                    ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700' 
                    : 'bg-white border-slate-200/90 hover:border-slate-300'
                }`}
              >
                {/* Header: Green Banner like in the spreadsheet */}
                <div className="bg-[#b4d79e] dark:bg-[#2e5425] text-slate-900 dark:text-emerald-100 font-bold px-4 py-2 border-b border-[#9ec486] dark:border-[#24421d] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase tracking-wider font-mono opacity-80">
                      Mês #{m.mes_numero.toString().padStart(2, '0')}
                    </span>
                    <span className="text-base font-black tracking-tight">{m.mes}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTogglePago(m.id)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all ${
                        m.pago
                          ? 'bg-emerald-800 text-white dark:bg-emerald-300 dark:text-slate-950'
                          : 'bg-amber-600/90 text-white dark:bg-amber-400 dark:text-slate-950'
                      }`}
                      title={m.pago ? `Pago em ${m.data_pagamento || '-'}` : 'Marcar como pago'}
                    >
                      {m.pago ? 'Quitado' : 'Pendente'}
                    </button>

                    <button
                      onClick={() => handleOpenEdit(m)}
                      className="p-1 rounded bg-black/10 hover:bg-black/20 dark:bg-white/10 dark:hover:bg-white/20 transition-colors text-slate-900 dark:text-white"
                      title="Editar dados deste mês"
                    >
                      <Edit2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Sub-header 1: Acordo de comissão */}
                <div className="bg-[#d9ead3] dark:bg-[#1f3d1b] text-slate-800 dark:text-emerald-200 text-[11px] font-bold text-center py-1 border-b border-[#c2ddbb] dark:border-[#1a3317]">
                  Acordo de comissão
                </div>

                {/* Table: Acordo de comissão */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-[#d9ead3]/60 dark:bg-[#1a3317]/60 text-slate-700 dark:text-emerald-300 text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
                        <th className="py-1 px-2.5">Valor Base</th>
                        <th className="py-1 px-2.5">Valor Alcançado</th>
                        <th className="py-1 px-2.5">Diferença</th>
                        <th className="py-1 px-2 text-center">Percentual</th>
                        <th className="py-1 px-2.5 text-right">Comissão</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
                      {m.acordo.map((row) => {
                        const rowNegative = row.comissao < 0;
                        const rowDifNegative = row.diferenca < 0;

                        return (
                          <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            <td className="py-1.5 px-2.5 whitespace-nowrap font-medium text-slate-800 dark:text-slate-200">
                              {formatCurrencyBRL(row.valor_base)}
                            </td>
                            <td className="py-1.5 px-2.5 whitespace-nowrap font-medium text-slate-700 dark:text-slate-300">
                              {row.valor_alcancado > 0 ? formatCurrencyBRL(row.valor_alcancado) : 'R$ -'}
                            </td>
                            <td className={`py-1.5 px-2.5 whitespace-nowrap font-medium ${
                              rowDifNegative ? 'text-[#c00000] dark:text-rose-400 font-semibold' : 'text-slate-700 dark:text-slate-300'
                            }`}>
                              {row.diferenca !== 0 ? formatCurrencyBRL(row.diferenca) : 'R$ -'}
                            </td>
                            <td className="py-1.5 px-2 text-center whitespace-nowrap font-medium text-slate-600 dark:text-slate-400">
                              {(row.percentual * 100).toFixed(1).replace('.', ',')}%
                            </td>
                            <td className={`py-1.5 px-2.5 text-right whitespace-nowrap font-bold ${
                              rowNegative ? 'text-[#c00000] dark:text-rose-400' : 'text-slate-900 dark:text-white'
                            }`}>
                              {row.comissao !== 0 ? formatCurrencyBRL(row.comissao) : 'R$ -'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Sub-header 2: Redes Sociais */}
                <div className="bg-[#d9ead3] dark:bg-[#1f3d1b] text-slate-800 dark:text-emerald-200 text-[11px] font-bold text-center py-1 border-t border-b border-[#c2ddbb] dark:border-[#1a3317]">
                  Redes Socias
                </div>

                {/* Table: Redes Sociais */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-[#d9ead3]/60 dark:bg-[#1a3317]/60 text-slate-700 dark:text-emerald-300 text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
                        <th className="py-1 px-2.5">Rede</th>
                        <th className="py-1 px-2.5">Valor da Nota</th>
                        <th className="py-1 px-2.5">Nº NF</th>
                        <th className="py-1 px-2.5 text-center">Mês</th>
                        <th className="py-1 px-2.5 text-right">Acessoria</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
                      {m.redes_sociais.map((rs) => (
                        <tr key={rs.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-1.5 px-2.5 font-medium text-slate-800 dark:text-slate-200">
                            {rs.rede}
                          </td>
                          <td className="py-1.5 px-2.5 font-medium text-slate-700 dark:text-slate-300">
                            {rs.valor_nota > 0 ? formatCurrencyBRL(rs.valor_nota) : 'R$ -'}
                          </td>
                          <td className="py-1.5 px-2.5 font-mono">
                            {rs.numero_nf ? (
                              <span className="text-blue-600 dark:text-blue-400 font-bold underline cursor-pointer">
                                {rs.numero_nf}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-1.5 px-2.5 text-center text-slate-600 dark:text-slate-400">
                            {rs.mes}
                          </td>
                          <td className="py-1.5 px-2.5 text-right font-medium text-slate-800 dark:text-slate-200">
                            {rs.acessoria > 0 ? formatCurrencyBRL(rs.acessoria) : 'R$ -'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Footer Bar: Totais */}
                <div className="bg-[#d9ead3] dark:bg-[#1f3d1b] border-t border-[#c2ddbb] dark:border-[#1a3317] flex items-center justify-end px-3 py-1.5 gap-4">
                  <span className="text-xs font-bold text-slate-800 dark:text-emerald-200">Totais</span>
                  <span className={`text-xs font-black min-w-28 text-right px-2 py-0.5 rounded ${
                    isNegative 
                      ? 'text-[#c00000] dark:text-rose-400' 
                      : m.total_comissao > 0 
                        ? 'text-slate-900 dark:text-white font-black' 
                        : 'text-slate-700 dark:text-slate-300'
                  }`}>
                    {m.total_comissao !== 0 ? formatCurrencyBRL(m.total_comissao) : 'R$ -'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW MODE 2: CONSOLIDATED SPREADSHEET TABLE */}
      {viewMode === 'table' && (
        <div className={`rounded-3xl border overflow-hidden ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h3 className="font-bold text-sm">Resumo Consolidado Anual &bull; 12 Meses</h3>
            <span className="text-xs text-slate-500">Comissões de Adriano Nascimento</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className={`border-b font-black uppercase text-[10px] tracking-wider ${
                  isDarkMode ? 'bg-slate-800/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}>
                  <th className="py-3 px-4">Mês</th>
                  <th className="py-3 px-3">Meta Base (R$)</th>
                  <th className="py-3 px-3">Alcançado (R$)</th>
                  <th className="py-3 px-3">Diferença (R$)</th>
                  <th className="py-3 px-3">Comissão Acordo</th>
                  <th className="py-3 px-3">Acessoria Redes</th>
                  <th className="py-3 px-4 text-right">Total Comissão</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {filteredMonths.map(m => {
                  const somaAcordo = m.acordo.reduce((acc, a) => acc + (Number(a.comissao) || 0), 0);
                  const somaAlcancado = m.acordo.reduce((acc, a) => acc + (Number(a.valor_alcancado) || 0), 0);
                  const somaBase = m.acordo.reduce((acc, a) => acc + (Number(a.valor_base) || 0), 0);
                  const somaDif = m.acordo.reduce((acc, a) => acc + (Number(a.diferenca) || 0), 0);
                  const somaRedes = m.redes_sociais.reduce((acc, rs) => acc + (Number(rs.acessoria) || 0), 0);
                  const isNeg = m.total_comissao < 0;

                  return (
                    <tr 
                      key={m.id}
                      className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors ${
                        isNeg ? 'bg-rose-500/[0.02]' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {m.mes}
                      </td>
                      <td className="py-3.5 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {formatCurrencyBRL(somaBase)}
                      </td>
                      <td className="py-3.5 px-3 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                        {somaAlcancado > 0 ? formatCurrencyBRL(somaAlcancado) : 'R$ -'}
                      </td>
                      <td className={`py-3.5 px-3 whitespace-nowrap font-medium ${
                        somaDif < 0 ? 'text-[#c00000] dark:text-rose-400 font-bold' : 'text-slate-700 dark:text-slate-300'
                      }`}>
                        {somaDif !== 0 ? formatCurrencyBRL(somaDif) : 'R$ -'}
                      </td>
                      <td className={`py-3.5 px-3 whitespace-nowrap font-bold ${
                        somaAcordo < 0 ? 'text-[#c00000] dark:text-rose-400' : 'text-slate-900 dark:text-white'
                      }`}>
                        {somaAcordo !== 0 ? formatCurrencyBRL(somaAcordo) : 'R$ -'}
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap text-purple-600 dark:text-purple-400 font-semibold">
                        {somaRedes > 0 ? formatCurrencyBRL(somaRedes) : 'R$ -'}
                      </td>
                      <td className={`py-3.5 px-4 text-right whitespace-nowrap font-black text-sm ${
                        isNeg 
                          ? 'text-[#c00000] dark:text-rose-400' 
                          : m.total_comissao > 0 
                            ? 'text-emerald-600 dark:text-emerald-400' 
                            : 'text-slate-600'
                      }`}>
                        {m.total_comissao !== 0 ? formatCurrencyBRL(m.total_comissao) : 'R$ -'}
                      </td>
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleTogglePago(m.id)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 cursor-pointer transition-all ${
                            m.pago
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25'
                              : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/35'
                          }`}
                        >
                          {m.pago ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                          <span>{m.pago ? 'Quitado' : 'Pendente'}</span>
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleOpenEdit(m)}
                          className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className={`border-t font-black text-xs ${
                  isDarkMode ? 'bg-slate-800/80 text-white' : 'bg-slate-100 text-slate-900'
                }`}>
                  <td className="py-3 px-4">TOTAIS ANUAIS</td>
                  <td className="py-3 px-3">R$ 2.760.000,00</td>
                  <td className="py-3 px-3">{formatCurrencyBRL(metrics.totalAlcancado)}</td>
                  <td className="py-3 px-3">-</td>
                  <td className="py-3 px-3">-</td>
                  <td className="py-3 px-3 text-purple-600 dark:text-purple-400">{formatCurrencyBRL(metrics.totalAcessoriaRedes)}</td>
                  <td className={`py-3 px-4 text-right text-sm font-black ${
                    metrics.totalComissoes >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {formatCurrencyBRL(metrics.totalComissoes)}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* VIEW MODE 3: PERFORMANCE CHARTS */}
      {viewMode === 'chart' && (
        <div className="space-y-6">
          <div className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Faturamento Alcançado vs Metas Base (R$ 200.000 / R$ 320.000)
            </h3>
            <p className="text-xs text-slate-500 mb-6">Desempenho mensal em relação às faixas de acordo de comissão.</p>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={months.map(m => {
                    const alcancado = m.acordo.reduce((acc, a) => acc + (Number(a.valor_alcancado) || 0), 0);
                    return {
                      name: m.mes.substring(0, 3),
                      alcancado: alcancado,
                      metaBase: 200000,
                      comissao: m.total_comissao
                    };
                  })}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="name" fontSize={11} stroke={isDarkMode ? '#94a3b8' : '#64748b'} />
                  <YAxis 
                    fontSize={10} 
                    stroke={isDarkMode ? '#94a3b8' : '#64748b'} 
                    tickFormatter={(val) => `R$ ${(val / 1000).toFixed(0)}k`} 
                  />
                  <Tooltip 
                    formatter={(value: any) => formatCurrencyBRL(Number(value))}
                    contentStyle={{ 
                      borderRadius: '16px', 
                      backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
                      border: '1px solid #cbd5e1'
                    }}
                  />
                  <Legend />
                  <ReferenceLine y={200000} stroke="#f59e0b" strokeDasharray="4 4" label="Base R$ 200k" />
                  <Bar dataKey="alcancado" name="Faturamento Alcançado" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Curva de Comissões Líquidas (Positivas e Penalidades)
            </h3>
            <p className="text-xs text-slate-500 mb-6">Valores líquidos de comissão ao longo do ano.</p>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={months.map(m => ({
                    name: m.mes.substring(0, 3),
                    comissao: m.total_comissao
                  }))}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="name" fontSize={11} stroke={isDarkMode ? '#94a3b8' : '#64748b'} />
                  <YAxis 
                    fontSize={10} 
                    stroke={isDarkMode ? '#94a3b8' : '#64748b'} 
                    tickFormatter={(val) => `R$ ${val}`} 
                  />
                  <Tooltip 
                    formatter={(value: any) => formatCurrencyBRL(Number(value))}
                    contentStyle={{ 
                      borderRadius: '16px', 
                      backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
                      border: '1px solid #cbd5e1'
                    }}
                  />
                  <ReferenceLine y={0} stroke="#64748b" strokeWidth={1.5} />
                  <Line 
                    type="monotone" 
                    dataKey="comissao" 
                    name="Comissão Líquida (R$)" 
                    stroke="#10b981" 
                    strokeWidth={3} 
                    dot={{ r: 5, fill: '#10b981' }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      <AnimatePresence>
        {isModalOpen && editingMonth && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className={`relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 shadow-2xl border ${
                isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                    <Edit2 size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold">Editar Planilha de {editingMonth.mes}</h3>
                    <p className="text-xs text-slate-500">Ajuste os valores alcançados, notas de redes sociais e pagamento.</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveMonth} className="space-y-6 pt-5">
                {/* 1. Acordo de Comissão Rows */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      Acordo de Comissão ({editingMonth.acordo.length} faixas)
                    </h4>
                  </div>

                  <div className="space-y-3">
                    {editingMonth.acordo.map((row, index) => (
                      <div 
                        key={row.id}
                        className={`p-3.5 rounded-2xl border space-y-3 ${
                          isDarkMode ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Faixa #{index + 1}
                          </span>
                          <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            Comissão calculada: {formatCurrencyBRL(row.comissao)}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Valor Base (R$)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={row.valor_base}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                const updated = [...editingMonth.acordo];
                                updated[index] = { ...updated[index], valor_base: val };
                                setEditingMonth(recalculateMonth({ ...editingMonth, acordo: updated }));
                              }}
                              className="w-full h-9 px-3 rounded-xl border bg-white dark:bg-slate-900 font-medium"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Valor Alcançado (R$)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={row.valor_alcancado}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                const updated = [...editingMonth.acordo];
                                updated[index] = { ...updated[index], valor_alcancado: val };
                                setEditingMonth(recalculateMonth({ ...editingMonth, acordo: updated }));
                              }}
                              className="w-full h-9 px-3 rounded-xl border bg-white dark:bg-slate-900 font-medium"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Diferença (R$)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={row.diferenca}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                const updated = [...editingMonth.acordo];
                                updated[index] = { ...updated[index], diferenca: val };
                                setEditingMonth(recalculateMonth({ ...editingMonth, acordo: updated }));
                              }}
                              className="w-full h-9 px-3 rounded-xl border bg-white dark:bg-slate-900 font-medium"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Percentual (%)</label>
                            <input
                              type="number"
                              step="0.001"
                              value={row.percentual * 100}
                              onChange={(e) => {
                                const perc = (parseFloat(e.target.value) || 0) / 100;
                                const updated = [...editingMonth.acordo];
                                updated[index] = { ...updated[index], percentual: perc };
                                setEditingMonth(recalculateMonth({ ...editingMonth, acordo: updated }));
                              }}
                              className="w-full h-9 px-3 rounded-xl border bg-white dark:bg-slate-900 font-medium"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Redes Sociais Rows */}
                <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-purple-600 dark:text-purple-400">
                      Redes Sociais &bull; Acessoria
                    </h4>
                  </div>

                  <div className="space-y-3">
                    {editingMonth.redes_sociais.map((rs, index) => (
                      <div 
                        key={rs.id}
                        className={`p-3 rounded-2xl border grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs ${
                          isDarkMode ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Rede</label>
                          <input
                            type="text"
                            value={rs.rede}
                            onChange={(e) => {
                              const updated = [...editingMonth.redes_sociais];
                              updated[index] = { ...updated[index], rede: e.target.value };
                              setEditingMonth({ ...editingMonth, redes_sociais: updated });
                            }}
                            className="w-full h-9 px-3 rounded-xl border bg-white dark:bg-slate-900 font-medium"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Valor da Nota (R$)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={rs.valor_nota}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              const updated = [...editingMonth.redes_sociais];
                              updated[index] = { ...updated[index], valor_nota: val };
                              setEditingMonth({ ...editingMonth, redes_sociais: updated });
                            }}
                            className="w-full h-9 px-3 rounded-xl border bg-white dark:bg-slate-900 font-medium"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Nº Nota Fiscal</label>
                          <input
                            type="text"
                            placeholder="Ex: 38742348"
                            value={rs.numero_nf}
                            onChange={(e) => {
                              const updated = [...editingMonth.redes_sociais];
                              updated[index] = { ...updated[index], numero_nf: e.target.value };
                              setEditingMonth({ ...editingMonth, redes_sociais: updated });
                            }}
                            className="w-full h-9 px-3 rounded-xl border bg-white dark:bg-slate-900 font-medium"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Acessoria (R$)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={rs.acessoria}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              const updated = [...editingMonth.redes_sociais];
                              updated[index] = { ...updated[index], acessoria: val };
                              setEditingMonth(recalculateMonth({ ...editingMonth, redes_sociais: updated }));
                            }}
                            className="w-full h-9 px-3 rounded-xl border bg-white dark:bg-slate-900 font-medium"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Pagamento e Status */}
                <div className="p-4 rounded-2xl border space-y-3 bg-slate-500/5 border-slate-500/10">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Status de Pagamento</span>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(editingMonth.pago)}
                        onChange={(e) => setEditingMonth({ 
                          ...editingMonth, 
                          pago: e.target.checked,
                          data_pagamento: e.target.checked ? (editingMonth.data_pagamento || new Date().toLocaleDateString('pt-BR')) : ''
                        })}
                        className="rounded text-emerald-600 focus:ring-emerald-500 size-4"
                      />
                      <span className="text-xs font-bold">Comissão Quitada / Paga</span>
                    </label>
                  </div>

                  {editingMonth.pago && (
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Data de Pagamento</label>
                      <input
                        type="text"
                        placeholder="DD/MM/AAAA"
                        value={editingMonth.data_pagamento || ''}
                        onChange={(e) => setEditingMonth({ ...editingMonth, data_pagamento: e.target.value })}
                        className="w-full h-9 px-3 rounded-xl border bg-white dark:bg-slate-900 text-xs font-medium"
                      />
                    </div>
                  )}
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-between pt-2">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Recalculado</span>
                    <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                      {formatCurrencyBRL(editingMonth.total_comissao)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2.5 rounded-xl border text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 active:scale-95 flex items-center gap-1.5"
                    >
                      <Save size={14} />
                      <span>Salvar Mês</span>
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
