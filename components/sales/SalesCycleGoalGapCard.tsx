'use client';

import React from 'react';
import {
  Target,
  TrendingUp,
  CheckCircle2,
  Flame,
  Clock,
  Sparkles,
  CalendarPlus,
  Users,
} from 'lucide-react';
import { SalesCycleRange, getCycleDaysProgress, formatDateBR } from '@/lib/salesCycle';

interface SalesCycleGoalGapCardProps {
  cycleRange: SalesCycleRange;
  totalGoal: number;
  totalResult: number;
  todaySales?: number;
  loading?: boolean;
  isDarkMode?: boolean;
  onOpenDailySalesModal?: () => void;
  isManagerial?: boolean;
  compact?: boolean;
}

export function SalesCycleGoalGapCard({
  cycleRange,
  totalGoal,
  totalResult,
  todaySales = 0,
  loading = false,
  isDarkMode = false,
  onOpenDailySalesModal,
  isManagerial = false,
  compact = false,
}: SalesCycleGoalGapCardProps) {
  const { totalDays, elapsedDays, daysRemaining } = getCycleDaysProgress(
    cycleRange.startDate,
    cycleRange.endDate
  );

  const safeTotalDays = Math.max(1, totalDays);
  const safeElapsedDays = Math.max(1, elapsedDays);
  // Days remaining to close the goal (at least 1 if cycle is active)
  const safeRemainingDays = Math.max(1, daysRemaining);

  // 1. Monthly Cycle (26 to 25) Calculations
  // totalResult is already the sum of the values informed for the sellers in the 26-to-25 cycle
  const isMonthlyGoalReached = totalGoal > 0 && totalResult >= totalGoal;
  const monthlyRemaining = Math.max(0, totalGoal - totalResult);
  const monthlySurplus = Math.max(0, totalResult - totalGoal);
  const monthlyProgressPct =
    totalGoal > 0 ? Math.min(100, Math.max(0, (totalResult / totalGoal) * 100)) : 0;
  const monthlyMissingPct = Math.max(0, 100 - monthlyProgressPct);

  // 2. Daily Goal Calculations (based on the 26-to-25 cycle and the sellers' informed sum)
  // Ideal linear daily goal across the 26-to-25 cycle
  const idealDailyGoal = totalGoal > 0 ? totalGoal / safeTotalDays : 0;

  // Current daily average achieved by the sellers from their informed cycle sum
  const currentDailyAverage = totalResult > 0 ? totalResult / safeElapsedDays : 0;

  // Effective daily realized (uses todaySales if higher than 0, otherwise the seller's cycle daily average)
  const effectiveDailyRealized = todaySales > 0 ? todaySales : currentDailyAverage;

  // How much is needed per day in the remaining days until the 25th to reach 100% of the monthly goal
  const requiredDailyPaceRemaining =
    monthlyRemaining > 0 ? monthlyRemaining / safeRemainingDays : 0;

  // How much is missing to reach the daily goal
  const isDailyPaceOnTrack =
    totalGoal > 0 && (isMonthlyGoalReached || effectiveDailyRealized >= idealDailyGoal);
  const dailyGapToIdeal = Math.max(0, idealDailyGoal - effectiveDailyRealized);
  const dailySurplusOverIdeal = Math.max(0, effectiveDailyRealized - idealDailyGoal);

  const dailyAttainmentPct =
    idealDailyGoal > 0
      ? Math.min(100, Math.max(0, (effectiveDailyRealized / idealDailyGoal) * 100))
      : totalResult > 0
      ? 100
      : 0;

  const formatBRL = (val: number) =>
    `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div
      className={`${compact ? 'p-4 rounded-2xl' : 'p-4 sm:p-5 rounded-3xl'} border transition-all relative overflow-hidden ${
        isDarkMode
          ? 'bg-slate-900/80 border-slate-800/90'
          : 'bg-slate-50/80 border-slate-200/80'
      }`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/25 shrink-0">
            <Flame size={16} className="stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">
                Quanto Falta para Atingir a Meta Diária e Mensal
              </h4>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                Ciclo {cycleRange.startDay || 26} a {cycleRange.endDay || 25} ({cycleRange.shortLabel})
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Cálculo baseado na soma informada dos vendedores ({formatDateBR(cycleRange.startDate)} a {formatDateBR(cycleRange.endDate)})
            </p>
          </div>
        </div>

        {!compact && isManagerial && onOpenDailySalesModal && (
          <button
            type="button"
            onClick={onOpenDailySalesModal}
            className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-extrabold transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
          >
            <CalendarPlus size={13} />
            <span>Lançar / Atualizar Vendas</span>
          </button>
        )}
      </div>

      {/* Two Main Cards: 1. Meta Diária do Ciclo | 2. Meta Mensal do Ciclo (26 a 25) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* Card 1: Quanto Falta para a Meta Diária (Ciclo 26 a 25) */}
        <div
          className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 ${
            isDarkMode
              ? 'bg-slate-950/80 border-slate-800/90'
              : 'bg-white border-slate-200/80 shadow-2xs'
          }`}
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-lg border border-amber-500/20">
                <Clock size={11} />
                Meta Diária (Ciclo 26 a 25)
              </span>
              <span
                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                  isDailyPaceOnTrack
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                }`}
              >
                {loading ? '...' : `${dailyAttainmentPct.toFixed(1)}% da meta/dia`}
              </span>
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {isMonthlyGoalReached
                  ? 'Meta do Ciclo Superada (Média Diária Acima)'
                  : daysRemaining > 0
                  ? `Meta Diária Necessária nos ${daysRemaining} Dias Restantes`
                  : 'Falta para Fechar a Meta Diária do Ciclo'}
              </p>
              <div className="flex items-baseline gap-2 mt-0.5 flex-wrap">
                <p
                  className={`text-xl sm:text-2xl font-black tabular-nums tracking-tight ${
                    isMonthlyGoalReached
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {loading
                    ? 'R$ ...'
                    : isMonthlyGoalReached
                    ? `+${formatBRL(dailySurplusOverIdeal)}/dia`
                    : `${formatBRL(requiredDailyPaceRemaining)}/dia`}
                </p>
                <span className="text-[11px] font-bold text-slate-400">
                  {isMonthlyGoalReached
                    ? 'acima da meta diária'
                    : `para atingir 100% até dia ${cycleRange.endDay || 25}`}
                </span>
              </div>
            </div>
          </div>

          {/* Progress Bar for Daily Goal */}
          <div className="space-y-2 pt-1">
            <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200/60 dark:border-slate-700/60">
              <div
                style={{ width: `${dailyAttainmentPct}%` }}
                className={`h-full rounded-full transition-all duration-500 ${
                  isDailyPaceOnTrack
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                    : 'bg-gradient-to-r from-amber-500 to-orange-500'
                }`}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80 text-[11px]">
              <div>
                <span className="text-slate-400 dark:text-slate-500 block text-[10px] font-semibold">
                  Meta Diária do Ciclo ({safeTotalDays}d)
                </span>
                <span className="font-extrabold text-slate-800 dark:text-slate-200 tabular-nums">
                  {loading ? '...' : `${formatBRL(idealDailyGoal)}/dia`}
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 dark:text-slate-500 block text-[10px] font-semibold">
                  Média Diária Já Realizada ({safeElapsedDays}d)
                </span>
                <span className="font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {loading ? '...' : `${formatBRL(effectiveDailyRealized)}/dia`}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 pt-0.5">
              <span>
                {isDailyPaceOnTrack
                  ? 'Superávit diário atual sobre a meta ideal:'
                  : 'Diferença para a meta diária ideal:'}
              </span>
              <span
                className={`font-extrabold tabular-nums ${
                  isDailyPaceOnTrack
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-amber-600 dark:text-amber-400'
                }`}
              >
                {loading
                  ? '...'
                  : isDailyPaceOnTrack
                  ? `+${formatBRL(dailySurplusOverIdeal)}/dia`
                  : `Faltam ${formatBRL(dailyGapToIdeal)}/dia`}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Quanto Falta para a Meta Mensal do Ciclo (26 a 25) */}
        <div
          className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 ${
            isDarkMode
              ? 'bg-slate-950/70 border-slate-800/90'
              : 'bg-white border-slate-200/80 shadow-2xs'
          }`}
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-lg border border-blue-500/20">
                <Target size={11} />
                Meta Mensal ({cycleRange.shortLabel})
              </span>
              <span
                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                  isMonthlyGoalReached
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                    : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                }`}
              >
                {loading
                  ? '...'
                  : isMonthlyGoalReached
                  ? '100% Concluída'
                  : `Faltam ${monthlyMissingPct.toFixed(1)}%`}
              </span>
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {isMonthlyGoalReached
                  ? 'Superávit Acumulado no Ciclo (26 a 25)'
                  : 'Falta para Atingir a Meta Mensal (Ciclo 26 a 25)'}
              </p>
              <div className="flex items-baseline gap-2 mt-0.5 flex-wrap">
                <p
                  className={`text-xl sm:text-2xl font-black tabular-nums tracking-tight ${
                    isMonthlyGoalReached
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-blue-600 dark:text-blue-400'
                  }`}
                >
                  {loading
                    ? 'R$ ...'
                    : formatBRL(isMonthlyGoalReached ? monthlySurplus : monthlyRemaining)}
                </p>
                {isMonthlyGoalReached && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-500">
                    <Sparkles size={13} />
                    Meta Batida!
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Progress Bar for Monthly Cycle Goal */}
          <div className="space-y-2 pt-1">
            <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200/60 dark:border-slate-700/60">
              <div
                style={{ width: `${monthlyProgressPct}%` }}
                className={`h-full rounded-full transition-all duration-500 ${
                  isMonthlyGoalReached
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-500'
                }`}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80 text-[11px]">
              <div>
                <span className="text-slate-400 dark:text-slate-500 block text-[10px] font-semibold">
                  Soma Informada (26 a 25)
                </span>
                <span className="font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {loading ? '...' : formatBRL(totalResult)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 dark:text-slate-500 block text-[10px] font-semibold">
                  Meta Mensal do Ciclo
                </span>
                <span className="font-extrabold text-slate-800 dark:text-slate-200 tabular-nums">
                  {loading ? '...' : formatBRL(totalGoal)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 pt-0.5">
              <span>Fechamento do ciclo ({formatDateBR(cycleRange.endDate)}):</span>
              <span className="font-bold text-slate-600 dark:text-slate-300">
                {daysRemaining === 0
                  ? 'Último dia do ciclo'
                  : `${daysRemaining} ${daysRemaining === 1 ? 'dia restante' : 'dias restantes'}`}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
