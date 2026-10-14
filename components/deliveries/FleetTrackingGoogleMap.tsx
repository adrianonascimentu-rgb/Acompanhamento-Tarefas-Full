'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  APIProvider, 
  Map as GoogleMap, 
  AdvancedMarker, 
  InfoWindow, 
  useMap, 
  useMapsLibrary 
} from '@vis.gl/react-google-maps';
import { 
  Truck, 
  Navigation, 
  MapPin, 
  CheckCircle2, 
  Clock, 
  Play, 
  Square, 
  Compass, 
  Layers, 
  Route as RouteIcon, 
  Phone, 
  MessageCircle, 
  ExternalLink, 
  Maximize2, 
  RotateCcw, 
  Gauge, 
  ShieldCheck, 
  Radio, 
  AlertCircle,
  Sparkles,
  ChevronRight,
  ListOrdered
} from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { useRole } from '@/hooks/useRole';
import { supabase } from '@/lib/supabase';
import { PB_NEIGHBORHOOD_COORDS } from '@/lib/neighborhoodCoords';

export interface DeliveryStop {
  id: string | number;
  customerName?: string;
  address: string;
  neighborhood: string;
  city: string;
  product?: string;
  value?: number;
  status: string;
  lat: number;
  lng: number;
  order?: number;
  eta?: string;
  driver?: string;
}

export interface TruckVehicle {
  id: string;
  name: string;
  plate: string;
  type: 'replenishment' | 'delivery' | 'motorcycle';
  driverName: string;
  driverPhone?: string;
  lat: number;
  lng: number;
  heading: number;
  speedKmH: number;
  status: 'em_rota' | 'parado' | 'descarregando' | 'retornando';
  lastUpdated: string;
  assignedStops: DeliveryStop[];
  batteryPercent?: number;
  isSimulated?: boolean;
}

interface FleetTrackingGoogleMapProps {
  deliveries?: any[];
  onSelectDelivery?: (id: string | number) => void;
  className?: string;
}

// Centro padrão: João Pessoa - PB
const DEFAULT_CENTER = { lat: -7.1150, lng: -34.8631 };

// Rota de simulação realística por avenidas principais de João Pessoa
const SIMULATION_WAYPOINTS: [number, number][] = [
  [-7.1202, -34.8845], // Centro (Ponto de partida / Matriz)
  [-7.1243, -34.8750], // Av. Epitácio Pessoa - Trecho 1
  [-7.1287, -34.8631], // Torre
  [-7.1294, -34.8528], // Expedicionários
  [-7.1243, -34.8447], // Tambauzinho
  [-7.1186, -34.8268], // Tambaú
  [-7.0984, -34.8347], // Manaíra
  [-7.0656, -34.8336], // Bessa
  [-7.1396, -34.8517], // Castelo Branco
  [-7.1558, -34.8467], // Bancários
  [-7.1738, -34.8372], // Mangabeira
  [-7.1202, -34.8845], // Retorno ao Centro
];

// Inner Controller para desenhar rota otimizada e centralizar
function DirectionsAndRouteLayer({
  selectedTruck,
  optimizedRoute,
  onRouteCalculated,
  followVehicle
}: {
  selectedTruck: TruckVehicle | null;
  optimizedRoute: any | null;
  onRouteCalculated: (result: {
    totalDistanceKm: number;
    totalDurationMin: number;
    optimizedStops: DeliveryStop[];
    polylineOverview: string;
  } | null) => void;
  followVehicle: boolean;
}) {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);

  // Instancia DirectionsRenderer
  useEffect(() => {
    if (!map || !routesLib) return;

    if (!directionsRendererRef.current) {
      directionsRendererRef.current = new routesLib.DirectionsRenderer({
        map,
        suppressMarkers: true, // usamos marcadores customizados
        polylineOptions: {
          strokeColor: '#2563eb',
          strokeWeight: 5,
          strokeOpacity: 0.85,
        }
      });
    }

    return () => {
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
        directionsRendererRef.current = null;
      }
    };
  }, [map, routesLib]);

  // Se o modo Seguir Veículo estiver ativo
  useEffect(() => {
    if (followVehicle && selectedTruck && map) {
      map.panTo({ lat: selectedTruck.lat, lng: selectedTruck.lng });
    }
  }, [followVehicle, selectedTruck?.lat, selectedTruck?.lng, map]);

  // Otimização de Rota com Google Maps DirectionsService
  useEffect(() => {
    if (!routesLib || !selectedTruck || !selectedTruck.assignedStops || selectedTruck.assignedStops.length === 0) {
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setDirections({ routes: [] } as any);
      }
      onRouteCalculated(null);
      return;
    }

    const stops = selectedTruck.assignedStops.filter(
      s => typeof s.lat === 'number' && typeof s.lng === 'number' && !isNaN(s.lat) && !isNaN(s.lng)
    );

    if (stops.length === 0) {
      onRouteCalculated(null);
      return;
    }

    const service = new routesLib.DirectionsService();
    const origin = { lat: selectedTruck.lat, lng: selectedTruck.lng };

    // Se tiver mais de 1 parada, o destino é a última ou retorno
    let destination: google.maps.LatLngLiteral;
    let waypoints: google.maps.DirectionsWaypoint[] = [];

    if (stops.length === 1) {
      destination = { lat: stops[0].lat, lng: stops[0].lng };
    } else {
      destination = { lat: stops[stops.length - 1].lat, lng: stops[stops.length - 1].lng };
      waypoints = stops.slice(0, stops.length - 1).map(s => ({
        location: { lat: s.lat, lng: s.lng },
        stopover: true
      }));
    }

    service.route(
      {
        origin,
        destination,
        waypoints,
        optimizeWaypoints: true,
        travelMode: google.maps.TravelMode.DRIVING
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          if (directionsRendererRef.current) {
            directionsRendererRef.current.setDirections(result);
          }

          const route = result.routes[0];
          let totalDist = 0;
          let totalDur = 0;

          route.legs.forEach(leg => {
            totalDist += leg.distance?.value || 0;
            totalDur += leg.duration?.value || 0;
          });

          // Reordena as paradas de acordo com waypoint_order
          const order = route.waypoint_order || [];
          const intermediateStops = stops.slice(0, stops.length - 1);
          const orderedIntermediates = order.map(idx => intermediateStops[idx]);
          const lastStop = stops[stops.length - 1];

          const finalOrderedStops = [...orderedIntermediates, lastStop].map((s, idx) => ({
            ...s,
            order: idx + 1
          }));

          onRouteCalculated({
            totalDistanceKm: Number((totalDist / 1000).toFixed(1)),
            totalDurationMin: Math.round(totalDur / 60),
            optimizedStops: finalOrderedStops,
            polylineOverview: route.overview_polyline
          });
        } else {
          console.warn('Google Maps Directions status:', status);
        }
      }
    );
  }, [routesLib, selectedTruck?.id, selectedTruck?.assignedStops?.length, onRouteCalculated]);

  return null;
}

export function FleetTrackingGoogleMap({
  deliveries = [],
  onSelectDelivery,
  className = ''
}: FleetTrackingGoogleMapProps) {
  const { isDarkMode, mapsApiKey } = useTheme();
  const { user, isAdmin, role } = useRole();
  const isManagerOrAdmin = isAdmin || role === 'gerente' || role === 'supervisor' || role === 'administrador';

  const effectiveApiKey = mapsApiKey || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyCTfBfDPDjif_Es8txvqsLsjXvH9G8TjrY';

  // Frota ativa
  const [vehicles, setVehicles] = useState<TruckVehicle[]>([]);
  const [selectedTruckId, setSelectedTruckId] = useState<string>('truck-matriz');
  const [activeMarkerInfo, setActiveMarkerInfo] = useState<{
    type: 'truck' | 'stop';
    data: any;
  } | null>(null);

  const [followVehicle, setFollowVehicle] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationIndex, setSimulationIndex] = useState(0);
  const [isDriverTransmitting, setIsDriverTransmitting] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [optimizedRouteData, setOptimizedRouteData] = useState<{
    totalDistanceKm: number;
    totalDurationMin: number;
    optimizedStops: DeliveryStop[];
    polylineOverview: string;
  } | null>(null);

  // Prepara as paradas reais a partir da prop deliveries
  const mappedStops = useMemo<DeliveryStop[]>(() => {
    if (!deliveries || deliveries.length === 0) {
      return [
        {
          id: 'mock-1',
          customerName: 'Loja Centro Matriz',
          address: 'Praça Venâncio Neiva, 10',
          neighborhood: 'Centro',
          city: 'João Pessoa',
          product: 'Carga Geral de Reposição - 45 volumes',
          status: 'Pendente',
          lat: -7.1202,
          lng: -34.8845,
          value: 14500,
          driver: 'Roberto Silva'
        },
        {
          id: 'mock-2',
          customerName: 'Filial Tambaú',
          address: 'Av. Olavo Bilac, 240',
          neighborhood: 'Tambaú',
          city: 'João Pessoa',
          product: 'Peças e Ferragens Industriais',
          status: 'Em Andamento',
          lat: -7.1186,
          lng: -34.8268,
          value: 8200,
          driver: 'Roberto Silva'
        },
        {
          id: 'mock-3',
          customerName: 'Depósito Manaíra',
          address: 'Av. João Maurício, 700',
          neighborhood: 'Manaíra',
          city: 'João Pessoa',
          product: 'Acessórios e Ferramental de Linha',
          status: 'Agendada',
          lat: -7.0984,
          lng: -34.8347,
          value: 5900,
          driver: 'Roberto Silva'
        },
        {
          id: 'mock-4',
          customerName: 'Ponto de Apoio Mangabeira',
          address: 'Rua Josefa Taveira, 1200',
          neighborhood: 'Mangabeira',
          city: 'João Pessoa',
          product: 'Estoque Intermediário',
          status: 'Agendada',
          lat: -7.1738,
          lng: -34.8372,
          value: 11300,
          driver: 'Roberto Silva'
        }
      ];
    }

    return deliveries.map((d, index) => {
      let lat = d.lat || d.destination_lat;
      let lng = d.lng || d.destination_lng;

      if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
        const coords = PB_NEIGHBORHOOD_COORDS[d.neighborhood?.toLowerCase()?.trim() || 'centro'];
        if (coords) {
          lat = coords[0];
          lng = coords[1];
        } else {
          lat = -7.1150 + (index * 0.005);
          lng = -34.8631 + (index * 0.005);
        }
      }

      return {
        id: d.id,
        customerName: d.product ? `${d.product.slice(0, 30)}...` : `Entrega #${d.id}`,
        address: d.address || `${d.neighborhood || ''}, ${d.city || 'João Pessoa'}`,
        neighborhood: d.neighborhood || 'Centro',
        city: d.city || 'João Pessoa',
        product: d.product,
        value: d.value,
        status: d.status || 'Pendente',
        lat,
        lng,
        driver: d.driver
      };
    });
  }, [deliveries]);

  // Inicializa a frota com o caminhão de reposição principal e outros veículos
  useEffect(() => {
    const replenishmentStops = mappedStops;

    const initialVehicles: TruckVehicle[] = [
      {
        id: 'truck-matriz',
        name: 'Caminhão de Reposição - Principal',
        plate: 'AGX-2026',
        type: 'replenishment',
        driverName: 'Roberto Silva (Matriz)',
        driverPhone: '(83) 98888-0001',
        lat: SIMULATION_WAYPOINTS[0][0],
        lng: SIMULATION_WAYPOINTS[0][1],
        heading: 45,
        speedKmH: 42,
        status: 'em_rota',
        lastUpdated: 'Agora mesmo',
        assignedStops: replenishmentStops,
        batteryPercent: 94
      },
      {
        id: 'truck-secundario',
        name: 'Fiorino Ágil - Zona Sul',
        plate: 'KPB-9912',
        type: 'delivery',
        driverName: 'Marcos Souza',
        driverPhone: '(83) 99123-4567',
        lat: -7.1558,
        lng: -34.8467,
        heading: 120,
        speedKmH: 28,
        status: 'descarregando',
        lastUpdated: 'Há 1 min',
        assignedStops: replenishmentStops.slice(2),
        batteryPercent: 88
      }
    ];

    setVehicles(initialVehicles);
  }, [mappedStops]);

  // Caminhão selecionado no momento
  const selectedTruck = useMemo(() => {
    return vehicles.find(v => v.id === selectedTruckId) || vehicles[0] || null;
  }, [vehicles, selectedTruckId]);

  // Loop de Simulação de Deslocamento em Tempo Real
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setSimulationIndex(prevIdx => {
        const nextIdx = (prevIdx + 1) % SIMULATION_WAYPOINTS.length;
        const currentCoord = SIMULATION_WAYPOINTS[nextIdx];
        const prevCoord = SIMULATION_WAYPOINTS[prevIdx];

        // Calcula heading simples em graus
        const dLat = currentCoord[0] - prevCoord[0];
        const dLng = currentCoord[1] - prevCoord[1];
        const angleDeg = Math.round((Math.atan2(dLng, dLat) * 180) / Math.PI);
        const heading = (angleDeg + 360) % 360;

        // Velocidade simulada variando entre 35 e 55 km/h
        const simulatedSpeed = 35 + Math.floor(Math.sin(nextIdx) * 15 + 10);

        setVehicles(prevVehicles =>
          prevVehicles.map(veh => {
            if (veh.id === selectedTruckId) {
              return {
                ...veh,
                lat: currentCoord[0],
                lng: currentCoord[1],
                heading,
                speedKmH: simulatedSpeed,
                status: simulatedSpeed > 10 ? 'em_rota' : 'parado',
                lastUpdated: 'Atualizado em tempo real',
                isSimulated: true
              };
            }
            return veh;
          })
        );

        // Dispara evento global para outros componentes sincronizarem
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('truck-live-movement', {
              detail: {
                truckId: selectedTruckId,
                lat: currentCoord[0],
                lng: currentCoord[1],
                speed: simulatedSpeed,
                heading
              }
            })
          );
        }

        return nextIdx;
      });
    }, 2500);

    return () => clearInterval(interval);
  }, [isSimulating, selectedTruckId]);

  // Transmissor real de GPS via navigator.geolocation.watchPosition
  useEffect(() => {
    if (!isDriverTransmitting || typeof window === 'undefined' || !navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      pos => {
        const { latitude, longitude, speed, heading, accuracy } = pos.coords;
        setGpsAccuracy(Math.round(accuracy));

        const speedKmH = speed ? Math.round(speed * 3.6) : 0;

        setVehicles(prevVehicles =>
          prevVehicles.map(veh => {
            if (veh.id === selectedTruckId) {
              return {
                ...veh,
                lat: latitude,
                lng: longitude,
                heading: heading || veh.heading || 0,
                speedKmH,
                status: speedKmH > 5 ? 'em_rota' : 'parado',
                lastUpdated: 'GPS Real Ativo',
                isSimulated: false
              };
            }
            return veh;
          })
        );

        // Opcional: Persistir no Supabase se configurado
        try {
          supabase
            .from('deliveries')
            .update({
              driver_lat: latitude,
              driver_lng: longitude,
              current_lat: latitude,
              current_lng: longitude,
              updated_at: new Date().toISOString()
            })
            .eq('driver', user?.name || '')
            .then(() => {})
            .catch(() => {});
        } catch {}
      },
      err => {
        console.warn('Erro ao coletar GPS do entregador:', err.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 2000,
        timeout: 10000
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [isDriverTransmitting, selectedTruckId, user?.name]);

  // Abre rota completa no Google Maps Nativo
  const handleOpenGoogleMapsExternal = () => {
    if (!selectedTruck) return;
    const origin = `${selectedTruck.lat},${selectedTruck.lng}`;
    const stops = selectedTruck.assignedStops;

    if (stops.length === 0) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${origin}`, '_blank');
      return;
    }

    const destination = `${stops[stops.length - 1].lat},${stops[stops.length - 1].lng}`;
    const waypoints = stops.slice(0, stops.length - 1).map(s => `${s.lat},${s.lng}`).join('|');

    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${
      waypoints ? `&waypoints=${waypoints}` : ''
    }&travelmode=driving`;

    window.open(url, '_blank');
  };

  return (
    <div className={`relative w-full rounded-3xl overflow-hidden border shadow-xl flex flex-col ${
      isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
    } ${className}`}>
      
      {/* Barra Superior de Status & Controles de Gestão */}
      <div className={`p-4 border-b flex flex-col md:flex-row items-start md:items-center justify-between gap-3 ${
        isDarkMode ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-600/10 dark:bg-blue-400/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm">
            <Radio className="size-5 animate-pulse text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-sm md:text-base leading-tight">
                Rastreamento da Frota & Caminhão de Reposição
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-ping" />
                Tempo Real
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Deslocamento exato via satélite com cálculo de rotas otimizadas entre paradas (Google Maps)
            </p>
          </div>
        </div>

        {/* Seleção do Veículo e Ações Rápidas */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-between md:justify-end">
          <select
            value={selectedTruckId}
            onChange={(e) => setSelectedTruckId(e.target.value)}
            className={`px-3 py-2 rounded-xl text-xs font-bold border ${
              isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
            }`}
          >
            {vehicles.map(v => (
              <option key={v.id} value={v.id}>
                🚚 {v.name} ({v.plate})
              </option>
            ))}
          </select>

          {/* Toggle Seguir Veículo */}
          <button
            onClick={() => setFollowVehicle(!followVehicle)}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
              followVehicle 
                ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20' 
                : isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
            }`}
            title="Mantém a câmera centralizada no caminhão enquanto ele se desloca"
          >
            <Compass size={14} className={followVehicle ? 'animate-spin' : ''} />
            <span>Seguir</span>
          </button>

          {/* Botão de Simulação de Percurso (Para Testes e Demonstrações de Deslocamento) */}
          <button
            onClick={() => setIsSimulating(!isSimulating)}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
              isSimulating 
                ? 'bg-amber-500 text-white border-amber-600 shadow-md shadow-amber-500/20' 
                : isDarkMode ? 'bg-slate-800 border-slate-700 text-amber-400' : 'bg-white border-amber-200 text-amber-600'
            }`}
            title="Simula o deslocamento do caminhão em tempo real pelas vias de João Pessoa"
          >
            {isSimulating ? <Square size={14} /> : <Play size={14} />}
            <span>{isSimulating ? 'Pausar Teste' : 'Simular Movimento'}</span>
          </button>

          {/* Transmissor do Entregador */}
          <button
            onClick={() => setIsDriverTransmitting(!isDriverTransmitting)}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
              isDriverTransmitting 
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-500/20' 
                : isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
            }`}
            title="Usa o GPS do seu smartphone/notebook para transmitir localização real ao vivo"
          >
            <Radio size={14} className={isDriverTransmitting ? 'animate-pulse' : ''} />
            <span>{isDriverTransmitting ? 'Transmitindo GPS' : 'Ativar Meu GPS'}</span>
          </button>
        </div>
      </div>

      {/* Grid de Métricas do Caminhão Selecionado */}
      {selectedTruck && (
        <div className={`px-4 py-3 border-b grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs ${
          isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50/50 border-slate-200'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 shrink-0">
              <Truck size={16} />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">Veículo / Motorista</span>
              <strong className="font-bold truncate max-w-[130px] block">
                {selectedTruck.driverName}
              </strong>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
              <Gauge size={16} />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">Velocidade Atual</span>
              <strong className="font-bold text-emerald-600 dark:text-emerald-400">
                {selectedTruck.speedKmH} km/h
              </strong>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600 shrink-0">
              <RouteIcon size={16} />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">Rota Otimizada</span>
              <strong className="font-bold text-purple-600 dark:text-purple-400">
                {optimizedRouteData ? `${optimizedRouteData.totalDistanceKm} km (${optimizedRouteData.totalDurationMin} min)` : 'Calculando...'}
              </strong>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0">
              <ListOrdered size={16} />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">Paradas / Entregas</span>
              <strong className="font-bold">
                {selectedTruck.assignedStops?.length || 0} paradas na escala
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* Área do Mapa Google Maps */}
      <div className="relative w-full h-[520px] md:h-[600px]">
        <APIProvider 
          apiKey={effectiveApiKey}
          solutionChannel="gmp_mcp_codeassist_v1_aistudio"
        >
          <GoogleMap
            defaultCenter={selectedTruck ? { lat: selectedTruck.lat, lng: selectedTruck.lng } : DEFAULT_CENTER}
            defaultZoom={13}
            mapId="DEMO_MAP_ID"
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            gestureHandling="greedy"
            disableDefaultUI={false}
            style={{ width: '100%', height: '100%' }}
          >
            {/* Camada controladora de rota e centralização */}
            <DirectionsAndRouteLayer
              selectedTruck={selectedTruck}
              optimizedRoute={optimizedRouteData}
              onRouteCalculated={setOptimizedRouteData}
              followVehicle={followVehicle}
            />

            {/* Marcadores dos Veículos / Caminhões */}
            {vehicles.map(veh => {
              const isSelected = veh.id === selectedTruckId;
              return (
                <AdvancedMarker
                  key={veh.id}
                  position={{ lat: veh.lat, lng: veh.lng }}
                  onClick={() => {
                    setSelectedTruckId(veh.id);
                    setActiveMarkerInfo({ type: 'truck', data: veh });
                  }}
                  title={`${veh.name} - ${veh.speedKmH} km/h`}
                >
                  <div className="relative flex flex-col items-center cursor-pointer transition-transform duration-300 hover:scale-110">
                    {/* Badge flutuante de velocidade */}
                    <span className="mb-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-900 text-white shadow-md border border-white/20 whitespace-nowrap flex items-center gap-1">
                      <span className={`size-1.5 rounded-full ${veh.speedKmH > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                      {veh.speedKmH} km/h
                    </span>

                    {/* Ícone de Veículo com indicador de direção */}
                    <div className={`p-2.5 rounded-2xl shadow-xl border-2 flex items-center justify-center transition-all ${
                      isSelected 
                        ? 'bg-blue-600 text-white border-white scale-110 shadow-blue-500/50 ring-4 ring-blue-500/30' 
                        : 'bg-slate-900 text-yellow-300 border-yellow-400 shadow-black/40'
                    }`}>
                      <Truck size={22} className={veh.speedKmH > 5 ? 'animate-bounce' : ''} />
                    </div>

                    {/* Placa do caminhão */}
                    <span className="mt-1 px-1.5 py-0.2 rounded bg-white text-slate-900 font-extrabold text-[9px] shadow-sm border border-slate-300">
                      {veh.plate}
                    </span>
                  </div>
                </AdvancedMarker>
              );
            })}

            {/* Marcadores das Paradas de Entrega / Reposição */}
            {selectedTruck?.assignedStops?.map((stop, idx) => {
              const stopNumber = stop.order || idx + 1;
              return (
                <AdvancedMarker
                  key={String(stop.id)}
                  position={{ lat: stop.lat, lng: stop.lng }}
                  onClick={() => {
                    setActiveMarkerInfo({ type: 'stop', data: stop });
                    if (onSelectDelivery) onSelectDelivery(stop.id);
                  }}
                  title={`Parada ${stopNumber}: ${stop.customerName}`}
                >
                  <div className="relative flex flex-col items-center cursor-pointer transition-transform hover:scale-110">
                    <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shadow-lg border-2 border-white ring-2 ring-emerald-500/30">
                      {stopNumber}
                    </div>
                    <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-white/95 text-slate-900 shadow-sm border border-slate-200 mt-0.5 max-w-[90px] truncate">
                      {stop.neighborhood}
                    </span>
                  </div>
                </AdvancedMarker>
              );
            })}

            {/* Janela de Informações (InfoWindow) */}
            {activeMarkerInfo && (
              <InfoWindow
                position={
                  activeMarkerInfo.type === 'truck'
                    ? { lat: activeMarkerInfo.data.lat, lng: activeMarkerInfo.data.lng }
                    : { lat: activeMarkerInfo.data.lat, lng: activeMarkerInfo.data.lng }
                }
                onCloseClick={() => setActiveMarkerInfo(null)}
              >
                <div className="p-2 min-w-[220px] max-w-[280px] text-slate-900 font-sans">
                  {activeMarkerInfo.type === 'truck' ? (
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-700">
                          Caminhão de Reposição
                        </span>
                        <span className="text-[10px] font-bold text-slate-500">
                          {activeMarkerInfo.data.plate}
                        </span>
                      </div>
                      <h4 className="font-extrabold text-sm text-slate-900 mb-1">
                        {activeMarkerInfo.data.name}
                      </h4>
                      <p className="text-xs text-slate-600 mb-1">
                        Motorista: <strong>{activeMarkerInfo.data.driverName}</strong>
                      </p>
                      <p className="text-xs text-slate-600 mb-2">
                        Velocidade: <strong className="text-emerald-600">{activeMarkerInfo.data.speedKmH} km/h</strong>
                      </p>
                      <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100">
                        {activeMarkerInfo.data.driverPhone && (
                          <a
                            href={`tel:${activeMarkerInfo.data.driverPhone}`}
                            className="flex-1 px-2.5 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-[11px] text-center flex items-center justify-center gap-1"
                          >
                            <Phone size={12} /> Ligar
                          </a>
                        )}
                        <button
                          onClick={handleOpenGoogleMapsExternal}
                          className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] text-center flex items-center justify-center gap-1"
                        >
                          <Navigation size={12} /> Navegar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                          Parada #{activeMarkerInfo.data.order || 1}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500">
                          {activeMarkerInfo.data.status}
                        </span>
                      </div>
                      <h4 className="font-extrabold text-sm text-slate-900 mb-1">
                        {activeMarkerInfo.data.customerName || 'Ponto de Entrega'}
                      </h4>
                      <p className="text-xs text-slate-600 mb-1 flex items-start gap-1">
                        <MapPin size={12} className="mt-0.5 shrink-0 text-slate-400" />
                        <span>{activeMarkerInfo.data.address}</span>
                      </p>
                      {activeMarkerInfo.data.product && (
                        <p className="text-[11px] text-slate-500 mb-2">
                          Carga: {activeMarkerInfo.data.product}
                        </p>
                      )}
                      <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                        <span className="text-xs font-black text-slate-900">
                          {activeMarkerInfo.data.value ? `R$ ${activeMarkerInfo.data.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ''}
                        </span>
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${activeMarkerInfo.data.lat},${activeMarkerInfo.data.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-0.5"
                        >
                          GPS <ExternalLink size={10} />
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </InfoWindow>
            )}
          </GoogleMap>
        </APIProvider>

        {/* Floating Action Button: Abrir Navegação Completa no Google Maps */}
        <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2">
          <button
            onClick={handleOpenGoogleMapsExternal}
            className="px-4 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black text-xs shadow-2xl flex items-center gap-2 transition-all border border-white/20 backdrop-blur-md"
            title="Abre todas as paradas no aplicativo oficial do Google Maps para navegação curva a curva"
          >
            <Navigation size={16} />
            <span>Navegar no Google Maps</span>
          </button>
        </div>
      </div>

      {/* Painel Inferior de Paradas Otimizadas da Rota */}
      {selectedTruck?.assignedStops && selectedTruck.assignedStops.length > 0 && (
        <div className={`p-4 border-t ${isDarkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <RouteIcon size={16} className="text-blue-500" />
              <h4 className="font-black text-xs uppercase tracking-wider">
                Ordem Otimizada das Paradas ({selectedTruck.assignedStops.length} pontos de reposição)
              </h4>
            </div>
            {optimizedRouteData && (
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Extensão Total: <strong>{optimizedRouteData.totalDistanceKm} km</strong> • Tempo estimado: <strong>{optimizedRouteData.totalDurationMin} min</strong>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {selectedTruck.assignedStops.map((stop, idx) => {
              const stopNumber = stop.order || idx + 1;
              return (
                <div
                  key={String(stop.id)}
                  onClick={() => {
                    setActiveMarkerInfo({ type: 'stop', data: stop });
                    if (onSelectDelivery) onSelectDelivery(stop.id);
                  }}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer hover:shadow-md ${
                    isDarkMode 
                      ? 'bg-slate-900/80 border-slate-800 hover:border-blue-500/50' 
                      : 'bg-white border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-black text-[10px] flex items-center justify-center shrink-0">
                      {stopNumber}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      stop.status === 'Finalizada'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : stop.status === 'Em Andamento'
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}>
                      {stop.status}
                    </span>
                  </div>
                  <h5 className="font-bold text-xs truncate mb-0.5">
                    {stop.customerName || `Parada #${stopNumber}`}
                  </h5>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {stop.neighborhood} - {stop.city}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
