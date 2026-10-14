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
  DEFAULT_TRUCK_SCHEDULE 
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
      <div className={`p-4 rounded-3xl border shadow-lg ${
        isDarkMode 
          ? 'bg-gradient-to-r from-slate-900 via-indigo-950/70 to-blue-950/70 border-indigo-500/30 text-white' 
          : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 border-blue-500/40 text-white'
      }`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shrink-0 shadow-inner">
              <Truck size={26} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 shadow-sm flex items-center gap-1">
                  <Sparkles size={11} className="fill-current" /> Caminhão de Reposição
                </span>
              </div>
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="text-xs font-medium text-white/90">Próximo Carro:</span>
                <span className="text-base font-black tracking-tight text-white">
                  {hasNextDate ? nextDateDisplay : 'Aguardando definição'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5 text-xs text-white/80 font-medium">
                <Clock size={12} className="shrink-0 text-white/60" />
                <span>Último Carro Recebido:</span>
                <strong className="font-bold text-white/95">{lastDateDisplay}</strong>
                {latest && (
                  <button
                    onClick={() => setIsDetailsModalOpen(true)}
                    className="ml-1 text-xs underline font-bold text-yellow-200 hover:text-white transition-colors cursor-pointer"
                  >
                    (Ver Detalhes)
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            <button
              onClick={() => setIsDetailsModalOpen(true)}
              className="px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 transition-all text-white text-xs font-bold flex items-center gap-1.5 border border-white/20 backdrop-blur-sm"
            >
              <Info size={14} className="text-yellow-300" />
              <span>Info Último Caminhão</span>
            </button>

            <Link
              href="/reports/truck-history"
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white text-xs font-bold flex items-center gap-1.5 border border-white/15 backdrop-blur-sm"
            >
              <History size={14} />
              <span>Histórico</span>
            </Link>

            {canEdit && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-white text-blue-700 hover:bg-white/95 active:scale-95 transition-all text-xs font-black shadow-md flex items-center gap-1.5"
              >
                <Edit3 size={14} />
                <span>Alterar Datas</span>
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
            if (res.success) {
              setScheduleData(res.data);
            }
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
