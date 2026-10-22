import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';
import { supabase, getSafeSupabaseConfig } from '@/lib/supabase';
import { getDefaultSalesCycleForDate, formatShortDateBR } from '@/lib/salesCycle';

const DEFAULT_VAPID_PUBLIC_KEY =
  'BPrDi0R_L7n0ubuljp_LsSYD2IcckhvrtucPpDGDHBT91VMuoW_0IH2NlJ7fg_qjkXFjnAUosLaPjxuwGqGuOks';
const DEFAULT_VAPID_PRIVATE_KEY = 'vRUi4aUaaPufyu8NB-VjIPkhfzLPamS3bqjPQ4WnPRQ';
const DEFAULT_VAPID_SUBJECT = 'mailto:adrianonascimentu@gmail.com';

const MILESTONE_THRESHOLDS = [50, 75, 100] as const;
export type MilestoneThreshold = (typeof MILESTONE_THRESHOLDS)[number];

export interface MilestoneAlertRecord {
  id: string;
  eventKey: string;
  collaboratorId: string;
  sellerName: string;
  threshold: MilestoneThreshold;
  percentage: number;
  realizedAmount: number;
  targetAmount: number;
  cycleLabel: string;
  refMonth: number;
  refYear: number;
  title: string;
  message: string;
  sentAt: string;
  pushDevicesCount: number;
}

const SETTING_KEY_MILESTONE_LOG = 'sales_milestone_alerts_log_v1';

function initWebPush() {
  const envPub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const envPriv = process.env.VAPID_PRIVATE_KEY;
  const sub = process.env.VAPID_SUBJECT || DEFAULT_VAPID_SUBJECT;

  const pub =
    !envPub || envPub.includes('seu_vapid') || envPub.includes('placeholder') || envPub.length < 80
      ? DEFAULT_VAPID_PUBLIC_KEY
      : envPub;

  const priv =
    !envPriv || envPriv.includes('seu_vapid') || envPriv.includes('placeholder') || envPriv.length < 40
      ? DEFAULT_VAPID_PRIVATE_KEY
      : envPriv;

  try {
    webpush.setVapidDetails(sub, pub, priv);
  } catch (err) {
    console.warn('WebPush VAPID init warning:', err);
  }
}

initWebPush();

function getSupabaseAdmin() {
  const { supabaseUrl, supabaseServiceKey } = getSafeSupabaseConfig();
  return createClient(supabaseUrl, supabaseServiceKey);
}

function buildMilestoneCopy(
  threshold: MilestoneThreshold,
  sellerName: string,
  percentage: number,
  realized: number,
  target: number,
  cycleShortLabel: string
): { title: string; message: string; type: string } {
  const fmtRealized = realized.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const fmtTarget = target.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const remaining = Math.max(0, target - realized).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (threshold === 100) {
    return {
      title: `🏆 Parabéns, ${sellerName}! 100% da Meta Atingida!`,
      message: `Meta mensal batida no ciclo (${cycleShortLabel})! Você alcançou ${percentage.toFixed(
        1
      )}% da meta com R$ ${fmtRealized} vendidos (Meta: R$ ${fmtTarget}). Continue acelerando! 🚀`,
      type: 'milestone_100',
    };
  }

  if (threshold === 75) {
    return {
      title: `🔥 Excelente Ritmo, ${sellerName}! 75% da Meta Atingida!`,
      message: `Você já atingiu ${percentage.toFixed(
        1
      )}% da sua meta mensal no ciclo (${cycleShortLabel}) com R$ ${fmtRealized} vendidos. Faltam apenas R$ ${remaining} para bater 100% da meta!`,
      type: 'milestone_75',
    };
  }

  return {
    title: `🎯 Meio da Meta Alcançado! 50% Atingido (${sellerName})`,
    message: `Bom trabalho, ${sellerName}! Você chegou a ${percentage.toFixed(
      1
    )}% da sua meta mensal no ciclo (${cycleShortLabel}) com R$ ${fmtRealized} realizados. Faltam R$ ${remaining} para a meta total!`,
    type: 'milestone_50',
  };
}

async function getStoredMilestoneLog(): Promise<MilestoneAlertRecord[]> {
  try {
    const { data } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', SETTING_KEY_MILESTONE_LOG)
      .maybeSingle();

    if (data && Array.isArray(data.value)) {
      return data.value as MilestoneAlertRecord[];
    }
  } catch (err) {
    console.warn('Failed reading milestone log from system_settings:', err);
  }
  return [];
}

async function saveMilestoneLog(records: MilestoneAlertRecord[]) {
  try {
    // Keep most recent 250 alerts
    const trimmed = records.slice(0, 250);
    await supabase.from('system_settings').upsert({
      key: SETTING_KEY_MILESTONE_LOG,
      value: trimmed,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Failed saving milestone log:', err);
  }
}

async function sendWebPushToUser(
  targetUserId: string,
  title: string,
  body: string,
  url: string = '/sales-results'
): Promise<number> {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    let subscriptions: any[] = [];

    const { data: subsByProfile } = await supabaseAdmin
      .from('push_subscriptions')
      .select('id, profile_id, subscription')
      .eq('profile_id', targetUserId);

    if (subsByProfile && subsByProfile.length > 0) {
      subscriptions = [...subsByProfile];
    } else {
      try {
        const { data: subsByUser } = await supabaseAdmin
          .from('push_subscriptions')
          .select('id, subscription')
          .eq('user_id', targetUserId);
        if (subsByUser && subsByUser.length > 0) {
          subscriptions = [...subsByUser];
        }
      } catch {}
    }

    if (subscriptions.length === 0) return 0;

    const payload = JSON.stringify({
      title,
      body,
      url,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      timestamp: Date.now(),
    });

    let sentCount = 0;
    await Promise.allSettled(
      subscriptions.map(async (subRecord) => {
        let subObj = subRecord.subscription;
        if (typeof subObj === 'string') {
          try {
            subObj = JSON.parse(subObj);
          } catch {}
        }
        if (!subObj || !subObj.endpoint) return;

        try {
          await webpush.sendNotification(subObj, payload);
          sentCount++;
        } catch (err: any) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            if (subRecord.id) {
              await supabaseAdmin.from('push_subscriptions').delete().eq('id', subRecord.id);
            }
          }
        }
      })
    );

    return sentCount;
  } catch (err) {
    console.warn('Error sending WebPush for milestone:', err);
    return 0;
  }
}

async function insertSupabaseNotification(
  profileId: string,
  title: string,
  message: string,
  type: string,
  eventKey: string
) {
  try {
    const payload: Record<string, any> = {
      profile_id: profileId,
      title,
      message,
      type,
      event_key: eventKey,
      read: false,
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('notifications').insert(payload);
    if (error && (error.code === 'PGRST204' || error.message?.includes('column'))) {
      delete payload.event_key;
      await supabase.from('notifications').insert(payload);
    }
  } catch (err) {
    console.warn('Error inserting notification row:', err);
  }
}

export async function evaluateAndDispatchSalesMilestones(options?: {
  refMonth?: number;
  refYear?: number;
  startDate?: string;
  endDate?: string;
  sellerIds?: string[];
  forceResend?: boolean;
}) {
  const defaultCycle = getDefaultSalesCycleForDate();
  const refMonth = options?.refMonth || defaultCycle.refMonth;
  const refYear = options?.refYear || defaultCycle.refYear;
  const startDate = options?.startDate || defaultCycle.startDate;
  const endDate = options?.endDate || defaultCycle.endDate;
  const cycleShortLabel = `${formatShortDateBR(startDate)} a ${formatShortDateBR(endDate)}`;

  // 1. Fetch sellers
  let profilesQuery = supabase
    .from('profiles')
    .select('id, name, type, can_access_sales')
    .or('type.eq.vendedor,can_access_sales.eq.true');

  if (options?.sellerIds && options.sellerIds.length > 0) {
    profilesQuery = supabase
      .from('profiles')
      .select('id, name, type, can_access_sales')
      .in('id', options.sellerIds);
  }

  const { data: profiles } = await profilesQuery;
  const sellersMap = new Map<string, string>();
  (profiles || []).forEach((p: any) => {
    sellersMap.set(p.id, p.name || 'Vendedor');
  });

  // 2. Fetch sales_results — sellers' informed values in sales_results already correspond to the 26-to-25 cycle
  const [startY, startM] = startDate.split('-').map(Number);
  const [endY, endM] = endDate.split('-').map(Number);

  let salesQuery = supabase
    .from('sales_results')
    .select('collaborator_id, target_2026, result_2026, month, year')
    .eq('month', refMonth)
    .eq('year', refYear);

  if (options?.sellerIds && options.sellerIds.length > 0) {
    salesQuery = salesQuery.in('collaborator_id', options.sellerIds);
  }

  const { data: salesRows } = await salesQuery;
  let activeSalesRows = salesRows || [];

  const hasNonZeroInRef = activeSalesRows.some(
    (r: any) => (Number(r.result_2026) || 0) > 0 || (Number(r.target_2026) || 0) > 0
  );

  if (!hasNonZeroInRef && startM && startY && (startM !== endM || startY !== endY)) {
    let startMonthQuery = supabase
      .from('sales_results')
      .select('collaborator_id, target_2026, result_2026, month, year')
      .eq('month', startM)
      .eq('year', startY);

    if (options?.sellerIds && options.sellerIds.length > 0) {
      startMonthQuery = startMonthQuery.in('collaborator_id', options.sellerIds);
    }

    const { data: startRows } = await startMonthQuery;
    if (
      startRows &&
      startRows.some((r: any) => (Number(r.result_2026) || 0) > 0 || (Number(r.target_2026) || 0) > 0)
    ) {
      activeSalesRows = startRows;
    }
  }

  if (
    !activeSalesRows.some(
      (r: any) => (Number(r.result_2026) || 0) > 0 || (Number(r.target_2026) || 0) > 0
    )
  ) {
    let fallbackQuery = supabase
      .from('sales_results')
      .select('collaborator_id, target_2026, result_2026, month, year')
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .limit(40);

    if (options?.sellerIds && options.sellerIds.length > 0) {
      fallbackQuery = fallbackQuery.in('collaborator_id', options.sellerIds);
    }

    const { data: fallbackRows } = await fallbackQuery;
    if (fallbackRows && fallbackRows.length > 0) {
      const nonZero =
        fallbackRows.find(
          (d: any) => (Number(d.result_2026) || 0) > 0 || (Number(d.target_2026) || 0) > 0
        ) || fallbackRows[0];
      activeSalesRows = fallbackRows.filter(
        (d: any) => d.month === nonZero.month && d.year === nonZero.year
      );
    }
  }

  // Also check daily sales in [startDate, endDate]
  let dailySalesBySeller: Record<string, { amount: number; name?: string }> = {};
  try {
    const { data: dailySetting } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'daily_sales_registry')
      .maybeSingle();

    if (dailySetting && Array.isArray(dailySetting.value)) {
      dailySetting.value
        .filter((d: any) => d.date >= startDate && d.date <= endDate)
        .forEach((d: any) => {
          if (!dailySalesBySeller[d.collaborator_id]) {
            dailySalesBySeller[d.collaborator_id] = { amount: 0, name: d.seller_name };
          }
          dailySalesBySeller[d.collaborator_id].amount += Number(d.sales_amount) || 0;
        });
    }
  } catch {}

  const existingLog = await getStoredMilestoneLog();
  const existingKeys = new Set(existingLog.map((item) => item.eventKey));
  const newlyDispatched: MilestoneAlertRecord[] = [];

  const rowsToCheck = activeSalesRows;

  for (const row of rowsToCheck) {
    const sellerId = row.collaborator_id;
    const target = Number(row.target_2026) || 0;
    if (target <= 0) continue;

    const dailySum = dailySalesBySeller[sellerId]?.amount;
    const consolidated = Number(row.result_2026) || 0;
    const realized = dailySum !== undefined && dailySum > 0 ? Math.max(dailySum, consolidated) : consolidated;
    const percentage = Math.round((realized / target) * 1000) / 10;

    const sellerName =
      sellersMap.get(sellerId) || dailySalesBySeller[sellerId]?.name || 'Vendedor';

    for (const threshold of MILESTONE_THRESHOLDS) {
      if (percentage >= threshold) {
        const eventKey = `sales_milestone_${refYear}_${refMonth}_${sellerId}_${threshold}`;
        if (!options?.forceResend && existingKeys.has(eventKey)) {
          continue;
        }

        const { title, message, type } = buildMilestoneCopy(
          threshold,
          sellerName,
          percentage,
          realized,
          target,
          cycleShortLabel
        );

        // Insert into Supabase notifications (triggers realtime browser push for seller)
        await insertSupabaseNotification(sellerId, title, message, type, eventKey);

        // Send Web Push to seller's subscribed devices
        const pushDevicesCount = await sendWebPushToUser(
          sellerId,
          title,
          message,
          '/sales-results'
        );

        const alertRecord: MilestoneAlertRecord = {
          id: `${eventKey}_${Date.now()}`,
          eventKey,
          collaboratorId: sellerId,
          sellerName,
          threshold,
          percentage,
          realizedAmount: realized,
          targetAmount: target,
          cycleLabel: cycleShortLabel,
          refMonth,
          refYear,
          title,
          message,
          sentAt: new Date().toISOString(),
          pushDevicesCount,
        };

        newlyDispatched.push(alertRecord);
        existingKeys.add(eventKey);
      }
    }
  }

  if (newlyDispatched.length > 0) {
    await saveMilestoneLog([...newlyDispatched, ...existingLog]);
  }

  return {
    newlyDispatched,
    history: [...newlyDispatched, ...existingLog].slice(0, 50),
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const refMonth = searchParams.get('month') ? Number(searchParams.get('month')) : undefined;
    const refYear = searchParams.get('year') ? Number(searchParams.get('year')) : undefined;
    const sellerId = searchParams.get('sellerId') || undefined;

    const log = await getStoredMilestoneLog();
    const filtered = log.filter((item) => {
      if (refMonth && item.refMonth !== refMonth) return false;
      if (refYear && item.refYear !== refYear) return false;
      if (sellerId && item.collaboratorId !== sellerId) return false;
      return true;
    });

    return NextResponse.json({
      alerts: filtered.slice(0, 50),
    });
  } catch (err: any) {
    console.error('Error in GET /api/sales/milestone-alerts:', err);
    return NextResponse.json({ alerts: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { refMonth, refYear, startDate, endDate, sellerIds, forceResend } = body;

    const result = await evaluateAndDispatchSalesMilestones({
      refMonth,
      refYear,
      startDate,
      endDate,
      sellerIds,
      forceResend: Boolean(forceResend),
    });

    return NextResponse.json({
      success: true,
      dispatchedCount: result.newlyDispatched.length,
      newlyDispatched: result.newlyDispatched,
      alerts: result.history,
    });
  } catch (err: any) {
    console.error('Error in POST /api/sales/milestone-alerts:', err);
    return NextResponse.json(
      { error: err?.message || 'Erro ao avaliar alertas de metas' },
      { status: 500 }
    );
  }
}
