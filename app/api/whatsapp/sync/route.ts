import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSafeSupabaseConfig } from '@/lib/supabase';

const CLOUD_STATE_KEY = 'whatsapp_cloud_state_v1';

function getAdminClient() {
  const { isConfigured, supabaseUrl, supabaseServiceKey, supabaseAnonKey } = getSafeSupabaseConfig();
  if (!isConfigured) return null;
  const keyToUse =
    supabaseServiceKey && supabaseServiceKey !== 'placeholder-key'
      ? supabaseServiceKey
      : supabaseAnonKey;
  if (!keyToUse || keyToUse === 'placeholder-key') return null;

  return createClient(supabaseUrl, keyToUse, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

function normalizePhone(raw?: string): string {
  const digits = String(raw || '').replace(/\D/g, '');
  if ((digits.length === 10 || digits.length === 11) && !digits.startsWith('55')) {
    return `55${digits}`;
  }
  return digits;
}

export interface WhatsAppCloudState {
  providerConfig: {
    providerMode: 'meta' | 'alternative' | 'simulation';
    altServerUrl: string;
    altApiKey: string;
    altInstance: string;
    qrStatus: 'idle' | 'generating' | 'waiting' | 'connected';
    qrPhoneConnected: string;
    updatedAt?: string;
  };
  directory: {
    adminName: string;
    adminPhone: string;
    logisticsGroupPhone: string;
    collaboratorPhones: Record<string, string>;
    updatedAt?: string;
  };
  rules: any[];
  rulesUpdatedAt?: string;
  chats: any[];
  deletedChatIds: string[];
  chatMessages: Record<string, any[]>;
  automatedInboxMessages: any[];
  logs: any[];
  trafficEvents: any[];
  updatedAt: string;
}

const DEFAULT_CLOUD_STATE: WhatsAppCloudState = {
  providerConfig: {
    providerMode: 'alternative',
    altServerUrl: 'https://api.w-api.app',
    altApiKey: '',
    altInstance: '',
    qrStatus: 'connected',
    qrPhoneConnected: ''
  },
  directory: {
    adminName: 'Adriano Nascimento (Admin)',
    adminPhone: '',
    logisticsGroupPhone: '',
    collaboratorPhones: {}
  },
  rules: [],
  chats: [],
  deletedChatIds: [],
  chatMessages: {},
  automatedInboxMessages: [],
  logs: [],
  trafficEvents: [],
  updatedAt: new Date(0).toISOString()
};

function parseStoredValue(raw: any): WhatsAppCloudState {
  if (!raw) return { ...DEFAULT_CLOUD_STATE };
  let parsed = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { ...DEFAULT_CLOUD_STATE };
    }
  }
  if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_CLOUD_STATE };

  return {
    providerConfig: {
      ...DEFAULT_CLOUD_STATE.providerConfig,
      ...(parsed.providerConfig || {})
    },
    directory: {
      ...DEFAULT_CLOUD_STATE.directory,
      ...(parsed.directory || {}),
      collaboratorPhones: {
        ...(parsed.directory?.collaboratorPhones || {})
      }
    },
    rules: Array.isArray(parsed.rules) ? parsed.rules : [],
    rulesUpdatedAt: parsed.rulesUpdatedAt,
    chats: Array.isArray(parsed.chats) ? parsed.chats : [],
    deletedChatIds: Array.isArray(parsed.deletedChatIds) ? parsed.deletedChatIds : [],
    chatMessages:
      parsed.chatMessages && typeof parsed.chatMessages === 'object'
        ? parsed.chatMessages
        : {},
    automatedInboxMessages: Array.isArray(parsed.automatedInboxMessages)
      ? parsed.automatedInboxMessages
      : [],
    logs: Array.isArray(parsed.logs) ? parsed.logs : [],
    trafficEvents: Array.isArray(parsed.trafficEvents) ? parsed.trafficEvents : [],
    updatedAt: parsed.updatedAt || new Date().toISOString()
  };
}

function dedupeById<T extends { id?: string }>(cloudList: T[], incomingList: T[], maxItems: number): T[] {
  const map = new Map<string, T>();
  // Incoming items first or updated status wins
  for (const item of cloudList) {
    if (item && item.id) {
      map.set(item.id, item);
    }
  }
  for (const item of incomingList) {
    if (item && item.id) {
      const existing = map.get(item.id);
      if (existing) {
        map.set(item.id, { ...existing, ...item });
      } else {
        map.set(item.id, item);
      }
    }
  }
  const combined = Array.from(map.values());
  combined.sort((a: any, b: any) => {
    const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return tB - tA;
  });
  return combined.slice(0, maxItems);
}

export async function GET() {
  try {
    const client = getAdminClient();
    if (!client) {
      return NextResponse.json({ success: true, state: DEFAULT_CLOUD_STATE });
    }

    const { data, error } = await client
      .from('system_settings')
      .select('value')
      .eq('key', CLOUD_STATE_KEY)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ success: true, state: DEFAULT_CLOUD_STATE });
    }

    const state = parseStoredValue(data?.value);
    return NextResponse.json({ success: true, state });
  } catch (err: any) {
    return NextResponse.json({ success: true, state: DEFAULT_CLOUD_STATE });
  }
}

export async function POST(req: NextRequest) {
  try {
    const client = getAdminClient();
    const body = await req.json().catch(() => ({}));

    let currentCloud = { ...DEFAULT_CLOUD_STATE };
    if (client) {
      const { data } = await client
        .from('system_settings')
        .select('value')
        .eq('key', CLOUD_STATE_KEY)
        .maybeSingle();
      currentCloud = parseStoredValue(data?.value);
    }

    const nowIso = new Date().toISOString();

    // 1. Merge Provider Config
    const incProvider = body.providerConfig;
    const mergedProviderConfig = { ...currentCloud.providerConfig };
    if (incProvider && typeof incProvider === 'object') {
      const forceProvider = Boolean(body.forceProviderUpdate);
      if (forceProvider) {
        mergedProviderConfig.providerMode = incProvider.providerMode || mergedProviderConfig.providerMode;
        mergedProviderConfig.altServerUrl = incProvider.altServerUrl || mergedProviderConfig.altServerUrl || 'https://api.w-api.app';
        mergedProviderConfig.altApiKey = incProvider.altApiKey !== undefined ? incProvider.altApiKey : mergedProviderConfig.altApiKey;
        mergedProviderConfig.altInstance = incProvider.altInstance !== undefined ? incProvider.altInstance : mergedProviderConfig.altInstance;
        mergedProviderConfig.qrStatus = incProvider.qrStatus || mergedProviderConfig.qrStatus;
        mergedProviderConfig.qrPhoneConnected = incProvider.qrPhoneConnected ?? mergedProviderConfig.qrPhoneConnected;
        mergedProviderConfig.updatedAt = nowIso;
      } else {
        // Hydrate cloud only if cloud is missing credentials and incoming has them
        if (!mergedProviderConfig.altApiKey && incProvider.altApiKey) {
          mergedProviderConfig.altApiKey = incProvider.altApiKey;
        }
        if (!mergedProviderConfig.altInstance && incProvider.altInstance) {
          mergedProviderConfig.altInstance = incProvider.altInstance;
        }
        if (
          (!mergedProviderConfig.altServerUrl || mergedProviderConfig.altServerUrl === 'https://api.w-api.app') &&
          incProvider.altServerUrl
        ) {
          mergedProviderConfig.altServerUrl = incProvider.altServerUrl;
        }
        if (!mergedProviderConfig.qrPhoneConnected && incProvider.qrPhoneConnected) {
          mergedProviderConfig.qrPhoneConnected = incProvider.qrPhoneConnected;
        }
      }
    }

    // 2. Merge Directory Config
    const incDir = body.directory;
    const mergedDirectory = {
      ...currentCloud.directory,
      collaboratorPhones: { ...(currentCloud.directory.collaboratorPhones || {}) }
    };
    if (incDir && typeof incDir === 'object') {
      const forceDir = Boolean(body.forceDirectoryUpdate);
      if (forceDir) {
        mergedDirectory.adminName = incDir.adminName || mergedDirectory.adminName;
        mergedDirectory.adminPhone =
          incDir.adminPhone !== undefined ? normalizePhone(incDir.adminPhone) : mergedDirectory.adminPhone;
        mergedDirectory.logisticsGroupPhone =
          incDir.logisticsGroupPhone !== undefined
            ? normalizePhone(incDir.logisticsGroupPhone)
            : mergedDirectory.logisticsGroupPhone;
        if (body.replaceCollaboratorPhones && incDir.collaboratorPhones) {
          mergedDirectory.collaboratorPhones = { ...incDir.collaboratorPhones };
        } else if (incDir.collaboratorPhones) {
          mergedDirectory.collaboratorPhones = {
            ...mergedDirectory.collaboratorPhones,
            ...incDir.collaboratorPhones
          };
        }
        mergedDirectory.updatedAt = nowIso;
      } else {
        if (!mergedDirectory.adminPhone && incDir.adminPhone) {
          mergedDirectory.adminPhone = normalizePhone(incDir.adminPhone);
        }
        if (!mergedDirectory.logisticsGroupPhone && incDir.logisticsGroupPhone) {
          mergedDirectory.logisticsGroupPhone = normalizePhone(incDir.logisticsGroupPhone);
        }
        if (incDir.adminName && incDir.adminName !== 'Adriano Nascimento (Admin)') {
          mergedDirectory.adminName = incDir.adminName;
        }
        if (incDir.collaboratorPhones && typeof incDir.collaboratorPhones === 'object') {
          mergedDirectory.collaboratorPhones = {
            ...incDir.collaboratorPhones,
            ...mergedDirectory.collaboratorPhones
          };
        }
      }
    }

    // 3. Merge Automation Rules
    let mergedRules = currentCloud.rules;
    let rulesUpdatedAt = currentCloud.rulesUpdatedAt;
    if (Array.isArray(body.rules) && body.rules.length > 0) {
      if (body.forceRulesUpdate || !mergedRules || mergedRules.length === 0) {
        mergedRules = body.rules;
        rulesUpdatedAt = nowIso;
      } else {
        // Merge totalSentCount and lastTriggeredAt across cloud & incoming
        const incomingMap = new Map(body.rules.map((r: any) => [r.id, r]));
        mergedRules = mergedRules.map((cloudRule: any) => {
          const incRule: any = incomingMap.get(cloudRule.id);
          if (!incRule) return cloudRule;
          const cloudCount = cloudRule.totalSentCount || 0;
          const incCount = incRule.totalSentCount || 0;
          return {
            ...cloudRule,
            totalSentCount: Math.max(cloudCount, incCount),
            lastTriggeredAt:
              incCount > cloudCount
                ? incRule.lastTriggeredAt || cloudRule.lastTriggeredAt
                : cloudRule.lastTriggeredAt || incRule.lastTriggeredAt
          };
        });
      }
    }

    // 4. Deleted Chat IDs tracking
    const deletedSet = new Set<string>(currentCloud.deletedChatIds || []);
    if (Array.isArray(body.deletedChatIds)) {
      body.deletedChatIds.forEach((id: string) => deletedSet.add(id));
    }
    if (body.restoredChatId) {
      deletedSet.delete(body.restoredChatId);
    }

    // 5. Merge Chat Messages per Chat ID
    const mergedChatMessages: Record<string, any[]> = { ...(currentCloud.chatMessages || {}) };
    if (body.chatMessages && typeof body.chatMessages === 'object') {
      for (const [chatId, msgs] of Object.entries(body.chatMessages)) {
        if (!Array.isArray(msgs)) continue;
        const existingMsgs = Array.isArray(mergedChatMessages[chatId]) ? mergedChatMessages[chatId] : [];
        const msgMap = new Map<string, any>();
        for (const m of existingMsgs) {
          if (m && m.id) msgMap.set(m.id, m);
        }
        for (const m of msgs) {
          if (m && m.id) {
            const prev = msgMap.get(m.id);
            if (prev) {
              // Prefer final status ('sent', 'delivered', 'read', 'failed') over 'sending'
              const resolvedStatus =
                prev.status === 'sending' && m.status && m.status !== 'sending'
                  ? m.status
                  : m.status === 'sending' && prev.status && prev.status !== 'sending'
                  ? prev.status
                  : m.status || prev.status;
              msgMap.set(m.id, { ...prev, ...m, status: resolvedStatus });
            } else {
              msgMap.set(m.id, m);
            }
          }
        }
        const combined = Array.from(msgMap.values());
        combined.sort((a, b) => {
          const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          if (tA && tB && tA !== tB) return tA - tB;
          return 0;
        });
        mergedChatMessages[chatId] = combined.slice(-250);
      }
    }

    // 6. Merge Chats (Real Contacts)
    const chatMap = new Map<string, any>();
    for (const c of currentCloud.chats || []) {
      if (c && c.id && !deletedSet.has(c.id)) {
        chatMap.set(c.id, c);
      }
    }
    if (Array.isArray(body.chats)) {
      for (const c of body.chats) {
        if (!c || !c.id) continue;
        if (deletedSet.has(c.id) && body.restoredChatId !== c.id) continue;
        const existing = chatMap.get(c.id);
        const msgsForChat = mergedChatMessages[c.id] || [];
        const latestMsg = msgsForChat.length > 0 ? msgsForChat[msgsForChat.length - 1] : null;

        if (!existing) {
          chatMap.set(c.id, {
            ...c,
            lastMessage: latestMsg ? latestMsg.text : c.lastMessage,
            lastMessageStatus: latestMsg ? latestMsg.status : c.lastMessageStatus,
            time: latestMsg ? latestMsg.time : c.time
          });
        } else {
          chatMap.set(c.id, {
            ...existing,
            ...c,
            name: c.name || existing.name,
            lastMessage: latestMsg ? latestMsg.text : c.lastMessage || existing.lastMessage,
            lastMessageStatus: latestMsg ? latestMsg.status : c.lastMessageStatus || existing.lastMessageStatus,
            time: latestMsg ? latestMsg.time : c.time || existing.time
          });
        }
      }
    }

    // Ensure every chat in chatMap reflects its latest message from mergedChatMessages
    for (const [chatId, chatObj] of chatMap.entries()) {
      const msgsForChat = mergedChatMessages[chatId] || [];
      if (msgsForChat.length > 0) {
        const lastMsg = msgsForChat[msgsForChat.length - 1];
        chatMap.set(chatId, {
          ...chatObj,
          lastMessage: lastMsg.text,
          lastMessageSender: lastMsg.sender || 'user',
          lastMessageStatus: lastMsg.status || 'sent',
          time: lastMsg.time || chatObj.time
        });
      }
    }

    const mergedChats = Array.from(chatMap.values());

    // 7. Merge Automated Inbox Messages, Logs, and Traffic Events
    const mergedAutoInbox = dedupeById(
      currentCloud.automatedInboxMessages || [],
      Array.isArray(body.automatedInboxMessages) ? body.automatedInboxMessages : [],
      100
    );

    const mergedLogs = body.clearLogs
      ? []
      : dedupeById(
          currentCloud.logs || [],
          Array.isArray(body.logs) ? body.logs : [],
          100
        );

    const mergedTraffic = dedupeById(
      currentCloud.trafficEvents || [],
      Array.isArray(body.trafficEvents) ? body.trafficEvents : [],
      500
    );

    const nextState: WhatsAppCloudState = {
      providerConfig: mergedProviderConfig,
      directory: mergedDirectory,
      rules: mergedRules,
      rulesUpdatedAt,
      chats: mergedChats,
      deletedChatIds: Array.from(deletedSet),
      chatMessages: mergedChatMessages,
      automatedInboxMessages: mergedAutoInbox,
      logs: mergedLogs,
      trafficEvents: mergedTraffic,
      updatedAt: nowIso
    };

    if (client) {
      await client.from('system_settings').upsert(
        {
          key: CLOUD_STATE_KEY,
          value: nextState,
          updated_at: nowIso
        },
        { onConflict: 'key' }
      );
    }

    return NextResponse.json({ success: true, state: nextState });
  } catch (err: any) {
    console.error('Erro na sincronização em nuvem do WhatsApp:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Erro interno ao sincronizar WhatsApp' },
      { status: 500 }
    );
  }
}
