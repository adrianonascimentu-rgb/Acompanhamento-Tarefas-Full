'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Truck, X, Calendar, User, Users, Package, FileText, CheckCircle2, ShieldCheck } from 'lucide-react';
import { TruckScheduleData } from '@/lib/truckSchedule';

interface LastTruckDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: TruckScheduleData;
  isDarkMode: boolean;
}

export function LastTruckDetailsModal({ isOpen, onClose, data, isDarkMode }: LastTruckDetailsModalProps) {
  if (!isOpen) return null;

  const latest = data.history && data.history.length > 0 ? data.history[0] : null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className={`w-full max-w-2xl rounded-3xl shadow-2xl border overflow-hidden ${
            isDarkMode 
              ? 'bg-slate-900 border-slate-800 text-white' 
              : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-md">
                <Truck className="size-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight">Informações do Último Caminhão de Reposição</h2>
                <p className="text-xs text-white/80">Detalhes completos da carga, veículo, motorista e equipe</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
            {latest ? (
              <>
                {/* Summary Card */}
                <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-blue-50/70 border-blue-100'} flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4`}>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-blue-600/10 dark:bg-blue-400/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                      <Package size={24} />
                    </div>
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-950/60 px-2 py-0.5 rounded-full">
                        Último Recebimento Confirmado
                      </span>
                      <h3 className="text-base font-bold mt-1">Caminhão de Reposição</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                        <Calendar size={13} /> Data de Chegada: <strong className="text-slate-700 dark:text-slate-200">{latest.arrival_date}</strong>
                      </p>
                    </div>
                  </div>
                  <div className="text-right sm:text-right w-full sm:w-auto">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 size={13} /> Concluído & Conferido
                    </span>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                      <User size={14} className="text-blue-500" /> Motorista Responsável
                    </div>
                    <p className="text-sm font-extrabold text-slate-800 dark:text-slate-100">
                      {latest.driver_name || 'Não especificado'}
                    </p>
                  </div>

                  <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                      <Users size={14} className="text-indigo-500" /> Ajudante / Equipe
                    </div>
                    <p className="text-sm font-extrabold text-slate-800 dark:text-slate-100">
                      {latest.assistant_name || 'Nenhum ajudante registrado'}
                    </p>
                  </div>

                  <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                      <ShieldCheck size={14} className="text-emerald-500" /> Registrado por
                    </div>
                    <p className="text-sm font-extrabold text-slate-800 dark:text-slate-100">
                      {latest.created_by || data.updated_by_name || 'Administrador'}
                    </p>
                  </div>

                  <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                      <Calendar size={14} className="text-amber-500" /> Próxima Previsão
                    </div>
                    <p className="text-sm font-extrabold text-slate-800 dark:text-slate-100">
                      {data.next_arrival_date ? data.next_arrival_date : 'Não definida'}
                    </p>
                  </div>
                </div>

                {/* Notes & Observations */}
                <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">
                    <FileText size={14} className="text-purple-500" /> Observações e Notas da Carga
                  </div>
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800">
                    {latest.notes || latest.comments || 'Carga geral de reposição recebida sem incidentes ou notas específicas.'}
                  </p>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                <Truck size={48} className="mx-auto mb-3 opacity-40 text-blue-500 animate-bounce" />
                <p className="font-bold text-sm">Nenhum registro de caminhão no histórico recente.</p>
                <p className="text-xs mt-1 text-slate-400">Utilize o botão de alterar datas para registrar a chegada do primeiro caminhão.</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end bg-slate-50 dark:bg-slate-900/50">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
            >
              Fechar
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
