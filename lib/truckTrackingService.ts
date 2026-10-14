'use client';

import { supabase } from '@/lib/supabaseClient';

export interface LiveVehiclePosition {
  id: string; // vehicle id or delivery id
  vehicle_name: string;
  vehicle_type: 'caminhao' | 'fiorino' | 'moto';
  plate: string;
  driver_name: string;
  driver_phone?: string;
  status: 'Em Rota' | 'Parado' | 'Entregando' | 'Retornando à Base' | 'Finalizado';
  lat: number;
  lng: number;
  speed_kmh: number;
  heading_deg: number;
  accuracy_meters: number;
  last_updated: string;
  is_simulated?: boolean;
  battery_level?: number;
  current_stop_index?: number;
  total_stops?: number;
  next_stop_name?: string;
  eta_minutes?: number;
  total_distance_km?: number;
  stops?: DeliveryStop[];
}

export interface DeliveryStop {
  id: string | number;
  seq: number;
  title: string;
  recipient: string;
  address: string;
  neighborhood?: string;
  city?: string;
  lat: number;
  lng: number;
  status: 'Pendente' | 'Concluída' | 'A caminho';
  estimated_arrival?: string;
  notes?: string;
}

// Garagem / Centro de Distribuição Central (João Pessoa / PB)
export const WAREHOUSE_DEPOT = {
  name: 'Centro de Distribuição & Logística Central',
  address: 'Av. Epitácio Pessoa, 1250 - Estados, João Pessoa - PB',
  lat: -7.1197,
  lng: -34.8619,
};

// Caminhões e veículos padrão para inicialização / rastreamento
export const DEFAULT_VEHICLES: LiveVehiclePosition[] = [
  {
    id: 'truck-reposicao-01',
    vehicle_name: 'Caminhão de Reposição Principal',
    vehicle_type: 'caminhao',
    plate: 'DFG-5544',
    driver_name: 'João Pereira',
    driver_phone: '(83) 99123-4567',
    status: 'Em Rota',
    lat: -7.1186,
    lng: -34.8450,
    speed_kmh: 42,
    heading_deg: 85,
    accuracy_meters: 6,
    last_updated: new Date().toISOString(),
    is_simulated: true,
    battery_level: 89,
    current_stop_index: 1,
    total_stops: 4,
    next_stop_name: 'Supermercado Manaíra - Carga Geral',
    eta_minutes: 14,
    total_distance_km: 18.5,
    stops: [
      {
        id: 'stop-1',
        seq: 1,
        title: 'Reposição de Loja Manaíra',
        recipient: 'Loja Filial 02',
        address: 'Av. Gov. Flávio Ribeiro Coutinho, 800 - Manaíra',
        neighborhood: 'Manaíra',
        city: 'João Pessoa',
        lat: -7.0984,
        lng: -34.8347,
        status: 'A caminho',
        estimated_arrival: '10:30'
      },
      {
        id: 'stop-2',
        seq: 2,
        title: 'Descarregamento Estoque Bessa',
        recipient: 'Depósito Avançado Bessa',
        address: 'Rua Arthur Monteiro de Paiva, 350 - Bessa',
        neighborhood: 'Bessa',
        city: 'João Pessoa',
        lat: -7.0656,
        lng: -34.8336,
        status: 'Pendente',
        estimated_arrival: '11:15'
      },
      {
        id: 'stop-3',
        seq: 3,
        title: 'Transferência Cabedelo',
        recipient: 'Galpão Portuário',
        address: 'BR-230, Km 9 - Intermares',
        neighborhood: 'Intermares',
        city: 'Cabedelo',
        lat: -7.0345,
        lng: -34.8378,
        status: 'Pendente',
        estimated_arrival: '12:00'
      },
      {
        id: 'stop-4',
        seq: 4,
        title: 'Retorno ao CD',
        recipient: 'Base Operacional',
        address: 'Av. Epitácio Pessoa, 1250 - Estados',
        neighborhood: 'Estados',
        city: 'João Pessoa',
        lat: -7.1197,
        lng: -34.8619,
        status: 'Pendente',
        estimated_arrival: '12:45'
      }
    ]
  },
  {
    id: 'fiorino-express-02',
    vehicle_name: 'Fiorino Peças & Urgências',
    vehicle_type: 'fiorino',
    plate: 'ABC-1234',
    driver_name: 'Roberto Silva',
    driver_phone: '(83) 98765-4321',
    status: 'Entregando',
    lat: -7.1558,
    lng: -34.8467,
    speed_kmh: 0,
    heading_deg: 180,
    accuracy_meters: 4,
    last_updated: new Date().toISOString(),
    is_simulated: true,
    battery_level: 95,
    current_stop_index: 2,
    total_stops: 3,
    next_stop_name: 'Hospital Universitário - Equipamentos',
    eta_minutes: 8,
    total_distance_km: 12.2,
    stops: [
      {
        id: 'stop-f1',
        seq: 1,
        title: 'Entrega Peça Bancários',
        recipient: 'Dr. Silva',
        address: 'Rua Bancário Sérgio Guerra, 400 - Bancários',
        neighborhood: 'Bancários',
        city: 'João Pessoa',
        lat: -7.1558,
        lng: -34.8467,
        status: 'Concluída',
        estimated_arrival: '09:45'
      },
      {
        id: 'stop-f2',
        seq: 2,
        title: 'Manutenção Hospitalar',
        recipient: 'Setor de Engenharia Clínica',
        address: 'Campus I - UFPB, Castelo Branco',
        neighborhood: 'Castelo Branco',
        city: 'João Pessoa',
        lat: -7.1396,
        lng: -34.8517,
        status: 'A caminho',
        estimated_arrival: '10:20'
      },
      {
        id: 'stop-f3',
        seq: 3,
        title: 'Retorno ao CD',
        recipient: 'Base Operacional',
        address: 'Av. Epitácio Pessoa, 1250',
        neighborhood: 'Estados',
        city: 'João Pessoa',
        lat: -7.1197,
        lng: -34.8619,
        status: 'Pendente',
        estimated_arrival: '11:00'
      }
    ]
  }
];

const LOCAL_STORAGE_KEY = 'agentx_live_fleet_positions_v1';

// Obter posições do cache local
export function getLocalFleetPositions(): LiveVehiclePosition[] {
  if (typeof window === 'undefined') return DEFAULT_VEHICLES;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return DEFAULT_VEHICLES;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_VEHICLES;
  } catch {
    return DEFAULT_VEHICLES;
  }
}

// Salvar posições localmente
export function saveLocalFleetPositions(vehicles: LiveVehiclePosition[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(vehicles));
  } catch (e) {
    console.warn('Erro ao salvar frota no localStorage:', e);
  }
}

// Sincronizar posição de um veículo
export async function updateVehicleGps(positionUpdate: Partial<LiveVehiclePosition> & { id: string }) {
  const current = getLocalFleetPositions();
  const updated = current.map(v => {
    if (v.id === positionUpdate.id) {
      return {
        ...v,
        ...positionUpdate,
        last_updated: new Date().toISOString()
      };
    }
    return v;
  });

  saveLocalFleetPositions(updated);

  // Enviar broadcast em tempo real via Supabase Realtime Channel
  try {
    const channel = supabase.channel('truck-live-gps');
    await channel.send({
      type: 'broadcast',
      event: 'gps_update',
      payload: positionUpdate
    });
  } catch (e) {
    console.warn('Supabase broadcast skip:', e);
  }

  return updated;
}

// Algoritmo para otimização da rota de paradas (Nearest Neighbor TSP)
export function optimizeStopsSequence(
  startPoint: { lat: number; lng: number },
  stops: DeliveryStop[]
): DeliveryStop[] {
  if (!stops || stops.length <= 1) return stops;

  const calculateDistance = (p1: { lat: number; lng: number }, p2: { lat: number; lng: number }) => {
    const R = 6371; // km
    const dLat = (p2.lat - p1.lat) * (Math.PI / 180);
    const dLng = (p2.lng - p1.lng) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(p1.lat * (Math.PI / 180)) *
      Math.cos(p2.lat * (Math.PI / 180)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const remaining = [...stops];
  const optimized: DeliveryStop[] = [];
  let currentPos = startPoint;

  while (remaining.length > 0) {
    let nearestIndex = 0;
    let minDistance = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const dist = calculateDistance(currentPos, remaining[i]);
      if (dist < minDistance) {
        minDistance = dist;
        nearestIndex = i;
      }
    }

    const nextStop = remaining.splice(nearestIndex, 1)[0];
    optimized.push(nextStop);
    currentPos = { lat: nextStop.lat, lng: nextStop.lng };
  }

  // Renumerar sequência
  return optimized.map((s, idx) => ({
    ...s,
    seq: idx + 1
  }));
}

// Helper para calcular distância total em km de uma lista de coordenadas
export function calculatePolylineDistanceKm(path: { lat: number; lng: number }[]): number {
  if (path.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const p1 = path[i];
    const p2 = path[i + 1];
    const R = 6371;
    const dLat = (p2.lat - p1.lat) * (Math.PI / 180);
    const dLng = (p2.lng - p1.lng) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(p1.lat * (Math.PI / 180)) *
      Math.cos(p2.lat * (Math.PI / 180)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    total += R * c;
  }
  return Number(total.toFixed(1));
}
