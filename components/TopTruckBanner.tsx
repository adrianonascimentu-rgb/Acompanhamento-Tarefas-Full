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
  DEFAULT_TRUCK_SCHEDULE,
  subscribeTruckSchedule
} from '@/lib/truckSchedule';
import { TruckScheduleModal } from '@/components/TruckScheduleModal';
import { LastTruckDetailsModal } from '@/components/LastTruckDetailsModal';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function TopTruckBanner() {
  const pathname = usePathname();
  const isHomePage = pathname === '/' || pathname === '';
  const { role, isAdmin, user, canViewHomeCard } = useRole();
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

    // 1. Escutar eventos locais/cross-tab via BroadcastChannel e CustomEvent
    const unsubscribe = subscribeTruckSchedule((newData) => {
      setScheduleData(newData);
    });

    // 2. Atualizar ao focar na janela
    const handleFocus = () => {
      loadData();
    };
    window.addEventListener('focus', handleFocus);

    // 3. Polling suave a cada 20 segundos para sincronia passiva entre máquinas
    const interval = setInterval(() => {
      loadData();
    }, 20000);

    // 4. Ouvir alterações em tempo real no Supabase
    let channel: any = null;
    try {
      channel = supabase
        .channel('public:truck-schedule-banner')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'system_settings' },
          (payload: any) => {
            if (payload?.new?.key === 'truck_replenishment_schedule' && payload.new.value) {
              setScheduleData(payload.new.value);
            } else {
              loadData();
            }
          }
        )
        .subscribe();
    } catch (e) {
      // ignore
    }

    return () => {
      unsubscribe();
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [loadData]);

  const handleSaveData = async (newData: any) => {
    const res = await updateTruckSchedule({
      ...newData,
      updated_by_name: user?.name || (isAdmin ? 'Administrador' : role)
    });
    if (res.success && res.data) {
      setScheduleData(res.data);
    }
    return res;
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
        buttonBg: 'bg-white text-emerald-800 hover:bg-white/95 dark:bg-emerald-600 dark:hover:bg-emerald-500 dark:text-white dark:shadow-emerald-900/40'
      };
    } else if (daysUntilArrival === 1) {
      // FALTA 1 DIA (AMANHÃ) - Amarelo/Âmbar acolhedor que não cansa a vista
      return {
        bannerBg: isDarkMode 
          ? 'bg-gradient-to-r from-amber-950 via-yellow-950 to-slate-900 border-amber-500/40 text-white shadow-amber-500/10' 
          : 'bg-gradient-to-r from-amber-600 via-amber-700 to-yellow-600 border-amber-400/50 text-white shadow-amber-500/20',
        badgeBg: 'bg-yellow-300 text-slate-950',
        badgeLabel: '⚠️ CHEGA AMANHÃ!',
        buttonBg: 'bg-white text-amber-900 hover:bg-white/95 dark:bg-amber-600 dark:hover:bg-amber-500 dark:text-white dark:shadow-amber-900/40'
      };
    } else {
      // PADRÃO - Azul suave
      return {
        bannerBg: isDarkMode 
          ? 'bg-gradient-to-r from-slate-900 via-indigo-950/80 to-blue-950/80 border-indigo-500/30 text-white shadow-indigo-500/5' 
          : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 border-blue-500/40 text-white shadow-blue-500/20',
        badgeBg: 'bg-amber-400 text-slate-950',
        badgeLabel: 'Caminhão de Reposição',
        buttonBg: 'bg-white text-blue-700 hover:bg-white/95 dark:bg-blue-600 dark:hover:bg-blue-500 dark:text-white dark:shadow-blue-900/40'
      };
    }
  };

  const { bannerBg, badgeBg, badgeLabel, buttonBg } = getBannerStyles();

  const nextDateDisplay = formatFriendlyDate(scheduleData.next_arrival_date);
  const effectiveLastDate = latest?.arrival_date || scheduleData.last_arrival_date;
  const lastDateDisplay = formatFriendlyDate(effectiveLastDate);

  const hasNextDate = !!scheduleData.next_arrival_date;

  if (isHomePage && !canViewHomeCard('card_truck_banner')) {
    return null;
  }

  return (
    <>
      <div className="w-full px-2.5 py-1.5 sm:px-4 sm:py-2.5">
        <motion.div
          initial={{ opacity: 0, y: -2 }}
          animate={{ opacity: 1, y: 0 }}
          className={`relative overflow-hidden rounded-xl sm:rounded-2xl border sm:border-2 shadow-xs sm:shadow-md transition-all duration-300 ${bannerBg}`}
        >
          <div className="relative px-2.5 py-1.5 sm:px-5 sm:py-3 flex items-center justify-between gap-1.5 sm:gap-2.5 text-xs sm:text-sm flex-nowrap min-w-0">
            {/* Esquerda: Ícone + Badge Compacta + Próximo */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 flex-1 overflow-hidden">
              <div className="size-6 sm:size-9 rounded-lg sm:rounded-xl bg-amber-400/25 sm:bg-white/20 border border-amber-400/50 sm:border-white/30 flex items-center justify-center text-amber-300 sm:text-white shrink-0 shadow-xs">
                <Truck size={13} className="sm:hidden animate-pulse text-amber-300" />
                <Truck size={18} className="hidden sm:inline-block animate-pulse text-white" />
              </div>

              {/* Badge completa no Desktop, compacta amarela no mobile */}
              <span className={`hidden sm:inline-flex px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-xs shrink-0 ${badgeBg}`}>
                {badgeLabel}
              </span>
              <span className="sm:hidden px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider shrink-0 bg-amber-400 text-slate-950 shadow-xs">
                Caminhão
              </span>

              <div className="flex items-center gap-1 sm:gap-2 text-[11px] sm:text-sm font-bold text-white min-w-0 truncate">
                <span className="opacity-80 shrink-0 text-[10px] sm:text-xs">Próximo:</span>
                <strong className="font-black text-white text-[11px] sm:text-base truncate">
                  {hasNextDate ? nextDateDisplay : 'Aguardando'}
                </strong>
                <span className="opacity-40 hidden md:inline">|</span>
                <span className="opacity-95 text-xs sm:text-sm hidden md:inline truncate">
                  Último: <strong className="font-black text-white/95">{lastDateDisplay}</strong>
                </span>
              </div>
            </div>

            {/* Direita: Ações (Alterar sempre visível, extras no desktop) */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              <Link
                href="/deliveries?mode=tracking"
                className="hidden md:flex px-2.5 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 active:scale-95 transition-all text-white text-xs font-bold items-center gap-1 border border-white/30 shadow-xs cursor-pointer"
                title="Rastrear no Mapa"
              >
                <Navigation size={13} className="text-yellow-300 shrink-0" />
                <span>Mapa</span>
              </Link>

              {latest && (
                <button
                  type="button"
                  onClick={() => setIsDetailsModalOpen(true)}
                  className="hidden lg:inline-flex px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 transition-all text-white text-xs font-bold cursor-pointer"
                  title="Ver detalhes da carga"
                >
                  Info Carga
                </button>
              )}

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
                  className={`px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-lg sm:rounded-xl ${buttonBg} active:scale-95 transition-all text-[11px] sm:text-xs font-black shadow-sm flex items-center gap-1 cursor-pointer shrink-0`}
                  title="Alterar datas do caminhão"
                >
                  <Edit3 size={12} className="shrink-0" />
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
