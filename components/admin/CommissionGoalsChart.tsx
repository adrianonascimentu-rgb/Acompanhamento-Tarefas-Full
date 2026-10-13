'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Cell, ReferenceLine 
} from 'recharts';
import { 
  TrendingUp, Target, Award, CheckCircle2, ArrowUpRight, 
  Users, Layers, Search, BarChart3, Sparkles, ChevronRight,
  SlidersHorizontal, Check
} from 'lucide-react';
import { PartnerCommission } from '@/lib/initialCommissions';
import { CommissionTier } from './CommissionsManager';

interface CommissionGoalsChartProps {
  commissions: PartnerCommission[];
  tiers: CommissionTier[];
  isDarkMode?: boolean;
  onSelectCollaborator?: (name: string) => void;
}

const TIER_COLORS = [
  { bar: '#3b82f6', text: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  { bar: '#6366f1', text: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20' },
  { bar: '#f59e0b', text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  { bar: '#10b981', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  { bar: '#ec4899', text: 'text-pink-600 dark:text-pink-400', bg: 'bg-pink-500/10 border-pink-500/20' },
];

export default function CommissionGoalsChart({
  commissions = [],
  tiers = [],
  isDarkMode = false,
  onSelectCollaborator
}: CommissionGoalsChartProps) {
  const [mounted, setMounted] = useState(false);
  const [groupBy, setGroupBy] = useState<'parceiro' | 'vendedor'>('parceiro');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'sales_desc' | 'name' | 'progress'>('sales_desc');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sorted Tiers by minimum value
  const sortedTiers = useMemo(() => {
    return [...tiers].sort((a, b) => a.min - b.min);
  }, [tiers]);

  // Aggregate sales by collaborator (parceiro or vendedor)
  const collaboratorStats = useMemo(() => {
    const map = new Map<string, {
      name: string;
      code: string;
      totalSales: number;
      totalCommission: number;
      count: number;
    }>();

    commissions.forEach(c => {
      const key = groupBy === 'parceiro' ? (c.parceiro || 'Indefinido') : (c.vendedor || 'Indefinido');
      if (!map.has(key)) {
        map.set(key, {
          name: key,
          code: c.codigo_parceiro || '-',
          totalSales: 0,
          totalCommission: 0,
          count: 0
        });
      }
      const entry = map.get(key)!;
      entry.totalSales += Number(c.valor_venda) || 0;
      entry.totalCommission += Number(c.valor_comissao) || 0;
      entry.count += 1;
    });

    return Array.from(map.values()).map(collab => {
      // Determine which tier this collaborator reached
      let currentTierIndex = 0;
      let currentTier = sortedTiers[0] || { id: 'default', name: 'Faixa Inicial', min: 0, max: 3000, percentage: '3%' };

      sortedTiers.forEach((t, idx) => {
        if (collab.totalSales >= t.min) {
          currentTier = t;
          currentTierIndex = idx;
        }
      });

      const nextTier = currentTierIndex < sortedTiers.length - 1 ? sortedTiers[currentTierIndex + 1] : null;

      // Progress calculation to next tier
      let progressPercent = 100;
      let neededForNext = 0;

      if (nextTier) {
        const span = nextTier.min - currentTier.min;
        const currentWithinSpan = collab.totalSales - currentTier.min;
        progressPercent = Math.min(100, Math.max(0, Math.round((currentWithinSpan / span) * 100)));
        neededForNext = Math.max(0, nextTier.min - collab.totalSales);
      }

      const colorMeta = TIER_COLORS[currentTierIndex % TIER_COLORS.length];

      return {
        ...collab,
        currentTier,
        currentTierIndex,
        nextTier,
        progressPercent,
        neededForNext,
        colorMeta
      };
    });
  }, [commissions, groupBy, sortedTiers]);

  // Filtered and sorted collaborators
  const filteredCollaborators = useMemo(() => {
    return collaboratorStats.filter(c => {
      const matchesSearch = !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTier = tierFilter === 'all' || c.currentTier.id === tierFilter;
      return matchesSearch && matchesTier;
    }).sort((a, b) => {
      if (sortBy === 'sales_desc') return b.totalSales - a.totalSales;
      if (sortBy === 'progress') return b.progressPercent - a.progressPercent;
      return a.name.localeCompare(b.name);
    });
  }, [collaboratorStats, searchQuery, tierFilter, sortBy]);

  // Executive summary metrics
  const summary = useMemo(() => {
    const totalSales = collaboratorStats.reduce((acc, c) => acc + c.totalSales, 0);
    const topPerformer = [...collaboratorStats].sort((a, b) => b.totalSales - a.totalSales)[0];
    
    // Tier counts
    const tierDistribution = sortedTiers.map(t => ({
      tier: t,
      count: collaboratorStats.filter(c => c.currentTier.id === t.id).length
    }));

    return {
      totalSales,
      topPerformer,
      tierDistribution,
      totalCount: collaboratorStats.length
    };
  }, [collaboratorStats, sortedTiers]);

  // Chart data formatted for Recharts
  const chartData = useMemo(() => {
    return filteredCollaborators.map(c => ({
      name: c.name,
      vendas: c.totalSales,
      comissao: c.totalCommission,
      tierName: c.currentTier.name,
      tierPerc: c.currentTier.percentage,
      color: c.colorMeta.bar
    }));
  }, [filteredCollaborators]);

  return (
    <div className="space-y-6">
      {/* Top Banner / Goal Evolution Overview */}
      <div className={`p-6 rounded-3xl border ${
        isDarkMode 
          ? 'bg-gradient-to-br from-slate-900 via-slate-900/90 to-blue-950/20 border-slate-800' 
          : 'bg-gradient-to-br from-white via-blue-50/20 to-slate-50 border-slate-200/80 shadow-xs'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-2 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 font-bold">
                <Target size={18} />
              </span>
              <span className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Performance & Metas de Comissionamento
              </span>
            </div>
            <h3 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Evolução das Metas por Colaborador
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
              Monitore visualmente o faturamento acumulado de cada parceiro e identifique em tempo real quem atingiu ou está próximo de alcançar as faixas superiores de bonificação.
            </p>
          </div>

          {/* Group Switcher (Parceiro vs Vendedor) */}
          <div className="flex items-center gap-2 self-start lg:self-center">
            <div className={`p-1 rounded-xl border flex items-center ${
              isDarkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-100 border-slate-200'
            }`}>
              <button
                onClick={() => setGroupBy('parceiro')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  groupBy === 'parceiro' 
                    ? 'bg-blue-600 text-white shadow-xs' 
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Por Parceiro
              </button>
              <button
                onClick={() => setGroupBy('vendedor')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  groupBy === 'vendedor' 
                    ? 'bg-blue-600 text-white shadow-xs' 
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Por Vendedor
              </button>
            </div>
          </div>
        </div>

        {/* Executive Highlights Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-800/40 border-slate-700/60' : 'bg-white border-slate-200/60'}`}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Faturamento Analisado</p>
            <p className="text-lg font-black mt-1 text-slate-900 dark:text-white">
              R$ {summary.totalSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">{summary.totalCount} {groupBy === 'parceiro' ? 'parceiros' : 'vendedores'} avaliados</p>
          </div>

          <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-800/40 border-slate-700/60' : 'bg-white border-slate-200/60'}`}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Líder em Vendas</p>
            <p className="text-lg font-black mt-1 text-blue-600 dark:text-blue-400 truncate">
              {summary.topPerformer ? summary.topPerformer.name : '-'}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5 truncate">
              {summary.topPerformer ? `R$ ${summary.topPerformer.totalSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
            </p>
          </div>

          <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-800/40 border-slate-700/60' : 'bg-white border-slate-200/60'}`}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Faixas Configuradas</p>
            <p className="text-lg font-black mt-1 text-amber-500 dark:text-amber-400">
              {sortedTiers.length} Níveis
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">De {sortedTiers[0]?.percentage || '0%'} até {sortedTiers[sortedTiers.length - 1]?.percentage || '0%'}</p>
          </div>

          <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-800/40 border-slate-700/60' : 'bg-white border-slate-200/60'}`}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">No Top Tier (Premium)</p>
            <p className="text-lg font-black mt-1 text-emerald-600 dark:text-emerald-400">
              {summary.tierDistribution[summary.tierDistribution.length - 1]?.count || 0}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">Colaborador(es) na faixa máxima</p>
          </div>
        </div>

        {/* Tiers Legend Reference Bar */}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-3">
            Régua de Metas e Tiers Cadastrados
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {sortedTiers.map((t, idx) => {
              const colorMeta = TIER_COLORS[idx % TIER_COLORS.length];
              const reachedCount = collaboratorStats.filter(c => c.currentTier.id === t.id).length;
              return (
                <div 
                  key={t.id}
                  className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
                    isDarkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-white/80 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span 
                      className="size-3 rounded-full shrink-0" 
                      style={{ backgroundColor: colorMeta.bar }} 
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-black truncate text-slate-900 dark:text-white">
                        {t.name}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {t.max >= 999999 ? `Acima de R$ ${t.min.toLocaleString('pt-BR')}` : `R$ ${t.min.toLocaleString('pt-BR')} a R$ ${t.max.toLocaleString('pt-BR')}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-black text-blue-600 dark:text-blue-400 block">
                      {t.percentage}
                    </span>
                    <span className="text-[9px] text-slate-400">
                      {reachedCount} atingiram
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Interactive Controls & Filters */}
      <div className={`p-4 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-3 ${
        isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
      }`}>
        <div className="relative w-full md:w-72">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={`Buscar por ${groupBy}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-medium outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap justify-end">
          {/* Tier Filter */}
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-bold outline-none"
          >
            <option value="all">Todas as Faixas (Tiers)</option>
            {sortedTiers.map(t => (
              <option key={t.id} value={t.id}>{t.name} ({t.percentage})</option>
            ))}
          </select>

          {/* Sort Order */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-bold outline-none"
          >
            <option value="sales_desc">Maior Venda (R$)</option>
            <option value="progress">Maior Progresso de Meta</option>
            <option value="name">Nome (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Graphical Bar Chart */}
      <div className={`p-6 rounded-3xl border ${
        isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h4 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart3 size={18} className="text-blue-600" />
              Comparativo de Faturamento vs Linhas de Metas
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              As cores das barras indicam o Tier alcançado pelo colaborador. Linhas horizontais mostram as transições de faixa.
            </p>
          </div>
          <span className="text-xs font-bold text-slate-400">
            {chartData.length} colaboradores listados
          </span>
        </div>

        <div className="h-80 w-full">
          {mounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 10, bottom: 25 }}
              >
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke={isDarkMode ? '#334155' : '#f1f5f9'} 
                  vertical={false} 
                />
                <XAxis
                  dataKey="name"
                  tick={{ fill: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 11, fontWeight: 600 }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 10 }}
                  tickFormatter={(val) => `R$ ${(val / 1000).toFixed(0)}k`}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const data = payload[0].payload;
                    return (
                      <div className={`p-3 rounded-2xl shadow-xl border text-xs ${
                        isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                      }`}>
                        <p className="font-black text-sm mb-1">{data.name}</p>
                        <div className="space-y-1">
                          <p className="flex justify-between gap-4 text-slate-500">
                            <span>Vendas Totais:</span>
                            <strong className="text-slate-900 dark:text-white">
                              R$ {data.vendas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </strong>
                          </p>
                          <p className="flex justify-between gap-4 text-slate-500">
                            <span>Comissão Gerada:</span>
                            <strong className="text-purple-600 dark:text-purple-400">
                              R$ {data.comissao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </strong>
                          </p>
                          <div className="pt-1.5 mt-1.5 border-t border-slate-100 dark:border-slate-800 flex justify-between gap-4">
                            <span className="font-semibold text-blue-600 dark:text-blue-400">
                              Tier Atual:
                            </span>
                            <span className="font-black text-emerald-600 dark:text-emerald-400">
                              {data.tierName} ({data.tierPerc})
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }}
                />

                {/* Reference Lines for Tiers */}
                {sortedTiers.map((t, idx) => {
                  if (t.min === 0) return null;
                  return (
                    <ReferenceLine
                      key={t.id}
                      y={t.min}
                      stroke={TIER_COLORS[idx % TIER_COLORS.length].bar}
                      strokeDasharray="4 4"
                      label={{
                        value: `${t.name} (R$ ${t.min.toLocaleString('pt-BR')})`,
                        fill: isDarkMode ? '#94a3b8' : '#64748b',
                        fontSize: 9,
                        position: 'insideTopRight'
                      }}
                    />
                  );
                })}

                <Bar dataKey="vendas" radius={[8, 8, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
              Carregando visualização gráfica...
            </div>
          )}
        </div>
      </div>

      {/* Detailed Evolution Cards Grid per Collaborator */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
            <Award size={16} className="text-amber-500" />
            Progresso Individual das Metas ({filteredCollaborators.length})
          </h4>
          <span className="text-xs text-slate-500">
            Clique em qualquer colaborador para ver seus lançamentos
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCollaborators.map(c => {
            const isMaxTier = !c.nextTier;
            return (
              <div
                key={c.name}
                className={`p-5 rounded-3xl border transition-all flex flex-col justify-between ${
                  isDarkMode 
                    ? 'bg-slate-900 border-slate-800 hover:border-slate-700' 
                    : 'bg-white border-slate-200 shadow-xs hover:shadow-md'
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${c.colorMeta.bg} ${c.colorMeta.text}`}>
                          {c.currentTier.name}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                          {c.currentTier.percentage}
                        </span>
                      </div>
                      <h5 className="text-base font-black mt-1.5 text-slate-900 dark:text-white truncate">
                        {c.name}
                      </h5>
                      {c.code !== '-' && (
                        <p className="text-[10px] text-slate-400 font-mono">
                          Código: {c.code}
                        </p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Total Vendido</p>
                      <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                        R$ {c.totalSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar towards Next Tier */}
                  <div className="space-y-1.5 my-4">
                    <div className="flex justify-between items-center text-[11px] font-bold">
                      <span className="text-slate-500">
                        {isMaxTier ? 'Meta Máxima Atingida' : `Rumo ao ${c.nextTier?.name}`}
                      </span>
                      <span className={isMaxTier ? 'text-emerald-600 font-black' : 'text-blue-600'}>
                        {isMaxTier ? '100%' : `${c.progressPercent}%`}
                      </span>
                    </div>

                    <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${isMaxTier ? 100 : c.progressPercent}%`,
                          backgroundColor: isMaxTier ? '#10b981' : c.colorMeta.bar
                        }}
                      />
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-slate-400 pt-0.5">
                      <span>Atual: R$ {c.totalSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      <span>
                        {isMaxTier ? 'Tier Premium' : `Meta: R$ ${c.nextTier?.min.toLocaleString('pt-BR')}`}
                      </span>
                    </div>
                  </div>

                  {/* Motivational Status Text */}
                  <div className={`p-3 rounded-2xl mb-4 text-xs ${
                    isMaxTier 
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20' 
                      : (isDarkMode ? 'bg-slate-800/60 text-slate-300' : 'bg-slate-50 text-slate-600')
                  }`}>
                    {isMaxTier ? (
                      <p className="flex items-center gap-1.5 font-bold">
                        <Sparkles size={14} className="text-emerald-500 shrink-0" />
                        <span>Atingiu a faixa mais alta de comissão ({c.currentTier.percentage})!</span>
                      </p>
                    ) : (
                      <p className="flex items-center gap-1.5">
                        <ArrowUpRight size={14} className="text-blue-500 shrink-0" />
                        <span>
                          Faltam <strong>R$ {c.neededForNext.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> para subir para <strong>{c.nextTier?.name} ({c.nextTier?.percentage})</strong>.
                        </span>
                      </p>
                    )}
                  </div>

                  {/* Stats Footer */}
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <span>{c.count} vendas registradas</span>
                    <span className="font-bold text-purple-600 dark:text-purple-400">
                      R$ {c.totalCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} comissão
                    </span>
                  </div>
                </div>

                {onSelectCollaborator && (
                  <button
                    onClick={() => onSelectCollaborator(c.name)}
                    className="mt-4 w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span>Ver Lançamentos de {c.name}</span>
                    <ChevronRight size={14} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
