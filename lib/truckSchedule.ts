import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export interface TruckArrivalRecord {
  id: string;
  arrival_date: string; // ISO date or YYYY-MM-DD
  driver_name: string;
  assistant_name?: string;
  notes?: string;
  comments?: string; // Campo dedicado para comentários/ocorrências (mercadorias avariadas, faltas/sobras físicas, divergências de NF)
  created_at: string;
  created_by?: string;
  company_id?: string;
}

export interface TruckScheduleData {
  next_arrival_date: string | null; // Data do próximo carro (ex: "2026-10-05" ou "2026-10-05T10:00")
  last_arrival_date: string | null; // Data do último carro (ex: "2026-09-28")
  history: TruckArrivalRecord[];
  updated_at?: string;
  updated_by_name?: string;
}

const LOCAL_STORAGE_KEY = 'agentex_truck_schedule_v1';
export const TRUCK_SCHEDULE_EVENT = 'agentex:truck_schedule_updated';

export const DEFAULT_TRUCK_SCHEDULE: TruckScheduleData = {
  next_arrival_date: '2026-10-21',
  last_arrival_date: '2026-10-08',
  history: [
    {
      id: 'truck_rec_20261008',
      arrival_date: '2026-10-08',
      driver_name: 'Carlos Eduardo',
      assistant_name: 'Marcos Souza',
      notes: 'Recebimento de 480 caixas de peças e lubrificantes estocado com sucesso.',
      comments: 'Carga recebida 100% conforme sem divergências.',
      created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      created_by: 'Gestão de Estoque'
    }
  ],
  updated_at: new Date().toISOString(),
  updated_by_name: 'Adriano Nascimento'
};

export function getLocalTruckSchedule(): TruckScheduleData {
  if (typeof window === 'undefined') return DEFAULT_TRUCK_SCHEDULE;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return DEFAULT_TRUCK_SCHEDULE;
    const parsed = JSON.parse(raw);
    return {
      next_arrival_date: parsed.next_arrival_date || null,
      last_arrival_date: parsed.last_arrival_date || null,
      history: Array.isArray(parsed.history) ? parsed.history : [],
      updated_at: parsed.updated_at,
      updated_by_name: parsed.updated_by_name
    };
  } catch (e) {
    console.warn('Erro ao ler dados de caminhão do localStorage:', e);
    return DEFAULT_TRUCK_SCHEDULE;
  }
}

export function saveLocalTruckSchedule(data: TruckScheduleData) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Erro ao salvar dados de caminhão no localStorage:', e);
  }
}

/**
 * Busca a agenda do caminhão de reposição de forma garantida para todos os usuários:
 * 1. Tenta o endpoint seguro de API (/api/truck-schedule) do servidor
 * 2. Em caso de falha de rede/offline, consulta o Supabase client
 * 3. Fallback resiliente para o cache local sincronizado
 */
export async function fetchTruckSchedule(): Promise<TruckScheduleData> {
  const localData = getLocalTruckSchedule();

  // 1. Tentar via API route (sempre disponível, resolve conflitos entre clientes e adblockers)
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/truck-schedule', {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        cache: 'no-store'
      });
      if (res.ok) {
        const json = await res.json();
        if (json && (json.next_arrival_date !== undefined || json.last_arrival_date !== undefined || Array.isArray(json.history))) {
          const schedule: TruckScheduleData = {
            next_arrival_date: json.next_arrival_date || null,
            last_arrival_date: json.last_arrival_date || null,
            history: Array.isArray(json.history) ? json.history : [],
            updated_at: json.updated_at,
            updated_by_name: json.updated_by_name
          };
          saveLocalTruckSchedule(schedule);
          return schedule;
        }
      }
    } catch (apiErr) {
      // Fallback para Supabase direto
    }
  }

  // 2. Consulta direta via Supabase Client
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'truck_replenishment_schedule')
        .maybeSingle();

      if (!error && data?.value) {
        const merged: TruckScheduleData = {
          next_arrival_date: data.value.next_arrival_date || null,
          last_arrival_date: data.value.last_arrival_date || null,
          history: Array.isArray(data.value.history) ? data.value.history : [],
          updated_at: data.value.updated_at,
          updated_by_name: data.value.updated_by_name
        };
        saveLocalTruckSchedule(merged);
        return merged;
      }
    } catch (err) {
      console.warn('Falha na requisição direta Supabase de caminhão:', err);
    }
  }

  return localData;
}

/**
 * Atualiza a agenda e propaga imediatamente para todos os clientes e componentes
 */
export async function updateTruckSchedule(newData: {
  next_arrival_date?: string | null;
  last_arrival_date?: string | null;
  history?: TruckArrivalRecord[];
  newRecord?: {
    id?: string;
    arrival_date: string;
    driver_name: string;
    assistant_name?: string;
    notes?: string;
    comments?: string;
    created_at?: string;
  };
  updateRecord?: {
    id: string;
    arrival_date?: string;
    comments?: string;
    notes?: string;
    driver_name?: string;
    assistant_name?: string;
  };
  deletedRecordId?: string;
  deletedRecord?: Partial<TruckArrivalRecord>;
  updated_by_name?: string;
}): Promise<{ success: boolean; data: TruckScheduleData; message?: string }> {
  try {
    // 1. Tentar salvar via API route centralizada
    let savedData: TruckScheduleData | null = null;
    try {
      const res = await fetch('/api/truck-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newData)
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          savedData = json.data;
        }
      }
    } catch (e) {
      console.warn('Aviso: POST /api/truck-schedule indisponível, usando fallback direto:', e);
    }

    // Se a API route salvou, salva localmente e dispara os eventos
    if (savedData) {
      saveLocalTruckSchedule(savedData);
      notifyScheduleChanged(savedData);
      return { success: true, data: savedData };
    }

    // 2. Fallback local e direto no Supabase caso a API falhe
    const current = await fetchTruckSchedule();
    let updatedHistory: TruckArrivalRecord[] = [...(current.history || [])];

    if (Array.isArray(newData.history)) {
      updatedHistory = [...newData.history];
    } else {
      if (newData.deletedRecordId || newData.deletedRecord) {
        const targetId = newData.deletedRecordId ? String(newData.deletedRecordId).trim() : '';
        const delRec = newData.deletedRecord;

        updatedHistory = updatedHistory.filter(h => {
          if (targetId && String(h.id).trim() === targetId) return false;
          if (delRec?.id && String(h.id).trim() === String(delRec.id).trim()) return false;
          if (delRec?.arrival_date && delRec?.driver_name &&
              String(h.arrival_date).trim() === String(delRec.arrival_date).trim() &&
              String(h.driver_name).trim().toLowerCase() === String(delRec.driver_name).trim().toLowerCase()) {
            return false;
          }
          return true;
        });
      }

      if (newData.updateRecord) {
        const editId = String(newData.updateRecord.id).trim();
        updatedHistory = updatedHistory.map(h => {
          if (String(h.id).trim() === editId) {
            return {
              ...h,
              ...(newData.updateRecord?.arrival_date !== undefined ? { arrival_date: newData.updateRecord.arrival_date } : {}),
              ...(newData.updateRecord?.comments !== undefined ? { comments: newData.updateRecord.comments } : {}),
              ...(newData.updateRecord?.notes !== undefined ? { notes: newData.updateRecord.notes } : {}),
              ...(newData.updateRecord?.driver_name !== undefined ? { driver_name: newData.updateRecord.driver_name } : {}),
              ...(newData.updateRecord?.assistant_name !== undefined ? { assistant_name: newData.updateRecord.assistant_name } : {}),
            };
          }
          return h;
        });
      }

      if (newData.newRecord) {
        const newEntry: TruckArrivalRecord = {
          id: newData.newRecord.id || `truck_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          arrival_date: newData.newRecord.arrival_date,
          driver_name: newData.newRecord.driver_name,
          assistant_name: newData.newRecord.assistant_name || '',
          notes: newData.newRecord.notes || '',
          comments: newData.newRecord.comments || '',
          created_at: newData.newRecord.created_at || new Date().toISOString(),
          created_by: newData.updated_by_name || 'Usuário'
        };
        updatedHistory = [newEntry, ...updatedHistory];
      }
    }

    updatedHistory.sort((a, b) => 
      new Date(b.arrival_date).getTime() - new Date(a.arrival_date).getTime()
    );

    const nextDate = newData.next_arrival_date !== undefined ? newData.next_arrival_date : current.next_arrival_date;
    let lastDate: string | null = null;
    if (updatedHistory.length > 0) {
      lastDate = updatedHistory[0].arrival_date;
    } else if (newData.last_arrival_date !== undefined) {
      lastDate = newData.last_arrival_date;
    } else {
      lastDate = null;
    }

    const payload: TruckScheduleData = {
      next_arrival_date: nextDate,
      last_arrival_date: lastDate,
      history: updatedHistory,
      updated_at: new Date().toISOString(),
      updated_by_name: newData.updated_by_name || 'Gestão'
    };

    saveLocalTruckSchedule(payload);

    if (isSupabaseConfigured) {
      await supabase
        .from('system_settings')
        .upsert(
          {
            key: 'truck_replenishment_schedule',
            value: payload,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'key' }
        );
    }

    notifyScheduleChanged(payload);
    return { success: true, data: payload };
  } catch (error: any) {
    console.error('Erro ao atualizar agenda de caminhão:', error);
    return { success: false, data: getLocalTruckSchedule(), message: error.message };
  }
}

/**
 * Notifica todas as abas e componentes da tela sobre alterações na agenda
 */
function notifyScheduleChanged(data: TruckScheduleData) {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent(TRUCK_SCHEDULE_EVENT, { detail: data }));
    if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel('agentex_truck_channel');
      channel.postMessage({ type: 'UPDATE', data });
      channel.close();
    }
  } catch (e) {
    // ignore
  }
}

/**
 * Registra listener para manter componentes sincronizados em tempo real
 */
export function subscribeTruckSchedule(callback: (data: TruckScheduleData) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleCustomEvent = (e: Event) => {
    const custom = e as CustomEvent;
    if (custom.detail) {
      callback(custom.detail);
    }
  };

  const handleStorage = (e: StorageEvent) => {
    if (e.key === LOCAL_STORAGE_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        callback(parsed);
      } catch {}
    }
  };

  window.addEventListener(TRUCK_SCHEDULE_EVENT, handleCustomEvent);
  window.addEventListener('storage', handleStorage);

  let bc: BroadcastChannel | null = null;
  if ('BroadcastChannel' in window) {
    try {
      bc = new BroadcastChannel('agentex_truck_channel');
      bc.onmessage = (event) => {
        if (event.data?.type === 'UPDATE' && event.data.data) {
          callback(event.data.data);
        }
      };
    } catch {}
  }

  return () => {
    window.removeEventListener(TRUCK_SCHEDULE_EVENT, handleCustomEvent);
    window.removeEventListener('storage', handleStorage);
    if (bc) {
      bc.close();
    }
  };
}
