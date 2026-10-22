'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Bell,
  BellRing,
  CheckCircle2,
  Flame,
  Trophy,
  Target,
  Send,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { SalesCycleRange } from '@/lib/salesCycle';
import { registerPushNotification, getPushNotificationStatus } from '@/lib/push';
import type { MilestoneAlertRecord } from '@/app/api/sales/milestone-alerts/route';

interface SalesMilestonePushCardProps {
  cycleRange: SalesCycleRange;
  userId?: string;
  isManagerial?: boolean;
  isDarkMode?: boolean;
  compact?: boolean;
}

export function SalesMilestonePushCard({
  cycleRange,
  userId,
  isManagerial = false,
  isDarkMode = false,
  compact = false,
}: SalesMilestonePushCardProps) {
  const [pushStatus, setPushStatus] = useState<'unsupported' | 'default' | 'granted' | 'denied'>('default');
  const [alerts, setAlerts] = useState<MilestoneAlertRecord[]>([]);
  const [checking, setChecking] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const shownLocalTagsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setPushStatus(getPushNotificationStatus());
  }, []);

  const showNativeBrowserNotification = useCallback((alert: MilestoneAlertRecord) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    if (shownLocalTagsRef.current.has(alert.eventKey)) return;
    shownLocalTagsRef.current.add(alert.eventKey);

    try {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready
          .then((reg) => {
            reg.showNotification(alert.title, {
              body: alert.message,
              icon: '/icons/icon-192.png',
              badge: '/icons/icon-192.png',
              tag: alert.eventKey,
            });
          })
          .catch(() => {
            new Notification(alert.title, {
              body: alert.message,
              icon: '/icons/icon-192.png',
              tag: alert.eventKey,
            });
          });
      } else {
        new Notification(alert.title, {
          body: alert.message,
          icon: '/icons/icon-192.png',
          tag: alert.eventKey,
        });
      }
    } catch (e) {
      console.warn('Falha ao disparar notificação local do navegador:', e);
    }
  }, []);

  const evaluateMilestones = useCallback(
    async (forceResend: boolean = false) => {
      try {
        setChecking(true);
        const res = await fetch('/api/sales/milestone-alerts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            refMonth: cycleRange.refMonth,
            refYear: cycleRange.refYear,
            startDate: cycleRange.startDate,
            endDate: cycleRange.endDate,
            sellerIds: !isManagerial && userId ? [userId] : undefined,
            forceResend,
          }),
        });

        if (res.ok) {
          const json = await res.json();
          const allCycleAlerts: MilestoneAlertRecord[] = (json.alerts || []).filter(
            (a: MilestoneAlertRecord) =>
              a.refMonth === cycleRange.refMonth &&
              a.refYear === cycleRange.refYear &&
              (isManagerial || !userId || a.collaboratorId === userId)
          );
          setAlerts(allCycleAlerts);

          const newlyDispatched: MilestoneAlertRecord[] = json.newlyDispatched || [];
          newlyDispatched.forEach((alert) => {
            if (isManagerial || !userId || alert.collaboratorId === userId) {
              showNativeBrowserNotification(alert);
            }
          });

          if (forceResend) {
            setFeedbackMsg(
              newlyDispatched.length > 0
                ? `${newlyDispatched.length} alerta(s) push disparado(s) para 50%, 75% e 100%!`
                : 'Marcos verificados! Nenhum vendedor atingiu 50% neste ciclo ainda.'
            );
            setTimeout(() => setFeedbackMsg(null), 4000);
          } else if (newlyDispatched.length > 0) {
            setFeedbackMsg(
              `🔔 Novo marco atingido! ${newlyDispatched.length} notificação(ões) push enviada(s).`
            );
            setTimeout(() => setFeedbackMsg(null), 4500);
          }
        }
      } catch (err) {
        console.warn('Erro ao verificar marcos de metas:', err);
      } finally {
        setChecking(false);
      }
    },
    [
      cycleRange.refMonth,
      cycleRange.refYear,
      cycleRange.startDate,
      cycleRange.endDate,
      isManagerial,
      userId,
      showNativeBrowserNotification,
    ]
  );

  useEffect(() => {
    evaluateMilestones(false);

    const handleSalesUpdated = () => {
      evaluateMilestones(false);
    };

    window.addEventListener('daily_sales_updated', handleSalesUpdated);
    window.addEventListener('sales_results_updated', handleSalesUpdated);
    return () => {
      window.removeEventListener('daily_sales_updated', handleSalesUpdated);
      window.removeEventListener('sales_results_updated', handleSalesUpdated);
    };
  }, [evaluateMilestones]);

  const handleEnableDevicePush = async () => {
    const res = await registerPushNotification(userId);
    setPushStatus(getPushNotificationStatus());
    if (res.success) {
      setFeedbackMsg('Notificações Push ativadas neste dispositivo para marcos de 50%, 75% e 100%!');
      setTimeout(() => setFeedbackMsg(null), 4000);
    } else if (res.message) {
      setFeedbackMsg(res.message);
      setTimeout(() => setFeedbackMsg(null), 4000);
    }
  };

  const countByThreshold = (threshold: 50 | 75 | 100) => {
    const uniqueSellers = new Set(
      alerts.filter((a) => a.threshold === threshold).map((a) => a.collaboratorId)
    );
    return uniqueSellers.size;
  };

  const sellersAt50 = countByThreshold(50);
  const sellersAt75 = countByThreshold(75);
  const sellersAt100 = countByThreshold(100);

  return (
    <div
      className={`border transition-all ${
        compact ? 'p-4 rounded-2xl' : 'p-5 rounded-3xl'
      } ${
        isDarkMode
          ? 'bg-slate-900/80 border-slate-800/90'
          : 'bg-slate-50/80 border-slate-200/80'
      }`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/25 shrink-0">
            <BellRing size={16} className="stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">
                Alertas Push Automáticos (50% • 75% • 100%)
              </h4>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                  pushStatus === 'granted'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                }`}
              >
                {pushStatus === 'granted' ? 'Push Ativo' : 'Push Pendente'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Notifica automaticamente os vendedores ao atingirem 50%, 75% e 100% da meta mensal ({cycleRange.shortLabel})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {pushStatus !== 'granted' && (
            <button
              type="button"
              onClick={handleEnableDevicePush}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-extrabold transition-all cursor-pointer shadow-2xs active:scale-95"
            >
              <Bell size={12} />
              <span>Ativar Push</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => evaluateMilestones(true)}
            disabled={checking}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-extrabold transition-all cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
            title="Verificar atingimento de 50%, 75% e 100% e reenviar alertas Push aos vendedores"
          >
            <Send size={12} />
            <span>{checking ? 'Verificando...' : 'Disparar Alertas Push'}</span>
          </button>
        </div>
      </div>

      {feedbackMsg && (
        <div className="mb-3 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 size={14} className="shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Three Milestone Tier Cards: 50%, 75%, 100% */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {/* 50% Milestone */}
        <div
          className={`p-3 rounded-2xl border flex items-center justify-between gap-2.5 ${
            sellersAt50 > 0
              ? 'bg-amber-500/10 border-amber-500/30 dark:bg-amber-950/30'
              : isDarkMode
              ? 'bg-slate-950/60 border-slate-800'
              : 'bg-white border-slate-200/80'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Target size={16} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
                Marco 50% da Meta
              </span>
              <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100 truncate block">
                {sellersAt50 > 0
                  ? `${sellersAt50} ${sellersAt50 === 1 ? 'vendedor notificado' : 'vendedores notificados'}`
                  : 'Monitorando 50%'}
              </span>
            </div>
          </div>
          {sellersAt50 > 0 && (
            <CheckCircle2 size={16} className="text-amber-500 shrink-0" />
          )}
        </div>

        {/* 75% Milestone */}
        <div
          className={`p-3 rounded-2xl border flex items-center justify-between gap-2.5 ${
            sellersAt75 > 0
              ? 'bg-blue-500/10 border-blue-500/30 dark:bg-blue-950/30'
              : isDarkMode
              ? 'bg-slate-950/60 border-slate-800'
              : 'bg-white border-slate-200/80'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Flame size={16} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
                Marco 75% da Meta
              </span>
              <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100 truncate block">
                {sellersAt75 > 0
                  ? `${sellersAt75} ${sellersAt75 === 1 ? 'vendedor notificado' : 'vendedores notificados'}`
                  : 'Monitorando 75%'}
              </span>
            </div>
          </div>
          {sellersAt75 > 0 && (
            <CheckCircle2 size={16} className="text-blue-500 shrink-0" />
          )}
        </div>

        {/* 100% Milestone */}
        <div
          className={`p-3 rounded-2xl border flex items-center justify-between gap-2.5 ${
            sellersAt100 > 0
              ? 'bg-emerald-500/10 border-emerald-500/30 dark:bg-emerald-950/30'
              : isDarkMode
              ? 'bg-slate-950/60 border-slate-800'
              : 'bg-white border-slate-200/80'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Trophy size={16} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                Marco 100% (Meta Batida)
              </span>
              <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100 truncate block">
                {sellersAt100 > 0
                  ? `${sellersAt100} ${sellersAt100 === 1 ? 'vendedor notificado' : 'vendedores notificados'}`
                  : 'Monitorando 100%'}
              </span>
            </div>
          </div>
          {sellersAt100 > 0 && (
            <Sparkles size={16} className="text-emerald-500 shrink-0" />
          )}
        </div>
      </div>

      {/* Recent Dispatched Milestone Alerts List */}
      {alerts.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-800/80 space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <span className="flex items-center gap-1">
              <Volume2 size={12} className="text-emerald-500" />
              Últimos Alertas Push Enviados no Ciclo ({cycleRange.shortLabel})
            </span>
            <span>{alerts.length} disparo(s)</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {alerts.slice(0, 6).map((alert) => (
              <span
                key={alert.id}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border ${
                  alert.threshold === 100
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                    : alert.threshold === 75
                    ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20'
                    : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'
                }`}
                title={alert.message}
              >
                <span>
                  {alert.threshold === 100 ? '🏆' : alert.threshold === 75 ? '🔥' : '🎯'}
                </span>
                <span>{alert.sellerName}</span>
                <span className="font-black">({alert.threshold}% • {alert.percentage.toFixed(1)}%)</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
