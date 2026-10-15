'use client';

import React, { useState, useEffect } from 'react';
import { Truck, Sparkles, History, Calendar, User, Package } from 'lucide-react';
import Link from 'next/link';
import { TruckScheduleData, fetchTruckSchedule, DEFAULT_TRUCK_SCHEDULE } from '@/lib/truckSchedule';

export function ReplenishmentTruckCard({ isDarkMode = false }: { isDarkMode?: boolean }) {
  const [scheduleData, setScheduleData] = useState<TruckScheduleData>(DEFAULT_TRUCK_SCHEDULE);

  useEffect(() => {
    fetchTruckSchedule().then(setScheduleData);
  }, []);

  const latest = scheduleData.history && scheduleData.history.length > 0 ? scheduleData.history[0] : null;

  return (
    <div className={`p-4 rounded-2xl border shadow-xs ${
      isDarkMode 
        ? 'bg-gradient-to-r from-slate-900 via-indigo-950/80 to-blue-950/80 border-indigo-500/30 text-white' 
        : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 border-blue-500/40 text-white'
    }`}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white">
            <Truck size={18} className="animate-pulse" />
          </div>
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-400 text-slate-950 inline-flex items-center gap-1">
              <Sparkles size={10} /> Caminhão de Reposição
            </span>
            <h3 className="text-sm font-black text-white mt-1">Status de Cargas e Chegadas de Estoque</h3>
          </div>
        </div>

        <Link
          href="/reports/truck-history"
          className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold flex items-center gap-1.5"
        >
          <History size={14} />
          <span>Ver Histórico Completo</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-2 border-t border-white/20">
        <div className="p-2.5 rounded-xl bg-white/10">
          <p className="text-[10px] font-bold uppercase opacity-80 flex items-center gap-1"><Calendar size={12} /> Próxima Chegada</p>
          <p className="text-sm font-black mt-0.5">{scheduleData.next_arrival_date || 'Aguardando agendamento'}</p>
        </div>

        <div className="p-2.5 rounded-xl bg-white/10">
          <p className="text-[10px] font-bold uppercase opacity-80 flex items-center gap-1"><Calendar size={12} /> Última Chegada</p>
          <p className="text-sm font-black mt-0.5">{latest?.arrival_date || scheduleData.last_arrival_date || 'Sem registro'}</p>
        </div>

        <div className="p-2.5 rounded-xl bg-white/10">
          <p className="text-[10px] font-bold uppercase opacity-80 flex items-center gap-1"><User size={12} /> Último Motorista</p>
          <p className="text-xs font-bold mt-0.5 truncate">{latest?.driver_name || 'Carlos Eduardo'}</p>
        </div>
      </div>
    </div>
  );
}

export default ReplenishmentTruckCard;
