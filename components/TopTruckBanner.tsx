'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { 
  Truck, 
  Clock, 
  Edit3, 
  History, 
  Sparkles,
  Navigation,
} from 'lucide-react';
import { useRole } from '@/hooks/useRole';
import { useTheme } from '@/hooks/useTheme';
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
import { usePathname } from 'next/navigation';

export function TopTruckBanner() {
  const pathname = usePathname();
  const isHomePage = pathname === '/' || pathname === '';
  const { role, isAdmin, user, isAuthenticated } = useRole();
  const { isDarkMode } = useTheme();
  
  // Apenas Administrador, Gerente ou Supervisor podem editar
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
      console.warn('Erro ao carregar dados do caminhão:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Ouvir alterações em tempo real na tabela system_settings
    const isConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://placeholder-url.supabase.co';

    if (isConfigured) {
      const channel = supabase
        .channel('public:truck-schedule-banner')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'system_settings', filter: 'key=eq.truck_replenishment_schedule' },
          (payload: any) => {
            if (payload?.new?.value) {
              setScheduleData(payload.new.value);
            } else {
              loadData();
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [loadData]);

  const handleSaveData = async (newData: any) => {
    const res = await updateTruckSchedule({
      ...newData,
      updated_by_name: user?.name || (isAdmin ? 'Administrador' : role)
    });
    if (res.success) {
      setScheduleData(res.data);
    }
  };

  // Calcular a diferença em dias entre a data do próximo carro e a data atual
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

  // Formatar datas para exibição amigável em Português
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
    } catch (e) {
      return dateStr;
    }
  };

  // Se o usuário não estiver autenticado, não renderiza o balão
  if (!isAuthenticated && !user) {
    return null;
  }

  const daysUntilArrival = getDaysUntilArrival(scheduleData.next_arrival_date);
  const latest = scheduleData.history && scheduleData.history.length > 0 ? scheduleData.history[0] : null;

  // Esquema visual dinâmico com cores confortáveis para não cansar a vista:
  // - 1 dia restante (diffDays === 1): Amarelo / Âmbar agradável
  // - Dia da chegada (diffDays === 0): Verde Esmeralda agradável
  // - Mais de 1 dia ou padrão: Azul suave
  const getBannerStyles = () => {
    if (daysUntilArrival === 0) {
      // HOJE - Verde agradável e suave
      return {
        bannerBg: isDarkMode 
          ? 'bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-900 border-emerald-500/40 text-white shadow-emerald-500/10' 
          : 'bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-600 border-emerald-400/50 text-white shadow-emerald-500/20',
        badgeBg: 'bg-emerald-300 text-slate-950',
        badgeLabel: '🚚 CHEGA HOJE!',
        buttonTextColor: 'text-emerald-800'
      };
    } else if (daysUntilArrival === 1) {
      // FALTA 1 DIA (AMANHÃ) - Amarelo/Âmbar acolhedor que não cansa a vista
      return {
        bannerBg: isDarkMode 
          ? 'bg-gradient-to-r from-amber-950 via-yellow-950 to-slate-900 border-amber-500/40 text-white shadow-amber-500/10' 
          : 'bg-gradient-to-r from-amber-600 via-amber-700 to-yellow-600 border-amber-400/50 text-white shadow-amber-500/20',
        badgeBg: 'bg-yellow-300 text-slate-950',
        badgeLabel: '⚠️ CHEGA AMANHÃ!',
        buttonTextColor: 'text-amber-900'
      };
    } else {
      // PADRÃO - Azul suave
      return {
        bannerBg: isDarkMode 
          ? 'bg-gradient-to-r from-slate-900 via-indigo-950/80 to-blue-950/80 border-indigo-500/30 text-white shadow-indigo-500/5' 
          : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 border-blue-500/40 text-white shadow-blue-500/20',
        badgeBg: 'bg-amber-400 text-slate-950',
        badgeLabel: 'Caminhão de Reposição',
        buttonTextColor: 'text-blue-700'
      };
    }
  };

  const { bannerBg, badgeBg, badgeLabel, buttonTextColor } = getBannerStyles();

  const nextDateDisplay = formatFriendlyDate(scheduleData.next_arrival_date);
  const effectiveLastDate = latest?.arrival_date || scheduleData.last_arrival_date;
  const lastDateDisplay = formatFriendlyDate(effectiveLastDate);

  const hasNextDate = !!scheduleData.next_arrival_date;

  return (
    <>
      <div className="w-full px-3 py-2 sm:px-4 sm:py-2.5">
        <motion.div
          initial={{ opacity: 0, y: -2 }}
          animate={{ opacity: 1, y: 0 }}
          className={`relative overflow-hidden rounded-2xl border-2 shadow-md transition-all duration-300 ${bannerBg}`}
        >
          <div className="relative px-3.5 py-2.5 sm:px-5 sm:py-3 flex flex-wrap items-center justify-between gap-2.5 text-xs sm:text-sm">
            {/* Esquerda: Ícone + Badge + Próximo + Último */}
            <div className="flex items-center gap-2.5 min-w-0 flex-wrap sm:flex-nowrap">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center text-white shrink-0 shadow-xs">
                <Truck size={18} className="animate-pulse text-white" />
              </div>

              <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-xs shrink-0 ${badgeBg}`}>
                {badgeLabel}
              </span>

              <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-white truncate">
                <span className="truncate">Próximo: <strong className="font-black text-white text-sm sm:text-base">{hasNextDate ? nextDateDisplay : 'Aguardando'}</strong></span>
                <span className="opacity-40 hidden sm:inline">|</span>
                <span className="opacity-95 text-xs sm:text-sm hidden sm:inline">Último: <strong className="font-black text-white/95">{lastDateDisplay}</strong></span>
              </div>
            </div>

            {/* Direita: Ações expandidas com toque ergonômico */}
            <div className="flex items-center gap-1.5 shrink-0 ml-auto sm:ml-0">
              <Link
                href="/deliveries?mode=tracking"
                className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 active:scale-95 transition-all text-white text-xs font-bold flex items-center gap-1 border border-white/30 shadow-xs cursor-pointer"
                title="Rastrear no Mapa"
              >
                <Navigation size={14} className="text-yellow-300 shrink-0" />
                <span className="hidden xs:inline">Mapa</span>
              </Link>

              {latest && (
                <button
                  type="button"
                  onClick={() => setIsDetailsModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 transition-all text-white text-xs font-bold cursor-pointer"
                  title="Ver detalhes da carga"
                >
                  Info Carga
                </button>
              )}

              <Link
                href="/reports/truck-history"
                className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 transition-all text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                title="Histórico"
              >
                <History size={14} className="shrink-0" />
                <span className="hidden md:inline">Histórico</span>
              </Link>

              {canEdit && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className={`px-3.5 py-1.5 rounded-xl bg-white ${buttonTextColor} hover:bg-white/95 active:scale-95 transition-all text-xs font-black shadow-sm flex items-center gap-1 cursor-pointer`}
                >
                  <Edit3 size={14} className="shrink-0" />
                  <span>Alterar</span>
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Modal de Configuração de Datas e Registro de Chegada */}
      {canEdit && (
        <TruckScheduleModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          data={scheduleData}
          onSave={handleSaveData}
          isDarkMode={isDarkMode}
        />
      )}

      {/* Modal de Detalhes do Último Caminhão */}
      <LastTruckDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        data={scheduleData}
        isDarkMode={isDarkMode}
      />
    </>
  );
}
