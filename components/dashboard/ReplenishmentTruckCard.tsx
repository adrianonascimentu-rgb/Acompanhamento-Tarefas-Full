'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { Truck, Clock, Edit3, History, Sparkles, Info, Package } from 'lucide-react';
import { useRole } from '@/hooks/useRole';
import { supabase } from '@/lib/supabase';
import { 
  TruckScheduleData, 
  fetchTruckSchedule, 
  updateTruckSchedule, 
  DEFAULT_TRUCK_SCHEDULE,
  subscribeTruckSchedule
} from '@/lib/truckSchedule';
import { TruckScheduleModal } from '@/components/TruckScheduleModal';
import { LastTruckDetailsModal } from '@/components/LastTruckDetailsModal';
import Link from 'next/link';

interface ReplenishmentTruckCardProps {
  isDarkMode?: boolean;
}

export function ReplenishmentTruckCard({ isDarkMode = false }: ReplenishmentTruckCardProps) {
  const { role, isAdmin, user } = useRole();
  const canEdit = isAdmin || role === 'gerente' || role === 'supervisor';

  const [scheduleData, setScheduleData] = useState<TruckScheduleData>(DEFAULT_TRUCK_SCHEDULE);
  const [, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await fetchTruckSchedule();
      setScheduleData(data);
    } catch (e) {
      console.warn('Erro ao carregar agenda do caminhão:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const unsubscribe = subscribeTruckSchedule((newData) => {
      setScheduleData(newData);
    });

    const handleFocus = () => {
      loadData();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      unsubscribe();
      window.removeEventListener('focus', handleFocus);
    };
  }, [loadData]);

  const getDaysUntilArrival = (dateStr: string | null): number | null => {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr + (dateStr.includes('T') ? '' : 'T00:00:00'));
      if (isNaN(d.getTime())) return null;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const target = new Date(d);
      target.setHours(0, 0, 0, 0);
      const diffTime = target.getTime() - today.getTime();
      return Math.round(diffTime / (1000 * 60 * 60 * 24));
    } catch {
      return null;
    }
  };

  const formatFriendlyDate = (dateStr: string | null) => {
    if (!dateStr) return 'Não informada';
    try {
      const d = new Date(dateStr + (dateStr.includes('T') ? '' : 'T00:00:00'));
      if (isNaN(d.getTime())) return dateStr;
      const diffDays = getDaysUntilArrival(dateStr);
      const formatted = d.toLocaleDateString('pt-BR', { 
        weekday: 'short', 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });

      if (diffDays === 0) return `Hoje (${formatted})`;
      if (diffDays === 1) return `Amanhã (${formatted})`;
      if (diffDays === -1) return `Ontem (${formatted})`;
      if (diffDays !== null && diffDays > 1 && diffDays <= 7) return `Em ${diffDays} dias (${formatted})`;
      return formatted;
    } catch {
      return dateStr;
    }
  };

  const latest = scheduleData.history && scheduleData.history.length > 0 ? scheduleData.history[0] : null;
  const effectiveLastDate = latest?.arrival_date || scheduleData.last_arrival_date;
  const nextDateDisplay = formatFriendlyDate(scheduleData.next_arrival_date);
  const lastDateDisplay = formatFriendlyDate(effectiveLastDate);
  const hasNextDate = !!scheduleData.next_arrival_date;

  return (
    <>
      <div className={`p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border sm:border-2 shadow-xs sm:shadow-md ${
        isDarkMode 
          ? 'bg-gradient-to-r from-slate-900 via-indigo-950/70 to-blue-950/70 border-indigo-500/30 text-white' 
          : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 border-blue-500/40 text-white'
      }`}>
        <div className="flex items-center justify-between gap-1.5 sm:gap-2.5 text-xs sm:text-sm flex-nowrap min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 flex-1 overflow-hidden">
            <div className="size-6 sm:size-8 rounded-lg sm:rounded-xl bg-amber-400/25 sm:bg-white/20 border border-amber-400/50 sm:border-white/30 flex items-center justify-center text-amber-300 sm:text-white shrink-0 shadow-xs">
              <Truck size={13} className="sm:hidden animate-pulse text-amber-300" />
              <Truck size={18} className="hidden sm:inline-block animate-pulse text-white" />
            </div>
            <span className="hidden sm:inline-flex px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-400 text-slate-950 shadow-xs items-center gap-1 shrink-0">
              <Sparkles size={12} className="fill-current" /> Reposição
            </span>
            <span className="sm:hidden px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider shrink-0 bg-amber-400 text-slate-950 shadow-xs">
              Caminhão
            </span>
            <div className="flex items-center gap-1 sm:gap-2 text-[11px] sm:text-sm font-bold text-white min-w-0 truncate">
              <span className="opacity-80 shrink-0 text-[10px] sm:text-xs">Próximo:</span>
              <strong className="font-black text-white text-[11px] sm:text-base truncate">{hasNextDate ? nextDateDisplay : 'Aguardando'}</strong>
              <span className="opacity-40 hidden md:inline">|</span>
              <span className="opacity-90 text-xs hidden md:inline truncate">Último: <strong className="font-bold text-white/95">{lastDateDisplay}</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <button
              onClick={() => setIsDetailsModalOpen(true)}
              className="hidden lg:inline-flex px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 transition-all text-white text-xs font-bold cursor-pointer"
              title="Info Carga"
            >
              Info Carga
            </button>

            <Link
              href="/reports/truck-history"
              className="hidden sm:flex px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 transition-all text-white text-[11px] sm:text-xs font-bold items-center gap-1 cursor-pointer"
              title="Histórico de Cargas"
            >
              <History size={13} className="shrink-0" />
              <span className="hidden md:inline">Histórico</span>
            </Link>

            {canEdit && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-lg sm:rounded-xl bg-white text-blue-700 hover:bg-white/95 dark:bg-blue-600 dark:hover:bg-blue-500 dark:text-white dark:shadow-blue-900/40 active:scale-95 transition-all text-[11px] sm:text-xs font-black shadow-xs flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Edit3 size={12} className="shrink-0" />
                <span>Alterar</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {canEdit && (
        <TruckScheduleModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          data={scheduleData}
          onSave={async (newData: any) => {
            const res = await updateTruckSchedule({
              ...newData,
              updated_by_name: user?.name || (isAdmin ? 'Administrador' : role)
            });
            if (res.success && res.data) {
              setScheduleData(res.data);
            }
            return res;
          }}
          isDarkMode={isDarkMode}
        />
      )}

      <LastTruckDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        data={scheduleData}
        isDarkMode={isDarkMode}
      />
    </>
  );
}
