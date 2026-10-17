import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSafeSupabaseConfig } from '@/lib/supabase';
import { DEFAULT_TRUCK_SCHEDULE, TruckScheduleData, TruckArrivalRecord } from '@/lib/truckSchedule';

function getAdminClient() {
  const { isConfigured, supabaseUrl, supabaseServiceKey, supabaseAnonKey } = getSafeSupabaseConfig();

  if (!isConfigured) {
    return null;
  }

  if (supabaseServiceKey && supabaseServiceKey !== 'placeholder-key') {
    return createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });
  }

  if (supabaseAnonKey && supabaseAnonKey !== 'placeholder-key') {
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false }
    });
  }

  return null;
}

const SETTING_KEY = 'truck_replenishment_schedule';

// In-memory fallback if database is temporarily unavailable
let inMemorySchedule: TruckScheduleData = { ...DEFAULT_TRUCK_SCHEDULE };

export async function GET() {
  try {
    const client = getAdminClient();
    if (!client) {
      return NextResponse.json(inMemorySchedule, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
    }

    const { data, error } = await client
      .from('system_settings')
      .select('value, updated_at')
      .eq('key', SETTING_KEY)
      .maybeSingle();

    if (!error && data?.value) {
      const schedule: TruckScheduleData = {
        next_arrival_date: data.value.next_arrival_date || null,
        last_arrival_date: data.value.last_arrival_date || null,
        history: Array.isArray(data.value.history) ? data.value.history : [],
        updated_at: data.value.updated_at || data.updated_at,
        updated_by_name: data.value.updated_by_name || 'Gestão'
      };
      inMemorySchedule = schedule;
      return NextResponse.json(schedule, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
    }

    return NextResponse.json(inMemorySchedule, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
  } catch (err: any) {
    console.warn('Erro ao buscar agenda de reposição de caminhão:', err);
    return NextResponse.json(inMemorySchedule);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const client = getAdminClient();

    // 1. Obter estado atual
    let current = { ...inMemorySchedule };
    if (client) {
      const { data } = await client
        .from('system_settings')
        .select('value')
        .eq('key', SETTING_KEY)
        .maybeSingle();
      if (data?.value) {
        current = {
          next_arrival_date: data.value.next_arrival_date || null,
          last_arrival_date: data.value.last_arrival_date || null,
          history: Array.isArray(data.value.history) ? data.value.history : [],
          updated_at: data.value.updated_at,
          updated_by_name: data.value.updated_by_name
        };
      }
    }

    let updatedHistory = [...(current.history || [])];

    if (body.deletedRecordId) {
      updatedHistory = updatedHistory.filter(h => h.id !== body.deletedRecordId);
    }

    if (body.updateRecord) {
      updatedHistory = updatedHistory.map(h => {
        if (h.id === body.updateRecord?.id) {
          return {
            ...h,
            ...(body.updateRecord.comments !== undefined ? { comments: body.updateRecord.comments } : {}),
            ...(body.updateRecord.notes !== undefined ? { notes: body.updateRecord.notes } : {}),
            ...(body.updateRecord.driver_name !== undefined ? { driver_name: body.updateRecord.driver_name } : {}),
            ...(body.updateRecord.assistant_name !== undefined ? { assistant_name: body.updateRecord.assistant_name } : {}),
          };
        }
        return h;
      });
    }

    if (body.newRecord) {
      const newEntry: TruckArrivalRecord = {
        id: `truck_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        arrival_date: body.newRecord.arrival_date,
        driver_name: body.newRecord.driver_name,
        assistant_name: body.newRecord.assistant_name || '',
        notes: body.newRecord.notes || '',
        comments: body.newRecord.comments || '',
        created_at: new Date().toISOString(),
        created_by: body.updated_by_name || 'Usuário'
      };

      updatedHistory = [newEntry, ...updatedHistory].sort((a, b) => 
        new Date(b.arrival_date).getTime() - new Date(a.arrival_date).getTime()
      );
    }

    const nextDate = body.next_arrival_date !== undefined ? body.next_arrival_date : current.next_arrival_date;
    let lastDate = body.last_arrival_date !== undefined ? body.last_arrival_date : current.last_arrival_date;

    if (body.newRecord && (!lastDate || new Date(body.newRecord.arrival_date).getTime() >= new Date(lastDate).getTime())) {
      lastDate = body.newRecord.arrival_date;
    }

    const payload: TruckScheduleData = {
      next_arrival_date: nextDate,
      last_arrival_date: lastDate,
      history: updatedHistory,
      updated_at: new Date().toISOString(),
      updated_by_name: body.updated_by_name || 'Gestão'
    };

    inMemorySchedule = payload;

    if (client) {
      const { error: upsertErr } = await client
        .from('system_settings')
        .upsert(
          {
            key: SETTING_KEY,
            value: payload,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'key' }
        );

      if (upsertErr) {
        console.warn('Aviso ao salvar system_settings no Supabase:', upsertErr);
      }
    }

    return NextResponse.json({ success: true, data: payload });
  } catch (err: any) {
    console.error('Erro no POST /api/truck-schedule:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
