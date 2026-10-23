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
  CheckSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import WhatsAppAnalytics from '@/components/whatsapp/WhatsAppAnalytics';
import WhatsAppAutomations from '@/components/whatsapp/WhatsAppAutomations';
import { getAutomatedInboxMessages } from '@/lib/whatsappAutomation';

interface WhatsAppMessage {
  id: string;
  text: string;
  sender: 'user' | 'system';
  name?: string;
  time: string;
  status?: 'sending' | 'sent' | 'delivered' | 'read';
}

interface ChatContact {
  id: string;
  name: string;
  phone: string;
  lastMessage: string;
  lastMessageSender: 'user' | 'system';
  lastMessageStatus?: 'sending' | 'sent' | 'delivered' | 'read';
  time: string;
  unread: number;
  online: boolean;
  type: 'group' | 'contact';
  roleOrDept: string;
  tags: string[];
  linkedOrder?: string;
  notes?: string;
}

const INITIAL_CHATS: ChatContact[] = [
  {
    id: '1',
    name: 'Almoxarifado Central',
    phone: '5511999999999',
    lastMessage: 'Excelente, vou providenciar a retirada no almoxarifado.',
    lastMessageSender: 'user',
    lastMessageStatus: 'read',
    time: '14:32',
    unread: 0,
    online: true,
    type: 'group',
    roleOrDept: 'Logística & Estoque Interno',
    tags: ['Prioridade', 'Estoque', 'Interno'],
    linkedOrder: 'OS #4295 - Compressor Industrial',
    notes: 'Grupo oficial para liberação imediata de peças e conferência de NF.'
  },
  {
    id: '2',
    name: 'João Entregador (Frota 04)',
    phone: '5511888888888',
    lastMessage: 'Perfeito! Coletar assinatura no canhoto da nota fiscal.',
    lastMessageSender: 'user',
    lastMessageStatus: 'read',
    time: '13:46',
    unread: 0,
    online: true,
    type: 'contact',
    roleOrDept: 'Motorista / Rota Zona Sul',
    tags: ['Em Rota', 'Entrega Expressa'],
    linkedOrder: 'Romaneio #884 - 6 Entregas',
    notes: 'Confirmar baixa do canhoto digitalizado antes das 17h.'
  },
  {
    id: '3',
    name: 'Equipe de Vendas',
    phone: '5511777777777',
    lastMessage: 'Nova meta batida! 3 novos contratos assinados hoje.',
    lastMessageSender: 'system',
    time: '12:10',
    unread: 1,
    online: false,
    type: 'group',
    roleOrDept: 'Comercial & Prospecção',
    tags: ['Comercial', 'Metas Q4'],
    linkedOrder: 'Campanha Outubro - 94% concluída',
    notes: 'Acompanhamento diário de propostas aprovadas e comissões.'
  },
  {
    id: '4',
    name: 'Metalúrgica São José',
    phone: '5511965432100',
    lastMessage: 'Podem enviar o boleto atualizado e a chave PIX?',
    lastMessageSender: 'system',
    time: '11:25',
    unread: 2,
    online: true,
    type: 'contact',
    roleOrDept: 'Cliente Corporativo B2B',
    tags: ['Financeiro', 'Cliente VIP'],
    linkedOrder: 'Pedido #9012 - R$ 8.450,00',
    notes: 'Cliente solicitou faturamento para 28 dias. Aguardando comprovante.'
  }
];

const INITIAL_MESSAGES: Record<string, WhatsAppMessage[]> = {
  '1': [
    { id: 'm1', text: 'Bom dia pessoal! Alguma previsão para o compressor?', sender: 'user', time: '10:00', status: 'read' },
    { id: 'm2', text: 'Bom dia! O pedido acabou de ser conferido pelo financeiro.', sender: 'system', name: 'Ricardo', time: '10:05' },
    { id: 'm3', text: 'O pedido de compressor foi aprovado no sistema.', sender: 'system', name: 'Sueli', time: '14:30' },
    { id: 'm4', text: 'Excelente, vou providenciar a retirada no almoxarifado.', sender: 'user', time: '14:32', status: 'read' },
  ],
  '2': [
    { id: 'm5', text: 'João, onde você está com a entrega da OS #4290?', sender: 'user', time: '13:30', status: 'read' },
    { id: 'm6', text: 'Cheguei no cliente 04 agora para descarregar.', sender: 'system', name: 'João', time: '13:45' },
    { id: 'm7', text: 'Perfeito! Coletar assinatura no canhoto da nota fiscal.', sender: 'user', time: '13:46', status: 'read' },
  ],
  '3': [
    { id: 'm8', text: 'Boa tarde equipe, conseguimos fechar a meta do trimestre?', sender: 'user', time: '12:00', status: 'read' },
    { id: 'm9', text: 'Nova meta batida! 3 novos contratos assinados hoje.', sender: 'system', name: 'Carlos', time: '12:10' },
  ],
  '4': [
    { id: 'm10', text: 'Olá! Seu pedido #9012 já foi separado para expedição.', sender: 'user', time: '11:10', status: 'read' },
    { id: 'm11', text: 'Maravilha! Podem enviar o boleto atualizado e a chave PIX?', sender: 'system', name: 'Marcos (Compras)', time: '11:25' },
  ]
};

const QUICK_REPLIES = [
  'Pedido conferido e liberado para entrega!',
  'Por favor, envie a foto do canhoto assinado.',
  'Segue nossa confirmação de agendamento.',
  'Recebido! Nossa equipe já está verificando.'
];

export default function WhatsAppPage() {
  const { isDarkMode } = useTheme();
  const { canAccessWhatsapp } = useRole();
  const [viewMode, setViewMode] = useState<'chat' | 'automations' | 'analytics'>('chat');
  const [chats, setChats] = useState<ChatContact[]>(INITIAL_CHATS);
  const [selectedChatId, setSelectedChatId] = useState<string | null>('1');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'groups'>('all');
  const [message, setMessage] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [showContextPanel, setShowContextPanel] = useState(true);
  const [chatMessages, setChatMessages] = useState<Record<string, WhatsAppMessage[]>>(INITIAL_MESSAGES);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Connection states
  const [isConnected, setIsConnected] = useState(true);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [apiStatus, setApiStatus] = useState<any>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [isSending, setIsSending] = useState(false);

  // WhatsApp Provider Integration States
  const [providerMode, setProviderMode] = useState<'meta' | 'alternative' | 'simulation'>('alternative');
  const [configTab, setConfigTab] = useState<'meta' | 'alternative' | 'simulation'>('alternative');
  const [altServerUrl, setAltServerUrl] = useState('https://api.z-api.io');
  const [altApiKey, setAltApiKey] = useState('');
  const [altInstance, setAltInstance] = useState('instancia_vendas_01');
  const [qrStatus, setQrStatus] = useState<'idle' | 'generating' | 'waiting' | 'connected'>('connected');
  const [qrPhoneConnected, setQrPhoneConnected] = useState('5511999999999');
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Load saved provider settings on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem('whatsapp_provider_mode') as any;
      if (savedMode) {
        setProviderMode(savedMode);
        setConfigTab(savedMode);
      }
      const savedUrl = localStorage.getItem('whatsapp_alt_server_url');
      if (savedUrl) setAltServerUrl(savedUrl);
      const savedKey = localStorage.getItem('whatsapp_alt_api_key');
      if (savedKey) setAltApiKey(savedKey);
      const savedInst = localStorage.getItem('whatsapp_alt_instance');
      if (savedInst) setAltInstance(savedInst);
    }
  }, []);

  const handleSaveProviderConfig = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('whatsapp_provider_mode', configTab);
      localStorage.setItem('whatsapp_alt_server_url', altServerUrl);
      localStorage.setItem('whatsapp_alt_api_key', altApiKey);
      localStorage.setItem('whatsapp_alt_instance', altInstance);
    }
    setProviderMode(configTab);
    setIsConfiguring(false);
  };

  useEffect(() => {
    checkApiStatus();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, selectedChatId, isTyping]);

  // Sync automated messages dispatched by WhatsAppAutomation rules into chat inbox
  useEffect(() => {
    const syncAutomatedMessages = () => {
      const autoMsgs = getAutomatedInboxMessages();
      if (!autoMsgs || autoMsgs.length === 0) return;

      setChats(prevChats => {
        const nextChats = [...prevChats];
        autoMsgs.forEach(item => {
          const existingIdx = nextChats.findIndex(
            c =>
              c.phone.replace(/\D/g, '') === item.recipientPhone.replace(/\D/g, '') ||
              c.name.toLowerCase() === item.recipientName.toLowerCase()
          );
          if (existingIdx === -1) {
            const newChatId = `auto-chat-${item.recipientPhone.replace(/\D/g, '')}`;
            if (!nextChats.some(c => c.id === newChatId)) {
              nextChats.unshift({
                id: newChatId,
                name: item.recipientName,
                phone: item.recipientPhone,
                lastMessage: item.text,
                lastMessageSender: 'user',
                lastMessageStatus: 'read',
                time: item.time,
                unread: 0,
                online: true,
                type: 'contact',
                roleOrDept: 'Automação WhatsApp',
                tags: ['Automático', 'Regra Ativa']
              });
            }
          }
        });
        return nextChats;
      });

      setChatMessages(prevMsgs => {
        const nextMsgs = { ...prevMsgs };
        autoMsgs.forEach(item => {
          const cleanPhone = item.recipientPhone.replace(/\D/g, '');
          const matchedInitial = INITIAL_CHATS.find(
            c =>
              c.phone.replace(/\D/g, '') === cleanPhone ||
              c.name.toLowerCase() === item.recipientName.toLowerCase()
          );
          const chatId = matchedInitial ? matchedInitial.id : `auto-chat-${cleanPhone}`;
          const currentList = nextMsgs[chatId] || [];
          if (!currentList.some(m => m.id === item.id)) {
            nextMsgs[chatId] = [
              ...currentList,
              {
                id: item.id,
                text: item.text,
                sender: 'user',
                time: item.time,
                status: 'read'
              }
            ];
          }
        });
        return nextMsgs;
      });
    };

    syncAutomatedMessages();
    window.addEventListener('whatsapp-automation-message-sent', syncAutomatedMessages);
    return () => window.removeEventListener('whatsapp-automation-message-sent', syncAutomatedMessages);
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

  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText ?? message).trim();
    if (!textToSend || !selectedChatId) return;

    const chat = chats.find(c => c.id === selectedChatId);
    if (!chat) return;

    if (!customText) setMessage('');
    setIsSending(true);

    const msgId = 'msg-' + Date.now();
    const formattedTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newMsg: WhatsAppMessage = {
      id: msgId,
      text: textToSend,
      sender: 'user',
      time: formattedTime,
      status: 'sending'
    };

    setChatMessages(prev => ({
      ...prev,
      [selectedChatId]: [...(prev[selectedChatId] || []), newMsg]
    }));

    try {
      await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: chat.phone,
          message: textToSend,
          providerMode,
          altServerUrl,
          altApiKey,
          altInstance
        })
      });
    } catch (err) {
      console.warn('WhatsApp API send fallback to simulated delivery:', err);
    }

    setIsSending(false);

    // 1. Sent after 600ms
    setTimeout(() => {
      setChatMessages(prev => ({
        ...prev,
        [selectedChatId]: (prev[selectedChatId] || []).map(m =>
          m.id === msgId ? { ...m, status: 'sent' } : m
        )
      }));
    }, 600);

    // 2. Delivered after 1500ms
    setTimeout(() => {
      setChatMessages(prev => ({
        ...prev,
        [selectedChatId]: (prev[selectedChatId] || []).map(m =>
          m.id === msgId ? { ...m, status: 'delivered' } : m
        )
      }));
    }, 1500);

    // 3. Read after 2800ms
    setTimeout(() => {
      setChatMessages(prev => ({
        ...prev,
        [selectedChatId]: (prev[selectedChatId] || []).map(m =>
          m.id === msgId ? { ...m, status: 'read' } : m
        )
      }));
    }, 2800);

    // 4. Simulated interactive reply from recipient
    setTimeout(() => {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        const contactFirstName = chat.name.split(' ')[0];
        const replyText =
          chat.type === 'group'
            ? 'Recebido pela equipe! Estamos acompanhando a solicitação.'
            : `Perfeito, mensagem recebida e confirmada por ${contactFirstName}.`;

        const replyMsg: WhatsAppMessage = {
          id: 'reply-' + Date.now(),
          text: replyText,
          sender: 'system',
          name: chat.type === 'group' ? 'Atendimento' : contactFirstName,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setChatMessages(prev => ({
          ...prev,
          [selectedChatId]: [...(prev[selectedChatId] || []), replyMsg]
        }));
      }, 1800);
    }, 3400);
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
        </div>

        {/* Center / Right Navigation & Quick Actions */}
        <div className="flex flex-wrap items-center justify-between lg:justify-end gap-2.5">
          <div className={`grid grid-cols-3 sm:flex items-center gap-1 p-1 rounded-xl border w-full sm:w-auto ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200/80'}`}>
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
              onClick={() => setViewMode('automations')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                viewMode === 'automations'
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
          </div>

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
        </div>
      </header>

      {/* Main Content Split View */}
      {viewMode === 'automations' ? (
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <WhatsAppAutomations />
        </div>
      ) : viewMode === 'analytics' ? (
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
            {/* Search and Filter Controls */}
            <div className={`p-3.5 border-b space-y-3 shrink-0 ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
              <div className="relative">
                <Search
                  size={16}
                  className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${
                    isDarkMode ? 'text-slate-500' : 'text-slate-400'
                  }`}
                />
                <input
                  type="text"
                  placeholder="Buscar contato, telefone ou setor..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className={`w-full pl-9 pr-8 py-2 rounded-xl text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/40 border ${
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
                    <X size={14} />
                  </button>
                )}
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

            {/* Conversation Items */}
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
                    <button
                      key={chat.id}
                      type="button"
                      onClick={() => handleSelectChat(chat.id)}
                      className={`w-full flex items-start gap-3.5 p-3.5 transition-colors text-left ${
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
                          <span
                            className={`text-[10px] font-mono shrink-0 ${
                              chat.unread > 0 ? 'text-emerald-500 font-bold' : 'text-slate-400'
                            }`}
                          >
                            {lastTime}
                          </span>
                        </div>

                        <p className="text-[10px] text-slate-400 truncate mb-1">{chat.roleOrDept}</p>

                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1 min-w-0">
                            {isLastMsgUser && (
                              <span className="shrink-0">
                                {lastStatus === 'read' ? (
                                  <CheckCheck size={13} className="text-[#53bdeb]" />
                                ) : lastStatus === 'delivered' ? (
                                  <CheckCheck size={13} className="text-slate-400" />
                                ) : lastStatus === 'sent' ? (
                                  <Check size={13} className="text-slate-400" />
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
                    </button>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center h-64 p-6 text-center text-slate-400">
                  <MessageCircle size={36} className="mb-2 opacity-30" />
                  <p className="text-xs font-medium">Nenhuma conversa encontrada para este filtro.</p>
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
                      <p
                        className={`text-[11px] font-medium ${
                          isTyping
                            ? 'text-emerald-500 animate-pulse'
                            : selectedChat.online
                            ? 'text-emerald-500'
                            : 'text-slate-400'
                        }`}
                      >
                        +{selectedChat.phone} ·{' '}
                        {isTyping ? 'digitando mensagem...' : selectedChat.online ? 'Online agora' : 'Visto recentemente'}
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
                      Histórico criptografado ponta a ponta · Hoje
                    </span>
                  </div>

                  {messages.map(msg => (
                    <div
                      key={msg.id}
                      className={`flex flex-col max-w-[85%] sm:max-w-[70%] ${
                        msg.sender === 'user' ? 'self-end' : 'self-start'
                      }`}
                    >
                      <div
                        className={`px-3.5 py-2.5 rounded-2xl relative shadow-2xs ${
                          msg.sender === 'user'
                            ? isDarkMode
                              ? 'bg-emerald-600 text-white rounded-tr-xs'
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
                              msg.sender === 'user' ? 'text-emerald-100/90' : 'text-slate-400'
                            }`}
                          >
                            {msg.time}
                          </span>
                          {msg.sender === 'user' && (
                            <span className="inline-flex items-center">
                              {msg.status === 'sending' && (
                                <Clock size={12} className="text-emerald-200/80 animate-pulse" />
                              )}
                              {msg.status === 'sent' && <Check size={13} className="text-emerald-100" />}
                              {msg.status === 'delivered' && <CheckCheck size={14} className="text-emerald-100" />}
                              {msg.status === 'read' && (
                                <CheckCheck size={14} className="text-[#53bdeb] drop-shadow-[0_0_2px_rgba(83,189,235,0.6)]" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {isTyping && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="self-start flex flex-col max-w-[75%]"
                    >
                      <div
                        className={`px-4 py-2.5 rounded-2xl rounded-tl-xs border flex items-center gap-1.5 ${
                          isDarkMode
                            ? 'bg-slate-900 text-slate-400 border-slate-800'
                            : 'bg-white text-slate-500 border-slate-200'
                        }`}
                      >
                        <span className="text-xs font-medium mr-1">
                          {selectedChat.name.split(' ')[0]} está digitando
                        </span>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" />
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce"
                          style={{ animationDelay: '150ms' }}
                        />
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce"
                          style={{ animationDelay: '300ms' }}
                        />
                      </div>
                    </motion.div>
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
                <h3 className="text-base font-bold mb-1">Selecione uma conversa ao lado</h3>
                <p className="text-xs text-slate-500 max-w-sm">
                  Escolha um cliente, motorista ou grupo interno para visualizar o histórico e disparar mensagens em tempo real.
                </p>
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
                </div>
              </div>
            </aside>
          )}
        </div>
      )}

      {/* Configuration Modal */}
      <AnimatePresence>
        {isConfiguring && (
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold mb-1.5">URL do Servidor Gateway</label>
                          <input
                            type="text"
                            value={altServerUrl}
                            onChange={e => setAltServerUrl(e.target.value)}
                            placeholder="https://api.z-api.io ou https://evolution.suaempresa.com"
                            className={`w-full px-3.5 py-2.5 text-xs rounded-xl border ${
                              isDarkMode
                                ? 'bg-slate-800 border-slate-700 text-white'
                                : 'bg-slate-50 border-slate-200 text-slate-900'
                            }`}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold mb-1.5">Chave de API / Token</label>
                          <input
                            type="password"
                            value={altApiKey}
                            onChange={e => setAltApiKey(e.target.value)}
                            placeholder="Sua chave de API do Gateway"
                            className={`w-full px-3.5 py-2.5 text-xs rounded-xl border ${
                              isDarkMode
                                ? 'bg-slate-800 border-slate-700 text-white'
                                : 'bg-slate-50 border-slate-200 text-slate-900'
                            }`}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold mb-1.5">ID / Nome da Instância</label>
                          <input
                            type="text"
                            value={altInstance}
                            onChange={e => setAltInstance(e.target.value)}
                            placeholder="instancia_01"
                            className={`w-full px-3.5 py-2.5 text-xs rounded-xl border ${
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
      </AnimatePresence>
    </div>
  );
}
