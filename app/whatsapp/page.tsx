'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { useRole } from '@/hooks/useRole';
import {
  MessageCircle,
  Search,
  MoreVertical,
  Phone,
  Video,
  Paperclip,
  Send,
  Check,
  CheckCheck,
  Clock,
  Settings,
  X,
  RefreshCw,
  QrCode,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  BarChart3,
  Server,
  Zap,
  CheckCircle2,
  Copy,
  PanelRightClose,
  PanelRightOpen,
  Tag,
  FileText,
  Truck,
  Sparkles,
  ChevronRight,
  Users,
  User,
  Building2,
  CheckSquare,
  Plus,
  Trash2,
  Megaphone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import WhatsAppAnalytics from '@/components/whatsapp/WhatsAppAnalytics';
import WhatsAppAutomations from '@/components/whatsapp/WhatsAppAutomations';
import WhatsAppCampaigns from '@/components/whatsapp/WhatsAppCampaigns';
import {
  getAutomatedInboxMessages,
  getDirectoryConfig,
  saveDirectoryConfig,
  getProviderConfig,
  saveProviderConfig,
  syncWhatsAppStateWithCloud,
  pushWhatsAppCloudUpdate,
  DELETED_CHATS_STORAGE_KEY,
  normalizeBrazilPhone,
  isPlaceholderPhone,
  recordWhatsAppTrafficEvent,
  syncCollaboratorPhonesFromProfiles,
  getCachedProfilePhones,
  executeSafeWhatsAppSend,
  getAntiBanConfig,
  getAntiBanLiveStats,
  syncCampaignRepliesFromChatMessages,
  getWhatsAppCampaigns
} from '@/lib/whatsappAutomation';
import { supabase } from '@/lib/supabase';
import { useUI } from '@/hooks/useUI';

interface WhatsAppMessage {
  id: string;
  text: string;
  sender: 'user' | 'system';
  name?: string;
  time: string;
  createdAt?: string;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
}

interface ChatContact {
  id: string;
  name: string;
  phone: string;
  lastMessage: string;
  lastMessageSender: 'user' | 'system';
  lastMessageStatus?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  time: string;
  unread: number;
  online: boolean;
  type: 'group' | 'contact';
  roleOrDept: string;
  tags: string[];
  linkedOrder?: string;
  notes?: string;
}

const REAL_CHATS_STORAGE_KEY = 'whatsapp_real_chats_v2';
const REAL_MESSAGES_STORAGE_KEY = 'whatsapp_real_messages_v2';

const QUICK_REPLIES = [
  'Pedido conferido e liberado para entrega!',
  'Por favor, envie a foto do canhoto assinado.',
  'Segue nossa confirmação de agendamento.',
  'Recebido! Nossa equipe já está verificando.'
];

export default function WhatsAppPage() {
  const { isDarkMode } = useTheme();
  const { canAccessWhatsapp, isAdmin } = useRole();
  const { showToast } = useUI();
  const [viewMode, setViewMode] = useState<'chat' | 'campaigns' | 'automations' | 'analytics'>('chat');
  const [automationsSubView, setAutomationsSubView] = useState<'rules' | 'antiban' | 'suggestions' | 'logs' | 'directory'>('rules');
  const [antiBanEnabled, setAntiBanEnabled] = useState(true);
  const [antiBanScore, setAntiBanScore] = useState(100);
  const [campaignRepliesCount, setCampaignRepliesCount] = useState(0);
  const [chats, setChats] = useState<ChatContact[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'groups'>('all');
  const [message, setMessage] = useState('');
  const [showContextPanel, setShowContextPanel] = useState(true);
  const [chatMessages, setChatMessages] = useState<Record<string, WhatsAppMessage[]>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // New real contact modal state
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactRole, setNewContactRole] = useState('Cliente / Colaborador');
  const [newContactType, setNewContactType] = useState<'contact' | 'group'>('contact');

  // Connection states
  const [isConnected, setIsConnected] = useState(true);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [apiStatus, setApiStatus] = useState<any>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [isSending, setIsSending] = useState(false);

  // WhatsApp Provider Integration States
  const [providerMode, setProviderMode] = useState<'meta' | 'alternative' | 'simulation'>('alternative');
  const [configTab, setConfigTab] = useState<'meta' | 'alternative' | 'simulation'>('alternative');
  const [altServerUrl, setAltServerUrl] = useState('https://api.w-api.app');
  const [altApiKey, setAltApiKey] = useState('');
  const [altInstance, setAltInstance] = useState('');
  const [qrStatus, setQrStatus] = useState<'idle' | 'generating' | 'waiting' | 'connected'>('connected');
  const [qrPhoneConnected, setQrPhoneConnected] = useState('');
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Load saved provider settings from localStorage and sync with Supabase Cloud
  useEffect(() => {
    const loadProviderFromLocal = () => {
      if (typeof window === 'undefined') return;
      const pc = getProviderConfig();
      if (pc.providerMode) {
        setProviderMode(pc.providerMode);
        setConfigTab(pc.providerMode);
      }
      if (pc.altServerUrl) setAltServerUrl(pc.altServerUrl);
      if (pc.altApiKey !== undefined) setAltApiKey(pc.altApiKey);
      if (pc.altInstance !== undefined) setAltInstance(pc.altInstance);
      if (pc.qrStatus) setQrStatus(pc.qrStatus);
      if (pc.qrPhoneConnected) setQrPhoneConnected(pc.qrPhoneConnected);
      const ab = getAntiBanConfig();
      const abStats = getAntiBanLiveStats();
      setAntiBanEnabled(ab.enabled);
      setAntiBanScore(abStats.healthScore);

      const { campaigns: syncedCamps } = syncCampaignRepliesFromChatMessages();
      const camps = syncedCamps.length > 0 ? syncedCamps : getWhatsAppCampaigns();
      let repliesTotal = 0;
      for (const c of camps) {
        for (const r of c.recipients || []) {
          if (r.status === 'replied') repliesTotal++;
        }
      }
      setCampaignRepliesCount(repliesTotal);
    };

    loadProviderFromLocal();
    void syncWhatsAppStateWithCloud();
    void syncCollaboratorPhonesFromProfiles();

    window.addEventListener('whatsapp-cloud-synced', loadProviderFromLocal);
    window.addEventListener('whatsapp-automation-updated', loadProviderFromLocal);
    window.addEventListener('whatsapp-antiban-updated', loadProviderFromLocal);
    window.addEventListener('whatsapp-campaigns-updated', loadProviderFromLocal);

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        void syncWhatsAppStateWithCloud();
      }
    };
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    let realtimeChannel: any = null;
    try {
      realtimeChannel = supabase
        .channel('public:system_settings-whatsapp-sync')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'system_settings' },
          (payload: any) => {
            if (!payload?.new?.key || payload.new.key === 'whatsapp_cloud_state_v1') {
              void syncWhatsAppStateWithCloud();
            }
          }
        )
        .subscribe();
    } catch {}

    const pollInterval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        void syncWhatsAppStateWithCloud();
      }
    }, 15000);

    return () => {
      window.removeEventListener('whatsapp-cloud-synced', loadProviderFromLocal);
      window.removeEventListener('whatsapp-automation-updated', loadProviderFromLocal);
      window.removeEventListener('whatsapp-antiban-updated', loadProviderFromLocal);
      window.removeEventListener('whatsapp-campaigns-updated', loadProviderFromLocal);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      clearInterval(pollInterval);
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
      }
    };
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      if (viewMode === 'automations' || viewMode === 'analytics') setViewMode('chat');
      if (isConfiguring) setIsConfiguring(false);
    }
  }, [isAdmin, viewMode, isConfiguring]);

  const handleOpenChatByPhone = (rawPhone: string, customerName: string) => {
    const cleanPhone = normalizeBrazilPhone(rawPhone);
    if (!cleanPhone) return;
    const chatId = `chat-${cleanPhone}`;

    setChats(prev => {
      const exists = prev.some(
        c => c.id === chatId || normalizeBrazilPhone(c.phone) === cleanPhone
      );
      if (exists) return prev;
      const newChat: ChatContact = {
        id: chatId,
        name: customerName || `Cliente ${cleanPhone.slice(-4)}`,
        phone: cleanPhone,
        lastMessage: 'Cliente de Campanha / Promoção',
        lastMessageSender: 'user',
        lastMessageStatus: 'sent',
        time: 'Agora',
        unread: 0,
        online: true,
        type: 'contact',
        roleOrDept: 'Cliente (Campanha)',
        tags: ['Cliente', 'Campanha']
      };
      const updated = [newChat, ...prev];
      try {
        localStorage.setItem(REAL_CHATS_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    setSelectedChatId(chatId);
    setViewMode('chat');
  };

  const handleSaveProviderConfig = () => {
    if (!isAdmin) {
      showToast('Apenas o administrador pode alterar as configurações de conexão.', 'warning');
      return;
    }
    const cleanInstMatch = altInstance.trim().match(/[?&]instanceId=([^&\s"']+)/i);
    const finalInstance = cleanInstMatch?.[1]
      ? decodeURIComponent(cleanInstMatch[1].trim())
      : altInstance.trim();
    setAltInstance(finalInstance);

    saveProviderConfig(
      {
        providerMode: configTab,
        altServerUrl: altServerUrl.trim() || 'https://api.w-api.app',
        altApiKey: altApiKey.trim().replace(/^Bearer\s+/i, ''),
        altInstance: finalInstance,
        qrStatus,
        qrPhoneConnected
      },
      true
    );
    setProviderMode(configTab);
    setIsConfiguring(false);
    showToast('Configurações de conexão salvas e sincronizadas em todos os dispositivos!', 'success');
  };

  useEffect(() => {
    checkApiStatus();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, selectedChatId]);

  // Build and sync ONLY real contacts and real messages
  useEffect(() => {
    const syncRealContactsAndMessages = () => {
      if (typeof window === 'undefined') return;

      let storedChats: ChatContact[] = [];
      let storedMsgs: Record<string, WhatsAppMessage[]> = {};
      let deletedChatIds: string[] = [];

      try {
        const rawDel = localStorage.getItem(DELETED_CHATS_STORAGE_KEY);
        if (rawDel) {
          const parsedDel = JSON.parse(rawDel);
          if (Array.isArray(parsedDel)) deletedChatIds = parsedDel;
        }
      } catch {}
      const deletedSet = new Set(deletedChatIds);

      try {
        const rawChats = localStorage.getItem(REAL_CHATS_STORAGE_KEY);
        if (rawChats) {
          const parsed = JSON.parse(rawChats);
          if (Array.isArray(parsed)) {
            storedChats = parsed.filter(
              c => c.phone && !isPlaceholderPhone(c.phone) && !deletedSet.has(c.id)
            );
          }
        }
      } catch {}

      try {
        const rawMsgs = localStorage.getItem(REAL_MESSAGES_STORAGE_KEY);
        if (rawMsgs) {
          const parsed = JSON.parse(rawMsgs);
          if (parsed && typeof parsed === 'object') {
            storedMsgs = parsed;
          }
        }
      } catch {}

      const dir = getDirectoryConfig();
      const ensureContactInList = (
        phoneRaw: string,
        name: string,
        roleOrDept: string,
        type: 'contact' | 'group' = 'contact',
        tags: string[] = ['Contato Real']
      ) => {
        const cleanPhone = normalizeBrazilPhone(phoneRaw);
        if (!cleanPhone || isPlaceholderPhone(cleanPhone)) return;
        const chatId = `chat-${cleanPhone}`;
        if (deletedSet.has(chatId)) return;
        const existingIdx = storedChats.findIndex(
          c => normalizeBrazilPhone(c.phone) === cleanPhone || c.id === chatId
        );
        if (existingIdx === -1) {
          storedChats.push({
            id: chatId,
            name,
            phone: cleanPhone,
            lastMessage: 'Conversa pronta para envio real via WhatsApp',
            lastMessageSender: 'user',
            lastMessageStatus: 'sent',
            time: 'Ativo',
            unread: 0,
            online: true,
            type,
            roleOrDept,
            tags
          });
        } else {
          storedChats[existingIdx] = {
            ...storedChats[existingIdx],
            name: storedChats[existingIdx].name || name,
            phone: cleanPhone
          };
        }
      };

      // 1. Admin real phone if configured
      if (dir.adminPhone && !isPlaceholderPhone(dir.adminPhone)) {
        ensureContactInList(
          dir.adminPhone,
          dir.adminName || 'Administrador',
          'Administrador / Gestor Principal',
          'contact',
          ['Admin', 'Alertas']
        );
        setQrPhoneConnected(normalizeBrazilPhone(dir.adminPhone));
      }

      // 2. Logistics Group real phone if configured
      if (dir.logisticsGroupPhone && !isPlaceholderPhone(dir.logisticsGroupPhone)) {
        ensureContactInList(
          dir.logisticsGroupPhone,
          'Grupo de Logística / Expedição',
          'Logística & Entregas',
          'group',
          ['Logística', 'Grupo']
        );
      }

      // 3. Real Collaborators & Drivers from User Profiles (Perfil do Usuário)
      const cachedProfilePhones = getCachedProfilePhones();
      cachedProfilePhones.forEach(p => {
        if (p.phone && !isPlaceholderPhone(p.phone)) {
          ensureContactInList(
            p.phone,
            p.name,
            `${p.role || 'Colaborador'} (Perfil)`,
            'contact',
            ['Perfil do Usuário', 'Equipe']
          );
        }
      });

      // 4. Real Collaborators & Drivers from Directory
      Object.entries(dir.collaboratorPhones || {}).forEach(([nameKey, phoneVal]) => {
        if (phoneVal && !isPlaceholderPhone(phoneVal)) {
          const matchedProfile = cachedProfilePhones.find(
            p => p.name.toLowerCase() === nameKey.toLowerCase() || normalizeBrazilPhone(p.phone) === normalizeBrazilPhone(phoneVal)
          );
          const formattedName = matchedProfile
            ? matchedProfile.name
            : nameKey
                .split(' ')
                .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                .join(' ');
          ensureContactInList(
            phoneVal,
            formattedName,
            matchedProfile ? `${matchedProfile.role || 'Colaborador'} (Perfil)` : 'Colaborador / Motorista Cadastrado',
            'contact',
            matchedProfile ? ['Perfil do Usuário', 'Equipe'] : ['Equipe', 'Automação']
          );
        }
      });

      // 4. Also ensure any chat present in storedMsgs is represented in storedChats
      Object.entries(storedMsgs).forEach(([chatIdKey, msgList]) => {
        if (!Array.isArray(msgList) || msgList.length === 0 || deletedSet.has(chatIdKey)) return;
        const phoneFromId = chatIdKey.replace(/^chat-/, '');
        if (phoneFromId && !isPlaceholderPhone(phoneFromId)) {
          ensureContactInList(
            phoneFromId,
            `Contato +${phoneFromId}`,
            'Contato WhatsApp',
            'contact',
            ['Contato Real']
          );
        }
      });

      // 5. Sync real automated messages sent
      const autoMsgs = getAutomatedInboxMessages();
      autoMsgs.forEach(item => {
        const cleanPhone = normalizeBrazilPhone(item.recipientPhone);
        if (!cleanPhone || isPlaceholderPhone(cleanPhone)) return;
        const chatId = `chat-${cleanPhone}`;
        if (deletedSet.has(chatId)) return;
        ensureContactInList(
          cleanPhone,
          item.recipientName,
          'Destinatário de Automação',
          'contact',
          ['Automático', 'W-API']
        );

        const currentList = storedMsgs[chatId] || [];
        if (!currentList.some(m => m.id === item.id)) {
          storedMsgs[chatId] = [
            ...currentList,
            {
              id: item.id,
              text: item.text,
              sender: 'user',
              time: item.time,
              createdAt: item.createdAt,
              status: item.status || 'sent'
            }
          ];
        }

        const chatIdx = storedChats.findIndex(c => c.id === chatId || normalizeBrazilPhone(c.phone) === cleanPhone);
        if (chatIdx !== -1) {
          storedChats[chatIdx] = {
            ...storedChats[chatIdx],
            lastMessage: item.text,
            lastMessageSender: 'user',
            lastMessageStatus: item.status || 'sent',
            time: item.time
          };
        }
      });

      // Ensure each chat's lastMessage reflects the latest message in storedMsgs
      storedChats = storedChats.map(c => {
        const list = storedMsgs[c.id];
        if (Array.isArray(list) && list.length > 0) {
          const latest = list[list.length - 1];
          return {
            ...c,
            lastMessage: latest.text || c.lastMessage,
            lastMessageSender: latest.sender || c.lastMessageSender,
            lastMessageStatus: latest.status || c.lastMessageStatus,
            time: latest.time || c.time
          };
        }
        return c;
      });

      localStorage.setItem(REAL_CHATS_STORAGE_KEY, JSON.stringify(storedChats));
      localStorage.setItem(REAL_MESSAGES_STORAGE_KEY, JSON.stringify(storedMsgs));

      setChats(storedChats);
      setChatMessages(storedMsgs);
      setSelectedChatId(prev => {
        if (prev && storedChats.some(c => c.id === prev)) return prev;
        return storedChats.length > 0 ? storedChats[0].id : null;
      });
    };

    syncRealContactsAndMessages();
    window.addEventListener('whatsapp-automation-message-sent', syncRealContactsAndMessages);
    window.addEventListener('whatsapp-automation-updated', syncRealContactsAndMessages);
    window.addEventListener('whatsapp-cloud-synced', syncRealContactsAndMessages);
    return () => {
      window.removeEventListener('whatsapp-automation-message-sent', syncRealContactsAndMessages);
      window.removeEventListener('whatsapp-automation-updated', syncRealContactsAndMessages);
      window.removeEventListener('whatsapp-cloud-synced', syncRealContactsAndMessages);
    };
  }, []);

  const checkApiStatus = async () => {
    try {
      setIsLoadingStatus(true);
      const res = await fetch('/api/whatsapp/status');
      const data = await res.json();
      setApiStatus(data);
      setIsConnected(true);
    } catch (error) {
      console.error('Error checking WhatsApp status:', error);
      setIsConnected(true);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  const handleSelectChat = (chatId: string) => {
    setSelectedChatId(chatId);
    setChats(prev =>
      prev.map(c => (c.id === chatId ? { ...c, unread: 0 } : c))
    );
  };

  const handleCreateRealContact = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = normalizeBrazilPhone(newContactPhone);
    if (!newContactName.trim() || cleanPhone.length < 10) {
      showToast('Informe o nome e o número real de WhatsApp (com DDD).', 'warning');
      return;
    }

    const chatId = `chat-${cleanPhone}`;
    const newChat: ChatContact = {
      id: chatId,
      name: newContactName.trim(),
      phone: cleanPhone,
      lastMessage: 'Contato adicionado para conversa real',
      lastMessageSender: 'user',
      lastMessageStatus: 'sent',
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      unread: 0,
      online: true,
      type: newContactType,
      roleOrDept: newContactRole.trim() || 'Contato WhatsApp',
      tags: ['Contato Real']
    };

    // Remove from deletedChatIds if previously deleted
    if (typeof window !== 'undefined') {
      try {
        const rawDel = localStorage.getItem(DELETED_CHATS_STORAGE_KEY);
        if (rawDel) {
          const parsedDel = JSON.parse(rawDel);
          if (Array.isArray(parsedDel)) {
            const nextDel = parsedDel.filter((id: string) => id !== chatId);
            localStorage.setItem(DELETED_CHATS_STORAGE_KEY, JSON.stringify(nextDel));
          }
        }
      } catch {}
    }

    const filtered = chats.filter(c => normalizeBrazilPhone(c.phone) !== cleanPhone);
    const updatedChats = [newChat, ...filtered];
    setChats(updatedChats);
    if (typeof window !== 'undefined') {
      localStorage.setItem(REAL_CHATS_STORAGE_KEY, JSON.stringify(updatedChats));
    }

    // Also link in Automation Directory so automations can use this real contact
    const dir = getDirectoryConfig();
    const updatedDir = {
      ...dir,
      collaboratorPhones: {
        ...dir.collaboratorPhones,
        [newContactName.trim().toLowerCase()]: cleanPhone
      }
    };
    saveDirectoryConfig(updatedDir, { syncCloud: false });

    void pushWhatsAppCloudUpdate({
      chats: updatedChats,
      restoredChatId: chatId,
      directory: updatedDir,
      forceDirectoryUpdate: true
    });

    setSelectedChatId(chatId);
    setNewContactName('');
    setNewContactPhone('');
    setIsNewChatModalOpen(false);
    showToast(`Contato ${newChat.name} (+${cleanPhone}) adicionado e sincronizado!`, 'success');
  };

  const handleDeleteRealChat = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const target = chats.find(c => c.id === chatId);
    const nextChats = chats.filter(c => c.id !== chatId);
    setChats(nextChats);
    if (typeof window !== 'undefined') {
      localStorage.setItem(REAL_CHATS_STORAGE_KEY, JSON.stringify(nextChats));
      try {
        const rawDel = localStorage.getItem(DELETED_CHATS_STORAGE_KEY);
        const delList = rawDel ? JSON.parse(rawDel) : [];
        const updatedDel = Array.from(new Set([...(Array.isArray(delList) ? delList : []), chatId]));
        localStorage.setItem(DELETED_CHATS_STORAGE_KEY, JSON.stringify(updatedDel));
      } catch {}
    }
    void pushWhatsAppCloudUpdate({
      chats: nextChats,
      deletedChatIds: [chatId]
    });
    if (selectedChatId === chatId) {
      setSelectedChatId(nextChats.length > 0 ? nextChats[0].id : null);
    }
    if (target) {
      showToast(`Conversa com ${target.name} removida da lista.`, 'info');
    }
  };

  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText ?? message).trim();
    if (!textToSend || !selectedChatId) return;

    const chat = chats.find(c => c.id === selectedChatId);
    if (!chat) return;

    if (!customText) setMessage('');
    setIsSending(true);

    const msgId = 'msg-' + Date.now();
    const formattedTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const nowIso = new Date().toISOString();

    const newMsg: WhatsAppMessage = {
      id: msgId,
      text: textToSend,
      sender: 'user',
      time: formattedTime,
      createdAt: nowIso,
      status: 'sending'
    };

    const initialMessagesForChat = [...(chatMessages[selectedChatId] || []), newMsg];
    const initialAllMessages = {
      ...chatMessages,
      [selectedChatId]: initialMessagesForChat
    };
    setChatMessages(initialAllMessages);
    if (typeof window !== 'undefined') {
      localStorage.setItem(REAL_MESSAGES_STORAGE_KEY, JSON.stringify(initialAllMessages));
    }

    const currentUrl =
      (typeof window !== 'undefined' && localStorage.getItem('whatsapp_alt_server_url')) ||
      altServerUrl ||
      'https://api.w-api.app';
    const currentKey =
      (typeof window !== 'undefined' && localStorage.getItem('whatsapp_alt_api_key')) ||
      altApiKey;
    const currentInstance =
      (typeof window !== 'undefined' && localStorage.getItem('whatsapp_alt_instance')) ||
      altInstance;

    let finalStatus: 'sent' | 'failed' = 'failed';

    try {
      const dispatchRes = await executeSafeWhatsAppSend({
        to: chat.phone,
        recipientName: chat.name,
        message: textToSend,
        providerMode: 'alternative',
        altServerUrl: currentUrl,
        altApiKey: currentKey,
        altInstance: currentInstance,
        isManualChat: true
      });
      if (dispatchRes.ok && dispatchRes.status === 'sent') {
        finalStatus = 'sent';
      } else {
        finalStatus = 'failed';
        showToast(
          dispatchRes.error || 'Não foi possível enviar pela W-API. Verifique suas credenciais W-API.',
          'warning'
        );
      }
    } catch {
      finalStatus = 'failed';
      showToast('Erro de comunicação ao disparar mensagem.', 'error');
    }

    setIsSending(false);

    // Update message with real delivery status (NO fake simulated reply)
    const updatedMessages: Record<string, WhatsAppMessage[]> = {
      ...initialAllMessages,
      [selectedChatId]: initialMessagesForChat.map(m =>
        m.id === msgId ? { ...m, status: finalStatus } : m
      )
    };
    setChatMessages(updatedMessages);
    if (typeof window !== 'undefined') {
      localStorage.setItem(REAL_MESSAGES_STORAGE_KEY, JSON.stringify(updatedMessages));
    }

    const updatedChats = chats.map(c =>
      c.id === selectedChatId
        ? {
            ...c,
            lastMessage: textToSend,
            lastMessageSender: 'user' as const,
            lastMessageStatus: finalStatus,
            time: formattedTime
          }
        : c
    );
    setChats(updatedChats);
    if (typeof window !== 'undefined') {
      localStorage.setItem(REAL_CHATS_STORAGE_KEY, JSON.stringify(updatedChats));
    }

    // Record real manual message in traffic analytics (without separate cloud call, we batch below)
    recordWhatsAppTrafficEvent(
      {
        direction: 'outbound',
        mode: 'manual',
        status: finalStatus,
        recipientName: chat.name,
        recipientPhone: chat.phone,
        text: textToSend,
        category: 'manual_chat'
      },
      false
    );

    // Push updated chats, messages, and traffic events to Supabase cloud so all devices see it
    void syncWhatsAppStateWithCloud();
  };

  const filteredChats = useMemo(() => {
    return chats.filter(chat => {
      const matchSearch =
        chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chat.phone.includes(searchQuery) ||
        chat.roleOrDept.toLowerCase().includes(searchQuery.toLowerCase());
      const matchFilter =
        activeFilter === 'all' ||
        (activeFilter === 'unread' && chat.unread > 0) ||
        (activeFilter === 'groups' && chat.type === 'group');
      return matchSearch && matchFilter;
    });
  }, [chats, searchQuery, activeFilter]);

  const selectedChat = useMemo(
    () => chats.find(c => c.id === selectedChatId) || null,
    [chats, selectedChatId]
  );

  const messages = useMemo(
    () => (selectedChatId ? chatMessages[selectedChatId] || [] : []),
    [selectedChatId, chatMessages]
  );

  const totalUnreadCount = useMemo(
    () => chats.reduce((acc, c) => acc + c.unread, 0),
    [chats]
  );

  if (!canAccessWhatsapp) {
    return (
      <div className={`flex flex-col items-center justify-center min-h-[80vh] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
        <MessageCircle size={64} className="mb-4 opacity-20" />
        <h2 className="text-xl font-bold mb-2">Acesso Restrito</h2>
        <p>Você não tem permissão para acessar o módulo de WhatsApp.</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col w-full h-[calc(100dvh-5.5rem)] md:h-[calc(100dvh-2.5rem)] overflow-hidden ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'}`}>
      {/* Top Workspace Subheader */}
      <header className={`px-4 py-3 border-b shrink-0 flex flex-col lg:flex-row lg:items-center justify-between gap-3 ${isDarkMode ? 'bg-slate-900/95 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shrink-0">
              <MessageCircle size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base font-bold tracking-tight truncate">Central WhatsApp Business</h1>
                <span className="text-xs text-slate-400 hidden sm:inline">·</span>
                <span className="text-xs font-semibold text-emerald-500 flex items-center gap-1.5 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {providerMode === 'alternative'
                    ? 'Gateway QR Ativo'
                    : providerMode === 'meta'
                    ? 'Meta Cloud Oficial'
                    : 'Sandbox Simulação'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block truncate">
                Atendimento omnichannel, expedição de pedidos e automações em tempo real
              </p>
            </div>
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={() => setIsConfiguring(true)}
              className={`lg:hidden px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-colors shrink-0 ${
                isDarkMode
                  ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
              title="Configurar Gateway ou API Oficial"
            >
              <QrCode size={14} className="text-emerald-500" />
              <span>Conexão</span>
            </button>
          )}
        </div>

        {/* Center / Right Navigation & Quick Actions */}
        <div className="flex flex-wrap items-center justify-between lg:justify-end gap-2.5">
          <div className={`${isAdmin ? 'grid grid-cols-2 sm:flex' : 'flex'} items-center gap-1 p-1 rounded-xl border w-full sm:w-auto ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200/80'}`}>
            <button
              type="button"
              onClick={() => setViewMode('chat')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                viewMode === 'chat'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : isDarkMode
                  ? 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
              }`}
            >
              <MessageCircle size={14} className="shrink-0" />
              <span>Conversas</span>
              {totalUnreadCount > 0 && (
                <span className={`ml-0.5 text-[10px] font-mono tabular-nums font-bold px-1.5 py-0.2 rounded-md ${
                  viewMode === 'chat' ? 'bg-white/20 text-white' : 'bg-emerald-500/15 text-emerald-500'
                }`}>
                  {totalUnreadCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setViewMode('campaigns')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                viewMode === 'campaigns'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : isDarkMode
                  ? 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
              }`}
              title="Disparo em massa de novidades, promoções e acompanhamento de respostas"
            >
              <Megaphone size={14} className="shrink-0" />
              <span>Campanhas & Promoções</span>
              {campaignRepliesCount > 0 && (
                <span
                  className={`ml-0.5 text-[10px] font-mono tabular-nums font-bold px-1.5 py-0.2 rounded-md ${
                    viewMode === 'campaigns'
                      ? 'bg-white/20 text-white'
                      : 'bg-purple-500/20 text-purple-400'
                  }`}
                >
                  {campaignRepliesCount}
                </span>
              )}
            </button>

            {isAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setAutomationsSubView('rules');
                    setViewMode('automations');
                  }}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    viewMode === 'automations' && automationsSubView !== 'antiban'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : isDarkMode
                      ? 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
                  }`}
                >
                  <Zap size={14} className="shrink-0" />
                  <span>Automações & Regras</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAutomationsSubView('antiban');
                    setViewMode('automations');
                  }}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    viewMode === 'automations' && automationsSubView === 'antiban'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : isDarkMode
                      ? 'text-emerald-400 hover:text-white hover:bg-slate-800/70'
                      : 'text-emerald-700 hover:text-slate-900 hover:bg-white/70'
                  }`}
                  title="Regras automáticas anti-banimento do número"
                >
                  <ShieldCheck size={14} className="shrink-0" />
                  <span>Anti-Ban ({antiBanEnabled ? `${antiBanScore}%` : 'Off'})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('analytics')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    viewMode === 'analytics'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : isDarkMode
                      ? 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
                  }`}
                >
                  <BarChart3 size={14} className="shrink-0" />
                  <span>Análise de Tráfego</span>
                </button>
              </>
            )}
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={() => setIsConfiguring(true)}
              className={`hidden lg:flex px-3.5 py-2.5 rounded-xl text-xs font-semibold items-center gap-2 border transition-colors whitespace-nowrap shrink-0 ${
                isDarkMode
                  ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs'
              }`}
              title="Configurar Gateway ou API Oficial"
            >
              <QrCode size={15} className="text-emerald-500 shrink-0" />
              <span>Configurar Conexão</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content Split View */}
      {viewMode === 'campaigns' ? (
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <WhatsAppCampaigns
            onOpenChatByPhone={handleOpenChatByPhone}
            onOpenAntiBanSettings={
              isAdmin
                ? () => {
                    setAutomationsSubView('antiban');
                    setViewMode('automations');
                  }
                : undefined
            }
          />
        </div>
      ) : isAdmin && viewMode === 'automations' ? (
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <WhatsAppAutomations initialSubView={automationsSubView} />
        </div>
      ) : isAdmin && viewMode === 'analytics' ? (
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <WhatsAppAnalytics onBackToChat={() => setViewMode('chat')} />
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-row overflow-hidden relative">
          {/* LEFT COLUMN: Chat List Sidebar */}
          <aside
            className={`${
              selectedChatId ? 'hidden md:flex' : 'flex'
            } w-full md:w-[320px] lg:w-[350px] shrink-0 flex-col border-r h-full min-h-0 ${
              isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            {/* Search, New Contact Button, and Filter Controls */}
            <div className={`p-3.5 border-b space-y-3 shrink-0 ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search
                    size={15}
                    className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                      isDarkMode ? 'text-slate-500' : 'text-slate-400'
                    }`}
                  />
                  <input
                    type="text"
                    placeholder="Buscar contato real..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className={`w-full pl-8 pr-7 py-2 rounded-xl text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/40 border ${
                      isDarkMode
                        ? 'bg-slate-800/90 text-white placeholder-slate-500 border-slate-700/80'
                        : 'bg-slate-50 text-slate-900 placeholder-slate-400 border-slate-200/90'
                    }`}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setIsNewChatModalOpen(true)}
                  className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors shadow-2xs cursor-pointer"
                  title="Adicionar contato ou iniciar nova conversa real"
                >
                  <Plus size={14} />
                  <span>Novo</span>
                </button>
              </div>

              {/* Filter Tabs */}
              <div className={`grid grid-cols-3 gap-1 p-1 rounded-xl ${isDarkMode ? 'bg-slate-950/60' : 'bg-slate-100'}`}>
                {[
                  { id: 'all', label: 'Todas', count: chats.length },
                  { id: 'unread', label: 'Não lidas', count: totalUnreadCount },
                  { id: 'groups', label: 'Grupos', count: chats.filter(c => c.type === 'group').length }
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveFilter(tab.id as any)}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 ${
                      activeFilter === tab.id
                        ? isDarkMode
                          ? 'bg-slate-800 text-emerald-400 shadow-2xs'
                          : 'bg-white text-emerald-600 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className="text-[10px] font-mono opacity-75">({tab.count})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Conversation Items (Strictly Real Contacts) */}
            <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredChats.length > 0 ? (
                filteredChats.map(chat => {
                  const chatMsgs = chatMessages[chat.id] || [];
                  const lastMsg = chatMsgs.length > 0 ? chatMsgs[chatMsgs.length - 1] : null;
                  const lastText = lastMsg ? lastMsg.text : chat.lastMessage;
                  const lastTime = lastMsg ? lastMsg.time : chat.time;
                  const isLastMsgUser = lastMsg ? lastMsg.sender === 'user' : chat.lastMessageSender === 'user';
                  const lastStatus = lastMsg ? lastMsg.status : chat.lastMessageStatus;
                  const isSelected = selectedChatId === chat.id;

                  return (
                    <div
                      key={chat.id}
                      onClick={() => handleSelectChat(chat.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') handleSelectChat(chat.id);
                      }}
                      className={`w-full flex items-start gap-3 p-3.5 transition-colors text-left cursor-pointer group ${
                        isSelected
                          ? isDarkMode
                            ? 'bg-emerald-500/10'
                            : 'bg-emerald-50/70'
                          : isDarkMode
                          ? 'hover:bg-slate-800/50'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="relative shrink-0 mt-0.5">
                        <div
                          className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-xs text-white shadow-xs ${
                            chat.type === 'group' ? 'bg-indigo-600' : 'bg-emerald-600'
                          }`}
                        >
                          {chat.name.substring(0, 2).toUpperCase()}
                        </div>
                        {chat.online && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <h3
                            className={`text-xs font-bold truncate ${
                              isSelected
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : isDarkMode
                                ? 'text-slate-100'
                                : 'text-slate-900'
                            }`}
                          >
                            {chat.name}
                          </h3>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span
                              className={`text-[10px] font-mono ${
                                chat.unread > 0 ? 'text-emerald-500 font-bold' : 'text-slate-400'
                              }`}
                            >
                              {lastTime}
                            </span>
                            <button
                              type="button"
                              onClick={e => handleDeleteRealChat(chat.id, e)}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-rose-500/15 text-slate-400 hover:text-rose-500 transition-all"
                              title="Remover conversa da lista"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>

                        <p className="text-[10px] font-mono text-slate-400 truncate mb-1">
                          +{chat.phone} · {chat.roleOrDept}
                        </p>

                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1 min-w-0">
                            {isLastMsgUser && (
                              <span className="shrink-0">
                                {lastStatus === 'read' ? (
                                  <CheckCheck size={13} className="text-[#53bdeb]" />
                                ) : lastStatus === 'delivered' ? (
                                  <CheckCheck size={13} className="text-slate-400" />
                                ) : lastStatus === 'sent' ? (
                                  <Check size={13} className="text-emerald-500" />
                                ) : lastStatus === 'failed' ? (
                                  <AlertCircle size={12} className="text-rose-500" />
                                ) : (
                                  <Clock size={11} className="text-slate-400 animate-pulse" />
                                )}
                              </span>
                            )}
                            <p
                              className={`text-xs truncate ${
                                chat.unread > 0
                                  ? isDarkMode
                                    ? 'text-white font-semibold'
                                    : 'text-slate-900 font-semibold'
                                  : 'text-slate-500 dark:text-slate-400'
                              }`}
                            >
                              {lastText}
                            </p>
                          </div>

                          {chat.unread > 0 && (
                            <span className="shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-500 text-white text-[10px] font-mono font-bold flex items-center justify-center">
                              {chat.unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center h-72 p-6 text-center text-slate-400 space-y-3">
                  <MessageCircle size={36} className="opacity-30" />
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      Nenhum contato ou conversa real ainda
                    </p>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      {isAdmin
                        ? 'Adicione um número real de WhatsApp ou cadastre seu telefone em Automações & Regras.'
                        : 'Adicione um número real de WhatsApp para iniciar uma conversa.'}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 w-full pt-1">
                    <button
                      type="button"
                      onClick={() => setIsNewChatModalOpen(true)}
                      className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Plus size={14} />
                      <span>Adicionar Contato Real</span>
                    </button>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => setViewMode('automations')}
                        className={`w-full py-2 px-3 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                          isDarkMode
                            ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        Configurar Telefones & W-API
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* CENTER COLUMN: Active Chat Canvas */}
          <main
            className={`${
              selectedChatId ? 'flex' : 'hidden md:flex'
            } flex-1 min-w-0 flex-col h-full min-h-0 overflow-hidden ${
              isDarkMode ? 'bg-slate-950' : 'bg-slate-50'
            }`}
          >
            {selectedChat ? (
              <>
                {/* Active Chat Header */}
                <div
                  className={`px-4 py-3 border-b flex items-center justify-between shrink-0 z-10 ${
                    isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => setSelectedChatId(null)}
                      className="md:hidden p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                      title="Voltar para lista"
                    >
                      <X size={18} />
                    </button>
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold text-xs shrink-0 ${
                        selectedChat.type === 'group' ? 'bg-indigo-600' : 'bg-emerald-600'
                      }`}
                    >
                      {selectedChat.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="font-bold text-sm truncate">{selectedChat.name}</h2>
                        <span className="text-xs text-slate-400 hidden sm:inline">·</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline truncate">
                          {selectedChat.roleOrDept}
                        </span>
                      </div>
                      <p className="text-[11px] font-mono font-medium text-emerald-500">
                        +{selectedChat.phone} · Canal W-API Direto
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowContextPanel(!showContextPanel)}
                      className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                        showContextPanel
                          ? isDarkMode
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                            : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          : isDarkMode
                          ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                          : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                      }`}
                      title="Alternar Painel de Detalhes do Contato"
                    >
                      {showContextPanel ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
                      <span className="hidden lg:inline">Detalhes CRM</span>
                    </button>
                  </div>
                </div>

                {/* Messages Scroll Container */}
                <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 flex flex-col gap-3">
                  <div className="flex justify-center my-2">
                    <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                      Histórico Real de Envios (+{selectedChat.phone})
                    </span>
                  </div>

                  {messages.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400">
                      <Send size={28} className="mb-2 opacity-30" />
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        Nenhuma mensagem enviada para +{selectedChat.phone} ainda
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
                        Escreva uma mensagem abaixo para disparar em tempo real para o WhatsApp deste contato via W-API.
                      </p>
                    </div>
                  ) : (
                    messages.map(msg => (
                      <div
                        key={msg.id}
                        className={`flex flex-col max-w-[85%] sm:max-w-[70%] ${
                          msg.sender === 'user' ? 'self-end' : 'self-start'
                        }`}
                      >
                        <div
                          className={`px-3.5 py-2.5 rounded-2xl relative shadow-2xs ${
                            msg.sender === 'user'
                              ? msg.status === 'failed'
                                ? 'bg-rose-600 text-white rounded-tr-xs'
                                : 'bg-emerald-600 text-white rounded-tr-xs'
                              : isDarkMode
                              ? 'bg-slate-900 text-slate-100 rounded-tl-xs border border-slate-800'
                              : 'bg-white text-slate-900 rounded-tl-xs border border-slate-200/80'
                          }`}
                        >
                          {msg.sender === 'system' && msg.name && (
                            <p
                              className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${
                                isDarkMode ? 'text-emerald-400' : 'text-emerald-600'
                              }`}
                            >
                              {msg.name}
                            </p>
                          )}
                          <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                          <div className="flex items-center justify-end gap-1.5 mt-1 select-none">
                            <span
                              className={`text-[10px] font-mono ${
                                msg.sender === 'user' ? 'text-white/85' : 'text-slate-400'
                              }`}
                            >
                              {msg.time}
                            </span>
                            {msg.sender === 'user' && (
                              <span className="inline-flex items-center gap-1">
                                {msg.status === 'sending' && (
                                  <Clock size={12} className="text-emerald-200/80 animate-pulse" />
                                )}
                                {msg.status === 'sent' && (
                                  <span title="Enviado via W-API" className="inline-flex">
                                    <CheckCheck size={14} className="text-emerald-100" />
                                  </span>
                                )}
                                {msg.status === 'delivered' && (
                                  <CheckCheck size={14} className="text-emerald-100" />
                                )}
                                {msg.status === 'read' && (
                                  <CheckCheck size={14} className="text-[#53bdeb]" />
                                )}
                                {msg.status === 'failed' && (
                                  <span className="text-[10px] font-bold flex items-center gap-0.5 text-white">
                                    <AlertCircle size={12} /> Falha W-API
                                  </span>
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Reply Templates Bar */}
                <div
                  className={`px-4 py-2 border-t flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0 ${
                    isDarkMode ? 'bg-slate-900/60 border-slate-800/80' : 'bg-slate-100/80 border-slate-200/70'
                  }`}
                >
                  <span className="text-[11px] font-semibold text-slate-400 shrink-0 flex items-center gap-1">
                    <Sparkles size={12} className="text-emerald-500" />
                    Respostas rápidas:
                  </span>
                  {QUICK_REPLIES.map((reply, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleSendMessage(reply)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium shrink-0 border transition-colors ${
                        isDarkMode
                          ? 'bg-slate-800 border-slate-700 text-slate-300 hover:border-emerald-500/50 hover:text-white'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-500/50 hover:text-slate-900'
                      }`}
                    >
                      {reply}
                    </button>
                  ))}
                </div>

                {/* Message Composer */}
                <div
                  className={`p-3 sm:p-4 border-t shrink-0 ${
                    isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-end gap-2.5 max-w-4xl mx-auto">
                    <div className="flex-1 relative">
                      <textarea
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        placeholder="Escreva uma mensagem para enviar no WhatsApp (Enter para enviar)..."
                        rows={1}
                        className={`w-full px-4 py-2.5 rounded-xl text-xs sm:text-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/40 resize-none border ${
                          isDarkMode
                            ? 'bg-slate-800 text-white placeholder-slate-500 border-slate-700'
                            : 'bg-slate-50 text-slate-900 placeholder-slate-400 border-slate-200'
                        }`}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSendMessage()}
                      disabled={!message.trim() || isSending}
                      className={`px-4 py-2.5 rounded-xl font-semibold text-xs flex items-center gap-2 transition-all shrink-0 ${
                        message.trim() && !isSending
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                          : isDarkMode
                          ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {isSending ? <RefreshCw className="animate-spin" size={16} /> : <Send size={16} />}
                      <span className="hidden sm:inline">Enviar</span>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4">
                  <MessageCircle size={32} />
                </div>
                <h3 className="text-base font-bold mb-1">
                  {chats.length > 0 ? 'Selecione uma conversa ao lado' : 'Adicione um contato real para conversar'}
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mb-4">
                  Apenas contatos reais cadastrados por você ou acionados pelas automações aparecem aqui.
                </p>
                <button
                  type="button"
                  onClick={() => setIsNewChatModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
                >
                  <Plus size={15} />
                  <span>Adicionar Contato / Nova Conversa</span>
                </button>
              </div>
            )}
          </main>

          {/* RIGHT COLUMN: Context & CRM Sidebar */}
          {selectedChat && showContextPanel && (
            <aside
              className={`hidden xl:flex w-[300px] shrink-0 flex-col border-l h-full min-h-0 overflow-y-auto ${
                isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div className={`p-4 border-b ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-sm shrink-0 ${
                      selectedChat.type === 'group' ? 'bg-indigo-600' : 'bg-emerald-600'
                    }`}
                  >
                    {selectedChat.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm truncate">{selectedChat.name}</h3>
                    <p className="text-xs text-slate-400 font-mono">+{selectedChat.phone}</p>
                  </div>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  {selectedChat.type === 'group' ? <Users size={14} /> : <Building2 size={14} />}
                  <span>{selectedChat.roleOrDept}</span>
                </div>
              </div>

              <div className="p-4 space-y-5 flex-1">
                {/* Linked Order / Operation */}
                {selectedChat.linkedOrder && (
                  <div>
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                      <Truck size={13} className="text-emerald-500" />
                      <span>Vínculo Operacional</span>
                    </h4>
                    <div
                      className={`p-3 rounded-xl border text-xs ${
                        isDarkMode ? 'bg-slate-800/60 border-slate-700/80' : 'bg-slate-50 border-slate-200/80'
                      }`}
                    >
                      <p className="font-bold text-emerald-500 mb-1">{selectedChat.linkedOrder}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Sincronizado automaticamente com o painel de logística e faturamento.
                      </p>
                    </div>
                  </div>
                )}

                {/* Contact Tags */}
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                    <Tag size={13} className="text-emerald-500" />
                    <span>Classificação</span>
                  </h4>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-300">
                    {selectedChat.tags.map((tag, idx) => (
                      <React.Fragment key={tag}>
                        <span>{tag}</span>
                        {idx < selectedChat.tags.length - 1 && <span aria-hidden="true">·</span>}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                {/* Operational Notes */}
                {selectedChat.notes && (
                  <div>
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                      <FileText size={13} className="text-emerald-500" />
                      <span>Observações do Atendimento</span>
                    </h4>
                    <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                      {selectedChat.notes}
                    </p>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Ações Rápidas no Chat
                  </h4>
                  <button
                    type="button"
                    onClick={() =>
                      handleSendMessage(
                        `Olá ${selectedChat.name.split(' ')[0]}, segue atualização referente a ${
                          selectedChat.linkedOrder || 'seu atendimento'
                        }: status confirmado no sistema.`
                      )
                    }
                    className={`w-full py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-colors ${
                      isDarkMode
                        ? 'bg-slate-800/80 border-slate-700 hover:bg-slate-800 text-slate-200'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <CheckSquare size={14} className="text-emerald-500" />
                      Enviar Status da OS
                    </span>
                    <ChevronRight size={14} className="text-slate-400" />
                  </button>

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setViewMode('analytics')}
                      className={`w-full py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-colors ${
                        isDarkMode
                          ? 'bg-slate-800/80 border-slate-700 hover:bg-slate-800 text-slate-200'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <BarChart3 size={14} className="text-emerald-500" />
                        Ver Métricas de SLA
                      </span>
                      <ChevronRight size={14} className="text-slate-400" />
                    </button>
                  )}
                </div>
              </div>
            </aside>
          )}
        </div>
      )}

      {/* Configuration Modal */}
      <AnimatePresence>
        {isConfiguring && isAdmin && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsConfiguring(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 12 }}
              className={`relative w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl border max-h-[90vh] overflow-y-auto ${
                isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white">
                      <Settings size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">Configuração do Canal WhatsApp</h3>
                      <p className="text-xs text-slate-500">
                        Selecione o modo de conexão para disparo e recebimento de mensagens
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsConfiguring(false)}
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Tabs for Providers */}
                <div className="flex flex-wrap items-center gap-2 p-1.5 mb-6 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setConfigTab('alternative')}
                    className={`flex-1 min-w-[160px] flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                      configTab === 'alternative'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <QrCode size={15} />
                    <span>Gateway / QR Code</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConfigTab('meta')}
                    className={`flex-1 min-w-[160px] flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                      configTab === 'meta'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <ShieldCheck size={15} />
                    <span>API Cloud Oficial (Meta)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConfigTab('simulation')}
                    className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                      configTab === 'simulation'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Zap size={15} />
                    <span>Modo Simulação</span>
                  </button>
                </div>

                {/* TAB 1: ALTERNATIVE GATEWAY / QR CODE */}
                {configTab === 'alternative' && (
                  <div className="space-y-6">
                    {/* Quick Gateway Preset Bar */}
                    <div className={`p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-2.5 text-xs ${
                      isDarkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <span className="font-semibold text-slate-500 dark:text-slate-300">
                        Preenchimento rápido de provedor:
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setAltServerUrl('https://api.w-api.app')}
                          className={`px-3 py-1.5 rounded-lg font-bold border transition-colors ${
                            altServerUrl.includes('w-api')
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : isDarkMode
                              ? 'bg-slate-900 border-slate-700 text-emerald-400 hover:bg-slate-800'
                              : 'bg-white border-slate-300 text-emerald-700 hover:bg-emerald-50'
                          }`}
                        >
                          W-API (api.w-api.app)
                        </button>
                        <button
                          type="button"
                          onClick={() => setAltServerUrl('https://api.z-api.io')}
                          className={`px-3 py-1.5 rounded-lg font-semibold border transition-colors ${
                            altServerUrl.includes('z-api')
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : isDarkMode
                              ? 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                              : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          Z-API
                        </button>
                        <button
                          type="button"
                          onClick={() => setAltServerUrl('https://evolution.suaempresa.com')}
                          className={`px-3 py-1.5 rounded-lg font-semibold border transition-colors ${
                            altServerUrl.includes('evolution')
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : isDarkMode
                              ? 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                              : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          Evolution API
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold mb-1.5">
                            1. URL do Servidor Gateway (W-API / Evolution / Z-API)
                          </label>
                          <input
                            type="text"
                            value={altServerUrl}
                            onChange={e => setAltServerUrl(e.target.value)}
                            placeholder="https://api.w-api.app"
                            className={`w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border ${
                              isDarkMode
                                ? 'bg-slate-800 border-slate-700 text-white'
                                : 'bg-slate-50 border-slate-200 text-slate-900'
                            }`}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold mb-1.5">
                            2. Token da Instância / Bearer Token (W-API)
                          </label>
                          <input
                            type="password"
                            value={altApiKey}
                            onChange={e => setAltApiKey(e.target.value)}
                            placeholder="Cole aqui o Token da sua instância W-API"
                            className={`w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border ${
                              isDarkMode
                                ? 'bg-slate-800 border-slate-700 text-white'
                                : 'bg-slate-50 border-slate-200 text-slate-900'
                            }`}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold mb-1.5">
                            3. ID da Instância (Instance ID no painel W-API)
                          </label>
                          <input
                            type="text"
                            value={altInstance}
                            onChange={e => setAltInstance(e.target.value)}
                            placeholder="Ex: LITE-XXXXXX ou ID da Instância"
                            className={`w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border ${
                              isDarkMode
                                ? 'bg-slate-800 border-slate-700 text-white'
                                : 'bg-slate-50 border-slate-200 text-slate-900'
                            }`}
                          />
                        </div>
                      </div>

                      {/* QR CODE CONNECTION CARD */}
                      <div
                        className={`p-5 rounded-2xl border flex flex-col items-center justify-center text-center ${
                          isDarkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <span className="text-xs font-bold block mb-1">Pareamento por QR Code</span>
                        <span className="text-[11px] text-slate-400 mb-3">
                          Digitalize com o WhatsApp do seu celular
                        </span>

                        <div className="p-3 bg-white rounded-xl border border-slate-200 mb-3 relative">
                          <svg className="w-28 h-28 text-slate-900" viewBox="0 0 100 100" fill="currentColor">
                            <path d="M0,0 h30 v30 h-30 z M10,10 h10 v10 h-10 z" />
                            <path d="M70,0 h30 v30 h-30 z M80,10 h10 v10 h-10 z" />
                            <path d="M0,70 h30 v30 h-30 z M10,80 h10 v10 h-10 z" />
                            <rect x="35" y="5" width="8" height="8" />
                            <rect x="50" y="5" width="12" height="12" />
                            <rect x="35" y="20" width="10" height="10" />
                            <rect x="5" y="35" width="12" height="12" />
                            <rect x="25" y="35" width="8" height="8" />
                            <rect x="40" y="35" width="20" height="10" />
                            <rect x="70" y="35" width="10" height="10" />
                            <rect x="85" y="35" width="10" height="10" />
                            <rect x="35" y="50" width="15" height="15" />
                            <rect x="55" y="50" width="10" height="10" />
                            <rect x="75" y="50" width="15" height="15" />
                            <rect x="35" y="70" width="10" height="10" />
                            <rect x="50" y="70" width="20" height="10" />
                            <rect x="75" y="70" width="20" height="20" />
                          </svg>
                          {qrStatus === 'connected' && (
                            <div className="absolute inset-0 bg-emerald-600/95 rounded-xl flex flex-col items-center justify-center text-white p-2">
                              <CheckCircle2 size={26} className="mb-1" />
                              <span className="text-[11px] font-bold">Sessão Conectada</span>
                              <span className="text-[10px] font-mono opacity-90">+{qrPhoneConnected}</span>
                            </div>
                          )}
                        </div>

                        <div className="w-full">
                          {qrStatus === 'connected' ? (
                            <button
                              type="button"
                              onClick={() => setQrStatus('waiting')}
                              className="w-full py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 font-bold text-xs transition-colors"
                            >
                              Desconectar Sessão
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setQrStatus('connected');
                                setQrPhoneConnected('5511987654321');
                              }}
                              className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all"
                            >
                              Simular Leitura do QR Code
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <span className="text-xs font-bold block mb-1">Webhook de Entrada</span>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 font-mono text-[11px] break-all border border-slate-200 dark:border-slate-700">
                          {typeof window !== 'undefined' ? window.location.origin : ''}/api/whatsapp/webhook
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (typeof window !== 'undefined') {
                              navigator.clipboard.writeText(`${window.location.origin}/api/whatsapp/webhook`);
                              setCopiedWebhook(true);
                              setTimeout(() => setCopiedWebhook(false), 2000);
                            }
                          }}
                          className="px-3 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0"
                        >
                          <Copy size={14} />
                          <span>{copiedWebhook ? 'Copiado!' : 'Copiar'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: META CLOUD API OFICIAL */}
                {configTab === 'meta' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                      <h4 className="font-bold text-sm">Configuração Meta Cloud API</h4>
                      <p className="text-xs text-slate-500">
                        Configure as variáveis <code className="font-mono">WHATSAPP_ACCESS_TOKEN</code> e{' '}
                        <code className="font-mono">WHATSAPP_PHONE_NUMBER_ID</code> no servidor para envio oficial.
                      </p>
                      <a
                        href="https://developers.facebook.com/apps"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-500 hover:underline pt-1"
                      >
                        <span>Abrir Painel Meta for Developers</span>
                        <ExternalLink size={13} />
                      </a>
                    </div>
                  </div>
                )}

                {/* TAB 3: MODO SIMULAÇÃO */}
                {configTab === 'simulation' && (
                  <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center space-y-2">
                    <Zap size={24} className="text-amber-500 mx-auto" />
                    <h4 className="font-bold text-sm">Modo Simulação Interno</h4>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      Ideal para demonstrações e testes de fluxo de atendimento sem necessidade de credenciais externas.
                    </p>
                  </div>
                )}

                <div className="mt-6 flex items-center justify-end gap-3 border-t pt-4 border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsConfiguring(false)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                      isDarkMode
                        ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveProviderConfig}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2"
                  >
                    <CheckCircle2 size={15} />
                    <span>Salvar e Ativar Modo</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* MODAL: ADICIONAR NOVO CONTATO REAL */}
        {isNewChatModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden ${
                isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="p-6 space-y-5">
                <div className="flex items-center justify-between border-b pb-4 border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-500">
                      <Plus size={20} />
                    </div>
                    <div>
                      <h3 className="text-base font-black">Adicionar Contato Real</h3>
                      <p className="text-xs text-slate-500">
                        Cadastre um número real do WhatsApp para iniciar conversas
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsNewChatModalOpen(false)}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleCreateRealContact} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold block mb-1.5">Nome do Contato ou Grupo *</label>
                    <input
                      type="text"
                      required
                      value={newContactName}
                      onChange={(e) => setNewContactName(e.target.value)}
                      placeholder="Ex: Carlos Motorista / Cliente João"
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
                        isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold block mb-1.5">Número do WhatsApp (com DDD) *</label>
                    <input
                      type="tel"
                      required
                      value={newContactPhone}
                      onChange={(e) => setNewContactPhone(e.target.value)}
                      placeholder="Ex: 5583999998888 ou 83999998888"
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
                        isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                      }`}
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Digite apenas números (DDI 55 + DDD + Número). Se não colocar 55, adicionamos automaticamente.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold block mb-1.5">Setor / Função</label>
                      <input
                        type="text"
                        value={newContactRole}
                        onChange={(e) => setNewContactRole(e.target.value)}
                        placeholder="Ex: Motorista / Cliente"
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
                          isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold block mb-1.5">Tipo</label>
                      <select
                        value={newContactType}
                        onChange={(e) => setNewContactType(e.target.value as 'contact' | 'group')}
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
                          isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                        }`}
                      >
                        <option value="contact">Contato Individual</option>
                        <option value="group">Grupo / Setor</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => setIsNewChatModalOpen(false)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                        isDarkMode
                          ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
                    >
                      <CheckCircle2 size={15} />
                      <span>Salvar Contato Real</span>
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
