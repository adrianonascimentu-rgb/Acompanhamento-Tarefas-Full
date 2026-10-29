'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Megaphone,
  Users,
  MessageSquareReply,
  Send,
  Plus,
  Play,
  Pause,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Sparkles,
  Tag,
  Search,
  Filter,
  Trash2,
  ExternalLink,
  RefreshCw,
  Upload,
  UserPlus,
  ShieldCheck,
  Flame,
  HelpCircle,
  Ban,
  Eye,
  Copy,
  Check,
  ChevronRight,
  Store,
  Ticket,
  SlidersHorizontal,
  MessageCircle,
  ArrowUpRight,
  X,
  FileSpreadsheet,
  Phone,
  Zap,
  Calendar
} from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import {
  WhatsAppCampaign,
  WhatsAppCampaignCategory,
  WhatsAppCampaignRecipient,
  WhatsAppCustomerContact,
  CampaignFollowUpStatus,
  CampaignReplyIntent,
  CUSTOMER_SEGMENT_TAGS,
  CAMPAIGN_CATEGORY_META,
  STORE_CAMPAIGN_TEMPLATES,
  getCustomerContacts,
  saveCustomerContacts,
  importCustomersFromWhatsAppChatsAndDeliveries,
  importCustomersFromBulkText,
  getWhatsAppCampaigns,
  saveWhatsAppCampaigns,
  interpolateCampaignMessage,
  syncCampaignRepliesFromChatMessages,
  dispatchCampaignRecipient,
  appendCampaignMessageToChatHistory,
  getAntiBanConfig,
  getDirectoryConfig,
  normalizeBrazilPhone,
  formatPhoneDisplay,
  syncWhatsAppStateWithCloud
} from '@/lib/whatsappAutomation';

interface WhatsAppCampaignsProps {
  onOpenChatByPhone?: (phone: string, name: string) => void;
  onOpenAntiBanSettings?: () => void;
  onOpenCreateTrigger?: () => void;
}

export default function WhatsAppCampaigns({
  onOpenChatByPhone,
  onOpenAntiBanSettings,
  onOpenCreateTrigger
}: WhatsAppCampaignsProps) {
  const { isDarkMode } = useTheme();

  const [activeTab, setActiveTab] = useState<'campaigns' | 'replies' | 'customers'>('campaigns');
  const [campaigns, setCampaigns] = useState<WhatsAppCampaign[]>([]);
  const [customers, setCustomers] = useState<WhatsAppCustomerContact[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('ALL');

  // Running Campaign state
  const [runningCampaignId, setRunningCampaignId] = useState<string | null>(null);
  const [currentRecipientName, setCurrentRecipientName] = useState<string>('');
  const [dispatchStatusBanner, setDispatchStatusBanner] = useState<{
    type: 'info' | 'success' | 'warning' | 'error';
    text: string;
  } | null>(null);
  const pauseSignalRef = useRef<boolean>(false);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState(false);
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [replyModalTarget, setReplyModalTarget] = useState<{
    campaignId: string;
    recipient: WhatsAppCampaignRecipient;
  } | null>(null);
  const [manualReplyText, setManualReplyText] = useState('');

  // Filters in Replies & Customers tab
  const [replyFilter, setReplyFilter] = useState<
    'all' | 'replied' | 'interesse' | 'waiting' | 'optout'
  >('all');
  const [replySearch, setReplySearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomerTag, setSelectedCustomerTag] = useState<string>('ALL');

  // New Campaign Form State
  const [campName, setCampName] = useState('Novidades & Ofertas da Semana');
  const [campCategory, setCampCategory] = useState<WhatsAppCampaignCategory>('novidades');
  const [campStoreName, setCampStoreName] = useState('Nossa Loja');
  const [campCoupon, setCampCoupon] = useState('NOVIDADE10');
  const [campTemplate, setCampTemplate] = useState(STORE_CAMPAIGN_TEMPLATES[0].template);
  const [campTargetTags, setCampTargetTags] = useState<string[]>([]);
  const [campIncludeOptOut, setCampIncludeOptOut] = useState(true);
  const [selectedRecipientPhones, setSelectedRecipientPhones] = useState<string[]>([]);
  const [customAudienceMode, setCustomAudienceMode] = useState<'tags' | 'manual'>('tags');
  const [campTriggerWhenMode, setCampTriggerWhenMode] = useState<'immediate' | 'scheduled' | 'event_trigger'>('immediate');
  const [campScheduledDate, setCampScheduledDate] = useState('');
  const [campScheduledTime, setCampScheduledTime] = useState('09:00');
  const [campTriggerEventName, setCampTriggerEventName] = useState('Ao cadastrar novo cliente na base');

  // New Customer Form State
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustCity, setNewCustCity] = useState('');
  const [newCustTags, setNewCustTags] = useState<string[]>(['Varejo', 'Promoções']);

  // Bulk Import State
  const [bulkText, setBulkText] = useState('');
  const [bulkTags, setBulkTags] = useState<string[]>(['Varejo', 'Promoções', 'Novidades']);

  const [antiBanCfg, setAntiBanCfg] = useState(() => getAntiBanConfig());
  const [isSyncingReplies, setIsSyncingReplies] = useState(false);

  const loadData = () => {
    const loadedCust = getCustomerContacts();
    setCustomers(loadedCust);
    const { campaigns: syncedCamps } = syncCampaignRepliesFromChatMessages();
    const finalCamps = syncedCamps.length > 0 ? syncedCamps : getWhatsAppCampaigns();
    setCampaigns(finalCamps);
    setAntiBanCfg(getAntiBanConfig());
  };

  useEffect(() => {
    loadData();
    // Auto-import from existing WhatsApp chats if customer list is empty on first load
    const existing = getCustomerContacts();
    if (existing.length === 0) {
      const imported = importCustomersFromWhatsAppChatsAndDeliveries();
      if (imported.totalCount > 0) {
        setCustomers(imported.contacts);
      }
    }

    const handleUpdate = () => loadData();
    window.addEventListener('whatsapp-campaigns-updated', handleUpdate);
    window.addEventListener('whatsapp-cloud-synced', handleUpdate);
    window.addEventListener('whatsapp-antiban-updated', handleUpdate);

    const interval = setInterval(() => {
      syncCampaignRepliesFromChatMessages();
      setCampaigns(getWhatsAppCampaigns());
    }, 8000);

    return () => {
      window.removeEventListener('whatsapp-campaigns-updated', handleUpdate);
      window.removeEventListener('whatsapp-cloud-synced', handleUpdate);
      window.removeEventListener('whatsapp-antiban-updated', handleUpdate);
      clearInterval(interval);
    };
  }, []);

  // Eligible customers for New Campaign based on tags or manual selection
  const eligibleAudience = useMemo(() => {
    const activeCustomers = customers.filter(c => !c.optOut);
    if (customAudienceMode === 'manual') {
      const setPhones = new Set(selectedRecipientPhones);
      return activeCustomers.filter(c => setPhones.has(c.phone));
    }
    if (campTargetTags.length === 0) return activeCustomers;
    return activeCustomers.filter(c =>
      (c.tags || []).some(t => campTargetTags.includes(t))
    );
  }, [customers, campTargetTags, customAudienceMode, selectedRecipientPhones]);

  // Global KPI stats across campaigns
  const globalStats = useMemo(() => {
    let totalSent = 0;
    let totalReplies = 0;
    let hotLeadsCount = 0;
    let waitingReplyCount = 0;
    let pendingQueueCount = 0;

    for (const c of campaigns) {
      for (const r of c.recipients || []) {
        if (r.status === 'pending' || r.status === 'sending') {
          pendingQueueCount++;
        }
        if (
          r.status === 'sent' ||
          r.status === 'delivered' ||
          r.status === 'read' ||
          r.status === 'replied'
        ) {
          totalSent++;
        }
        if (r.status === 'replied') {
          totalReplies++;
          if (
            r.replyIntent === 'interesse' ||
            r.followUpStatus === 'aguardando_atendimento'
          ) {
            hotLeadsCount++;
          }
        } else if (r.status === 'sent' || r.status === 'delivered' || r.status === 'read') {
          waitingReplyCount++;
        }
      }
    }

    const replyRate = totalSent > 0 ? Math.round((totalReplies / totalSent) * 100) : 0;
    return {
      totalCampaigns: campaigns.length,
      totalCustomers: customers.filter(c => !c.optOut).length,
      totalSent,
      totalReplies,
      replyRate,
      hotLeadsCount,
      waitingReplyCount,
      pendingQueueCount
    };
  }, [campaigns, customers]);

  // Flattened recipients list for "Acompanhamento & Respostas" tab
  const flattenedTrackingRows = useMemo(() => {
    const rows: Array<{
      campaign: WhatsAppCampaign;
      recipient: WhatsAppCampaignRecipient;
    }> = [];

    for (const camp of campaigns) {
      if (selectedCampaignId !== 'ALL' && camp.id !== selectedCampaignId) continue;
      for (const rec of camp.recipients || []) {
        rows.push({ campaign: camp, recipient: rec });
      }
    }

    return rows.filter(({ recipient, campaign }) => {
      if (replyFilter === 'replied' && recipient.status !== 'replied') return false;
      if (
        replyFilter === 'interesse' &&
        !(
          recipient.status === 'replied' &&
          (recipient.replyIntent === 'interesse' ||
            recipient.followUpStatus === 'aguardando_atendimento')
        )
      ) {
        return false;
      }
      if (
        replyFilter === 'waiting' &&
        !(
          recipient.status === 'sent' ||
          recipient.status === 'delivered' ||
          recipient.status === 'read'
        )
      ) {
        return false;
      }
      if (
        replyFilter === 'optout' &&
        !(
          recipient.replyIntent === 'optout' ||
          recipient.status === 'skipped_optout' ||
          recipient.status === 'failed' ||
          recipient.status === 'blocked_antiban'
        )
      ) {
        return false;
      }

      if (replySearch.trim()) {
        const q = replySearch.toLowerCase();
        const matchName = recipient.name.toLowerCase().includes(q);
        const matchPhone = recipient.phone.includes(q);
        const matchReply = (recipient.replyText || '').toLowerCase().includes(q);
        const matchCamp = campaign.name.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchReply && !matchCamp) return false;
      }

      return true;
    });
  }, [campaigns, selectedCampaignId, replyFilter, replySearch]);

  // Filtered customers for "Base de Clientes" tab
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      if (selectedCustomerTag !== 'ALL') {
        if (selectedCustomerTag === 'OPTOUT') {
          if (!c.optOut) return false;
        } else if (!(c.tags || []).includes(selectedCustomerTag)) {
          return false;
        }
      }
      if (customerSearch.trim()) {
        const q = customerSearch.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          (c.cityOrNeighborhood || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [customers, selectedCustomerTag, customerSearch]);

  // Estimate dispatch duration based on Anti-Ban rules
  const estimatedDispatchMinutes = useMemo(() => {
    const count = eligibleAudience.length;
    if (count === 0) return 0;
    const avgDelaySec = antiBanCfg.enabled
      ? (antiBanCfg.minDelaySeconds + antiBanCfg.maxDelaySeconds) / 2 + 2
      : 2;
    const burstPausesSec =
      antiBanCfg.enabled && antiBanCfg.burstThreshold > 0
        ? Math.floor(count / antiBanCfg.burstThreshold) * antiBanCfg.pauseSecondsOnBurst
        : 0;
    return Math.max(1, Math.ceil((count * avgDelaySec + burstPausesSec) / 60));
  }, [eligibleAudience.length, antiBanCfg]);

  // Handlers
  const handleSelectTemplatePreset = (presetId: string) => {
    const found = STORE_CAMPAIGN_TEMPLATES.find(t => t.id === presetId);
    if (!found) return;
    setCampCategory(found.category);
    setCampTemplate(found.template);
    if (found.couponCode) setCampCoupon(found.couponCode);
    setCampName(found.title);
  };

  const handleInsertVariable = (variable: string) => {
    setCampTemplate(prev => `${prev} ${variable}`);
  };

  const handleCreateCampaign = (startImmediately = false) => {
    if (!campName.trim() || !campTemplate.trim()) {
      setDispatchStatusBanner({
        type: 'warning',
        text: 'Preencha o nome da campanha e o texto da mensagem.'
      });
      return;
    }

    if (eligibleAudience.length === 0) {
      setDispatchStatusBanner({
        type: 'warning',
        text: 'Nenhum cliente selecionado ou cadastrado para receber esta campanha. Cadastre ou importe clientes primeiro.'
      });
      return;
    }

    const nowIso = new Date().toISOString();
    const recipients: WhatsAppCampaignRecipient[] = eligibleAudience.map(cust => ({
      id: `rec-${Date.now()}-${cust.phone}`,
      customerId: cust.id,
      name: cust.name,
      phone: cust.phone,
      tags: cust.tags || ['Varejo'],
      status: cust.optOut ? 'skipped_optout' : 'pending'
    }));

    const newCampaign: WhatsAppCampaign = {
      id: `camp-${Date.now()}`,
      name: campName.trim(),
      category: campCategory,
      storeName: campStoreName.trim() || 'Nossa Loja',
      couponCode: campCoupon.trim() || undefined,
      template: campTemplate,
      targetTags: customAudienceMode === 'tags' ? campTargetTags : ['Seleção Manual'],
      status: 'draft',
      includeOptOutFooter: campIncludeOptOut,
      triggerWhenMode: startImmediately ? 'immediate' : campTriggerWhenMode,
      scheduledDate: campTriggerWhenMode === 'scheduled' ? campScheduledDate : undefined,
      scheduledTime: campTriggerWhenMode === 'scheduled' ? campScheduledTime : undefined,
      triggerEventName: campTriggerWhenMode === 'event_trigger' ? campTriggerEventName : undefined,
      recipients,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    const updated = [newCampaign, ...campaigns];
    saveWhatsAppCampaigns(updated, true);
    setCampaigns(updated);
    setIsCreateModalOpen(false);

    if (startImmediately) {
      setTimeout(() => {
        void handleRunCampaign(newCampaign.id);
      }, 250);
    } else {
      setDispatchStatusBanner({
        type: 'success',
        text: `Campanha "${newCampaign.name}" criada com ${recipients.length} clientes na fila!`
      });
    }
  };

  const handleRunCampaign = async (campaignId: string) => {
    if (runningCampaignId) {
      setDispatchStatusBanner({
        type: 'warning',
        text: 'Já existe um disparo em massa em andamento. Aguarde ou pause o atual.'
      });
      return;
    }

    const currentList = getWhatsAppCampaigns();
    const targetCamp = currentList.find(c => c.id === campaignId);
    if (!targetCamp) return;

    const pendingRecipients = targetCamp.recipients.filter(
      r => r.status === 'pending' || r.status === 'failed' || r.status === 'blocked_antiban'
    );

    if (pendingRecipients.length === 0) {
      setDispatchStatusBanner({
        type: 'info',
        text: 'Todos os destinatários desta campanha já receberam a mensagem.'
      });
      return;
    }

    pauseSignalRef.current = false;
    setRunningCampaignId(campaignId);
    setDispatchStatusBanner({
      type: 'info',
      text: `Iniciando disparo protegido Anti-Ban para ${pendingRecipients.length} cliente(s)...`
    });

    // Mark campaign as running
    const markRunning = getWhatsAppCampaigns().map(c =>
      c.id === campaignId
        ? {
            ...c,
            status: 'running' as const,
            startedAt: c.startedAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        : c
    );
    saveWhatsAppCampaigns(markRunning, false);
    setCampaigns(markRunning);

    let sentSuccessCount = 0;
    let failedCount = 0;

    for (const rec of pendingRecipients) {
      if (pauseSignalRef.current) {
        break;
      }

      // Check if customer opted out in the meantime
      const freshCustomers = getCustomerContacts();
      const custRecord = freshCustomers.find(
        c => normalizeBrazilPhone(c.phone) === normalizeBrazilPhone(rec.phone)
      );
      if (custRecord?.optOut) {
        const afterSkip = getWhatsAppCampaigns().map(c => {
          if (c.id !== campaignId) return c;
          return {
            ...c,
            recipients: c.recipients.map(r =>
              r.id === rec.id ? { ...r, status: 'skipped_optout' as const } : r
            )
          };
        });
        saveWhatsAppCampaigns(afterSkip, false);
        setCampaigns(afterSkip);
        continue;
      }

      setCurrentRecipientName(`${rec.name} (${formatPhoneDisplay(rec.phone)})`);

      // Mark recipient as 'sending'
      const markSending = getWhatsAppCampaigns().map(c => {
        if (c.id !== campaignId) return c;
        return {
          ...c,
          recipients: c.recipients.map(r =>
            r.id === rec.id ? { ...r, status: 'sending' as const } : r
          )
        };
      });
      saveWhatsAppCampaigns(markSending, false);
      setCampaigns(markSending);

      const latestCampObj =
        getWhatsAppCampaigns().find(c => c.id === campaignId) || targetCamp;

      const dispatchRes = await dispatchCampaignRecipient({
        campaign: latestCampObj,
        recipient: rec
      });

      const now = new Date();
      const timeLabel = `Hoje, ${now.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
      })}`;
      const nowIso = now.toISOString();

      if (dispatchRes.ok) {
        sentSuccessCount++;
      } else {
        failedCount++;
      }

      // Update recipient status
      const afterRecipientUpdate = getWhatsAppCampaigns().map(c => {
        if (c.id !== campaignId) return c;
        return {
          ...c,
          updatedAt: nowIso,
          recipients: c.recipients.map(r =>
            r.id === rec.id
              ? {
                  ...r,
                  status: dispatchRes.status,
                  sentMessage: dispatchRes.finalMessage,
                  sentAt: timeLabel,
                  sentAtIso: nowIso,
                  delayAppliedSeconds: dispatchRes.delayAppliedSeconds,
                  error: dispatchRes.error
                }
              : r
          )
        };
      });
      saveWhatsAppCampaigns(afterRecipientUpdate, false);
      setCampaigns(afterRecipientUpdate);

      // Update customer lastCampaignAt
      if (dispatchRes.ok) {
        const custs = getCustomerContacts();
        const updatedCusts = custs.map(c =>
          normalizeBrazilPhone(c.phone) === normalizeBrazilPhone(rec.phone)
            ? { ...c, lastCampaignAt: timeLabel }
            : c
        );
        saveCustomerContacts(updatedCusts, false);
        setCustomers(updatedCusts);
      }

      // If blocked by Anti-Ban rate limit, pause campaign automatically to protect number
      if (dispatchRes.status === 'blocked_antiban') {
        pauseSignalRef.current = true;
        setDispatchStatusBanner({
          type: 'warning',
          text: `Campanha pausada automaticamente pela Blindagem Anti-Ban: ${dispatchRes.error}`
        });
        break;
      }
    }

    // Finalize campaign state and push to cloud
    const finalCamps = getWhatsAppCampaigns().map(c => {
      if (c.id !== campaignId) return c;
      const stillPending = c.recipients.some(
        r => r.status === 'pending' || r.status === 'sending'
      );
      return {
        ...c,
        status: (stillPending ? 'paused' : 'completed') as 'paused' | 'completed',
        completedAt: stillPending ? c.completedAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    });

    saveWhatsAppCampaigns(finalCamps, true);
    saveCustomerContacts(getCustomerContacts(), true);
    setCampaigns(finalCamps);
    setRunningCampaignId(null);
    setCurrentRecipientName('');

    if (!pauseSignalRef.current) {
      setDispatchStatusBanner({
        type: 'success',
        text: `Disparo concluído! ${sentSuccessCount} enviada(s) com proteção Anti-Ban${
          failedCount > 0 ? ` e ${failedCount} falha(s)` : ''
        }.`
      });
    }
  };

  const handlePauseCampaign = () => {
    pauseSignalRef.current = true;
    setDispatchStatusBanner({
      type: 'warning',
      text: 'Pausando campanha após concluir o envio atual...'
    });
  };

  const handleTestCampaignToAdmin = async (campaign: WhatsAppCampaign) => {
    const dir = getDirectoryConfig();
    const adminPhone = normalizeBrazilPhone(dir.adminPhone);
    if (!adminPhone || adminPhone.length < 10) {
      setDispatchStatusBanner({
        type: 'warning',
        text: 'Configure o telefone do Administrador em Automações & Regras ou na Conexão para receber o teste.'
      });
      return;
    }

    setDispatchStatusBanner({
      type: 'info',
      text: `Enviando prévia de "${campaign.name}" para ${formatPhoneDisplay(adminPhone)}...`
    });

    const dummyRec: WhatsAppCampaignRecipient = {
      id: 'test-admin',
      name: dir.adminName || 'Administrador',
      phone: adminPhone,
      tags: ['VIP'],
      status: 'pending'
    };

    const res = await dispatchCampaignRecipient({
      campaign,
      recipient: dummyRec,
      isTestToAdmin: true,
      overridePhone: adminPhone
    });

    if (res.ok) {
      setDispatchStatusBanner({
        type: 'success',
        text: `Prévia enviada com sucesso para o WhatsApp do Administrador (${formatPhoneDisplay(
          adminPhone
        )})!`
      });
    } else {
      setDispatchStatusBanner({
        type: 'error',
        text: `Falha no envio de teste: ${res.error || 'Verifique a conexão W-API'}`
      });
    }
  };

  const handleDeleteCampaign = (campaignId: string) => {
    const next = campaigns.filter(c => c.id !== campaignId);
    saveWhatsAppCampaigns(next, true);
    setCampaigns(next);
    if (selectedCampaignId === campaignId) setSelectedCampaignId('ALL');
  };

  const handleSyncRepliesNow = async () => {
    setIsSyncingReplies(true);
    try {
      await syncWhatsAppStateWithCloud();
      const { newRepliesDetected } = syncCampaignRepliesFromChatMessages();
      loadData();
      setDispatchStatusBanner({
        type: 'success',
        text:
          newRepliesDetected > 0
            ? `${newRepliesDetected} nova(s) resposta(s) de clientes sincronizada(s) das conversas!`
            : ' Respostas e status de leitura sincronizados com as conversas do WhatsApp.'
      });
    } finally {
      setIsSyncingReplies(false);
    }
  };

  const handleUpdateFollowUpStatus = (
    campaignId: string,
    recipientId: string,
    followUpStatus: CampaignFollowUpStatus
  ) => {
    const updated = campaigns.map(c => {
      if (c.id !== campaignId) return c;
      return {
        ...c,
        updatedAt: new Date().toISOString(),
        recipients: c.recipients.map(r =>
          r.id === recipientId ? { ...r, followUpStatus } : r
        )
      };
    });
    saveWhatsAppCampaigns(updated, true);
    setCampaigns(updated);
  };

  const handleSaveManualReply = () => {
    if (!replyModalTarget || !manualReplyText.trim()) return;
    const { campaignId, recipient } = replyModalTarget;
    const text = manualReplyText.trim();

    // Record in WhatsApp chat history as an incoming client message so syncCampaignRepliesFromChatMessages picks it up and it shows in Chat!
    appendCampaignMessageToChatHistory({
      phone: recipient.phone,
      name: recipient.name,
      text,
      sender: 'client'
    });

    const { campaigns: synced } = syncCampaignRepliesFromChatMessages();
    setCampaigns(synced);
    setCustomers(getCustomerContacts());
    setReplyModalTarget(null);
    setManualReplyText('');
    setDispatchStatusBanner({
      type: 'success',
      text: `Resposta de ${recipient.name} registrada e vinculada à conversa do WhatsApp!`
    });
  };

  const handleImportFromChats = () => {
    const res = importCustomersFromWhatsAppChatsAndDeliveries();
    setCustomers(res.contacts);
    setDispatchStatusBanner({
      type: 'success',
      text:
        res.importedCount > 0
          ? `${res.importedCount} contato(s) sincronizado(s) das conversas do WhatsApp! Total: ${res.totalCount} clientes.`
          : `Base sincronizada (${res.totalCount} clientes ativos).`
    });
  };

  const handleBulkImportSubmit = () => {
    if (!bulkText.trim()) return;
    const res = importCustomersFromBulkText(bulkText, bulkTags);
    setCustomers(res.contacts);
    setBulkText('');
    setIsBulkImportModalOpen(false);
    setDispatchStatusBanner({
      type: 'success',
      text: `${res.importedCount} cliente(s) importado(s) com sucesso para a base!`
    });
  };

  const handleAddSingleCustomer = () => {
    const cleanPhone = normalizeBrazilPhone(newCustPhone);
    if (!newCustName.trim() || cleanPhone.length < 10) {
      setDispatchStatusBanner({
        type: 'warning',
        text: 'Informe o nome do cliente e um número de WhatsApp válido com DDD.'
      });
      return;
    }

    const newContact: WhatsAppCustomerContact = {
      id: `cust-${cleanPhone}`,
      name: newCustName.trim(),
      phone: cleanPhone,
      tags: newCustTags.length > 0 ? newCustTags : ['Varejo'],
      cityOrNeighborhood: newCustCity.trim() || undefined,
      optOut: false,
      createdAt: new Date().toISOString()
    };

    const next = saveCustomerContacts([newContact, ...customers], true);
    setCustomers(next);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustCity('');
    setIsAddCustomerModalOpen(false);
    setDispatchStatusBanner({
      type: 'success',
      text: `Cliente ${newContact.name} adicionado à lista de transmissão!`
    });
  };

  const handleToggleCustomerOptOut = (customerId: string) => {
    const updated = customers.map(c =>
      c.id === customerId ? { ...c, optOut: !c.optOut } : c
    );
    saveCustomerContacts(updated, true);
    setCustomers(updated);
  };

  const handleDeleteCustomer = (customerId: string) => {
    const updated = customers.filter(c => c.id !== customerId);
    saveCustomerContacts(updated, true);
    setCustomers(updated);
  };

  const previewText = useMemo(() => {
    const sampleName =
      eligibleAudience[0]?.name || customers[0]?.name || 'Carlos Eduardo';
    return interpolateCampaignMessage(campTemplate, {
      customerName: sampleName,
      storeName: campStoreName,
      couponCode: campCoupon,
      includeOptOutFooter: campIncludeOptOut
    });
  }, [campTemplate, campStoreName, campCoupon, campIncludeOptOut, eligibleAudience, customers]);

  const getIntentBadge = (intent?: CampaignReplyIntent) => {
    switch (intent) {
      case 'interesse':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
            <Flame size={12} /> Interesse / Compra
          </span>
        );
      case 'duvida':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30">
            <HelpCircle size={12} /> Dúvida / Cotação
          </span>
        );
      case 'optout':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-500/15 text-rose-500 border border-rose-500/30">
            <Ban size={12} /> Pediu para Sair (Opt-out)
          </span>
        );
      case 'agradecimento':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
            <CheckCircle2 size={12} /> Agradecimento
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">
            <MessageSquareReply size={12} /> Respondeu
          </span>
        );
    }
  };

  return (
    <div
      className={`flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-6 ${
        isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* Top Workspace Header */}
      <div
        className={`p-5 rounded-2xl border flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 ${
          isDarkMode
            ? 'bg-slate-900/90 border-slate-800'
            : 'bg-white border-slate-200/90 shadow-xs'
        }`}
      >
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
              <Megaphone size={18} />
            </div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight">
              Central de Campanhas, Novidades & Promoções
            </h2>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
              <ShieldCheck size={13} />
              Disparo Protegido Anti-Ban ({antiBanCfg.minDelaySeconds}s–{antiBanCfg.maxDelaySeconds}s)
            </span>
          </div>
          <p
            className={`text-xs sm:text-sm ${
              isDarkMode ? 'text-slate-400' : 'text-slate-600'
            }`}
          >
            Organize disparos em massa para clientes da loja, segmente por perfil e acompanhe em tempo real quem recebeu e quem respondeu.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleSyncRepliesNow}
            disabled={isSyncingReplies}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all ${
              isDarkMode
                ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200/70'
            }`}
          >
            <RefreshCw size={14} className={isSyncingReplies ? 'animate-spin text-emerald-500' : 'text-emerald-500'} />
            <span>Atualizar Respostas</span>
          </button>

          <button
            type="button"
            onClick={() => setIsBulkImportModalOpen(true)}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all ${
              isDarkMode
                ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200/70'
            }`}
          >
            <Upload size={14} className="text-blue-500" />
            <span>Importar Clientes</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm flex items-center gap-2 transition-all"
          >
            <Plus size={15} />
            <span>Nova Campanha / Promoção</span>
          </button>
        </div>
      </div>

      {/* Live Status Banner */}
      {dispatchStatusBanner && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs font-medium ${
            dispatchStatusBanner.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : dispatchStatusBanner.type === 'warning'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              : dispatchStatusBanner.type === 'error'
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {runningCampaignId ? (
              <RefreshCw size={15} className="animate-spin shrink-0" />
            ) : (
              <Sparkles size={15} className="shrink-0" />
            )}
            <span>
              {dispatchStatusBanner.text}
              {runningCampaignId && currentRecipientName
                ? ` • Enviando agora para: ${currentRecipientName}`
                : ''}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setDispatchStatusBanner(null)}
            className="p-1 rounded-lg hover:bg-black/10"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div
          className={`p-4 rounded-2xl border ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Clientes Ativos</span>
            <Users size={15} className="text-blue-500" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums">
            {globalStats.totalCustomers}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Prontos para receber ofertas
          </p>
        </div>

        <div
          className={`p-4 rounded-2xl border ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Mensagens Enviadas</span>
            <Send size={15} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums">
            {globalStats.totalSent}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Em {globalStats.totalCampaigns} campanha(s) criada(s)
          </p>
        </div>

        <div
          className={`p-4 rounded-2xl border ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Respostas de Clientes</span>
            <MessageSquareReply size={15} className="text-purple-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-purple-400">
              {globalStats.totalReplies}
            </span>
            <span className="text-xs font-bold text-emerald-500">
              ({globalStats.replyRate}% retorno)
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Vinculadas automaticamente ao chat
          </p>
        </div>

        <div
          onClick={() => {
            setReplyFilter('interesse');
            setActiveTab('replies');
          }}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            isDarkMode
              ? 'bg-slate-900 border-slate-800 hover:border-emerald-500/50'
              : 'bg-white border-slate-200/80 hover:border-emerald-500'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Interesse / Pedidos</span>
            <Flame size={15} className="text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-emerald-500">
            {globalStats.hotLeadsCount}
          </div>
          <p className="text-[11px] text-emerald-500/80 mt-1 flex items-center gap-1 font-medium">
            <span>Ver clientes interessados</span>
            <ChevronRight size={12} />
          </p>
        </div>

        <div
          onClick={onOpenAntiBanSettings}
          className={`p-4 rounded-2xl border cursor-pointer transition-all col-span-2 lg:col-span-1 ${
            isDarkMode
              ? 'bg-slate-900 border-slate-800 hover:border-emerald-500/40'
              : 'bg-white border-slate-200/80 hover:border-emerald-500'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Cadência Anti-Ban</span>
            <ShieldCheck size={15} className="text-emerald-500" />
          </div>
          <div className="text-base font-bold text-emerald-500">
            {antiBanCfg.enabled ? 'Blindagem Ativa' : 'Desativada'}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Máx {antiBanCfg.maxMessagesPerMinute}/min • Pausa a cada {antiBanCfg.burstThreshold} envios
          </p>
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div
        className={`flex flex-wrap items-center justify-between gap-3 border-b pb-3 ${
          isDarkMode ? 'border-slate-800' : 'border-slate-200'
        }`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('campaigns')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'campaigns'
                ? 'bg-emerald-600 text-white shadow-xs'
                : isDarkMode
                ? 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Megaphone size={14} />
            <span>1. Campanhas & Disparos ({campaigns.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('replies')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'replies'
                ? 'bg-emerald-600 text-white shadow-xs'
                : isDarkMode
                ? 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <MessageSquareReply size={14} />
            <span>2. Acompanhamento de Envios & Respostas</span>
            {globalStats.totalReplies > 0 && (
              <span
                className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${
                  activeTab === 'replies'
                    ? 'bg-white/20 text-white'
                    : 'bg-emerald-500/20 text-emerald-400'
                }`}
              >
                {globalStats.totalReplies} respostas
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('customers')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'customers'
                ? 'bg-emerald-600 text-white shadow-xs'
                : isDarkMode
                ? 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Users size={14} />
            <span>3. Base de Clientes & Segmentação ({customers.length})</span>
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: CAMPAIGNS & DISPATCHES */}
      {/* ===================================================================== */}
      {activeTab === 'campaigns' && (
        <div className="space-y-4">
          {campaigns.length === 0 ? (
            <div
              className={`p-10 rounded-2xl border text-center space-y-4 ${
                isDarkMode
                  ? 'bg-slate-900/70 border-slate-800'
                  : 'bg-white border-slate-200'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500 mx-auto">
                <Megaphone size={24} />
              </div>
              <div className="max-w-md mx-auto space-y-1.5">
                <h3 className="text-base font-bold">
                  Nenhuma campanha de novidades ou promoção criada ainda
                </h3>
                <p className="text-xs text-slate-400">
                  Crie sua primeira campanha com modelos prontos para novidades da loja, queima de estoque, cupons VIP ou ações de fim de semana, com envio automático protegido contra banimento.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2"
                >
                  <Plus size={15} />
                  <span>Criar Primeira Campanha</span>
                </button>
                <button
                  type="button"
                  onClick={handleImportFromChats}
                  className={`px-4 py-2.5 rounded-xl text-xs font-semibold border flex items-center gap-2 ${
                    isDarkMode
                      ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                      : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <RefreshCw size={14} className="text-emerald-500" />
                  <span>Sincronizar Clientes das Conversas ({customers.length})</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {campaigns.map(camp => {
                const total = camp.recipients.length;
                const sentCount = camp.recipients.filter(
                  r =>
                    r.status === 'sent' ||
                    r.status === 'delivered' ||
                    r.status === 'read' ||
                    r.status === 'replied'
                ).length;
                const repliedCount = camp.recipients.filter(
                  r => r.status === 'replied'
                ).length;
                const pendingCount = camp.recipients.filter(
                  r =>
                    r.status === 'pending' ||
                    r.status === 'failed' ||
                    r.status === 'blocked_antiban'
                ).length;
                const hotCount = camp.recipients.filter(
                  r => r.status === 'replied' && r.replyIntent === 'interesse'
                ).length;
                const progressPct = total > 0 ? Math.round((sentCount / total) * 100) : 0;
                const isThisRunning = runningCampaignId === camp.id;
                const catMeta =
                  CAMPAIGN_CATEGORY_META[camp.category] || CAMPAIGN_CATEGORY_META.novidades;

                return (
                  <div
                    key={camp.id}
                    className={`p-5 rounded-2xl border flex flex-col justify-between gap-4 transition-all ${
                      isDarkMode
                        ? 'bg-slate-900 border-slate-800 hover:border-slate-700'
                        : 'bg-white border-slate-200/90 shadow-2xs'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              {catMeta.label}
                            </span>
                            {camp.couponCode && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                <Ticket size={11} /> {camp.couponCode}
                              </span>
                            )}
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                isThisRunning
                                  ? 'bg-blue-500/20 text-blue-400 animate-pulse'
                                  : camp.status === 'completed'
                                  ? 'bg-emerald-500/15 text-emerald-400'
                                  : camp.status === 'paused'
                                  ? 'bg-amber-500/15 text-amber-400'
                                  : 'bg-slate-500/15 text-slate-400'
                              }`}
                            >
                              {isThisRunning
                                ? 'Disparando agora...'
                                : camp.status === 'completed'
                                ? 'Concluída'
                                : camp.status === 'paused'
                                ? 'Pausada'
                                : 'Pronta para Envio'}
                            </span>
                          </div>
                          <h3 className="text-base font-bold">{camp.name}</h3>
                          <p className="text-[11px] text-slate-400">
                            Loja: <strong className="text-slate-300">{camp.storeName}</strong> • Público:{' '}
                            {camp.targetTags.length > 0
                              ? camp.targetTags.join(', ')
                              : 'Todos os Clientes Ativos'}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteCampaign(camp.id)}
                          disabled={isThisRunning}
                          className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                          title="Excluir campanha"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      {/* Message Snippet */}
                      <div
                        className={`p-3 rounded-xl text-xs whitespace-pre-wrap line-clamp-3 border font-sans ${
                          isDarkMode
                            ? 'bg-slate-950/80 border-slate-800 text-slate-300'
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        {camp.template}
                      </div>

                      {/* Progress Bar & Metrics */}
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400 font-medium">
                            Progresso: <strong className="text-emerald-400">{sentCount}</strong> de{' '}
                            <strong>{total}</strong> enviados ({progressPct}%)
                          </span>
                          <span className="font-mono text-xs text-purple-400 font-bold">
                            {repliedCount} resposta(s){' '}
                            {hotCount > 0 ? `• 🔥 ${hotCount} interessado(s)` : ''}
                          </span>
                        </div>
                        <div
                          className={`w-full h-2 rounded-full overflow-hidden ${
                            isDarkMode ? 'bg-slate-800' : 'bg-slate-200'
                          }`}
                        >
                          <div
                            className="h-full bg-emerald-500 transition-all duration-300"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Actions Footer */}
                    <div
                      className={`pt-3 border-t flex flex-wrap items-center justify-between gap-2 ${
                        isDarkMode ? 'border-slate-800' : 'border-slate-100'
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        {isThisRunning ? (
                          <button
                            type="button"
                            onClick={handlePauseCampaign}
                            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5"
                          >
                            <Pause size={14} />
                            <span>Pausar Disparo</span>
                          </button>
                        ) : pendingCount > 0 ? (
                          <button
                            type="button"
                            onClick={() => void handleRunCampaign(camp.id)}
                            disabled={Boolean(runningCampaignId)}
                            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white flex items-center gap-1.5"
                          >
                            <Play size={14} />
                            <span>
                              {sentCount > 0
                                ? `Retomar Envio (${pendingCount} restantes)`
                                : `Disparar para ${pendingCount} Clientes`}
                            </span>
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-500 px-2 py-1">
                            <CheckCircle2 size={14} /> Todos os envios concluídos
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => void handleTestCampaignToAdmin(camp)}
                          className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-colors ${
                            isDarkMode
                              ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                              : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                          }`}
                          title="Envia uma prévia real para o celular do Administrador"
                        >
                          <Send size={13} className="text-emerald-500" />
                          <span>Testar no Meu WhatsApp</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCampaignId(camp.id);
                          setActiveTab('replies');
                        }}
                        className="px-3 py-2 rounded-xl text-xs font-bold text-emerald-500 hover:bg-emerald-500/10 flex items-center gap-1.5 transition-colors"
                      >
                        <Eye size={14} />
                        <span>Acompanhar Respostas ({repliedCount})</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: DELIVERY & REPLIES TRACKING (CRM DE RETORNO) */}
      {/* ===================================================================== */}
      {activeTab === 'replies' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div
            className={`p-4 rounded-2xl border flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 ${
              isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'all', label: 'Todos os Envios' },
                { id: 'replied', label: `Responderam (${globalStats.totalReplies})` },
                { id: 'interesse', label: `🔥 Quero / Orçamento (${globalStats.hotLeadsCount})` },
                { id: 'waiting', label: `Aguardando Retorno (${globalStats.waitingReplyCount})` },
                { id: 'optout', label: 'Opt-out / Falhas' }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setReplyFilter(tab.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    replyFilter === tab.id
                      ? 'bg-emerald-600 text-white'
                      : isDarkMode
                      ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <select
                value={selectedCampaignId}
                onChange={e => setSelectedCampaignId(e.target.value)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border focus:outline-none ${
                  isDarkMode
                    ? 'bg-slate-800 border-slate-700 text-slate-200'
                    : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <option value="ALL">Todas as Campanhas ({campaigns.length})</option>
                {campaigns.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.recipients.length} clientes)
                  </option>
                ))}
              </select>

              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="Buscar cliente, resposta ou telefone..."
                  value={replySearch}
                  onChange={e => setReplySearch(e.target.value)}
                  className={`pl-8 pr-3 py-2 rounded-xl text-xs border focus:outline-none ${
                    isDarkMode
                      ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500'
                      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Replies & Deliveries Table/Cards */}
          {flattenedTrackingRows.length === 0 ? (
            <div
              className={`p-10 rounded-2xl border text-center space-y-2 ${
                isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <MessageSquareReply size={28} className="mx-auto text-slate-500" />
              <p className="text-sm font-bold">
                Nenhum envio ou resposta encontrado para este filtro
              </p>
              <p className="text-xs text-slate-400">
                Assim que os clientes responderem no WhatsApp, as respostas aparecerão automaticamente aqui com classificação de interesse.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {flattenedTrackingRows.map(({ campaign, recipient }) => (
                <div
                  key={`${campaign.id}-${recipient.id}`}
                  className={`p-4 rounded-2xl border flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 transition-all ${
                    recipient.status === 'replied'
                      ? isDarkMode
                        ? 'bg-slate-900 border-emerald-500/40'
                        : 'bg-emerald-50/30 border-emerald-500/40'
                      : isDarkMode
                      ? 'bg-slate-900 border-slate-800'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  {/* Left: Customer & Campaign Info */}
                  <div className="space-y-1.5 min-w-[240px]">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm">{recipient.name}</span>
                      <span className="text-xs font-mono text-slate-400">
                        {formatPhoneDisplay(recipient.phone)}
                      </span>
                      {recipient.status === 'replied' ? (
                        getIntentBadge(recipient.replyIntent)
                      ) : recipient.status === 'sent' ||
                        recipient.status === 'delivered' ||
                        recipient.status === 'read' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 size={11} /> Entregue ({recipient.sentAt || 'Hoje'})
                        </span>
                      ) : recipient.status === 'pending' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-500/15 text-slate-400">
                          <Clock size={11} /> Na Fila
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-500/15 text-rose-400">
                          <AlertTriangle size={11} />{' '}
                          {recipient.status === 'skipped_optout'
                            ? 'Opt-out'
                            : recipient.error || 'Falha'}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                      <span>
                        Campanha: <strong className="text-slate-300">{campaign.name}</strong>
                      </span>
                      {recipient.delayAppliedSeconds ? (
                        <span>• Cadência Anti-Ban: +{recipient.delayAppliedSeconds}s</span>
                      ) : null}
                    </div>
                  </div>

                  {/* Middle: Customer Reply Bubble (if replied) or Sent Preview */}
                  <div className="flex-1 max-w-2xl">
                    {recipient.status === 'replied' && recipient.replyText ? (
                      <div
                        className={`p-3 rounded-xl border space-y-1 ${
                          isDarkMode
                            ? 'bg-emerald-950/30 border-emerald-500/30'
                            : 'bg-white border-emerald-300'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] text-emerald-400 font-bold">
                          <span>Resposta do Cliente ({recipient.repliedAt || 'Recente'}):</span>
                        </div>
                        <p className="text-xs sm:text-sm font-medium">
                          “{recipient.replyText}”
                        </p>
                      </div>
                    ) : (
                      <div
                        className={`p-2.5 rounded-xl border text-xs line-clamp-2 ${
                          isDarkMode
                            ? 'bg-slate-950/70 border-slate-800 text-slate-400'
                            : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        <span className="font-semibold text-slate-500 mr-1">
                          Mensagem enviada:
                        </span>
                        {recipient.sentMessage || campaign.template}
                      </div>
                    )}
                  </div>

                  {/* Right: CRM Status & Quick Chat Action */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <select
                      value={recipient.followUpStatus || 'aguardando_atendimento'}
                      onChange={e =>
                        handleUpdateFollowUpStatus(
                          campaign.id,
                          recipient.id,
                          e.target.value as CampaignFollowUpStatus
                        )
                      }
                      className={`px-2.5 py-2 rounded-xl text-xs font-semibold border focus:outline-none ${
                        recipient.followUpStatus === 'convertido'
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                          : recipient.followUpStatus === 'em_atendimento'
                          ? 'bg-blue-500/15 border-blue-500/40 text-blue-400'
                          : isDarkMode
                          ? 'bg-slate-800 border-slate-700 text-slate-200'
                          : 'bg-slate-100 border-slate-200 text-slate-700'
                      }`}
                    >
                      <option value="aguardando_atendimento">⏳ Aguardando Atendimento</option>
                      <option value="em_atendimento">💬 Em Negociação</option>
                      <option value="convertido">✅ Venda Convertida</option>
                      <option value="arquivado">📁 Arquivado</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => {
                        setReplyModalTarget({ campaignId: campaign.id, recipient });
                        setManualReplyText(recipient.replyText || '');
                      }}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                        isDarkMode
                          ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                          : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                      }`}
                      title="Registrar ou simular resposta recebida do cliente"
                    >
                      <span>Registrar Resposta</span>
                    </button>

                    {onOpenChatByPhone && (
                      <button
                        type="button"
                        onClick={() => onOpenChatByPhone(recipient.phone, recipient.name)}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-2xs transition-all"
                      >
                        <MessageCircle size={14} />
                        <span>Abrir no Chat</span>
                        <ArrowUpRight size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: CUSTOMER BASE & SEGMENTATION */}
      {/* ===================================================================== */}
      {activeTab === 'customers' && (
        <div className="space-y-4">
          {/* Customer Controls Bar */}
          <div
            className={`p-4 rounded-2xl border flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 ${
              isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedCustomerTag('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedCustomerTag === 'ALL'
                    ? 'bg-emerald-600 text-white'
                    : isDarkMode
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Todos ({customers.length})
              </button>
              {CUSTOMER_SEGMENT_TAGS.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSelectedCustomerTag(tag)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    selectedCustomerTag === tag
                      ? 'bg-emerald-600 text-white'
                      : isDarkMode
                      ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {tag}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setSelectedCustomerTag('OPTOUT')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedCustomerTag === 'OPTOUT'
                    ? 'bg-rose-600 text-white'
                    : isDarkMode
                    ? 'bg-slate-800 text-rose-400 hover:bg-slate-700'
                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                }`}
              >
                Opt-out / Bloqueados ({customers.filter(c => c.optOut).length})
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="Buscar cliente ou WhatsApp..."
                  value={customerSearch}
                  onChange={e => setCustomerSearch(e.target.value)}
                  className={`pl-8 pr-3 py-2 rounded-xl text-xs border focus:outline-none ${
                    isDarkMode
                      ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500'
                      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>

              <button
                type="button"
                onClick={handleImportFromChats}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 ${
                  isDarkMode
                    ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                    : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <RefreshCw size={13} className="text-emerald-500" />
                <span>Sincronizar das Conversas</span>
              </button>

              <button
                type="button"
                onClick={() => setIsAddCustomerModalOpen(true)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5"
              >
                <UserPlus size={14} />
                <span>Novo Cliente</span>
              </button>
            </div>
          </div>

          {/* Customers Grid */}
          {filteredCustomers.length === 0 ? (
            <div
              className={`p-10 rounded-2xl border text-center space-y-3 ${
                isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <Users size={28} className="mx-auto text-slate-500" />
              <p className="text-sm font-bold">Nenhum cliente encontrado neste segmento</p>
              <div className="flex flex-wrap justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleImportFromChats}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white"
                >
                  Importar Contatos das Conversas Atuais
                </button>
                <button
                  type="button"
                  onClick={() => setIsBulkImportModalOpen(true)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold border ${
                    isDarkMode
                      ? 'bg-slate-800 border-slate-700 text-slate-200'
                      : 'bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  Colar Lista de Clientes (Excel / CSV)
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
              {filteredCustomers.map(cust => (
                <div
                  key={cust.id}
                  className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 ${
                    cust.optOut
                      ? isDarkMode
                        ? 'bg-slate-900/40 border-rose-500/30 opacity-75'
                        : 'bg-rose-50/30 border-rose-200 opacity-80'
                      : isDarkMode
                      ? 'bg-slate-900 border-slate-800'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-sm flex items-center gap-1.5">
                          <span>{cust.name}</span>
                          {cust.optOut && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400">
                              Opt-out
                            </span>
                          )}
                        </h4>
                        <p className="text-xs font-mono text-slate-400">
                          {formatPhoneDisplay(cust.phone)}
                          {cust.cityOrNeighborhood ? ` • ${cust.cityOrNeighborhood}` : ''}
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        {onOpenChatByPhone && (
                          <button
                            type="button"
                            onClick={() => onOpenChatByPhone(cust.phone, cust.name)}
                            className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-500/10"
                            title="Abrir conversa com cliente"
                          >
                            <MessageCircle size={15} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleToggleCustomerOptOut(cust.id)}
                          className={`p-1.5 rounded-lg text-xs ${
                            cust.optOut
                              ? 'text-emerald-400 hover:bg-emerald-500/10'
                              : 'text-slate-400 hover:text-amber-400 hover:bg-amber-500/10'
                          }`}
                          title={
                            cust.optOut
                              ? 'Reativar recebimento de campanhas'
                              : 'Pausar envios promocionais (Opt-out)'
                          }
                        >
                          <Ban size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCustomer(cust.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10"
                          title="Remover cliente"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {(cust.tags || []).map(t => (
                        <span
                          key={t}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                            isDarkMode
                              ? 'bg-slate-800 text-slate-300 border border-slate-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {t}
                        </span>
                      ))}
                    </div>

                    {cust.lastReplyText && (
                      <div
                        className={`p-2 rounded-xl text-[11px] border ${
                          isDarkMode
                            ? 'bg-slate-950 border-slate-800 text-slate-300'
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <span className="text-emerald-400 font-bold">Última resposta: </span>“
                        {cust.lastReplyText}”
                      </div>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-500 flex items-center justify-between pt-2 border-t border-slate-800/40">
                    <span>
                      Última campanha: {cust.lastCampaignAt || 'Nenhum disparo ainda'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: CREATE MASS CAMPAIGN */}
      {/* ===================================================================== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div
            className={`w-full max-w-4xl rounded-2xl border p-5 sm:p-6 space-y-5 max-h-[92vh] overflow-y-auto ${
              isDarkMode
                ? 'bg-slate-900 border-slate-800 text-slate-100'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between border-b pb-3 border-slate-800/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
                  <Megaphone size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold">
                    Criar Nova Campanha de Novidades, Promoções ou Ação da Loja
                  </h3>
                  <p className="text-xs text-slate-400">
                    Configure a mensagem, escolha o público-alvo e dispare com proteção Anti-Ban automática
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Form (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                {/* Preset Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    1. Escolha um Modelo Pronto da Loja
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {STORE_CAMPAIGN_TEMPLATES.map(preset => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectTemplatePreset(preset.id)}
                        className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition-all ${
                          campName === preset.title
                            ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400'
                            : isDarkMode
                            ? 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="line-clamp-1 font-bold">{preset.title}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Cupom: {preset.couponCode}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Campaign Name, Store Name, Coupon */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-1 space-y-1">
                    <label className="text-xs font-semibold text-slate-400">
                      Nome da Campanha
                    </label>
                    <input
                      type="text"
                      value={campName}
                      onChange={e => setCampName(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl text-xs border ${
                        isDarkMode
                          ? 'bg-slate-800 border-slate-700 text-white'
                          : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400">
                      Nome da Loja ({'{loja}'})
                    </label>
                    <input
                      type="text"
                      value={campStoreName}
                      onChange={e => setCampStoreName(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl text-xs border ${
                        isDarkMode
                          ? 'bg-slate-800 border-slate-700 text-white'
                          : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400">
                      Cupom / Código ({'{cupom}'})
                    </label>
                    <input
                      type="text"
                      value={campCoupon}
                      onChange={e => setCampCoupon(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl text-xs font-mono border ${
                        isDarkMode
                          ? 'bg-slate-800 border-slate-700 text-emerald-400'
                          : 'bg-slate-50 border-slate-200 text-emerald-700'
                      }`}
                    />
                  </div>
                </div>

                {/* Message Editor + Variables */}
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="text-xs font-semibold text-slate-400">
                      2. Texto da Mensagem (Personalizado por Cliente)
                    </label>
                    <div className="flex flex-wrap items-center gap-1">
                      {[
                        '{primeiro_nome}',
                        '{nome}',
                        '{saudacao}',
                        '{loja}',
                        '{cupom}',
                        '{data}'
                      ].map(v => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => handleInsertVariable(v)}
                          className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25"
                        >
                          +{v}
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    rows={6}
                    value={campTemplate}
                    onChange={e => setCampTemplate(e.target.value)}
                    className={`w-full p-3 rounded-xl text-xs border font-sans leading-relaxed focus:outline-none ${
                      isDarkMode
                        ? 'bg-slate-950 border-slate-800 text-slate-100'
                        : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                  <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={campIncludeOptOut}
                      onChange={e => setCampIncludeOptOut(e.target.checked)}
                      className="rounded text-emerald-600"
                    />
                    <span>
                      Incluir rodapé anti-denúncia (“Caso não queira mais receber nossas novidades, responda SAIR”)
                    </span>
                  </label>
                </div>

                {/* Audience Segmentation */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      3. Público-Alvo ({eligibleAudience.length} clientes selecionados)
                    </label>
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => setCustomAudienceMode('tags')}
                        className={`px-2.5 py-1 rounded-lg font-semibold ${
                          customAudienceMode === 'tags'
                            ? 'bg-emerald-600 text-white'
                            : 'text-slate-400 hover:underline'
                        }`}
                      >
                        Por Etiquetas
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomAudienceMode('manual');
                          if (selectedRecipientPhones.length === 0) {
                            setSelectedRecipientPhones(
                              customers.filter(c => !c.optOut).map(c => c.phone)
                            );
                          }
                        }}
                        className={`px-2.5 py-1 rounded-lg font-semibold ${
                          customAudienceMode === 'manual'
                            ? 'bg-emerald-600 text-white'
                            : 'text-slate-400 hover:underline'
                        }`}
                      >
                        Escolher Clientes Manualmente
                      </button>
                    </div>
                  </div>

                  {customAudienceMode === 'tags' ? (
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => setCampTargetTags([])}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
                          campTargetTags.length === 0
                            ? 'bg-emerald-600 border-emerald-500 text-white'
                            : isDarkMode
                            ? 'bg-slate-800 border-slate-700 text-slate-300'
                            : 'bg-slate-100 border-slate-200 text-slate-700'
                        }`}
                      >
                        Todos os Clientes Ativos ({customers.filter(c => !c.optOut).length})
                      </button>
                      {CUSTOMER_SEGMENT_TAGS.map(tag => {
                        const active = campTargetTags.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() =>
                              setCampTargetTags(prev =>
                                prev.includes(tag)
                                  ? prev.filter(t => t !== tag)
                                  : [...prev, tag]
                              )
                            }
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
                              active
                                ? 'bg-emerald-600 border-emerald-500 text-white'
                                : isDarkMode
                                ? 'bg-slate-800 border-slate-700 text-slate-300'
                                : 'bg-slate-100 border-slate-200 text-slate-700'
                            }`}
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div
                      className={`max-h-40 overflow-y-auto p-2.5 rounded-xl border space-y-1.5 ${
                        isDarkMode
                          ? 'bg-slate-950 border-slate-800'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      {customers
                        .filter(c => !c.optOut)
                        .map(cust => {
                          const checked = selectedRecipientPhones.includes(cust.phone);
                          return (
                            <label
                              key={cust.id}
                              className="flex items-center justify-between text-xs p-1.5 rounded-lg hover:bg-slate-800/40 cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={e => {
                                    if (e.target.checked) {
                                      setSelectedRecipientPhones(prev => [
                                        ...prev,
                                        cust.phone
                                      ]);
                                    } else {
                                      setSelectedRecipientPhones(prev =>
                                        prev.filter(p => p !== cust.phone)
                                      );
                                    }
                                  }}
                                />
                                <span className="font-semibold">{cust.name}</span>
                              </div>
                              <span className="font-mono text-slate-400">
                                {formatPhoneDisplay(cust.phone)}
                              </span>
                            </label>
                          );
                        })}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Preview & Anti-Ban Estimator (5 cols) */}
              <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Prévia Real no WhatsApp do Cliente
                  </span>
                  <div
                    className={`p-4 rounded-2xl border space-y-3 ${
                      isDarkMode
                        ? 'bg-[#0b141a] border-slate-800'
                        : 'bg-[#efeae2] border-slate-300'
                    }`}
                  >
                    <div
                      className={`p-3.5 rounded-2xl rounded-tl-xs text-xs whitespace-pre-wrap leading-relaxed shadow-xs ${
                        isDarkMode
                          ? 'bg-[#005c4b] text-slate-100'
                          : 'bg-[#d9fdd3] text-slate-900'
                      }`}
                    >
                      {previewText}
                      <div className="text-[10px] opacity-75 text-right mt-1.5">
                        {new Date().toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}{' '}
                        ✓✓
                      </div>
                    </div>
                  </div>
                </div>

                {/* Anti-Ban Safety Box */}
                <div
                  className={`p-4 rounded-2xl border space-y-2 ${
                    isDarkMode
                      ? 'bg-emerald-950/20 border-emerald-500/30'
                      : 'bg-emerald-50 border-emerald-200'
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-500">
                    <ShieldCheck size={16} />
                    <span>Estimativa de Envio Protegido (Anti-Ban)</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    • Destinatários elegíveis: <strong>{eligibleAudience.length} cliente(s)</strong>
                    <br />• Intervalo humano: <strong>{antiBanCfg.minDelaySeconds}s a {antiBanCfg.maxDelaySeconds}s</strong> + simulação de digitação
                    <br />• Tempo estimado total: <strong>~{estimatedDispatchMinutes} min</strong>
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => handleCreateCampaign(false)}
                    className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold border ${
                      isDarkMode
                        ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                        : 'bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200'
                    }`}
                  >
                    Salvar Campanha
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCreateCampaign(true)}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Play size={14} />
                    <span>Criar e Disparar Agora</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: BULK IMPORT CUSTOMERS */}
      {/* ===================================================================== */}
      {isBulkImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className={`w-full max-w-xl rounded-2xl border p-5 sm:p-6 space-y-4 ${
              isDarkMode
                ? 'bg-slate-900 border-slate-800 text-slate-100'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet size={18} className="text-emerald-500" />
                <h3 className="text-base font-bold">
                  Importar Lista de Clientes em Massa
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkImportModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Cole abaixo sua lista de clientes (um por linha) copiada do Excel, planilha ou bloco de notas no formato{' '}
              <code className="text-emerald-400">Nome, Telefone, Bairro/Tag</code> ou{' '}
              <code className="text-emerald-400">Nome - Telefone</code>:
            </p>

            <textarea
              rows={7}
              placeholder={
                'João Carlos, 83999887766, Manaira\nMaria Aparecida - (83) 98877-6655\nConstrutora Horizonte, 5583996543210, Obras & Construção'
              }
              value={bulkText}
              onChange={e => setBulkText(e.target.value)}
              className={`w-full p-3 rounded-xl text-xs font-mono border focus:outline-none ${
                isDarkMode
                  ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-600'
                  : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
              }`}
            />

            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-400">
                Etiquetas para aplicar aos clientes importados:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {CUSTOMER_SEGMENT_TAGS.map(tag => {
                  const active = bulkTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() =>
                        setBulkTags(prev =>
                          prev.includes(tag)
                            ? prev.filter(t => t !== tag)
                            : [...prev, tag]
                        )
                      }
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                        active
                          ? 'bg-emerald-600 border-emerald-500 text-white'
                          : isDarkMode
                          ? 'bg-slate-800 border-slate-700 text-slate-300'
                          : 'bg-slate-100 border-slate-200 text-slate-700'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsBulkImportModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleBulkImportSubmit}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                Importar Clientes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: ADD SINGLE CUSTOMER */}
      {/* ===================================================================== */}
      {isAddCustomerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className={`w-full max-w-md rounded-2xl border p-5 space-y-4 ${
              isDarkMode
                ? 'bg-slate-900 border-slate-800 text-slate-100'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold flex items-center gap-2">
                <UserPlus size={17} className="text-emerald-500" />
                <span>Cadastrar Cliente na Base</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddCustomerModalOpen(false)}
                className="p-1 rounded-lg text-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-400">
                  Nome Completo / Empresa
                </label>
                <input
                  type="text"
                  placeholder="Ex: Roberto Almeida"
                  value={newCustName}
                  onChange={e => setNewCustName(e.target.value)}
                  className={`w-full mt-1 px-3 py-2 rounded-xl text-xs border ${
                    isDarkMode
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400">
                  WhatsApp com DDD
                </label>
                <input
                  type="text"
                  placeholder="Ex: (83) 99999-8888"
                  value={newCustPhone}
                  onChange={e => setNewCustPhone(e.target.value)}
                  className={`w-full mt-1 px-3 py-2 rounded-xl text-xs font-mono border ${
                    isDarkMode
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400">
                  Bairro / Cidade (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Manaíra / João Pessoa"
                  value={newCustCity}
                  onChange={e => setNewCustCity(e.target.value)}
                  className={`w-full mt-1 px-3 py-2 rounded-xl text-xs border ${
                    isDarkMode
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">
                  Segmento / Etiquetas
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {CUSTOMER_SEGMENT_TAGS.map(tag => {
                    const active = newCustTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() =>
                          setNewCustTags(prev =>
                            prev.includes(tag)
                              ? prev.filter(t => t !== tag)
                              : [...prev, tag]
                          )
                        }
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                          active
                            ? 'bg-emerald-600 border-emerald-500 text-white'
                            : isDarkMode
                            ? 'bg-slate-800 border-slate-700 text-slate-300'
                            : 'bg-slate-100 border-slate-200 text-slate-700'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddCustomerModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAddSingleCustomer}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                Salvar Cliente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: REGISTER / SIMULATE CUSTOMER REPLY */}
      {/* ===================================================================== */}
      {replyModalTarget && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className={`w-full max-w-md rounded-2xl border p-5 space-y-4 ${
              isDarkMode
                ? 'bg-slate-900 border-slate-800 text-slate-100'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <MessageSquareReply size={16} className="text-emerald-500" />
                <span>Resposta de {replyModalTarget.recipient.name}</span>
              </h3>
              <button
                type="button"
                onClick={() => setReplyModalTarget(null)}
                className="p-1 rounded-lg text-slate-400"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              As respostas enviadas pelo cliente no WhatsApp são capturadas automaticamente. Você também pode registrar ou testar uma resposta abaixo para organizar o retorno:
            </p>

            <div className="flex flex-wrap gap-1.5">
              {[
                'EU QUERO! Pode me enviar a tabela de preços?',
                'Tem a pronta-entrega? Quero fazer um orçamento.',
                'Qual o horário de funcionamento da loja hoje?',
                'Show, obrigado pelo aviso!',
                'SAIR'
              ].map(sample => (
                <button
                  key={sample}
                  type="button"
                  onClick={() => setManualReplyText(sample)}
                  className="px-2.5 py-1 rounded-lg text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 text-left"
                >
                  “{sample}”
                </button>
              ))}
            </div>

            <textarea
              rows={3}
              value={manualReplyText}
              onChange={e => setManualReplyText(e.target.value)}
              placeholder="Digite o retorno do cliente..."
              className={`w-full p-3 rounded-xl text-xs border focus:outline-none ${
                isDarkMode
                  ? 'bg-slate-950 border-slate-800 text-white'
                  : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReplyModalTarget(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveManualReply}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                Salvar Resposta & Vincular ao Chat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
