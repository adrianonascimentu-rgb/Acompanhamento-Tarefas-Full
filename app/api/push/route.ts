import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '@/lib/serverAuth';
import { getSafeSupabaseConfig } from '@/lib/supabase';

const DEFAULT_VAPID_PUBLIC_KEY = 'BPrDi0R_L7n0ubuljp_LsSYD2IcckhvrtucPpDGDHBT91VMuoW_0IH2NlJ7fg_qjkXFjnAUosLaPjxuwGqGuOks';
const DEFAULT_VAPID_PRIVATE_KEY = 'vRUi4aUaaPufyu8NB-VjIPkhfzLPamS3bqjPQ4WnPRQ';
const DEFAULT_VAPID_SUBJECT = 'mailto:adrianonascimentu@gmail.com';

function getVapidCredentials() {
  let pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  let priv = process.env.VAPID_PRIVATE_KEY;
  let sub = process.env.VAPID_SUBJECT || DEFAULT_VAPID_SUBJECT;

  if (!pub || pub.includes('seu_vapid') || pub.includes('placeholder') || pub.length < 80) {
    pub = DEFAULT_VAPID_PUBLIC_KEY;
  }

  if (!priv || priv.includes('seu_vapid') || priv.includes('placeholder') || priv.length < 40) {
    priv = DEFAULT_VAPID_PRIVATE_KEY;
  }

  return { pub, priv, sub };
}

const { pub: publicVapidKey, priv: privateVapidKey, sub: vapidSubject } = getVapidCredentials();

try {
  webpush.setVapidDetails(
    vapidSubject,
    publicVapidKey,
    privateVapidKey
  );
} catch (err: any) {
  console.warn('Aviso ao inicializar chaves VAPID:', err?.message || err);
}

function getSupabaseAdmin() {
  const { supabaseUrl, supabaseServiceKey } = getSafeSupabaseConfig();
  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function POST(req: Request) {
  try {
    const auth = await requireAuth(req);
    if (!auth.authorized) return auth.response;

    const body = await req.json();
    const { profileId, userId, title, body: messageBody, url, icon, badge } = body;
    const targetUserId = profileId || userId;

    if (!targetUserId) {
      return NextResponse.json({ error: 'profileId ou userId é obrigatório' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // 1. Buscar subscrições do usuário tanto por profile_id quanto por user_id
    let subscriptions: any[] = [];

    const { data: subsByProfile, error: errProfile } = await supabaseAdmin
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
      } catch (e) {}
    }

    if (subscriptions.length === 0) {
      return NextResponse.json({ message: 'Nenhum dispositivo encontrado para este usuário', sentCount: 0 });
    }

    const payload = JSON.stringify({
      title: title || 'AgenteX - Notificação',
      body: messageBody || 'Você possui uma nova atualização.',
      url: url || '/tasks',
      icon: icon || '/icons/icon-192.png',
      badge: badge || '/icons/icon-192.png',
      timestamp: Date.now()
    });

    let sentCount = 0;
    const results = await Promise.allSettled(
      subscriptions.map(async (subRecord) => {
        let subObj = subRecord.subscription;
        if (typeof subObj === 'string') {
          try {
            subObj = JSON.parse(subObj);
          } catch (e) {}
        }

        if (!subObj || !subObj.endpoint) return;

        try {
          await webpush.sendNotification(subObj, payload);
          sentCount++;
        } catch (err: any) {
          // Se a inscrição expirou ou foi cancelada no aparelho
          if (err.statusCode === 410 || err.statusCode === 404) {
            if (subRecord.id) {
              await supabaseAdmin.from('push_subscriptions').delete().eq('id', subRecord.id);
            } else {
              await supabaseAdmin.from('push_subscriptions').delete().eq('subscription', subRecord.subscription);
            }
          }
        }
      })
    );

    return NextResponse.json({ 
      success: true, 
      sentCount,
      totalDevices: subscriptions.length,
      results 
    });
  } catch (err: any) {
    console.error('Push error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
