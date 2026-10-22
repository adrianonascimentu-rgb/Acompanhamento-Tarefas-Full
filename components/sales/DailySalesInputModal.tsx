'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  X, Calendar, DollarSign, Users, CheckCircle2, AlertCircle, 
  TrendingUp, Sparkles, Building, ShoppingBag, Clock, History, 
  Edit3, Trash2, ArrowRight, RotateCcw, Save, ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '@/lib/supabase';
import { useRole } from '@/hooks/useRole';
import { getDefaultSalesCycleForDate } from '@/lib/salesCycle';

interface DailySalesInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
  initialDate?: string; // YYYY-MM-DD
}

interface SellerInput {
  collaborator_id: string;
  name: string;
  sales_amount: string; // string for input control
  orders_count: string;
  store: string;
  notes: string;
}

export function DailySalesInputModal({
  isOpen,
  onClose,
  onSaved,
  initialDate
}: DailySalesInputModalProps) {
  const { user, role, isAdmin, isGerente, isSupervisor } = useRole();

  // Selected date (defaults to today in local time)
  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getYesterdayString = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [selectedDate, setSelectedDate] = useState<string>(initialDate || getTodayString());
  const [activeTab, setActiveTab] = useState<'entry' | 'history'>('entry');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sellers and input states
  const [sellers, setSellers] = useState<any[]>([]);
  const [sellerInputs, setSellerInputs] = useState<Record<string, SellerInput>>({});
  
  // History states
  const [monthHistory, setMonthHistory] = useState<Record<string, { total: number; sellers_count: number; orders: number }>>({});
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);

  // Check permissions: Admin, Gerente, Supervisor
  const isManagerial = isAdmin || isGerente || isSupervisor || role === 'admin' || role === 'gerente' || role === 'supervisor';

  // Fetch all sellers from profiles
  const loadSellersAndExistingData = useCallback(async (targetDate: string) => {
    try {
      setLoading(true);
      setErrorMessage(null);

      // 1. Fetch eligible sellers
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, type, can_access_sales, avatar_url')
        .or('type.eq.vendedor,can_access_sales.eq.true')
        .order('name');

      if (profilesError && profilesError.code !== 'PGRST116') {
        console.warn('Erro ao carregar vendedores:', profilesError);
      }

      const activeSellers = (profiles && profiles.length > 0) ? profiles : [
        { id: '1', name: 'Adriano Nascimento', type: 'vendedor' },
        { id: '2', name: 'Carlos Eduardo', type: 'vendedor' },
        { id: '3', name: 'Mariana Silva', type: 'vendedor' },
        { id: '4', name: 'Roberto Santos', type: 'vendedor' }
      ];

      setSellers(activeSellers);

      // 2. Fetch existing daily entries for this specific date
      let existingEntries: any[] = [];
      try {
        const res = await fetch(`/api/sales/daily?date=${targetDate}`);
        if (res.ok) {
          const json = await res.json();
          existingEntries = json.entries || [];
        }
      } catch (e) {
        console.warn('Falha ao consultar API de vendas diárias:', e);
      }

      // Initialize inputs map
      const inputsMap: Record<string, SellerInput> = {};
      activeSellers.forEach((seller) => {
        const found = existingEntries.find((e: any) => e.collaborator_id === seller.id);
        inputsMap[seller.id] = {
          collaborator_id: seller.id,
          name: seller.name,
          sales_amount: found && Number(found.sales_amount) > 0 ? String(found.sales_amount) : '',
          orders_count: found && found.orders_count ? String(found.orders_count) : '',
          store: found?.store || 'Loja Principal',
          notes: found?.notes || ''
        };
      });

      setSellerInputs(inputsMap);
    } catch (err: any) {
      console.error('Erro geral ao carregar dados diários:', err);
      setErrorMessage('Não foi possível carregar os vendedores.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch sales cycle history (26th to 25th)
  const loadMonthHistory = useCallback(async (targetDate: string) => {
    try {
      setHistoryLoading(true);
      const parsed = new Date(targetDate + 'T12:00:00Z');
      const cycle = getDefaultSalesCycleForDate(parsed);

      const res = await fetch(`/api/sales/daily?startDate=${cycle.startDate}&endDate=${cycle.endDate}`);
      if (res.ok) {
        const json = await res.json();
        setMonthHistory(json.days_summary || {});
      }
    } catch (e) {
      console.warn('Erro ao carregar histórico do ciclo:', e);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadSellersAndExistingData(selectedDate);
      loadMonthHistory(selectedDate);
      setSuccessMessage(null);
    }
  }, [isOpen, selectedDate, loadSellersAndExistingData, loadMonthHistory]);

  // Handle amount change
  const handleAmountChange = (sellerId: string, val: string) => {
    // Keep numbers and commas/dots
    const cleaned = val.replace(/[^0-9.,]/g, '');
    setSellerInputs(prev => ({
      ...prev,
      [sellerId]: {
        ...prev[sellerId],
        sales_amount: cleaned,
        // Auto default 1 order if none set and amount entered
        orders_count: prev[sellerId]?.orders_count || (cleaned ? '1' : '')
      }
    }));
  };

  const handleOrdersChange = (sellerId: string, val: string) => {
    const cleaned = val.replace(/[^0-9]/g, '');
    setSellerInputs(prev => ({
      ...prev,
      [sellerId]: {
        ...prev[sellerId],
        orders_count: cleaned
      }
    }));
  };

  const handleNotesChange = (sellerId: string, val: string) => {
    setSellerInputs(prev => ({
      ...prev,
      [sellerId]: {
        ...prev[sellerId],
        notes: val
      }
    }));
  };

  const handleQuickAdd = (sellerId: string, addAmount: number) => {
    const current = parseFloat((sellerInputs[sellerId]?.sales_amount || '0').replace(',', '.')) || 0;
    const newVal = (current + addAmount).toFixed(2);
    setSellerInputs(prev => ({
      ...prev,
      [sellerId]: {
        ...prev[sellerId],
        sales_amount: newVal,
        orders_count: prev[sellerId]?.orders_count || '1'
      }
    }));
  };

  const handleSetZero = (sellerId: string) => {
    setSellerInputs(prev => ({
      ...prev,
      [sellerId]: {
        ...prev[sellerId],
        sales_amount: '0',
        orders_count: '0'
      }
    }));
  };

  const handleFillEmptyAsZero = () => {
    setSellerInputs(prev => {
      const copy = { ...prev };
      Object.keys(copy).forEach(id => {
        if (!copy[id].sales_amount || copy[id].sales_amount.trim() === '') {
          copy[id] = {
            ...copy[id],
            sales_amount: '0',
            orders_count: '0'
          };
        }
      });
      return copy;
    });
  };

  // Summary KPIs for current inputs
  const currentSummary = useMemo(() => {
    let totalSales = 0;
    let totalOrders = 0;
    let sellersWithSales = 0;

    Object.values(sellerInputs).forEach((input) => {
      const amount = parseFloat((input.sales_amount || '0').replace(',', '.')) || 0;
      const orders = parseInt(input.orders_count || '0', 10) || 0;

      if (amount > 0) {
        totalSales += amount;
        sellersWithSales += 1;
      }
      totalOrders += orders;
    });

    const avgTicket = totalOrders > 0 ? totalSales / totalOrders : 0;

    return {
      totalSales,
      totalOrders,
      sellersWithSales,
      avgTicket,
      totalSellers: sellers.length
    };
  }, [sellerInputs, sellers]);

  // Save handler
  const handleSave = async () => {
    try {
      setSaving(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      // Build payload entries
      const entriesToSubmit = Object.values(sellerInputs).map(input => {
        const parsedAmount = parseFloat((input.sales_amount || '0').replace(',', '.')) || 0;
        const parsedOrders = parseInt(input.orders_count || '0', 10) || (parsedAmount > 0 ? 1 : 0);
        return {
          collaborator_id: input.collaborator_id,
          seller_name: input.name,
          sales_amount: parsedAmount,
          orders_count: parsedOrders,
          store: input.store || 'Loja Principal',
          notes: input.notes || ''
        };
      });

      const response = await fetch('/api/sales/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          entries: entriesToSubmit,
          created_by: user?.id,
          created_by_name: user?.name || role || 'Gestão'
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao salvar os lançamentos');
      }

      setSuccessMessage(`Resultado de vendas do dia ${formatDateDisplay(selectedDate)} registrado com sucesso!`);

      // Trigger updates across application
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('daily_sales_updated', {
          detail: { date: selectedDate, total: currentSummary.totalSales }
        }));
        window.dispatchEvent(new CustomEvent('sales_results_updated'));
      }

      // Refresh month history
      loadMonthHistory(selectedDate);

      if (onSaved) {
        onSaved();
      }

      // Auto close after 1.8s
      setTimeout(() => {
        onClose();
      }, 1800);

    } catch (err: any) {
      console.error('Erro ao salvar vendas diárias:', err);
      setErrorMessage(err?.message || 'Falha ao salvar as vendas diárias.');
    } finally {
      setSaving(false);
    }
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800/80 bg-gradient-to-r from-emerald-600/10 via-teal-600/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-lg shadow-emerald-600/20 shrink-0">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Lançamento Diário de Vendas
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                  <ShieldCheck size={12} />
                  Gestão Comercial
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Informe o resultado diário de cada vendedor para atualizar o progresso de metas em tempo real
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
            title="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Date Selector & Mode Tabs */}
        <div className="p-4 sm:px-6 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Quick Date Selectors */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1 mr-1">
              <Clock size={13} />
              Data:
            </span>

            <button
              type="button"
              onClick={() => setSelectedDate(getTodayString())}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedDate === getTodayString()
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              Hoje ({formatDateDisplay(getTodayString()).slice(0, 5)})
            </button>

            <button
              type="button"
              onClick={() => setSelectedDate(getYesterdayString())}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedDate === getYesterdayString()
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              Ontem
            </button>

            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
              />
            </div>
          </div>

          {/* Tab selector */}
          <div className="flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-xl self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveTab('entry')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'entry'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Edit3 size={13} />
              <span>Lançamento</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <History size={13} />
              <span>Dias do Mês ({Object.keys(monthHistory).length})</span>
            </button>
          </div>
        </div>

        {/* Live Daily KPI Summary Card */}
        {activeTab === 'entry' && (
          <div className="p-4 sm:px-6 bg-emerald-500/5 dark:bg-emerald-950/20 border-b border-emerald-500/10 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white/80 dark:bg-slate-900/80 p-3 rounded-2xl border border-emerald-200/50 dark:border-emerald-900/30">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 block">
                Total do Dia ({formatDateDisplay(selectedDate)})
              </span>
              <p className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                R$ {currentSummary.totalSales.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>

            <div className="bg-white/80 dark:bg-slate-900/80 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 block">
                Vendedores c/ Venda
              </span>
              <p className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-200 tabular-nums">
                {currentSummary.sellersWithSales} <span className="text-xs font-normal text-slate-400">/ {currentSummary.totalSellers}</span>
              </p>
            </div>

            <div className="bg-white/80 dark:bg-slate-900/80 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 block">
                Pedidos / Vendas
              </span>
              <p className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-200 tabular-nums">
                {currentSummary.totalOrders} <span className="text-xs font-normal text-slate-400">pedidos</span>
              </p>
            </div>

            <div className="bg-white/80 dark:bg-slate-900/80 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 block">
                Ticket Médio Dia
              </span>
              <p className="text-base sm:text-lg font-black text-blue-600 dark:text-blue-400 tabular-nums">
                R$ {currentSummary.avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        )}

        {/* Feedback messages */}
        <AnimatePresence>
          {successMessage && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-3 mx-4 sm:mx-6 mt-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2"
            >
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </motion.div>
          )}

          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-3 mx-4 sm:mx-6 mt-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-bold flex items-center gap-2"
            >
              <AlertCircle size={16} className="text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {activeTab === 'entry' ? (
            <>
              {/* Batch Actions Bar */}
              <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Lista de Vendedores da Equipe ({sellers.length})
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleFillEmptyAsZero}
                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                    title="Preenche R$ 0 nos vendedores que ainda estão em branco"
                  >
                    Zerar Não Preenchidos
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="space-y-3 py-6">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-20 bg-slate-100 dark:bg-slate-800/60 rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : sellers.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Users size={36} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-bold">Nenhum vendedor encontrado com permissão de vendas.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sellers.map((seller, index) => {
                    const inputState = sellerInputs[seller.id] || {
                      collaborator_id: seller.id,
                      name: seller.name,
                      sales_amount: '',
                      orders_count: '',
                      store: 'Loja Principal',
                      notes: ''
                    };
                    const numericVal = parseFloat((inputState.sales_amount || '0').replace(',', '.')) || 0;
                    const hasValue = numericVal > 0;

                    return (
                      <div
                        key={seller.id}
                        className={`p-3 sm:p-4 rounded-2xl border transition-all ${
                          hasValue
                            ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300/60 dark:border-emerald-800/60 shadow-xs'
                            : 'bg-white dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                          {/* Seller Identity */}
                          <div className="flex items-center gap-3 min-w-[180px]">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold flex items-center justify-center shrink-0 shadow-xs text-xs">
                              {seller.name?.charAt(0)?.toUpperCase() || 'V'}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                                {seller.name}
                              </h4>
                              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                                Vendedor #{index + 1}
                              </span>
                            </div>
                          </div>

                          {/* Inputs: Amount and Orders */}
                          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap flex-1 justify-end">
                            {/* Valor Vendido */}
                            <div className="w-full sm:w-44">
                              <label className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 block mb-1">
                                Valor Vendido (R$)
                              </label>
                              <div className="relative flex items-center">
                                <span className="absolute left-3 text-xs font-bold text-slate-400">R$</span>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  placeholder="0,00"
                                  value={inputState.sales_amount}
                                  onChange={(e) => handleAmountChange(seller.id, e.target.value)}
                                  className={`w-full pl-9 pr-3 py-2 rounded-xl text-sm font-extrabold outline-none border transition-all tabular-nums ${
                                    hasValue
                                      ? 'border-emerald-500 bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/10'
                                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:border-emerald-500'
                                  }`}
                                />
                              </div>
                            </div>

                            {/* Qtd. Pedidos */}
                            <div className="w-24">
                              <label className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 block mb-1">
                                Pedidos
                              </label>
                              <input
                                type="text"
                                inputMode="numeric"
                                placeholder="0"
                                value={inputState.orders_count}
                                onChange={(e) => handleOrdersChange(seller.id, e.target.value)}
                                className="w-full px-3 py-2 rounded-xl text-sm font-bold text-center outline-none border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:border-emerald-500 tabular-nums"
                              />
                            </div>

                            {/* Observação / Destaque do dia */}
                            <div className="flex-1 min-w-[150px]">
                              <label className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 block mb-1">
                                Obs / Destaque (Opcional)
                              </label>
                              <input
                                type="text"
                                placeholder="Ex: Fechou cliente grande"
                                value={inputState.notes}
                                onChange={(e) => handleNotesChange(seller.id, e.target.value)}
                                className="w-full px-3 py-2 rounded-xl text-xs font-medium outline-none border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:border-emerald-500"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Quick Chip Buttons */}
                        <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between flex-wrap gap-1.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                              Atalhos rápidos:
                            </span>
                            <button
                              type="button"
                              onClick={() => handleQuickAdd(seller.id, 500)}
                              className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 hover:text-emerald-700 text-slate-600 dark:text-slate-400 transition-colors cursor-pointer"
                            >
                              +500
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickAdd(seller.id, 1000)}
                              className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 hover:text-emerald-700 text-slate-600 dark:text-slate-400 transition-colors cursor-pointer"
                            >
                              +1.000
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickAdd(seller.id, 2500)}
                              className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 hover:text-emerald-700 text-slate-600 dark:text-slate-400 transition-colors cursor-pointer"
                            >
                              +2.500
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickAdd(seller.id, 5000)}
                              className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 hover:text-emerald-700 text-slate-600 dark:text-slate-400 transition-colors cursor-pointer"
                            >
                              +5.000
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleSetZero(seller.id)}
                            className="text-[10px] font-bold text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                          >
                            Zerar
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            /* Month History Tab */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Histórico Diário do Mês
                  </h4>
                  <p className="text-xs text-slate-500">
                    Consulte ou selecione qualquer dia já lançado para editar os valores
                  </p>
                </div>
                <span className="text-xs font-extrabold px-3 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded-lg">
                  {Object.keys(monthHistory).length} dias com lançamento
                </span>
              </div>

              {historyLoading ? (
                <div className="text-center py-10 text-slate-400">Carregando histórico...</div>
              ) : Object.keys(monthHistory).length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Calendar size={32} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-semibold">Nenhum lançamento diário registrado neste mês ainda.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(monthHistory)
                    .sort((a, b) => b[0].localeCompare(a[0]))
                    .map(([dateKey, dayData]) => (
                      <div
                        key={dateKey}
                        onClick={() => {
                          setSelectedDate(dateKey);
                          setActiveTab('entry');
                        }}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer hover:border-emerald-500 ${
                          dateKey === selectedDate
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20'
                            : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <Calendar size={13} className="text-emerald-500" />
                            {formatDateDisplay(dateKey)}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">
                            {dayData.sellers_count} vendedores
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between">
                          <p className="text-base font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                            R$ {dayData.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                          <span className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                            Editar <ArrowRight size={12} />
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:px-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
            {isManagerial ? 'Ação autorizada para Administrador, Gerente e Supervisor' : 'Acesso de visualização'}
          </div>

          <div className="flex items-center gap-2.5 ml-auto w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            {activeTab === 'entry' && (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || loading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-extrabold shadow-md shadow-emerald-600/20 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Save size={15} />
                    <span>Salvar Vendas do Dia ({formatDateDisplay(selectedDate)})</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
