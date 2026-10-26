'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Save,
  Settings2,
  Building2,
  User,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import {
  SalesCycleRange,
  getDefaultSalesCycleForDate,
  getSalesCycleForMonthYear,
  saveSalesCycleRange,
  saveSalesCycleToSupabase,
  fetchSalesCycleFromSupabase,
  formatDateBR,
  getTodayLocalYYYYMMDD,
} from '@/lib/salesCycle';

interface SalesCycleDateSelectorProps {
  cycleRange: SalesCycleRange;
  onChange: (newRange: SalesCycleRange) => void;
  userId?: string;
  userName?: string;
  isManagerial?: boolean;
  compact?: boolean;
}

export function SalesCycleDateSelector({
  cycleRange,
  onChange,
  userId,
  userName,
  isManagerial = false,
  compact = false,
}: SalesCycleDateSelectorProps) {
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [startDayInput, setStartDayInput] = useState<number>(cycleRange.startDay || 26);
  const [endDayInput, setEndDayInput] = useState<number>(cycleRange.endDay || 25);
  const [saveScope, setSaveScope] = useState<'company' | 'user'>(isManagerial ? 'company' : 'user');
  const [saving, setSaving] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState<string | null>(null);
  const [activeScopeBadge, setActiveScopeBadge] = useState<'company' | 'user'>(
    cycleRange.scope || 'company'
  );

  useEffect(() => {
    setStartDayInput(cycleRange.startDay || 26);
    setEndDayInput(cycleRange.endDay || 25);
    if (cycleRange.scope) {
      setActiveScopeBadge(cycleRange.scope);
    }
  }, [cycleRange.startDay, cycleRange.endDay, cycleRange.scope]);

  // Load saved preference from Supabase on mount
  useEffect(() => {
    let mounted = true;
    fetchSalesCycleFromSupabase(userId).then(({ range, preference }) => {
      if (!mounted) return;
      if (preference) {
        setActiveScopeBadge(preference.scope || 'company');
        setStartDayInput(preference.startDay || 26);
        setEndDayInput(preference.endDay || 25);
        onChange(range);
      }
    });
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const triggerFeedback = (msg: string) => {
    setSavedFeedback(msg);
    setTimeout(() => {
      setSavedFeedback(null);
    }, 3200);
  };

  const handleStartDateChange = async (newStart: string) => {
    if (!newStart) return;
    const todayStr = getTodayLocalYYYYMMDD();
    let end = cycleRange.endDate;
    if (newStart > cycleRange.endDate) {
      const parsedStart = new Date(`${newStart}T12:00:00Z`);
      const autoCycle = getDefaultSalesCycleForDate(
        parsedStart,
        startDayInput || 26,
        endDayInput || 25,
        activeScopeBadge
      );
      end = autoCycle.endDate >= newStart ? autoCycle.endDate : newStart;
    }
    const isHistorical = end < todayStr;
    const updated = saveSalesCycleRange(newStart, end, activeScopeBadge, !isHistorical);
    onChange(updated);

    setSaving(true);
    await saveSalesCycleToSupabase({
      startDate: updated.startDate,
      endDate: updated.endDate,
      startDay: updated.startDay,
      endDay: updated.endDay,
      scope: isManagerial ? saveScope : 'user',
      userId,
      userName,
      autoRollover: !isHistorical,
    });
    setSaving(false);
    triggerFeedback(
      (isManagerial ? saveScope : 'user') === 'company'
        ? 'Salvo na Empresa (Supabase)'
        : 'Salvo no seu Usuário (Supabase)'
    );
  };

  const handleEndDateChange = async (newEnd: string) => {
    if (!newEnd) return;
    const todayStr = getTodayLocalYYYYMMDD();
    const start = newEnd < cycleRange.startDate ? newEnd : cycleRange.startDate;
    const isHistorical = newEnd < todayStr;
    const updated = saveSalesCycleRange(start, newEnd, activeScopeBadge, !isHistorical);
    onChange(updated);

    setSaving(true);
    await saveSalesCycleToSupabase({
      startDate: updated.startDate,
      endDate: updated.endDate,
      startDay: updated.startDay,
      endDay: updated.endDay,
      scope: isManagerial ? saveScope : 'user',
      userId,
      userName,
      autoRollover: !isHistorical,
    });
    setSaving(false);
    triggerFeedback(
      (isManagerial ? saveScope : 'user') === 'company'
        ? 'Salvo na Empresa (Supabase)'
        : 'Salvo no seu Usuário (Supabase)'
    );
  };

  const handleShiftCycle = async (deltaMonths: number) => {
    let targetMonth = cycleRange.refMonth + deltaMonths;
    let targetYear = cycleRange.refYear;
    if (targetMonth > 12) {
      targetMonth = 1;
      targetYear += 1;
    } else if (targetMonth < 1) {
      targetMonth = 12;
      targetYear -= 1;
    }
    const shifted = getSalesCycleForMonthYear(
      targetMonth,
      targetYear,
      startDayInput || 26,
      endDayInput || 25,
      activeScopeBadge
    );
    const todayStr = getTodayLocalYYYYMMDD();
    const isHistorical = shifted.endDate < todayStr;
    const updated = saveSalesCycleRange(shifted.startDate, shifted.endDate, activeScopeBadge, !isHistorical);
    onChange(updated);

    await saveSalesCycleToSupabase({
      startDate: updated.startDate,
      endDate: updated.endDate,
      startDay: startDayInput || 26,
      endDay: endDayInput || 25,
      scope: isManagerial ? saveScope : 'user',
      userId,
      userName,
      autoRollover: !isHistorical,
    });
  };

  const handleApplyStandard26To25 = async () => {
    setStartDayInput(26);
    setEndDayInput(25);
    const def = getDefaultSalesCycleForDate(new Date(), 26, 25, isManagerial ? saveScope : 'user');
    const updated = saveSalesCycleRange(def.startDate, def.endDate, def.scope);
    onChange(updated);

    setSaving(true);
    await saveSalesCycleToSupabase({
      startDate: updated.startDate,
      endDate: updated.endDate,
      startDay: 26,
      endDay: 25,
      scope: isManagerial ? saveScope : 'user',
      userId,
      userName,
    });
    setSaving(false);
    triggerFeedback('Ciclo 26 a 25 salvo no Supabase!');
  };

  const handleSaveCustomDaysRule = async () => {
    const sDay = Math.min(31, Math.max(1, Number(startDayInput) || 26));
    const eDay = Math.min(31, Math.max(1, Number(endDayInput) || 25));
    const targetScope = isManagerial ? saveScope : 'user';

    const computed = getSalesCycleForMonthYear(
      cycleRange.refMonth,
      cycleRange.refYear,
      sDay,
      eDay,
      targetScope
    );
    const updated = saveSalesCycleRange(computed.startDate, computed.endDate, targetScope);
    setActiveScopeBadge(targetScope);
    onChange(updated);

    setSaving(true);
    await saveSalesCycleToSupabase({
      startDate: updated.startDate,
      endDate: updated.endDate,
      startDay: sDay,
      endDay: eDay,
      scope: targetScope,
      userId,
      userName,
    });
    setSaving(false);
    setShowConfigPanel(false);
    triggerFeedback(
      targetScope === 'company'
        ? `Ciclo (${sDay} a ${eDay}) salvo para a Empresa!`
        : `Ciclo (${sDay} a ${eDay}) salvo para você!`
    );
  };

  return (
    <div className="space-y-2">
      {/* Main Date Picker Row */}
      <div
        className={`rounded-2xl bg-slate-50/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 shadow-2xs ${
          compact ? 'px-3.5 py-2.5' : 'p-3'
        }`}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-xs font-extrabold text-slate-800 dark:text-slate-100">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 shrink-0">
              <Calendar size={14} />
            </div>
            <span>Período do Ciclo ({cycleRange.startDay || 26} a {cycleRange.endDay || 25})</span>
          </div>

          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
              activeScopeBadge === 'company'
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                : 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20'
            }`}
            title={
              activeScopeBadge === 'company'
                ? 'Preferência global configurada para a Empresa no Supabase'
                : 'Preferência individual salva para seu usuário no Supabase'
            }
          >
            {activeScopeBadge === 'company' ? <Building2 size={10} /> : <User size={10} />}
            <span>{activeScopeBadge === 'company' ? 'Padrão Empresa' : 'Meu Ciclo'}</span>
          </span>

          {(savedFeedback || saving) && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <CheckCircle2 size={12} className="shrink-0" />
              <span>{saving ? 'Sincronizando...' : savedFeedback}</span>
            </span>
          )}
        </div>

        {/* Start and End Date Inputs + Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-950/90 px-2.5 py-1.5 rounded-xl border border-slate-200/90 dark:border-slate-700/80 shadow-2xs flex-wrap sm:flex-nowrap">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 dark:text-slate-500">
                Início:
              </span>
              <input
                type="date"
                value={cycleRange.startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="bg-transparent text-xs font-extrabold text-slate-800 dark:text-slate-100 outline-none cursor-pointer tabular-nums"
              />
            </label>

            <span className="text-slate-300 dark:text-slate-700 font-bold px-0.5">→</span>

            <label className="flex items-center gap-1.5 cursor-pointer">
              <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 dark:text-slate-500">
                Fim:
              </span>
              <input
                type="date"
                value={cycleRange.endDate}
                onChange={(e) => handleEndDateChange(e.target.value)}
                className="bg-transparent text-xs font-extrabold text-slate-800 dark:text-slate-100 outline-none cursor-pointer tabular-nums"
              />
            </label>
          </div>

          {/* Navigation & Config Trigger */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleShiftCycle(-1)}
              className="p-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer shadow-2xs"
              title="Ciclo anterior"
            >
              <ChevronLeft size={14} />
            </button>

            <button
              type="button"
              onClick={handleApplyStandard26To25}
              className="px-2.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 text-[11px] font-extrabold flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
              title="Restaurar ciclo padrão da empresa (26 de um mês a 25 do mês seguinte)"
            >
              <RotateCcw size={11} />
              <span>26 a 25</span>
            </button>

            <button
              type="button"
              onClick={() => handleShiftCycle(1)}
              className="p-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer shadow-2xs"
              title="Próximo ciclo"
            >
              <ChevronRight size={14} />
            </button>

            <button
              type="button"
              onClick={() => setShowConfigPanel((prev) => !prev)}
              className={`px-2.5 py-1.5 rounded-xl border transition-colors cursor-pointer flex items-center gap-1.5 text-[11px] font-bold shadow-2xs ${
                showConfigPanel
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
              }`}
              title="Configurar regra de dias do ciclo e salvar no Supabase (Empresa ou Usuário)"
            >
              <Settings2 size={13} />
              <span className="hidden sm:inline">Configurar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Expandable Cycle Configuration Panel (Supabase Persistence for User or Company) */}
      {showConfigPanel && (
        <div className="p-3.5 rounded-2xl bg-slate-100/95 dark:bg-slate-900/95 border border-emerald-500/30 space-y-3 shadow-sm">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Sparkles size={14} className="text-emerald-500" />
              <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                Configurar Padrão do Ciclo de Vendas (Supabase)
              </span>
            </div>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
              Ativo: {formatDateBR(cycleRange.startDate)} até {formatDateBR(cycleRange.endDate)}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-end">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1">
                Dia de Início (Mês Anterior)
              </label>
              <input
                type="number"
                min={1}
                max={31}
                value={startDayInput}
                onChange={(e) => setStartDayInput(parseInt(e.target.value, 10) || 26)}
                className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-800 dark:text-white outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1">
                Dia de Fechamento (Mês Seguinte)
              </label>
              <input
                type="number"
                min={1}
                max={31}
                value={endDayInput}
                onChange={(e) => setEndDayInput(parseInt(e.target.value, 10) || 25)}
                className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-800 dark:text-white outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1">
                Salvar Preferência Para
              </label>
              <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setSaveScope('company')}
                  disabled={!isManagerial}
                  className={`flex items-center justify-center gap-1 py-1 px-2 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                    saveScope === 'company'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                  } ${!isManagerial ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title="Define o ciclo padrão para toda a empresa"
                >
                  <Building2 size={11} />
                  <span>Empresa</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSaveScope('user')}
                  className={`flex items-center justify-center gap-1 py-1 px-2 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                    saveScope === 'user'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                  title="Salva a visualização apenas para o seu usuário"
                >
                  <User size={11} />
                  <span>Meu Usuário</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Padrão corporativo: <strong>Dia 26</strong> de um mês até <strong>Dia 25</strong> do mês seguinte.
            </span>

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={() => setShowConfigPanel(false)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={handleSaveCustomDaysRule}
                disabled={saving}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-xs transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <Save size={13} />
                <span>{saving ? 'Salvando...' : 'Salvar no Supabase'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
