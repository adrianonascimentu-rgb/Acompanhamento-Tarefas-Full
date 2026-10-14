'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow, useMap } from '@vis.gl/react-google-maps';
import { 
  Truck, 
  MapPin, 
  Navigation, 
  Sparkles, 
  Play, 
  Pause, 
  RotateCcw, 
  Layers, 
  Compass, 
  Phone, 
  Clock, 
  CheckCircle2, 
  ArrowRight,
  Sliders,
  Maximize2,
  RefreshCw,
  Gauge
} from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { 
  LiveVehiclePosition, 
  DeliveryStop, 
  WAREHOUSE_DEPOT, 
  DEFAULT_VEHICLES, 
  getLocalFleetPositions, 
  saveLocalFleetPositions, 
  optimizeStopsSequence, 
  calculatePolylineDistanceKm 
} from '@/lib/truckTrackingService';

interface GoogleMapsFleetTrackerProps {
  initialVehicles?: LiveVehiclePosition[];
  onSelectVehicle?: (vehicle: LiveVehiclePosition) => void;
  className?: string;
  height?: string;
}

// Sub-componente para controlar o mapa (câmera, centralização e polilinhas)
function MapCameraController({ 
  selectedVehicle, 
  activeRoutePath 
}: { 
  selectedVehicle: LiveVehiclePosition | null;
  activeRoutePath: { lat: number; lng: number }[];
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    if (selectedVehicle) {
      map.panTo({ lat: selectedVehicle.lat, lng: selectedVehicle.lng });
      map.setZoom(14);
    } else if (activeRoutePath.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(new google.maps.LatLng(WAREHOUSE_DEPOT.lat, WAREHOUSE_DEPOT.lng));
      activeRoutePath.forEach(pt => bounds.extend(new google.maps.LatLng(pt.lat, pt.lng)));
      map.fitBounds(bounds, 50);
    }
  }, [map, selectedVehicle, activeRoutePath]);

  return null;
}

// Sub-componente para desenhar as linhas de rotas nativas do Google Maps
function RoutePolyline({ 
  path, 
  color = '#2563eb' 
}: { 
  path: { lat: number; lng: number }[];
  color?: string;
}) {
  const map = useMap();
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map) return;

    if (!polylineRef.current) {
      polylineRef.current = new google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: color,
        strokeOpacity: 0.85,
        strokeWeight: 5,
        icons: [
          {
            icon: {
              path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
              scale: 3,
              strokeColor: '#ffffff',
              fillColor: color,
              fillOpacity: 1,
            },
            offset: '50%',
            repeat: '100px',
          },
        ],
      });
      polylineRef.current.setMap(map);
    } else {
      polylineRef.current.setPath(path);
      polylineRef.current.setOptions({ strokeColor: color });
    }

    return () => {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
    };
  }, [map, path, color]);

  return null;
}

export function GoogleMapsFleetTracker({
  className = '',
  height = '560px'
}: GoogleMapsFleetTrackerProps) {
  const { mapsApiKey, isDarkMode } = useTheme();
  const [vehicles, setVehicles] = useState<LiveVehiclePosition[]>(() => getLocalFleetPositions());
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(vehicles[0]?.id || 'truck-reposicao-01');
  const [activeInfoWindow, setActiveInfoWindow] = useState<LiveVehiclePosition | DeliveryStop | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationSpeed, setSimulationSpeed] = useState<number>(1);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite' | 'hybrid'>('roadmap');
  const [optimizationApplied, setOptimizationApplied] = useState(false);

  const effectiveApiKey = mapsApiKey || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyCTfBfDPDjif_Es8txvqsLsjXvH9G8TjrY';

  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId) || vehicles[0] || null;

  // Gerar caminho da rota do veículo selecionado (do CD passando pelas paradas)
  const routePath = React.useMemo(() => {
    if (!selectedVehicle) return [];
    const pts = [{ lat: WAREHOUSE_DEPOT.lat, lng: WAREHOUSE_DEPOT.lng }];
    pts.push({ lat: selectedVehicle.lat, lng: selectedVehicle.lng });
    if (selectedVehicle.stops) {
      selectedVehicle.stops.forEach(s => pts.push({ lat: s.lat, lng: s.lng }));
    }
    return pts;
  }, [selectedVehicle]);

  // Simulação de movimento contínuo realista pelas vias
  useEffect(() => {
    if (!isSimulating || !selectedVehicle || !selectedVehicle.stops || selectedVehicle.stops.length === 0) return;

    const interval = setInterval(() => {
      setVehicles(prevVehicles => {
        return prevVehicles.map(veh => {
          if (veh.id !== selectedVehicleId || !veh.stops || veh.stops.length === 0) return veh;

          const currentStopIdx = veh.current_stop_index || 1;
          const targetStop = veh.stops.find(s => s.seq === currentStopIdx) || veh.stops[0];

          if (!targetStop) return veh;

          // Vetor em direção à parada
          const dLat = targetStop.lat - veh.lat;
          const dLng = targetStop.lng - veh.lng;
          const dist = Math.sqrt(dLat * dLat + dLng * dLng);

          // Chegou na parada
          if (dist < 0.001) {
            const nextIdx = (currentStopIdx % veh.stops.length) + 1;
            const nextStop = veh.stops.find(s => s.seq === nextIdx);
            return {
              ...veh,
              status: 'Entregando',
              speed_kmh: 0,
              current_stop_index: nextIdx,
              next_stop_name: nextStop ? `${nextStop.title} (${nextStop.neighborhood || 'Destino'})` : 'Retorno ao CD',
              stops: veh.stops.map(s => s.seq === currentStopIdx ? { ...s, status: 'Concluída' } : s)
            };
          }

          // Deslocar caminhão suavemente
          const step = (0.00045 * simulationSpeed);
          const ratio = Math.min(step / dist, 1);
          const newLat = veh.lat + dLat * ratio;
          const newLng = veh.lng + dLng * ratio;

          // Calcular ângulo de direção (heading)
          const angleDeg = Math.round((Math.atan2(dLng, dLat) * 180) / Math.PI);
          const normalizedHeading = (angleDeg + 360) % 360;

          const randomSpeed = Math.round(35 + Math.random() * 20 * simulationSpeed);

          return {
            ...veh,
            status: 'Em Rota',
            lat: newLat,
            lng: newLng,
            speed_kmh: randomSpeed,
            heading_deg: normalizedHeading,
            last_updated: new Date().toISOString()
          };
        });
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isSimulating, selectedVehicleId, simulationSpeed, selectedVehicle]);

  // Otimizar a rota de paradas do caminhão usando Nearest Neighbor TSP
  const handleOptimizeRoute = useCallback(() => {
    if (!selectedVehicle || !selectedVehicle.stops) return;

    const optimized = optimizeStopsSequence(
      { lat: selectedVehicle.lat, lng: selectedVehicle.lng },
      selectedVehicle.stops
    );

    const updated = vehicles.map(v => {
      if (v.id === selectedVehicle.id) {
        const fullPath = [
          { lat: v.lat, lng: v.lng },
          ...optimized.map(s => ({ lat: s.lat, lng: s.lng })),
          { lat: WAREHOUSE_DEPOT.lat, lng: WAREHOUSE_DEPOT.lng }
        ];
        const newDist = calculatePolylineDistanceKm(fullPath);
        return {
          ...v,
          stops: optimized,
          total_distance_km: newDist,
          eta_minutes: Math.round((newDist / 38) * 60),
          next_stop_name: optimized[0]?.title || 'Primeira Parada'
        };
      }
      return v;
    });

    setVehicles(updated);
    saveLocalFleetPositions(updated);
    setOptimizationApplied(true);
    setTimeout(() => setOptimizationApplied(false), 4000);
  }, [selectedVehicle, vehicles]);

  // Centralizar o mapa na base ou no veículo
  const handleResetPositions = () => {
    setVehicles(DEFAULT_VEHICLES);
    saveLocalFleetPositions(DEFAULT_VEHICLES);
    setIsSimulating(false);
  };

  return (
    <div className={`relative w-full rounded-3xl overflow-hidden border shadow-xl flex flex-col ${
      isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
    } ${className}`}>
      
      {/* Barra de Controle Superior da Frota */}
      <div className="p-3.5 sm:p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
            <Truck size={20} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-black tracking-tight">Rastreamento de Frota & Caminhão de Reposição</h3>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" /> Tempo Real
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Deslocamento exato via GPS de alta precisão e rotas entre paradas integradas ao Google Maps
            </p>
          </div>
        </div>

        {/* Seletor de Veículo & Ações de Otimização */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-between md:justify-end">
          <select
            value={selectedVehicleId}
            onChange={(e) => setSelectedVehicleId(e.target.value)}
            className="px-3 py-1.5 rounded-xl border text-xs font-bold bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 cursor-pointer shadow-xs"
          >
            {vehicles.map(v => (
              <option key={v.id} value={v.id}>
                🚚 {v.vehicle_name} ({v.plate}) - {v.driver_name}
              </option>
            ))}
          </select>

          {/* Botão de Otimizar Rota */}
          <button
            onClick={handleOptimizeRoute}
            className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all active:scale-95 shadow-md ${
              optimizationApplied
                ? 'bg-emerald-600 text-white'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-500/20'
            }`}
            title="Calcular a menor distância e melhor sequência entre paradas"
          >
            <Sparkles size={13} className={optimizationApplied ? 'animate-spin' : ''} />
            <span>{optimizationApplied ? 'Rota Otimizada!' : 'Otimizar Paradas'}</span>
          </button>

          {/* Toggle de Simulação de Deslocamento */}
          <button
            onClick={() => setIsSimulating(!isSimulating)}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 border transition-all active:scale-95 ${
              isSimulating
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
            }`}
            title="Iniciar ou pausar a simulação do caminhão trafegando pelas ruas"
          >
            {isSimulating ? <Pause size={13} /> : <Play size={13} />}
            <span>{isSimulating ? 'Pausar Rota' : 'Simular GPS'}</span>
          </button>
        </div>
      </div>

      {/* Painel do Mapa Google Maps */}
      <div style={{ height }} className="relative w-full">
        <APIProvider 
          apiKey={effectiveApiKey}
          solutionChannel="gmp_mcp_codeassist_v1_aistudio"
        >
          <Map
            defaultCenter={{ lat: -7.1197, lng: -34.8550 }}
            defaultZoom={13}
            mapId="DEMO_MAP_ID"
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            mapTypeId={mapType}
            gestureHandling="greedy"
            disableDefaultUI={false}
            style={{ width: '100%', height: '100%' }}
          >
            <MapCameraController 
              selectedVehicle={selectedVehicle}
              activeRoutePath={routePath}
            />

            {/* Linha da Rota entre paradas */}
            {routePath.length > 1 && (
              <RoutePolyline 
                path={routePath} 
                color={selectedVehicle?.vehicle_type === 'caminhao' ? '#2563eb' : '#10b981'} 
              />
            )}

            {/* Marcador do Centro de Distribuição / Base */}
            <AdvancedMarker
              position={{ lat: WAREHOUSE_DEPOT.lat, lng: WAREHOUSE_DEPOT.lng }}
              title={WAREHOUSE_DEPOT.name}
            >
              <div className="bg-slate-900 text-white border-2 border-white rounded-2xl px-2.5 py-1 text-[11px] font-black shadow-xl flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                <span>Base Central</span>
              </div>
            </AdvancedMarker>

            {/* Marcadores dos Veículos / Caminhões */}
            {vehicles.map(vehicle => {
              const isSelected = vehicle.id === selectedVehicleId;
              return (
                <AdvancedMarker
                  key={vehicle.id}
                  position={{ lat: vehicle.lat, lng: vehicle.lng }}
                  onClick={() => {
                    setSelectedVehicleId(vehicle.id);
                    setActiveInfoWindow(vehicle);
                  }}
                  title={`${vehicle.vehicle_name} (${vehicle.plate})`}
                >
                  <div className="relative cursor-pointer group">
                    {/* Anel de Pulso de GPS Ativo */}
                    <div className="absolute -inset-2.5 rounded-full bg-blue-500/30 animate-ping pointer-events-none" />
                    
                    {/* Badge do Veículo com Indicador de Velocidade */}
                    <div className={`relative px-3 py-1.5 rounded-2xl border-2 flex items-center gap-2 shadow-2xl transition-all duration-300 ${
                      isSelected 
                        ? 'bg-blue-600 border-white text-white scale-110 shadow-blue-500/50' 
                        : 'bg-slate-900/90 border-blue-400 text-white hover:scale-105'
                    }`}>
                      <Truck size={16} className={vehicle.speed_kmh > 0 ? 'animate-bounce' : ''} />
                      <div className="flex flex-col text-left leading-none">
                        <span className="text-[10px] font-black uppercase tracking-tight">{vehicle.plate}</span>
                        <span className="text-[9px] font-bold text-blue-200 mt-0.5">
                          {vehicle.speed_kmh > 0 ? `${vehicle.speed_kmh} km/h` : 'Parado'}
                        </span>
                      </div>
                    </div>
                  </div>
                </AdvancedMarker>
              );
            })}

            {/* Marcadores das Paradas da Rota (Sequência 1, 2, 3...) */}
            {selectedVehicle?.stops?.map(stop => (
              <AdvancedMarker
                key={String(stop.id)}
                position={{ lat: stop.lat, lng: stop.lng }}
                onClick={() => setActiveInfoWindow(stop)}
                title={`${stop.seq}º Parada: ${stop.title}`}
              >
                <div className={`flex items-center justify-center w-7 h-7 rounded-full text-white font-black text-xs shadow-lg border-2 border-white transition-transform hover:scale-125 cursor-pointer ${
                  stop.status === 'Concluída' 
                    ? 'bg-emerald-600' 
                    : stop.status === 'A caminho' 
                    ? 'bg-blue-600 ring-4 ring-blue-500/30 animate-pulse' 
                    : 'bg-amber-500'
                }`}>
                  {stop.status === 'Concluída' ? '✓' : stop.seq}
                </div>
              </AdvancedMarker>
            ))}

            {/* InfoWindow Informativa */}
            {activeInfoWindow && (
              <InfoWindow
                position={{
                  lat: 'lat' in activeInfoWindow ? activeInfoWindow.lat : 0,
                  lng: 'lng' in activeInfoWindow ? activeInfoWindow.lng : 0,
                }}
                onCloseClick={() => setActiveInfoWindow(null)}
              >
                <div className="p-2 min-w-[220px] max-w-[280px] text-slate-900 font-sans">
                  {'vehicle_name' in activeInfoWindow ? (
                    <div>
                      <div className="flex items-center justify-between gap-2 border-b pb-1.5 mb-1.5">
                        <h4 className="font-extrabold text-xs text-blue-700">
                          {activeInfoWindow.vehicle_name}
                        </h4>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                          {activeInfoWindow.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 font-bold mb-1">
                        Motorista: {activeInfoWindow.driver_name}
                      </p>
                      <p className="text-[11px] text-slate-600 mb-1 flex items-center gap-1">
                        <Gauge size={12} className="text-blue-500" /> Velocidade: <strong>{activeInfoWindow.speed_kmh} km/h</strong>
                      </p>
                      <p className="text-[11px] text-slate-600 flex items-center gap-1">
                        <MapPin size={12} className="text-rose-500" /> Próxima Parada: <strong>{activeInfoWindow.next_stop_name || 'Em trânsito'}</strong>
                      </p>
                    </div>
                  ) : (
                    <div>
                      <span className="text-[10px] font-black text-blue-600 uppercase">
                        {activeInfoWindow.seq}ª Parada da Rota
                      </span>
                      <h4 className="font-bold text-xs text-slate-900 mt-0.5">
                        {activeInfoWindow.title}
                      </h4>
                      <p className="text-[11px] text-slate-600 mt-1">
                        {activeInfoWindow.address}
                      </p>
                      <div className="mt-2 flex items-center justify-between border-t pt-1 text-[10px]">
                        <span className="font-bold">Status: {activeInfoWindow.status}</span>
                        <span className="text-slate-500">Prev: {activeInfoWindow.estimated_arrival}</span>
                      </div>
                    </div>
                  )}
                </div>
              </InfoWindow>
            )}
          </Map>
        </APIProvider>

        {/* Floating Telemetry & Controls Overlay */}
        <div className="absolute top-3 left-3 z-10 flex flex-col gap-2 pointer-events-auto">
          {/* Card de Informações da Rota em Tempo Real */}
          {selectedVehicle && (
            <div className={`p-3 rounded-2xl border shadow-xl backdrop-blur-md max-w-xs transition-all ${
              isDarkMode ? 'bg-slate-900/90 border-slate-700 text-white' : 'bg-white/95 border-slate-200 text-slate-900'
            }`}>
              <div className="flex items-center justify-between gap-3 mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-500 flex items-center gap-1">
                  <Compass size={12} /> {selectedVehicle.vehicle_name}
                </span>
                <span className="text-xs font-mono font-black px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                  {selectedVehicle.speed_kmh} km/h
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 dark:text-slate-400">Distância Total:</span>
                  <strong className="font-extrabold">{selectedVehicle.total_distance_km || 18.5} km</strong>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 dark:text-slate-400">Tempo Estimado (ETA):</span>
                  <strong className="font-extrabold text-emerald-600 dark:text-emerald-400">~{selectedVehicle.eta_minutes || 14} min</strong>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 dark:text-slate-400">Próxima Parada:</span>
                  <span className="font-bold truncate max-w-[140px] text-right">{selectedVehicle.next_stop_name || 'Descarregando'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Seletor de Camadas (Satélite / Tráfego) */}
        <div className="absolute bottom-4 right-4 z-10 flex items-center gap-1.5 bg-white/95 dark:bg-slate-900/90 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl backdrop-blur-md">
          <button
            onClick={() => setMapType('roadmap')}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
              mapType === 'roadmap' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            Mapa
          </button>
          <button
            onClick={() => setMapType('satellite')}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
              mapType === 'satellite' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            Satélite
          </button>
          <button
            onClick={() => setMapType('hybrid')}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
              mapType === 'hybrid' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            Híbrido
          </button>
          <button
            onClick={handleResetPositions}
            className="p-1 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white"
            title="Restaurar posições originais"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* Roteiro e Paradas Detalhadas na Base do Card */}
      {selectedVehicle?.stops && selectedVehicle.stops.length > 0 && (
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Navigation size={13} className="text-blue-500" /> Itinerário Otimizado ({selectedVehicle.stops.length} Paradas)
            </h4>
            <span className="text-[11px] font-bold text-slate-500">
              Motorista: <strong>{selectedVehicle.driver_name}</strong> {selectedVehicle.driver_phone && `• ${selectedVehicle.driver_phone}`}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
            {selectedVehicle.stops.map(stop => (
              <div
                key={String(stop.id)}
                onClick={() => setActiveInfoWindow(stop)}
                className={`p-2.5 rounded-2xl border text-left cursor-pointer transition-all hover:scale-102 ${
                  stop.status === 'Concluída'
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200/80 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-200'
                    : stop.status === 'A caminho'
                    ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-200 shadow-sm'
                    : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-white/60 dark:bg-black/20">
                    Parada {stop.seq}
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                    {stop.estimated_arrival}
                  </span>
                </div>
                <p className="text-xs font-black truncate">{stop.title}</p>
                <p className="text-[11px] opacity-80 truncate">{stop.address}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
