'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Radio, 
  MapPin, 
  Truck, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Compass, 
  Gauge, 
  Battery, 
  Power,
  RotateCcw
} from 'lucide-react';
import { updateVehicleGps, LiveVehiclePosition, DEFAULT_VEHICLES } from '@/lib/truckTrackingService';

interface DriverGpsBroadcasterModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
}

export function DriverGpsBroadcasterModal({
  isOpen,
  onClose,
  isDarkMode
}: DriverGpsBroadcasterModalProps) {
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState('truck-reposicao-01');
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [speed, setSpeed] = useState<number>(0);
  const [heading, setHeading] = useState<number>(0);
  const [accuracy, setAccuracy] = useState<number>(5);
  const [statusMessage, setStatusMessage] = useState('Pronto para iniciar transmissão');
  const [updateCount, setUpdateCount] = useState(0);

  const watchIdRef = useRef<number | null>(null);

  // Iniciar / Parar transmissão GPS
  const handleToggleBroadcast = () => {
    if (isBroadcasting) {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setIsBroadcasting(false);
      setStatusMessage('Transmissão encerrada');
    } else {
      if (!navigator.geolocation) {
        setStatusMessage('Geolocalização não suportada neste dispositivo');
        return;
      }

      setStatusMessage('Buscando sinal de satélite GPS...');
      setIsBroadcasting(true);

      watchIdRef.current = navigator.geolocation.watchPosition(
        async (position) => {
          const { latitude, longitude, speed: geoSpeed, heading: geoHeading, accuracy: geoAccuracy } = position.coords;
          
          const speedKmh = geoSpeed !== null && geoSpeed >= 0 ? Math.round(geoSpeed * 3.6) : 0;
          const headingDeg = geoHeading !== null && !isNaN(geoHeading) ? Math.round(geoHeading) : 0;

          setCurrentCoords({ lat: latitude, lng: longitude });
          setSpeed(speedKmh);
          setHeading(headingDeg);
          setAccuracy(Math.round(geoAccuracy));
          setUpdateCount(prev => prev + 1);
          setStatusMessage(`🟢 Transmitindo ao vivo (${Math.round(geoAccuracy)}m de precisão)`);

          // Sincronizar com o backend / Supabase
          await updateVehicleGps({
            id: selectedVehicleId,
            lat: latitude,
            lng: longitude,
            speed_kmh: speedKmh,
            heading_deg: headingDeg,
            accuracy_meters: Math.round(geoAccuracy),
            status: speedKmh > 5 ? 'Em Rota' : 'Parado',
            is_simulated: false
          });
        },
        (error) => {
          console.warn('Erro GPS:', error);
          setStatusMessage(`Aviso de sinal GPS: ${error.message}. Alternando para precisão aproximada.`);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 2000
        }
      );
    }
  };

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className={`w-full max-w-lg rounded-3xl shadow-2xl border overflow-hidden ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-md">
                <Radio className="size-5 text-white animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-black tracking-tight">Transmissão GPS do Entregador</h3>
                <p className="text-xs text-white/80">Compartilhar localização em tempo real com gerentes</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-5">
            {/* Seletor de Veículo / Caminhão */}
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                Selecione o Caminhão ou Veículo em Operação:
              </label>
              <select
                value={selectedVehicleId}
                onChange={(e) => setSelectedVehicleId(e.target.value)}
                disabled={isBroadcasting}
                className="w-full px-3.5 py-2.5 rounded-2xl border text-xs font-bold bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 cursor-pointer disabled:opacity-60"
              >
                {DEFAULT_VEHICLES.map(v => (
                  <option key={v.id} value={v.id}>
                    🚚 {v.vehicle_name} ({v.plate}) - {v.driver_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Card */}
            <div className={`p-4 rounded-2xl border transition-all ${
              isBroadcasting 
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200' 
                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${isBroadcasting ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`} />
                  {statusMessage}
                </span>
                <span className="text-[11px] font-mono font-bold">
                  {updateCount} atualizações
                </span>
              </div>

              {currentCoords && (
                <div className="grid grid-cols-2 gap-2 text-xs font-mono mt-3 pt-3 border-t border-emerald-200 dark:border-emerald-800/40">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Latitude / Longitude</span>
                    <strong>{currentCoords.lat.toFixed(5)}, {currentCoords.lng.toFixed(5)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Velocidade / Direção</span>
                    <strong>{speed} km/h • {heading}°</strong>
                  </div>
                </div>
              )}
            </div>

            {/* Telemetria Rápida */}
            <div className="grid grid-cols-3 gap-3">
              <div className={`p-3 rounded-2xl border text-center ${
                isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'
              }`}>
                <Gauge size={16} className="mx-auto text-blue-500 mb-1" />
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Velocidade</span>
                <strong className="text-sm font-black">{speed} km/h</strong>
              </div>

              <div className={`p-3 rounded-2xl border text-center ${
                isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'
              }`}>
                <Compass size={16} className="mx-auto text-indigo-500 mb-1" />
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Precisão</span>
                <strong className="text-sm font-black">±{accuracy}m</strong>
              </div>

              <div className={`p-3 rounded-2xl border text-center ${
                isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'
              }`}>
                <Battery size={16} className="mx-auto text-emerald-500 mb-1" />
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Status Conexão</span>
                <strong className="text-xs font-black text-emerald-600">Online</strong>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {isBroadcasting ? 'Compartilhamento contínuo ativo' : 'Pronto'}
            </span>

            <button
              onClick={handleToggleBroadcast}
              className={`px-5 py-2.5 rounded-2xl text-xs font-black shadow-lg flex items-center gap-2 active:scale-95 transition-all cursor-pointer ${
                isBroadcasting
                  ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/20'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
              }`}
            >
              <Power size={14} />
              <span>{isBroadcasting ? 'Parar Transmissão' : 'Iniciar Transmissão GPS'}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
