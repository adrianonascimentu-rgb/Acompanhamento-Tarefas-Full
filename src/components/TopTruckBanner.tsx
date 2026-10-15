'use client';

import React, { useState, useEffect } from 'react';
import { Truck, Navigation, History, Edit3 } from 'lucide-react';
import Link from 'next/link';
import { TruckScheduleData, fetchTruckSchedule, DEFAULT_TRUCK_SCHEDULE } from '@/lib/truckSchedule';

export function TopTruckBanner() {
  const [scheduleData, setScheduleData] = useState<TruckScheduleData>(DEFAULT_TRUCK_SCHEDULE);

  useEffect(() => {
    fetchTruckSchedule().then(setScheduleData);
  }, []);

  const latest = scheduleData.history && scheduleData.history.length > 0 ? scheduleData.history[0] : null;

  return (
    <div className="w-full px-2 sm:px-4 pt-2 pb-1">
      <div className="relative overflow-hidden rounded-xl border border-blue-500/30 bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 text-white shadow-xs p-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center text-white shrink-0">
              <Truck size={14} className="animate-pulse" />
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-400 text-slate-950">
              🚚 Caminhão de Reposição
            </span>
            <div className="flex items-center gap-2 text-xs font-semibold text-white truncate">
              <span>Próximo Carro: <strong className="font-black">{scheduleData.next_arrival_date || 'Aguardando'}</strong></span>
              <span className="opacity-40 hidden sm:inline">|</span>
              <span className="opacity-95 hidden sm:inline">Último: <strong>{latest?.arrival_date || scheduleData.last_arrival_date || 'Não informado'}</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            <Link
              href="/reports/truck-history"
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1"
            >
              <History size={12} />
              <span>Histórico</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TopTruckBanner;
