'use client';

import React, { useState, useMemo } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Send, 
  MessageSquare, 
  Clock, 
  Calendar, 
  Users, 
  ArrowUpRight, 
  ArrowDownRight, 
  CheckCircle2, 
  Sparkles, 
  ArrowLeftRight, 
  Zap, 
  Download,
  Filter,
  RefreshCw,
  Info,
  UserCheck
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { motion } from 'motion/react';

// Generates dynamic analytics data based on date range
function generateTrafficData(days: number) {
  const data = [];
  const now = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    
    // Day formatting
    const dayOfWeek = d.toLocaleDateString('pt-BR', { weekday: 'short' });
    const formattedDate = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;

    // Realistic volume with weekend dips and natural variability
    const baseMultiplier = isWeekend ? 0.45 : 1.0;
    const seasonalTrend = 1 + Math.sin(i * 0.4) * 0.15;
    
    const sent = Math.floor((120 + Math.random() * 85) * baseMultiplier * seasonalTrend);
    const received = Math.floor((140 + Math.random() * 95) * baseMultiplier * seasonalTrend);
    const total = sent + received;
    const responseRate = Math.min(99, Math.floor(92 + Math.random() * 7));

    data.push({
      date: formattedDate,
      fullDate: d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }),
      dayName: dayOfWeek,
      sent,
      received,
      total,
      responseRate,
      avgResponseTimeMin: (1.2 + Math.random() * 1.5).toFixed(1)
    });
  }
  return data;
}

// Peak hours distribution (08:00 to 20:00)
const HOURLY_TRAFFIC = [
  { hour: '08:00', sent: 24, received: 38 },
  { hour: '09:00', sent: 78, received: 92 },
  { hour: '10:00', sent: 145, received: 168 },
  { hour: '11:00', sent: 162, received: 184 },
  { hour: '12:00', sent: 94, received: 105 },
  { hour: '13:00', sent: 110, received: 122 },
  { hour: '14:00', sent: 175, received: 198 },
  { hour: '15:00', sent: 192, received: 215 },
  { hour: '16:00', sent: 180, received: 202 },
  { hour: '17:00', sent: 154, received: 170 },
  { hour: '18:00', sent: 88, received: 95 },
  { hour: '19:00', sent: 42, received: 48 },
];

const CATEGORY_DATA = [
  { name: 'Vendas & Negociação', value: 42, color: '#10b981' },
  { name: 'Suporte & Garantias', value: 28, color: '#6366f1' },
  { name: 'Logística & Entregas', value: 18, color: '#f59e0b' },
  { name: 'Grupos Internos / Almox.', value: 12, color: '#3b82f6' },
];

export default function WhatsAppAnalytics({ onBackToChat }: { onBackToChat?: () => void }) {
  const { isDarkMode } = useTheme();
  const [dateRange, setDateRange] = useState<7 | 14 | 30>(7);
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Generate traffic dataset for selected range
  const trafficData = useMemo(() => {
    return generateTrafficData(dateRange);
  }, [dateRange]);

  // Aggregate totals and performance metrics
  const metrics = useMemo(() => {
    const len = trafficData?.length || 1;
    const totalSent = (trafficData || []).reduce((acc, curr) => acc + curr.sent, 0);
    const totalReceived = (trafficData || []).reduce((acc, curr) => acc + curr.received, 0);
    const grandTotal = totalSent + totalReceived;
    const avgDaily = Math.round(grandTotal / len);
    const avgSentDaily = Math.round(totalSent / len);
    const avgReceivedDaily = Math.round(totalReceived / len);
    const avgResponseTime = (
      (trafficData || []).reduce((acc, curr) => acc + parseFloat(curr.avgResponseTimeMin), 0) / len
    ).toFixed(1);

    const sentRatio = Math.round((totalSent / grandTotal) * 100);
    const receivedRatio = 100 - sentRatio;

    return {
      totalSent,
      totalReceived,
      grandTotal,
      avgDaily,
      avgSentDaily,
      avgReceivedDaily,
      avgResponseTime,
      sentRatio,
      receivedRatio
    };
  }, [trafficData]);

  // Current Week KPI Metrics (highlights: total messages sent, unique contacts reached, average response time)
  const currentWeekInfo = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday...
    const distToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + distToMonday);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const formatShort = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    const weekLabel = `${formatShort(monday)} a ${formatShort(sunday)}`;

    // Use the 7 most recent days to represent the current week
    const weekSlice = (trafficData || []).slice(-7);
    const totalSent = weekSlice.reduce((acc, curr) => acc + curr.sent, 0) || 1284;
    const totalReceived = weekSlice.reduce((acc, curr) => acc + curr.received, 0) || 1412;
    
    // Unique contacts reached estimation based on inbound and outbound customer conversations
    const uniqueContacts = Math.round(weekSlice.reduce((acc, curr) => acc + Math.round(curr.received * 0.45 + curr.sent * 0.22), 0) / 2.1) || 342;
    
    // Average response time in minutes for the week
    const avgResponseTimeMin = (
      weekSlice.reduce((acc, curr) => acc + parseFloat(curr.avgResponseTimeMin), 0) / (weekSlice.length || 1)
    ).toFixed(1);

    return {
      weekLabel,
      totalSent,
      totalReceived,
      uniqueContacts,
      avgResponseTimeMin,
      dailySentAvg: Math.round(totalSent / (weekSlice.length || 7)),
      sentGrowth: '+16.8%',
      contactsGrowth: '+11.4%',
      responseTimeDelta: '-24s',
      slaComplianceRate: '98.5%'
    };
  }, [trafficData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  // Custom Chart Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className={`p-3.5 rounded-2xl shadow-xl border text-xs space-y-2 backdrop-blur-md ${
          isDarkMode 
            ? 'bg-slate-900/95 border-slate-800 text-white' 
            : 'bg-white/95 border-slate-200 text-slate-900 shadow-slate-200'
        }`}>
          <div className="flex items-center justify-between gap-4 border-b pb-1.5 border-slate-200 dark:border-slate-800">
            <span className="font-bold text-xs">{data.fullDate || label}</span>
            <span className="text-[10px] font-semibold text-slate-400 capitalize">{data.dayName}</span>
          </div>
          
          <div className="space-y-1.5 font-medium">
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-emerald-500 font-bold">
                <span className="size-2 rounded-full bg-emerald-500" />
                Enviadas:
              </span>
              <span className="font-mono font-bold">{data.sent.toLocaleString('pt-BR')}</span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-indigo-500 font-bold">
                <span className="size-2 rounded-full bg-indigo-500" />
                Recebidas:
              </span>
              <span className="font-mono font-bold">{data.received.toLocaleString('pt-BR')}</span>
            </div>

            <div className="pt-1 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 font-bold text-slate-700 dark:text-slate-200">
              <span>Total do Dia:</span>
              <span className="font-mono">{data.total.toLocaleString('pt-BR')} msgs</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`flex-1 flex flex-col h-full overflow-y-auto ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <div className="p-4 sm:p-8 max-w-7xl mx-auto w-full space-y-8">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/20">
              <BarChart3 size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight">Análise de Tráfego WhatsApp</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Em Tempo Real
                </span>
              </div>
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Monitore o volume diário de mensagens enviadas vs. recebidas e o engajamento dos clientes.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Range Selector */}
            <div className={`flex items-center p-1 rounded-xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              {[
                { label: '7 Dias', value: 7 },
                { label: '14 Dias', value: 14 },
                { label: '30 Dias', value: 30 },
              ].map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setDateRange(tab.value as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    dateRange === tab.value
                      ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                      : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`p-2.5 rounded-xl border transition-all ${
                isDarkMode 
                  ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white' 
                  : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 shadow-sm'
              }`}
              title="Recarregar Métricas"
            >
              <RefreshCw size={16} className={isRefreshing ? 'animate-spin text-emerald-500' : ''} />
            </button>

            {onBackToChat && (
              <button
                onClick={onBackToChat}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
              >
                <MessageSquare size={16} />
                <span>Voltar ao Chat</span>
              </button>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* NEW TOP KPI DASHBOARD ROW: HIGHLIGHTS FOR THE CURRENT WEEK               */}
        {/* ========================================================================= */}
        <section className="space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span>Destaques da Semana Atual</span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Semana em Curso
                </span>
              </h2>
              <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                isDarkMode 
                  ? 'bg-slate-900 border-slate-800 text-slate-300' 
                  : 'bg-white border-slate-200 text-slate-600 shadow-xs'
              }`}>
                📅 {currentWeekInfo.weekLabel}
              </span>
            </div>
            <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Métricas consolidadas de atendimento no WhatsApp de segunda a domingo
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* KPI 1: Total Messages Sent (Current Week) */}
            <motion.div 
              whileHover={{ y: -2 }}
              transition={{ duration: 0.2 }}
              className={`p-5 rounded-3xl border transition-all relative overflow-hidden flex flex-col justify-between ${
                isDarkMode 
                  ? 'bg-gradient-to-br from-slate-900 via-slate-900/90 to-emerald-950/25 border-emerald-500/30 shadow-lg shadow-emerald-950/20' 
                  : 'bg-gradient-to-br from-white via-white to-emerald-50/60 border-emerald-200/90 shadow-md shadow-emerald-500/5'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      Mensagens Enviadas
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                      Outbound
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Total disparado pela equipe na semana atual
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 shadow-xs shrink-0">
                  <Send size={20} />
                </div>
              </div>

              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white font-mono">
                    {currentWeekInfo.totalSent.toLocaleString('pt-BR')}
                  </span>
                  <span className="text-xs font-bold text-slate-400">mensagens</span>
                </div>

                <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                    <TrendingUp size={14} />
                    {currentWeekInfo.sentGrowth}
                    <span className="font-normal text-slate-400">vs. semana ant.</span>
                  </span>
                  <span className="font-medium text-slate-500 dark:text-slate-400">
                    ~{currentWeekInfo.dailySentAvg} msgs/dia
                  </span>
                </div>
              </div>
            </motion.div>

            {/* KPI 2: Unique Contacts Reached (Current Week) */}
            <motion.div 
              whileHover={{ y: -2 }}
              transition={{ duration: 0.2 }}
              className={`p-5 rounded-3xl border transition-all relative overflow-hidden flex flex-col justify-between ${
                isDarkMode 
                  ? 'bg-gradient-to-br from-slate-900 via-slate-900/90 to-sky-950/25 border-sky-500/30 shadow-lg shadow-sky-950/20' 
                  : 'bg-gradient-to-br from-white via-white to-sky-50/60 border-sky-200/90 shadow-md shadow-sky-500/5'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-black uppercase tracking-wider text-sky-600 dark:text-sky-400">
                      Contatos Únicos Alcançados
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-sky-500/15 text-sky-700 dark:text-sky-300">
                      Alcance
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Clientes & leads com interações ativas
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/25 shadow-xs shrink-0">
                  <UserCheck size={20} />
                </div>
              </div>

              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white font-mono">
                    {currentWeekInfo.uniqueContacts.toLocaleString('pt-BR')}
                  </span>
                  <span className="text-xs font-bold text-slate-400">contatos únicos</span>
                </div>

                <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 font-bold text-sky-600 dark:text-sky-400">
                    <TrendingUp size={14} />
                    {currentWeekInfo.contactsGrowth}
                    <span className="font-normal text-slate-400">novos contatos</span>
                  </span>
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 size={13} />
                    94% respondidos
                  </span>
                </div>
              </div>
            </motion.div>

            {/* KPI 3: Average Response Time (Current Week) */}
            <motion.div 
              whileHover={{ y: -2 }}
              transition={{ duration: 0.2 }}
              className={`p-5 rounded-3xl border transition-all relative overflow-hidden flex flex-col justify-between ${
                isDarkMode 
                  ? 'bg-gradient-to-br from-slate-900 via-slate-900/90 to-amber-950/25 border-amber-500/30 shadow-lg shadow-amber-950/20' 
                  : 'bg-gradient-to-br from-white via-white to-amber-50/60 border-amber-200/90 shadow-md shadow-amber-500/5'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                      Tempo Médio de Resposta
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300">
                      Agilidade
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Tempo médio até o primeiro retorno na semana
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25 shadow-xs shrink-0">
                  <Clock size={20} />
                </div>
              </div>

              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white font-mono">
                    {currentWeekInfo.avgResponseTimeMin}
                  </span>
                  <span className="text-xs font-bold text-slate-400">minutos</span>
                  <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    SLA &lt; 5 min
                  </span>
                </div>

                <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                    <Zap size={14} className="fill-emerald-500/30" />
                    {currentWeekInfo.responseTimeDelta}
                    <span className="font-normal text-slate-400">mais rápido</span>
                  </span>
                  <span className="font-medium text-slate-500 dark:text-slate-400">
                    {currentWeekInfo.slaComplianceRate} dentro do SLA
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Separator / Title for General Period Overview */}
        <div className="pt-2 flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Visão Geral do Período ({dateRange} Dias)
          </h3>
        </div>

        {/* 4 Main KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Volume */}
          <div className={`p-5 rounded-3xl border transition-all relative overflow-hidden ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Trocadas</span>
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <ArrowLeftRight size={18} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black tracking-tight">{metrics.grandTotal.toLocaleString('pt-BR')}</span>
              <span className="text-xs font-bold text-slate-400">mensagens</span>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-500 font-bold">
              <TrendingUp size={14} />
              <span>+18.4%</span>
              <span className={`font-normal ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>vs. período anterior</span>
            </div>
          </div>

          {/* Card 2: Sent Messages */}
          <div className={`p-5 rounded-3xl border transition-all relative overflow-hidden ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Enviadas (Outbound)</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Send size={18} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
                {metrics.totalSent.toLocaleString('pt-BR')}
              </span>
              <span className="text-xs font-bold text-slate-400">({metrics.sentRatio}%)</span>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
              <span className="font-semibold text-slate-700 dark:text-slate-300">{metrics.avgSentDaily}</span>
              <span>média/dia enviadas</span>
            </div>
          </div>

          {/* Card 3: Received Messages */}
          <div className={`p-5 rounded-3xl border transition-all relative overflow-hidden ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Recebidas (Inbound)</span>
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <MessageSquare size={18} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black tracking-tight text-indigo-600 dark:text-indigo-400">
                {metrics.totalReceived.toLocaleString('pt-BR')}
              </span>
              <span className="text-xs font-bold text-slate-400">({metrics.receivedRatio}%)</span>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
              <span className="font-semibold text-slate-700 dark:text-slate-300">{metrics.avgReceivedDaily}</span>
              <span>média/dia recebidas</span>
            </div>
          </div>

          {/* Card 4: Response Time & Health */}
          <div className={`p-5 rounded-3xl border transition-all relative overflow-hidden ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Tempo de Resposta</span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Clock size={18} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black tracking-tight text-amber-600 dark:text-amber-400">
                {metrics.avgResponseTime} min
              </span>
              <span className="text-xs font-bold text-emerald-500">96.8% taxa</span>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-500 font-bold">
              <CheckCircle2 size={14} />
              <span>Atendimento Ágil</span>
            </div>
          </div>
        </div>

        {/* Main Chart Section: Daily Message Volume (Enviadas vs. Recebidas) */}
        <div className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-black tracking-tight">Volume Diário: Enviadas vs. Recebidas</h2>
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Comparação de mensagens enviadas pela equipe vs. mensagens recebidas de clientes nos últimos {dateRange} dias.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Legend indicators */}
              <div className="flex items-center gap-4 text-xs font-bold">
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <span className="size-3 rounded bg-emerald-500" />
                  Enviadas
                </span>
                <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                  <span className="size-3 rounded bg-indigo-500" />
                  Recebidas
                </span>
              </div>

              {/* Chart type toggle */}
              <div className={`p-1 rounded-xl flex items-center border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
                <button
                  type="button"
                  onClick={() => setChartType('area')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    chartType === 'area'
                      ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                      : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  Área
                </button>
                <button
                  type="button"
                  onClick={() => setChartType('bar')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    chartType === 'bar'
                      ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                      : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  Barras
                </button>
              </div>
            </div>
          </div>

          {/* Recharts Area / Bar Container */}
          <div className="w-full h-80 sm:h-96">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'area' ? (
                <AreaChart data={trafficData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorReceived" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#334155' : '#e2e8f0'} vertical={false} opacity={0.6} />
                  <XAxis 
                    dataKey="date" 
                    stroke={isDarkMode ? '#64748b' : '#94a3b8'} 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis 
                    stroke={isDarkMode ? '#64748b' : '#94a3b8'} 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="sent" 
                    name="Enviadas"
                    stroke="#10b981" 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#colorSent)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="received" 
                    name="Recebidas"
                    stroke="#6366f1" 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#colorReceived)" 
                  />
                </AreaChart>
              ) : (
                <BarChart data={trafficData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#334155' : '#e2e8f0'} vertical={false} opacity={0.6} />
                  <XAxis 
                    dataKey="date" 
                    stroke={isDarkMode ? '#64748b' : '#94a3b8'} 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis 
                    stroke={isDarkMode ? '#64748b' : '#94a3b8'} 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="sent" name="Enviadas" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="received" name="Recebidas" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={32} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Secondary Visualizations: Hourly Peak & Channel Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Hourly Traffic Distribution */}
          <div className={`lg:col-span-2 p-6 rounded-3xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-base">Horários de Pico no Atendimento</h3>
                <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Concentração de mensagens ao longo do horário comercial (08h às 20h).
                </p>
              </div>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 text-xs font-bold flex items-center gap-1.5">
                <Zap size={14} />
                <span>Pico: 14h - 16h</span>
              </div>
            </div>

            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={HOURLY_TRAFFIC} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#334155' : '#e2e8f0'} vertical={false} opacity={0.6} />
                  <XAxis dataKey="hour" stroke={isDarkMode ? '#64748b' : '#94a3b8'} fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke={isDarkMode ? '#64748b' : '#94a3b8'} fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="received" name="Recebidas" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="sent" name="Enviadas" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category / Department Breakdown */}
          <div className={`p-6 rounded-3xl border flex flex-col justify-between ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
            <div>
              <h3 className="font-bold text-base mb-1">Assuntos Mais Frequentes</h3>
              <p className={`text-xs mb-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Distribuição percentual por tipo de atendimento.
              </p>

              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={CATEGORY_DATA}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={68}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {CATEGORY_DATA.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(val: any) => [`${val}%`, 'Volume']}
                      contentStyle={{
                        borderRadius: '12px',
                        border: isDarkMode ? '1px solid #334155' : '1px solid #e2e8f0',
                        backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
                        fontSize: '11px',
                        fontWeight: 'bold'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              {CATEGORY_DATA.map((cat, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="font-medium truncate max-w-[140px]">{cat.name}</span>
                  </div>
                  <span className="font-mono font-bold">{cat.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Detailed Breakdown Table */}
        <div className={`rounded-3xl border overflow-hidden ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base">Detalhamento Diário do Período</h3>
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Histórico consolidado dia a dia com taxa de resposta.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-400">{trafficData.length} registros</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className={isDarkMode ? 'bg-slate-800/50 text-slate-400' : 'bg-slate-50 text-slate-500'}>
                  <th className="p-4 font-bold uppercase tracking-wider text-[10px]">Data</th>
                  <th className="p-4 font-bold uppercase tracking-wider text-[10px]">Dia</th>
                  <th className="p-4 font-bold uppercase tracking-wider text-[10px] text-right text-emerald-600 dark:text-emerald-400">Enviadas</th>
                  <th className="p-4 font-bold uppercase tracking-wider text-[10px] text-right text-indigo-600 dark:text-indigo-400">Recebidas</th>
                  <th className="p-4 font-bold uppercase tracking-wider text-[10px] text-right">Total</th>
                  <th className="p-4 font-bold uppercase tracking-wider text-[10px] text-center">Taxa de Resposta</th>
                  <th className="p-4 font-bold uppercase tracking-wider text-[10px] text-center">Tempo Médio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {trafficData.map((row, idx) => (
                  <tr key={idx} className={`transition-colors ${isDarkMode ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/50'}`}>
                    <td className="p-4 font-mono font-bold text-slate-900 dark:text-slate-100">{row.fullDate}</td>
                    <td className="p-4 capitalize text-slate-500">{row.dayName}</td>
                    <td className="p-4 font-mono font-bold text-right text-emerald-600 dark:text-emerald-400">{row.sent.toLocaleString('pt-BR')}</td>
                    <td className="p-4 font-mono font-bold text-right text-indigo-600 dark:text-indigo-400">{row.received.toLocaleString('pt-BR')}</td>
                    <td className="p-4 font-mono font-bold text-right text-slate-900 dark:text-slate-100">{row.total.toLocaleString('pt-BR')}</td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        {row.responseRate}%
                      </span>
                    </td>
                    <td className="p-4 text-center font-mono text-slate-500">{row.avgResponseTimeMin} min</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
