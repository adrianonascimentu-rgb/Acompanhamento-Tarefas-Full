'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { useUI } from '@/hooks/useUI';
import { useRole } from '@/hooks/useRole';
import {
  Zap,
  Plus,
  Clock,
  CheckCircle2,
  Send,
  Edit2,
  Trash2,
  Sparkles,
  Truck,
  ClipboardList,
  Users,
  Package,
  BarChart3,
  Phone,
  Search,
  X,
  Play,
  History,
  Settings,
  Check,
  AlertTriangle,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  Bell,
  ArrowRight,
  Home,
  Wind,
  Award,
  ListTodo,
  Target,
  ShoppingBag,
  Calculator,
  ArrowRightLeft,
  Wrench,
  Tag,
  Store,
  TrendingUp,
  Radio,
  DollarSign
} from 'lucide-react';
import {
  WhatsAppAutomationRule,
  WhatsAppAutomationLog,
  AutomationCategory,
  AutomationTriggerType,
  RecipientTarget,
  TRIGGER_METADATA,
  getAutomationRules,
  saveAutomationRules,
  getAutomationLogs,
  saveAutomationLog,
  clearAutomationLogs,
  getDirectoryConfig,
  saveDirectoryConfig,
  getProviderConfig,
  saveProviderConfig,
  syncWhatsAppStateWithCloud,
  triggerWhatsAppAutomation,
  interpolateTemplate,
  DEFAULT_AUTOMATION_RULES,
  normalizeBrazilPhone,
  isPlaceholderPhone,
  recordMessageInWhatsAppFeed,
  recordWhatsAppTrafficEvent,
  syncCollaboratorPhonesFromProfiles,
  getCachedProfilePhones,
  CollaboratorProfilePhone,
  WhatsAppAntiBanConfig,
  WhatsAppAntiBanProfile,
  WhatsAppAntiBanStats,
  ANTIBAN_PROFILE_PRESETS,
  DEFAULT_ANTIBAN_CONFIG,
  getAntiBanConfig,
  saveAntiBanConfig,
  getAntiBanLiveStats,
  humanizeWhatsAppMessage,
  WhatsAppCustomTrigger,
  TriggerFiringMode,
  SYSTEM_ACTION_CATALOG,
  SIDEBAR_MODULE_OPTIONS,
  getCustomTriggers,
  saveCustomTriggers,
  deleteCustomTrigger,
  getAllTriggerMetadata
} from '@/lib/whatsappAutomation';

const EXTRA_SUGGESTION_TEMPLATES: Omit<WhatsAppAutomationRule, 'id' | 'totalSentCount'>[] = [
  {
    name: 'Pesquisa Rápida de Satisfação Pós-Entrega',
    description: 'Envia mensagem automática ao cliente 30 minutos após a entrega ser finalizada pelo motorista para avaliar o atendimento.',
    category: 'clients',
    trigger: 'delivery_finalized',
    enabled: true,
    recipientTarget: 'delivery_client',
    conditionStatus: ['Finalizada'],
    isSuggested: true,
    template:
      '⭐ *Entrega Concluída com Sucesso!*\n\nOlá! Confirmamos a entrega do seu pedido (*{produto}*) realizada hoje às {horario} por *{motorista}*.\n\nDe 1 a 5, como você avalia nossa entrega? Seu retorno é fundamental para nossa qualidade!'
  },
  {
    name: 'Alerta de Entrega Especial para Equipe Comercial',
    description: 'Dispara aviso imediato no grupo de vendas/logística quando uma Entrega ou Retirada Especial é reservada.',
    category: 'deliveries',
    trigger: 'special_delivery_alert',
    enabled: true,
    recipientTarget: 'custom_number',
    customPhone: '5511999999999',
    isSuggested: true,
    template:
      '🚨 *Aviso de Entrega/Retirada Especial*\n\nFoi agendada uma operação especial:\n• *Data/Turno:* {data} ({turno})\n• *Motorista/Veículo:* {motorista} - {veiculo}\n• *Carga:* {produto}\n• *Local:* {endereco}\n\nFavor verificar disponibilidade de frota antes de agendar novas entregas neste turno.'
  },
  {
    name: 'Boletim Executivo de Fechamento do Dia (Diretoria)',
    description: 'Envia às 18:15 um resumo para o Administrador com o total de entregas concluídas, pendentes e tarefas do dia.',
    category: 'management',
    trigger: 'daily_executive_summary',
    enabled: true,
    recipientTarget: 'admin_or_creator',
    scheduleTime: '18:15',
    isSuggested: true,
    template:
      '📊 *Resumo Executivo Diário ({data})*\n\nConfira os indicadores de fechamento de hoje:\n• *Entregas Finalizadas:* {entregas_concluidas}\n• *Entregas Pendentes:* {quantidade_pendente}\n• *Tarefas Concluídas:* {tarefas_concluidas}\n• *Tarefas em Aberto:* {tarefas_pendentes}\n\nRelatório gerado automaticamente pela Central WhatsApp.'
  }
];

const CATEGORY_LABELS: Record<string, { label: string; shortLabel: string; icon: any; section?: string }> = {
  all: { label: 'Todas as Regras', shortLabel: 'Todas', icon: Zap },
  // Principal
  home: { label: 'Início', shortLabel: 'Início', icon: Home, section: 'Principal' },
  products: { label: 'Catálogo de Peças', shortLabel: 'Peças', icon: Package, section: 'Principal' },
  split_table: { label: 'Tabela de Split', shortLabel: 'Split', icon: Wind, section: 'Principal' },
  loyalty: { label: 'Clientes Fidelidade', shortLabel: 'Fidelidade', icon: Award, section: 'Principal' },
  tasks: { label: 'Tarefas', shortLabel: 'Tarefas', icon: ClipboardList, section: 'Principal' },
  demands: { label: 'Demandas', shortLabel: 'Demandas', icon: ListTodo, section: 'Principal' },
  routes: { label: 'Rotas & GPS', shortLabel: 'Rotas', icon: Truck, section: 'Principal' },
  // Comunicação & CRM
  whatsapp: { label: 'WhatsApp', shortLabel: 'WhatsApp', icon: MessageCircle, section: 'Comunicação & CRM' },
  leads: { label: 'Leads', shortLabel: 'Leads', icon: Target, section: 'Comunicação & CRM' },
  social_media: { label: 'Site', shortLabel: 'Site', icon: ShoppingBag, section: 'Comunicação & CRM' },
  // Operações
  deliveries: { label: 'Entregas', shortLabel: 'Entregas', icon: Truck, section: 'Operações' },
  shipping_calculator: { label: 'Cálculo de Frete', shortLabel: 'Frete', icon: Calculator, section: 'Operações' },
  truck_history: { label: 'Caminhão Reposição', shortLabel: 'Reposição', icon: Truck, section: 'Operações' },
  transfers: { label: 'Transferências', shortLabel: 'Transferências', icon: ArrowRightLeft, section: 'Operações' },
  warranties: { label: 'Garantias', shortLabel: 'Garantias', icon: ShieldCheck, section: 'Operações' },
  assistances: { label: 'Assistência Técnica', shortLabel: 'Assistência', icon: Wrench, section: 'Operações' },
  price_research: { label: 'Pesquisa Concorrentes', shortLabel: 'Concorrentes', icon: Tag, section: 'Operações' },
  mercado_livre: { label: 'Pesquisa Mercado Livre', shortLabel: 'Mercado Livre', icon: Store, section: 'Operações' },
  // Resultados
  sales: { label: 'Vendas', shortLabel: 'Vendas', icon: TrendingUp, section: 'Resultados' },
  reports: { label: 'Relatórios', shortLabel: 'Relatórios', icon: BarChart3, section: 'Resultados' },
  // Administração
  live_panel: { label: 'Painel Ao Vivo (GPS)', shortLabel: 'GPS Ao Vivo', icon: Radio, section: 'Administração' },
  collaborators: { label: 'Equipe', shortLabel: 'Equipe', icon: Users, section: 'Administração' },
  commissions: { label: 'Comissionados', shortLabel: 'Comissionados', icon: DollarSign, section: 'Administração' },
  settings: { label: 'Configurações', shortLabel: 'Configurações', icon: Settings, section: 'Administração' },
  adriano_commissions: { label: 'Comissões Adriano', shortLabel: 'Comissões Adriano', icon: TrendingUp, section: 'Administração' },
  // Compatibilidade com regras anteriores
  clients: { label: 'Avisos a Clientes', shortLabel: 'Clientes', icon: Users, section: 'Comunicação & CRM' },
  management: { label: 'Diretoria & Resumos', shortLabel: 'Diretoria', icon: BarChart3, section: 'Administração' }
};

const RECIPIENT_LABELS: Record<RecipientTarget, string> = {
  assigned_collaborator: 'Colaborador escolhido na tarefa',
  admin_or_creator: 'Administrador / Criador da tarefa',
  assigned_driver: 'Motorista escalado na entrega',
  delivery_client: 'Cliente da entrega (telefone do pedido)',
  custom_number: 'Número fixo ou Grupo do WhatsApp'
};

export default function WhatsAppAutomations({
  initialSubView,
  openTriggerModalSignal
}: {
  initialSubView?: 'rules' | 'antiban' | 'suggestions' | 'logs' | 'directory';
  openTriggerModalSignal?: number;
} = {}) {
  const { isDarkMode } = useTheme();
  const { showToast } = useUI();
  const { isAdmin, canAccessWhatsapp } = useRole();

  const [rules, setRules] = useState<WhatsAppAutomationRule[]>([]);
  const [customTriggers, setCustomTriggers] = useState<WhatsAppCustomTrigger[]>([]);
  const [logs, setLogs] = useState<WhatsAppAutomationLog[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<AutomationCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSubView, setActiveSubView] = useState<
    'rules' | 'antiban' | 'suggestions' | 'logs' | 'directory'
  >(initialSubView || 'rules');

  // Custom Trigger ("Quando Disparar") Creation Modal State
  const [isTriggerModalOpen, setIsTriggerModalOpen] = useState(false);
  const [editingTriggerId, setEditingTriggerId] = useState<string | null>(null);
  const [newVarInput, setNewVarInput] = useState('');
  const [triggerForm, setTriggerForm] = useState<{
    selectedActionKey: string;
    customActionDescription: string;
    label: string;
    firingMode: TriggerFiringMode;
    category: AutomationCategory;
    defaultRecipient: RecipientTarget;
    hasSchedule: boolean;
    defaultScheduleTime: string;
    conditionStatusValue: string;
    delayMinutes: number;
    availableVariables: string[];
  }>({
    selectedActionKey: 'lead_created',
    customActionDescription: '',
    label: 'Quando captar / pesquisar ou cadastrar novo Lead na prospecção',
    firingMode: 'system_event',
    category: 'leads',
    defaultRecipient: 'assigned_collaborator',
    hasSchedule: false,
    defaultScheduleTime: '08:00',
    conditionStatusValue: 'Qualificado',
    delayMinutes: 30,
    availableVariables: ['{cliente}', '{bairro}', '{cidade}', '{vendedor}', '{horario}', '{data}']
  });

  useEffect(() => {
    if (initialSubView) {
      setActiveSubView(initialSubView);
    }
  }, [initialSubView]);

  useEffect(() => {
    if (openTriggerModalSignal && openTriggerModalSignal > 0) {
      setActiveSubView('rules');
      handleOpenCreateTriggerModal();
    }
  }, [openTriggerModalSignal]);

  // Anti-Ban State
  const [antiBanConfig, setAntiBanConfig] = useState<WhatsAppAntiBanConfig>(DEFAULT_ANTIBAN_CONFIG);
  const [antiBanStats, setAntiBanStats] = useState<WhatsAppAntiBanStats>({
    sentLastMinute: 0,
    sentLastHour: 0,
    sentToday: 0,
    queuedCount: 0,
    blockedDuplicatesCount: 0,
    blockedRateLimitCount: 0,
    humanizedMessagesCount: 0,
    lastDelayAppliedSeconds: 0,
    consecutiveBurstCount: 0,
    healthScore: 100
  });

  // Rule Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [testingRuleId, setTestingRuleId] = useState<string | null>(null);
  const [isSendingDirectTest, setIsSendingDirectTest] = useState(false);

  // Directory & W-API Gateway State
  const [directory, setDirectory] = useState(getDirectoryConfig());
  const [newCollabName, setNewCollabName] = useState('');
  const [newCollabPhone, setNewCollabPhone] = useState('');
  const [wapiInstanceId, setWapiInstanceId] = useState('');
  const [wapiToken, setWapiToken] = useState('');
  const [wapiServerUrl, setWapiServerUrl] = useState('https://api.w-api.app');
  const [lastDiagnosticError, setLastDiagnosticError] = useState<string | null>(null);

  // Form State for New/Edit Rule
  const [formState, setFormState] = useState<{
    name: string;
    description: string;
    category: AutomationCategory;
    trigger: AutomationTriggerType;
    recipientTarget: RecipientTarget;
    customPhone: string;
    scheduleTime: string;
    template: string;
    enabled: boolean;
  }>({
    name: '',
    description: '',
    category: 'tasks',
    trigger: 'task_created',
    recipientTarget: 'assigned_collaborator',
    customPhone: '',
    scheduleTime: '07:30',
    template: DEFAULT_AUTOMATION_RULES[0].template,
    enabled: true
  });

  const [profilePhones, setProfilePhones] = useState<CollaboratorProfilePhone[]>([]);
  const [isSyncingProfiles, setIsSyncingProfiles] = useState(false);

  const allTriggersMap = useMemo(() => {
    return getAllTriggerMetadata();
  }, [customTriggers, rules]);

  const loadData = () => {
    setCustomTriggers(getCustomTriggers());
    getAllTriggerMetadata();
    setRules(getAutomationRules());
    setLogs(getAutomationLogs());
    setDirectory(getDirectoryConfig());
    setProfilePhones(getCachedProfilePhones());
    setAntiBanConfig(getAntiBanConfig());
    setAntiBanStats(getAntiBanLiveStats());
    if (typeof window !== 'undefined') {
      const pc = getProviderConfig();
      setWapiInstanceId(pc.altInstance || '');
      setWapiToken(pc.altApiKey || '');
      setWapiServerUrl(pc.altServerUrl || 'https://api.w-api.app');
    }
  };

  useEffect(() => {
    loadData();
    void syncWhatsAppStateWithCloud();
    void syncCollaboratorPhonesFromProfiles();
    const handleUpdate = () => loadData();
    window.addEventListener('whatsapp-automation-updated', handleUpdate);
    window.addEventListener('whatsapp-cloud-synced', handleUpdate);
    window.addEventListener('whatsapp-antiban-updated', handleUpdate);
    window.addEventListener('whatsapp-traffic-updated', handleUpdate);
    return () => {
      window.removeEventListener('whatsapp-automation-updated', handleUpdate);
      window.removeEventListener('whatsapp-cloud-synced', handleUpdate);
      window.removeEventListener('whatsapp-antiban-updated', handleUpdate);
      window.removeEventListener('whatsapp-traffic-updated', handleUpdate);
    };
  }, []);

  const handleUpdateAntiBan = (patch: Partial<WhatsAppAntiBanConfig>, toastMsg?: string) => {
    const nextConfig: WhatsAppAntiBanConfig = {
      ...antiBanConfig,
      ...patch,
      profile: patch.profile || 'custom'
    };
    const saved = saveAntiBanConfig(nextConfig, true);
    setAntiBanConfig(saved);
    setAntiBanStats(getAntiBanLiveStats());
    if (toastMsg) {
      showToast(toastMsg, 'success');
    }
  };

  const handleSelectAntiBanProfile = (profile: Exclude<WhatsAppAntiBanProfile, 'custom'>) => {
    const preset = ANTIBAN_PROFILE_PRESETS[profile];
    const nextConfig: WhatsAppAntiBanConfig = {
      ...antiBanConfig,
      ...preset,
      enabled: true,
      profile
    };
    const saved = saveAntiBanConfig(nextConfig, true);
    setAntiBanConfig(saved);
    setAntiBanStats(getAntiBanLiveStats());
    const labels = {
      conservative: 'Conservador (Aquecimento de Chip)',
      balanced: 'Equilibrado (Operação Segura Recomendada)',
      intensive: 'Intensivo (Chip Maturado)'
    };
    showToast(`Perfil Anti-Ban "${labels[profile]}" ativado e sincronizado!`, 'success');
  };

  const filteredRules = useMemo(() => {
    return rules.filter(rule => {
      const matchesCat = selectedCategory === 'all' || rule.category === selectedCategory;
      const matchesSearch =
        rule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rule.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rule.template.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [rules, selectedCategory, searchQuery]);

  const stats = useMemo(() => {
    const activeCount = rules.filter(r => r.enabled).length;
    const scheduledCount = rules.filter(r => r.enabled && r.scheduleTime).length;
    const totalDispatches = rules.reduce((acc, r) => acc + (r.totalSentCount || 0), 0);
    return { activeCount, totalRules: rules.length, scheduledCount, totalDispatches };
  }, [rules]);

  const allSuggestions = useMemo(() => {
    return [
      ...DEFAULT_AUTOMATION_RULES.filter(r => r.isSuggested),
      ...EXTRA_SUGGESTION_TEMPLATES
    ];
  }, []);

  const handleToggleRule = (id: string) => {
    const updated = rules.map(r => (r.id === id ? { ...r, enabled: !r.enabled } : r));
    setRules(updated);
    saveAutomationRules(updated);
    const target = updated.find(r => r.id === id);
    if (target) {
      showToast(
        `Regra "${target.name}" ${target.enabled ? 'ativada' : 'pausada'}.`,
        target.enabled ? 'success' : 'info'
      );
    }
  };

  const handleScheduleTimeChange = (id: string, newTime: string) => {
    const updated = rules.map(r => (r.id === id ? { ...r, scheduleTime: newTime } : r));
    setRules(updated);
    saveAutomationRules(updated);
    showToast(`Horário programado atualizado para ${newTime}.`, 'success');
  };

  const handleOpenCreateTriggerModal = () => {
    setEditingTriggerId(null);
    setNewVarInput('');
    const defaultAction = SYSTEM_ACTION_CATALOG.find(a => a.actionKey === 'lead_created') || SYSTEM_ACTION_CATALOG[0];
    const cleanActionText = defaultAction.actionLabel.includes(': ')
      ? defaultAction.actionLabel.split(': ').slice(1).join(': ')
      : defaultAction.actionLabel;
    setTriggerForm({
      selectedActionKey: defaultAction.actionKey,
      customActionDescription: '',
      label: `Quando ${cleanActionText.charAt(0).toLowerCase()}${cleanActionText.slice(1)}`,
      firingMode: defaultAction.defaultFiringMode,
      category: defaultAction.category,
      defaultRecipient: defaultAction.defaultRecipient,
      hasSchedule: defaultAction.defaultFiringMode === 'scheduled_time',
      defaultScheduleTime: '08:00',
      conditionStatusValue: 'Qualificado',
      delayMinutes: 30,
      availableVariables: [...defaultAction.defaultVariables]
    });
    setIsTriggerModalOpen(true);
  };

  const handleOpenEditTriggerModal = (triggerItem: WhatsAppCustomTrigger) => {
    setEditingTriggerId(triggerItem.id);
    setNewVarInput('');
    setTriggerForm({
      selectedActionKey: triggerItem.systemActionKey || 'custom_action',
      customActionDescription: triggerItem.actionDescription || triggerItem.label,
      label: triggerItem.label,
      firingMode: triggerItem.firingMode || (triggerItem.hasSchedule ? 'scheduled_time' : 'system_event'),
      category: triggerItem.category,
      defaultRecipient: triggerItem.defaultRecipient,
      hasSchedule: Boolean(triggerItem.hasSchedule),
      defaultScheduleTime: triggerItem.defaultScheduleTime || '08:00',
      conditionStatusValue: triggerItem.conditionStatusValue || 'Concluída',
      delayMinutes: triggerItem.delayMinutes || 30,
      availableVariables:
        triggerItem.availableVariables && triggerItem.availableVariables.length > 0
          ? triggerItem.availableVariables
          : ['{colaborador}', '{cliente}', '{produto}', '{status}', '{horario}', '{data}']
    });
    setIsTriggerModalOpen(true);
  };

  const handleSaveCustomTrigger = () => {
    const baseText =
      triggerForm.label.trim() ||
      triggerForm.customActionDescription.trim();
    if (!baseText) {
      showToast('Selecione uma ação ou digite o nome do gatilho.', 'warning');
      return;
    }

    const isScheduled = triggerForm.firingMode === 'scheduled_time' || triggerForm.hasSchedule;
    let formattedLabel = baseText;
    if (
      triggerForm.firingMode === 'scheduled_time' &&
      !baseText.toLowerCase().includes(triggerForm.defaultScheduleTime)
    ) {
      formattedLabel = `Horário programado (${triggerForm.defaultScheduleTime}): ${baseText}`;
    } else if (
      triggerForm.firingMode === 'status_change' &&
      triggerForm.conditionStatusValue &&
      !baseText.toLowerCase().includes(triggerForm.conditionStatusValue.toLowerCase())
    ) {
      formattedLabel = `${baseText} (Status: ${triggerForm.conditionStatusValue})`;
    } else if (
      triggerForm.firingMode === 'delay_after_event' &&
      triggerForm.delayMinutes > 0 &&
      !baseText.toLowerCase().includes('min')
    ) {
      formattedLabel = `${baseText} (${triggerForm.delayMinutes} min após a ação)`;
    }

    const triggerId = editingTriggerId || `custom_trigger_${Date.now()}`;
    const newTriggerObj: WhatsAppCustomTrigger = {
      id: triggerId,
      label: formattedLabel,
      systemActionKey: triggerForm.selectedActionKey,
      actionDescription: triggerForm.customActionDescription.trim() || formattedLabel,
      category: triggerForm.category,
      defaultRecipient: triggerForm.defaultRecipient,
      availableVariables:
        triggerForm.availableVariables.length > 0
          ? triggerForm.availableVariables
          : ['{colaborador}', '{cliente}', '{produto}', '{status}', '{horario}', '{data}'],
      hasSchedule: isScheduled,
      defaultScheduleTime: isScheduled ? triggerForm.defaultScheduleTime : undefined,
      firingMode: triggerForm.firingMode,
      conditionStatusValue:
        triggerForm.firingMode === 'status_change' ? triggerForm.conditionStatusValue : undefined,
      delayMinutes:
        triggerForm.firingMode === 'delay_after_event' ? triggerForm.delayMinutes : undefined,
      isCustom: true,
      createdAt: new Date().toISOString()
    };

    const existingList = getCustomTriggers();
    const updatedList = editingTriggerId
      ? existingList.map(t => (t.id === editingTriggerId ? newTriggerObj : t))
      : [newTriggerObj, ...existingList];

    saveCustomTriggers(updatedList, true);
    setCustomTriggers(updatedList);

    if (isModalOpen) {
      setFormState(prev => ({
        ...prev,
        trigger: triggerId,
        category: newTriggerObj.category,
        recipientTarget: newTriggerObj.defaultRecipient,
        scheduleTime: isScheduled ? newTriggerObj.defaultScheduleTime || '08:00' : prev.scheduleTime
      }));
      showToast(`Gatilho "${formattedLabel}" criado e já selecionado na regra!`, 'success');
    } else {
      showToast(
        `Novo gatilho "${formattedLabel}" criado! Ele já está disponível na lista de gatilhos para qualquer regra.`,
        'success'
      );
    }

    setIsTriggerModalOpen(false);
  };

  const handleDeleteCustomTrigger = (triggerId: string) => {
    const target = customTriggers.find(t => t.id === triggerId);
    const updated = deleteCustomTrigger(triggerId, true);
    setCustomTriggers(updated);
    showToast(`Gatilho "${target?.label || ''}" removido.`, 'info');
  };

  const handleOpenCreateModal = (preselectedTrigger?: string) => {
    setEditingRuleId(null);
    const allMeta = getAllTriggerMetadata();
    const chosenTrigger = preselectedTrigger && allMeta[preselectedTrigger] ? preselectedTrigger : 'task_created';
    const meta = allMeta[chosenTrigger] || TRIGGER_METADATA.task_created;
    setFormState({
      name: preselectedTrigger ? meta.label.replace(/^Quando\s+/i, 'Aviso: ') : '',
      description: preselectedTrigger ? meta.label : '',
      category: meta.category || 'tasks',
      trigger: chosenTrigger,
      recipientTarget: meta.defaultRecipient || 'assigned_collaborator',
      customPhone: '',
      scheduleTime: meta.defaultScheduleTime || '07:30',
      template:
        '📌 *Nova Atualização Automática*\n\nOlá *{colaborador}*, temos uma atualização sobre *{tarefa}* (Status: {status}) às *{horario}*.',
      enabled: true
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (rule: WhatsAppAutomationRule) => {
    setEditingRuleId(rule.id);
    setFormState({
      name: rule.name,
      description: rule.description,
      category: rule.category,
      trigger: rule.trigger,
      recipientTarget: rule.recipientTarget,
      customPhone: rule.customPhone || '',
      scheduleTime: rule.scheduleTime || '07:30',
      template: rule.template,
      enabled: rule.enabled
    });
    setIsModalOpen(true);
  };

  const handleDeleteRule = (id: string) => {
    const target = rules.find(r => r.id === id);
    const updated = rules.filter(r => r.id !== id);
    setRules(updated);
    saveAutomationRules(updated);
    showToast(`Regra "${target?.name || ''}" removida.`, 'info');
  };

  const handleSaveRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.name.trim() || !formState.template.trim()) {
      showToast('Preencha o nome da regra e a mensagem automática.', 'warning');
      return;
    }

    const allMeta = getAllTriggerMetadata();
    const triggerMeta = allMeta[formState.trigger] || TRIGGER_METADATA[formState.trigger];
    const hasSchedule = Boolean(triggerMeta?.hasSchedule);

    if (editingRuleId) {
      const updated = rules.map(r =>
        r.id === editingRuleId
          ? {
              ...r,
              name: formState.name.trim(),
              description: formState.description.trim() || triggerMeta?.label || formState.trigger,
              category: formState.category,
              trigger: formState.trigger,
              recipientTarget: formState.recipientTarget,
              customPhone: formState.customPhone.trim() || undefined,
              scheduleTime: hasSchedule ? formState.scheduleTime : undefined,
              template: formState.template,
              enabled: formState.enabled
            }
          : r
      );
      setRules(updated);
      saveAutomationRules(updated);
      showToast('Regra de automação atualizada com sucesso!', 'success');
    } else {
      const newRule: WhatsAppAutomationRule = {
        id: 'rule-' + Date.now(),
        name: formState.name.trim(),
        description: formState.description.trim() || triggerMeta?.label || formState.trigger,
        category: formState.category,
        trigger: formState.trigger,
        recipientTarget: formState.recipientTarget,
        customPhone: formState.customPhone.trim() || undefined,
        scheduleTime: hasSchedule ? formState.scheduleTime : undefined,
        template: formState.template,
        enabled: formState.enabled,
        totalSentCount: 0
      };
      const updated = [newRule, ...rules];
      setRules(updated);
      saveAutomationRules(updated);
      showToast('Nova regra de envio automático criada!', 'success');
    }

    setIsModalOpen(false);
  };

  const sanitizeWapiInstanceId = (raw: string): string => {
    const trimmed = raw.trim();
    const match = trimmed.match(/[?&]instanceId=([^&\s"']+)/i);
    if (match && match[1]) {
      return decodeURIComponent(match[1].trim());
    }
    return raw;
  };

  const isInstanceNameInsteadOfId = Boolean(wapiInstanceId.trim().includes(' '));
  const isWapiConfigured = Boolean(
    wapiInstanceId.trim() && !isInstanceNameInsteadOfId && wapiToken.trim()
  );
  const isAdminPhoneReal = Boolean(
    directory.adminPhone &&
      directory.adminPhone.replace(/\D/g, '').length >= 10 &&
      !isPlaceholderPhone(directory.adminPhone)
  );

  const persistWapiAndDirectory = (nextDir = directory) => {
    const normalizedAdmin = normalizeBrazilPhone(nextDir.adminPhone);
    const normalizedGroup = normalizeBrazilPhone(nextDir.logisticsGroupPhone);
    const cleanedInstance = sanitizeWapiInstanceId(wapiInstanceId).trim();
    if (cleanedInstance !== wapiInstanceId) {
      setWapiInstanceId(cleanedInstance);
    }

    const updatedDir = {
      ...nextDir,
      adminPhone: normalizedAdmin || nextDir.adminPhone,
      logisticsGroupPhone: normalizedGroup || nextDir.logisticsGroupPhone
    };
    setDirectory(updatedDir);
    saveDirectoryConfig(updatedDir, { syncCloud: true });

    if (typeof window !== 'undefined') {
      if (cleanedInstance || wapiToken.trim()) {
        saveProviderConfig(
          {
            providerMode: 'alternative',
            altServerUrl: wapiServerUrl.trim() || 'https://api.w-api.app',
            altInstance: cleanedInstance,
            altApiKey: wapiToken.trim().replace(/^Bearer\s+/i, ''),
            qrPhoneConnected: normalizedAdmin || undefined
          },
          true
        );
      }
    }
    return updatedDir;
  };

  const handleDirectAdminTestSend = async () => {
    const savedDir = persistWapiAndDirectory(directory);
    const cleanedInstance = sanitizeWapiInstanceId(wapiInstanceId).trim();
    setLastDiagnosticError(null);

    if (!savedDir.adminPhone || isPlaceholderPhone(savedDir.adminPhone)) {
      const msg =
        'Você ainda está com o telefone fictício de exemplo (5583999990001). Digite o SEU número real de celular (DDD + Número) no campo "WhatsApp do Administrador"!';
      setLastDiagnosticError(msg);
      showToast(msg, 'warning');
      setActiveSubView('directory');
      return;
    }

    if (!cleanedInstance || !wapiToken.trim()) {
      const msg =
        'Para a mensagem chegar no seu celular, preencha o código "ID da Instância" e o "Token Bearer" da sua conta W-API.';
      setLastDiagnosticError(msg);
      showToast(msg, 'warning');
      setActiveSubView('directory');
      return;
    }

    if (cleanedInstance.includes(' ')) {
      const msg = `"${cleanedInstance}" é o NOME da sua instância, e não o código ID! No painel da W-API, copie o código "ID da Instância" (um código sem espaços, ex: LITE-... ou 3B9X8Z...) que fica ao lado ou abaixo do nome "${cleanedInstance}".`;
      setLastDiagnosticError(msg);
      showToast(msg, 'warning');
      return;
    }

    setIsSendingDirectTest(true);
    try {
      const cleanToken = wapiToken.trim().replace(/^Bearer\s+/i, '');
      const cleanUrl = (wapiServerUrl.trim() || 'https://api.w-api.app').replace(/\/$/, '');
      const targetPhone = normalizeBrazilPhone(savedDir.adminPhone);

      const testMsg = `✅ *Teste de Recebimento do Administrador*\n\nOlá *${savedDir.adminName}*! Seu número (*+${targetPhone}*) e sua instância *W-API (${wapiInstanceId.trim()})* estão configurados e prontos para receber alertas automáticos de tarefas e entregas.`;

      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: targetPhone,
          message: testMsg,
          text: testMsg,
          providerMode: 'alternative',
          altServerUrl: cleanUrl,
          altApiKey: cleanToken,
          altInstance: wapiInstanceId.trim()
        })
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success) {
        setLastDiagnosticError(null);
        recordMessageInWhatsAppFeed(savedDir.adminName, targetPhone, testMsg, 'sent');
        recordWhatsAppTrafficEvent({
          direction: 'outbound',
          mode: 'auto',
          status: 'sent',
          recipientName: savedDir.adminName,
          recipientPhone: targetPhone,
          text: testMsg,
          category: 'management',
          ruleName: 'Teste de Conexão W-API (Admin)'
        });
        saveAutomationLog({
          id: `log-${Date.now()}`,
          ruleId: 'direct-test',
          ruleName: 'Teste de Conexão W-API (Admin)',
          trigger: 'daily_executive_summary',
          recipientName: savedDir.adminName,
          recipientPhone: targetPhone,
          message: testMsg,
          timestamp: `Hoje, ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
          createdAt: new Date().toISOString(),
          category: 'management',
          status: 'sent'
        });
        showToast(
          `Mensagem enviada via W-API para seu celular (+${targetPhone})! Verifique seu WhatsApp.`,
          'success'
        );
      } else {
        const errText =
          data?.error ||
          'A W-API recusou o envio. Verifique se sua instância está "Conectada" (QR Code lido) no painel w-api.app.';
        recordWhatsAppTrafficEvent({
          direction: 'outbound',
          mode: 'auto',
          status: 'failed',
          recipientName: savedDir.adminName,
          recipientPhone: targetPhone,
          text: testMsg,
          category: 'management',
          ruleName: 'Teste de Conexão W-API (Admin)'
        });
        setLastDiagnosticError(errText);
        showToast(`Falha no envio W-API: ${errText}`, 'error');
      }
    } catch {
      const errText = 'Erro de comunicação ao tentar disparar para a W-API.';
      setLastDiagnosticError(errText);
      showToast(errText, 'error');
    } finally {
      setIsSendingDirectTest(false);
    }
  };

  const handleTestRuleNow = async (rule: WhatsAppAutomationRule) => {
    setTestingRuleId(rule.id);
    setLastDiagnosticError(null);
    try {
      const savedDir = persistWapiAndDirectory(directory);
      const adminTargetPhone = normalizeBrazilPhone(savedDir.adminPhone);

      const sampleVariables: Record<string, any> = {
        colaborador: 'Carlos',
        criador: savedDir.adminName,
        tarefa: 'Conferência de Estoque Setor A',
        prioridade: 'Alta',
        prazo: new Date().toLocaleDateString('pt-BR'),
        status: 'Concluída',
        progresso: '100',
        descricao: 'Verificar divergências de lote e atualizar planilha central.',
        motorista: 'Roberto Silva',
        veiculo: 'Fiorino ABC-1234',
        endereco: 'Av. Epitácio Pessoa, 1250',
        bairro: 'Estados',
        cidade: 'João Pessoa',
        produto: 'Compressor Industrial 100L + Kit Mangueiras',
        vendedor: 'Carlos Vendedor',
        turno: 'Manhã',
        total_entregas: '3',
        quantidade_pendente: '1',
        lista_entregas:
          '1. *Av. Epitácio Pessoa, 1250* (Estados) - Compressor Industrial\n2. *Rua Bancário Sérgio Guerra, 410* (Bancários) - Parafusadeira Impacto\n3. *Av. Gov. Flávio Ribeiro Coutinho, 200* (Manaíra) - Kit EPI Completo',
        categoria: 'Pedido de Material',
        entregas_concluidas: '14',
        tarefas_concluidas: '19',
        tarefas_pendentes: '4'
      };

      // Ao clicar em "Testar Disparo", envia para o celular do Administrador se ele já cadastrou o número real dele
      const forceToAdmin =
        adminTargetPhone && !isPlaceholderPhone(adminTargetPhone)
          ? {
              forceRuleId: rule.id,
              forceRecipientPhone: adminTargetPhone,
              forceRecipientName: `${savedDir.adminName} (Teste no seu Celular)`
            }
          : { forceRuleId: rule.id };

      const res = await triggerWhatsAppAutomation(rule.trigger, sampleVariables, forceToAdmin);

      if (res.triggeredCount > 0) {
        const log = res.logs[0];
        if (log.status === 'sent') {
          showToast(
            `Enviado via W-API para +${log.recipientPhone} (${log.recipientName})! Confira seu celular.`,
            'success'
          );
        } else {
          const warnMsg =
            res.lastError ||
            (isPlaceholderPhone(log.recipientPhone)
              ? `O número +${log.recipientPhone} é apenas de exemplo. Cadastre seu celular real e a W-API na aba "Telefones de Destino".`
              : `Apenas simulado no painel para +${log.recipientPhone}. Configure o Instance ID e Token da W-API para receber no celular.`);
          setLastDiagnosticError(warnMsg);
          showToast(warnMsg, 'warning');
        }
      }
    } catch {
      showToast('Erro ao testar disparo automático.', 'error');
    } finally {
      setTestingRuleId(null);
    }
  };

  const handleActivateSuggestion = (tpl: Omit<WhatsAppAutomationRule, 'id' | 'totalSentCount'>) => {
    const existing = rules.find(r => r.name.toLowerCase() === tpl.name.toLowerCase());
    if (existing) {
      const updated = rules.map(r => (r.id === existing.id ? { ...r, enabled: true } : r));
      setRules(updated);
      saveAutomationRules(updated);
      showToast(`Automação "${tpl.name}" ativada!`, 'success');
      setActiveSubView('rules');
      return;
    }

    const newRule: WhatsAppAutomationRule = {
      ...tpl,
      id: 'rule-sug-' + Date.now(),
      totalSentCount: 0,
      enabled: true
    };
    const updated = [newRule, ...rules];
    setRules(updated);
    saveAutomationRules(updated);
    showToast(`Automação "${tpl.name}" adicionada e ativada!`, 'success');
    setActiveSubView('rules');
  };

  const handleSaveDirectory = (e: React.FormEvent) => {
    e.preventDefault();
    persistWapiAndDirectory(directory);
    setLastDiagnosticError(null);
    showToast('Seu telefone de Administrador e credenciais W-API foram salvos!', 'success');
  };

  const handleAddCollaboratorPhone = () => {
    if (!newCollabName.trim() || !newCollabPhone.trim()) {
      showToast('Informe o nome do colaborador/motorista e o WhatsApp.', 'warning');
      return;
    }
    const cleanPhone = normalizeBrazilPhone(newCollabPhone);
    const updatedDir = {
      ...directory,
      collaboratorPhones: {
        ...directory.collaboratorPhones,
        [newCollabName.trim().toLowerCase()]: cleanPhone
      }
    };
    setDirectory(updatedDir);
    saveDirectoryConfig(updatedDir);
    setNewCollabName('');
    setNewCollabPhone('');
    showToast('Telefone vinculado para disparos automáticos!', 'success');
  };

  const handleRemoveCollaboratorPhone = (key: string) => {
    const nextPhones = { ...directory.collaboratorPhones };
    delete nextPhones[key];
    const updatedDir = { ...directory, collaboratorPhones: nextPhones };
    setDirectory(updatedDir);
    saveDirectoryConfig(updatedDir, { syncCloud: true, replaceCollaboratorPhones: true });
    showToast(`Contato "${key}" removido da lista.`, 'info');
  };

  const insertVariableIntoTemplate = (variable: string) => {
    setFormState(prev => ({
      ...prev,
      template: `${prev.template} ${variable}`
    }));
  };

  const previewText = useMemo(() => {
    return interpolateTemplate(formState.template, {
      colaborador: 'Carlos',
      criador: directory.adminName,
      tarefa: 'Inspeção de Estoque Setor B',
      prioridade: 'Alta',
      prazo: new Date().toLocaleDateString('pt-BR'),
      status: 'Em Andamento',
      progresso: '65',
      descricao: 'Conferir recebimento das notas fiscais do turno da manhã.',
      motorista: 'Roberto Silva',
      veiculo: 'Fiorino ABC-1234',
      endereco: 'Av. Epitácio Pessoa, 1250',
      bairro: 'Estados',
      cidade: 'João Pessoa',
      produto: 'Compressor Industrial 100L',
      vendedor: 'Mariana Vendas',
      turno: 'Manhã',
      total_entregas: '4',
      quantidade_pendente: '2',
      lista_entregas:
        '1. Av. Epitácio Pessoa, 1250 (Estados) - Compressor Industrial\n2. Rua das Trincheiras, 310 (Centro) - Kit Ferramentas'
    });
  }, [formState.template, directory.adminName]);

  const inputBaseClass = `w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${
    isDarkMode
      ? 'bg-slate-950 border-slate-700/90 text-slate-100 placeholder-slate-500 focus:border-emerald-500'
      : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-600'
  }`;

  if (!canAccessWhatsapp && !isAdmin) {
    return (
      <div className={`flex-1 flex flex-col items-center justify-center p-8 text-center ${isDarkMode ? 'bg-slate-950 text-slate-400' : 'bg-slate-50 text-slate-500'}`}>
        <ShieldCheck size={48} className="mb-3 opacity-30 text-emerald-500" />
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1">Acesso Restrito</h3>
        <p className="text-xs max-w-sm">
          Você não possui permissão para visualizar ou alterar as automações do WhatsApp.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`flex-1 flex flex-col h-full overflow-y-auto ${
        isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
        {/* Header & Primary Action */}
        <div
          className={`p-5 sm:p-6 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
            isDarkMode
              ? 'bg-slate-900/90 border-slate-800'
              : 'bg-white border-slate-200/90 shadow-2xs'
          }`}
        >
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shrink-0 mt-0.5">
              <Zap size={22} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight">
                Regras e Gatilhos de Envio Automático via WhatsApp
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
                Crie gatilhos personalizados (&quot;Quando Disparar&quot;) por evento, status ou horário fixo e vincule regras automáticas de WhatsApp.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setActiveSubView('antiban')}
              className={`px-3.5 py-2.5 rounded-xl font-semibold text-xs flex items-center gap-2 border transition-colors whitespace-nowrap ${
                antiBanConfig.enabled
                  ? isDarkMode
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                  : isDarkMode
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25'
                  : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
              }`}
            >
              <ShieldCheck size={15} className="text-emerald-500" />
              <span>
                Blindagem Anti-Ban ({antiBanConfig.enabled ? `${antiBanStats.healthScore}% Seguro` : 'Pausada'})
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubView('directory')}
              className={`px-3.5 py-2.5 rounded-xl font-semibold text-xs flex items-center gap-2 border transition-colors whitespace-nowrap ${
                isDarkMode
                  ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200/70'
              }`}
            >
              <Phone size={15} className="text-emerald-500" />
              <span>Agenda de Telefones</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenCreateTriggerModal()}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-colors whitespace-nowrap cursor-pointer"
              title="Criar novo gatilho / definir quando disparar mensagens no WhatsApp"
            >
              <Clock size={15} />
              <span>Criar Gatilho / Quando Disparar</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenCreateModal()}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-2 shadow-sm transition-colors whitespace-nowrap cursor-pointer"
            >
              <Plus size={16} />
              <span>Criar Nova Regra</span>
            </button>
          </div>
        </div>

        {/* Summary KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            className={`p-4 sm:p-5 rounded-2xl border flex flex-col justify-between ${
              isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/90 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
              <span>Regras Ativas</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                <Zap size={16} />
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums">
                {stats.activeCount}{' '}
                <span className="text-sm font-normal text-slate-400">/ {stats.totalRules}</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Monitorando eventos em tempo real
              </p>
            </div>
          </div>

          <div
            className={`p-4 sm:p-5 rounded-2xl border flex flex-col justify-between ${
              isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/90 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
              <span>Rotinas com Horário Fixo</span>
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                <Clock size={16} />
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums">
                {stats.scheduledCount}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Roteiro matinal e cobrança de baixa
              </p>
            </div>
          </div>

          <div
            className={`p-4 sm:p-5 rounded-2xl border flex flex-col justify-between ${
              isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/90 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
              <span>Disparos Realizados</span>
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
                <Send size={16} />
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums">
                {stats.totalDispatches}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Mensagens automáticas enviadas
              </p>
            </div>
          </div>

          <div
            className={`p-4 sm:p-5 rounded-2xl border flex flex-col justify-between ${
              isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/90 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
              <span>Destino do Administrador</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                <ShieldCheck size={16} />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold font-mono tabular-nums truncate">
                  +{directory.adminPhone}
                </span>
                {!isAdminPhoneReal && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30">
                    Exemplo Fictício
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setActiveSubView('directory')}
                className={`w-full px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between border transition-colors ${
                  isDarkMode
                    ? 'bg-slate-800/90 border-slate-700 text-emerald-400 hover:bg-slate-800'
                    : 'bg-emerald-50/80 border-emerald-200 text-emerald-700 hover:bg-emerald-100/80'
                }`}
              >
                <span>{isAdminPhoneReal && isWapiConfigured ? 'Gerenciar telefones' : 'Configurar meu celular'}</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* Diagnostic & Quick Setup Banner when Admin phone is placeholder or W-API is missing */}
        {(!isAdminPhoneReal || !isWapiConfigured || lastDiagnosticError) && (
          <div
            className={`p-4 sm:p-5 rounded-2xl border space-y-4 ${
              isDarkMode
                ? 'bg-amber-950/25 border-amber-500/40 text-amber-100'
                : 'bg-amber-50/90 border-amber-300 text-slate-900'
            }`}
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-500 shrink-0 mt-0.5">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold">
                    Por que a mensagem ainda não chegou no seu celular de Administrador?
                  </h3>
                  <p className="text-xs opacity-90 mt-1 leading-relaxed">
                    {!isAdminPhoneReal && (
                      <span>
                        1. O telefone de Administrador está com o número fictício de demonstração (<strong>5583999990001</strong>). Digite o <strong>seu número real com DDD</strong> abaixo.{' '}
                      </span>
                    )}
                    {!isWapiConfigured && (
                      <span>
                        2. As credenciais da <strong>W-API (Instance ID e Token Bearer)</strong> ainda não foram salvas neste navegador. Preencha-as abaixo para envio real.
                      </span>
                    )}
                    {lastDiagnosticError && (
                      <span className="block mt-1 font-semibold text-rose-500 dark:text-rose-400">
                        Diagnóstico do último disparo: {lastDiagnosticError}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Inline Quick Configuration Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-bold mb-1">
                  1. Seu WhatsApp (Admin com DDD) *
                </label>
                <input
                  type="text"
                  value={directory.adminPhone}
                  onChange={e =>
                    setDirectory({ ...directory, adminPhone: e.target.value.replace(/\D/g, '') })
                  }
                  placeholder="Ex: 5583999998888"
                  className={`${inputBaseClass} font-mono`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold mb-1">
                  2. Código ID da Instância (Não o nome) *
                </label>
                <input
                  type="text"
                  value={wapiInstanceId}
                  onChange={e => setWapiInstanceId(sanitizeWapiInstanceId(e.target.value))}
                  placeholder="Ex: LITE-9X8Z... (ou cole a URL)"
                  className={`${inputBaseClass} font-mono ${
                    isInstanceNameInsteadOfId ? 'border-rose-500 ring-1 ring-rose-500/40' : ''
                  }`}
                />
                {isInstanceNameInsteadOfId && (
                  <p className="text-[11px] font-semibold text-rose-500 mt-1 leading-snug">
                    ⚠️ &quot;{wapiInstanceId.trim()}&quot; é o NOME. Cole o código ID (sem espaços) ou a URL da W-API.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold mb-1">
                  3. Token Bearer (W-API) *
                </label>
                <input
                  type="password"
                  value={wapiToken}
                  onChange={e => setWapiToken(e.target.value)}
                  placeholder="Cole seu Token da W-API"
                  className={`${inputBaseClass} font-mono`}
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  disabled={isSendingDirectTest}
                  onClick={handleDirectAdminTestSend}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-sm cursor-pointer"
                >
                  {isSendingDirectTest ? (
                    <RefreshCw size={15} className="animate-spin shrink-0" />
                  ) : (
                    <Send size={15} className="shrink-0" />
                  )}
                  <span>Salvar & Testar no Meu Celular</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Section Switcher Tabs (5-tab bar with Blindagem Anti-Ban) */}
        <div
          className={`grid grid-cols-2 lg:grid-cols-5 gap-2 p-1.5 rounded-2xl border ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-200/70 border-slate-200'
          }`}
        >
          {[
            { id: 'rules', label: 'Regras Configuradas', icon: Zap, count: rules.length },
            {
              id: 'antiban',
              label: 'Blindagem Anti-Ban',
              icon: ShieldCheck,
              count: [
                antiBanConfig.randomDelayEnabled,
                antiBanConfig.rateLimitEnabled,
                antiBanConfig.deduplicationEnabled,
                antiBanConfig.dynamicVariationEnabled,
                antiBanConfig.safeHoursEnabled
              ].filter(Boolean).length
            },
            {
              id: 'suggestions',
              label: 'Sugestões de Automação',
              icon: Sparkles,
              count: allSuggestions.length
            },
            {
              id: 'directory',
              label: 'Telefones de Destino',
              icon: Phone,
              count: Object.keys(directory.collaboratorPhones).length + 2
            },
            { id: 'logs', label: 'Histórico de Disparos', icon: History, count: logs.length }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeSubView === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSubView(tab.id as any)}
                className={`flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : isDarkMode
                    ? 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-white/70'
                }`}
              >
                <Icon size={15} className="shrink-0" />
                <span className="truncate">{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono tabular-nums shrink-0 ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : isDarkMode
                        ? 'bg-slate-800 text-slate-400'
                        : 'bg-white text-slate-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* SUBVIEW 1: CONFIGURED RULES */}
        {activeSubView === 'rules' && (
          <div className="space-y-5">
            {/* Dedicated Filter & Search Bar */}
            <div
              className={`p-3.5 rounded-2xl border flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 ${
                isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/90 shadow-2xs'
              }`}
            >
              {/* Category Filter Buttons (Wraps cleanly without horizontal scroll clipping) */}
              <div className="flex flex-wrap items-center gap-2">
                {(Object.keys(CATEGORY_LABELS) as Array<AutomationCategory | 'all'>)
                  .filter(catKey => {
                    if (
                      catKey === 'all' ||
                      catKey === 'tasks' ||
                      catKey === 'deliveries' ||
                      catKey === 'leads' ||
                      catKey === 'clients' ||
                      catKey === 'demands' ||
                      catKey === 'management'
                    ) {
                      return true;
                    }
                    return rules.some(r => r.category === catKey);
                  })
                  .map(catKey => {
                    const catMeta = CATEGORY_LABELS[catKey] || { label: String(catKey), icon: Zap };
                    const { label, icon: CatIcon } = catMeta;
                    const isSelected = selectedCategory === catKey;
                    const count =
                      catKey === 'all'
                        ? rules.length
                        : rules.filter(r => r.category === catKey).length;

                    return (
                      <button
                        key={catKey}
                        type="button"
                        onClick={() => setSelectedCategory(catKey)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all whitespace-nowrap ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                            : isDarkMode
                            ? 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        <CatIcon size={14} className="shrink-0" />
                        <span>{label}</span>
                        <span
                          className={`text-[10px] font-mono tabular-nums px-1.5 py-0.2 rounded ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : isDarkMode
                              ? 'bg-slate-800 text-slate-400'
                              : 'bg-slate-200/80 text-slate-600'
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
              </div>

              {/* Search Input */}
              <div className="relative w-full lg:w-72 shrink-0">
                <Search
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Buscar regra, gatilho ou variável..."
                  className={`w-full pl-9 pr-8 py-2 rounded-xl text-xs font-medium border focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${
                    isDarkMode
                      ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500'
                      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white'
                  }`}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    title="Limpar busca"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Painel de Gatilhos / Quando Disparar */}
            <div
              className={`p-4 rounded-2xl border space-y-3 ${
                isDarkMode
                  ? 'bg-slate-900/90 border-slate-800'
                  : 'bg-white border-slate-200/90 shadow-2xs'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-500 shrink-0">
                    <Clock size={16} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xs sm:text-sm font-bold">
                        Gatilhos do Sistema (Quando Disparar)
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-500 border border-indigo-500/30">
                        {Object.keys(allTriggersMap).length} gatilhos disponíveis nas regras
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Crie novos gatilhos para qualquer ação do aplicativo. Eles aparecerão automaticamente no seletor &quot;Quando disparar? (Gatilho)&quot; ao criar ou editar uma regra.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenCreateTriggerModal()}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-colors shrink-0 cursor-pointer"
                >
                  <Plus size={14} />
                  <span>+ Criar Novo Gatilho</span>
                </button>
              </div>

              {customTriggers.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                    Gatilhos Criados por Você:
                  </span>
                  {customTriggers.map(ct => (
                    <div
                      key={ct.id}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border ${
                        isDarkMode
                          ? 'bg-indigo-950/40 border-indigo-500/40 text-indigo-200'
                          : 'bg-indigo-50 border-indigo-200 text-indigo-800'
                      }`}
                    >
                      <Zap size={12} className="text-indigo-500 shrink-0" />
                      <span>{ct.label}</span>
                      <button
                        type="button"
                        onClick={() => handleOpenEditTriggerModal(ct)}
                        className="p-0.5 text-slate-400 hover:text-indigo-400 cursor-pointer ml-1"
                        title="Editar gatilho"
                      >
                        <Edit2 size={11} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCustomTrigger(ct.id)}
                        className="p-0.5 text-slate-400 hover:text-rose-500 cursor-pointer"
                        title="Excluir gatilho"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Rules Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {filteredRules.map(rule => {
                const triggerInfo = allTriggersMap[rule.trigger] || TRIGGER_METADATA[rule.trigger];
                const isTesting = testingRuleId === rule.id;
                const CatIcon = CATEGORY_LABELS[rule.category]?.icon || Zap;

                return (
                  <div
                    key={rule.id}
                    className={`p-5 sm:p-6 rounded-2xl border flex flex-col justify-between gap-5 transition-all ${
                      isDarkMode
                        ? rule.enabled
                          ? 'bg-slate-900 border-slate-800 hover:border-slate-700'
                          : 'bg-slate-900/50 border-slate-800/70 opacity-75'
                        : rule.enabled
                        ? 'bg-white border-slate-200/90 shadow-2xs hover:border-slate-300'
                        : 'bg-slate-50 border-slate-200/70 opacity-75'
                    }`}
                  >
                    <div className="space-y-4">
                      {/* Card Top Bar: Category Badge + Status & Toggle Switch */}
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                              isDarkMode
                                ? 'bg-slate-800 border-slate-700 text-slate-200'
                                : 'bg-slate-100 border-slate-200 text-slate-700'
                            }`}
                          >
                            <CatIcon size={13} className="text-emerald-500 shrink-0" />
                            <span>{CATEGORY_LABELS[rule.category]?.label}</span>
                          </span>

                          {rule.isSuggested && (
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${
                                isDarkMode
                                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                  : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                              }`}
                            >
                              <Sparkles size={12} />
                              <span>Sugestão</span>
                            </span>
                          )}
                        </div>

                        {/* Labeled Toggle Button */}
                        <button
                          type="button"
                          onClick={() => handleToggleRule(rule.id)}
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all shrink-0 ${
                            rule.enabled
                              ? isDarkMode
                                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                                : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                              : isDarkMode
                              ? 'bg-slate-800 border-slate-700 text-slate-400'
                              : 'bg-slate-100 border-slate-300 text-slate-600'
                          }`}
                          title={rule.enabled ? 'Clique para pausar regra' : 'Clique para ativar regra'}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              rule.enabled ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          />
                          <span>{rule.enabled ? 'Regra Ativa' : 'Pausada'}</span>
                          <div
                            className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ${
                              rule.enabled
                                ? 'bg-emerald-600'
                                : isDarkMode
                                ? 'bg-slate-700'
                                : 'bg-slate-300'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 mt-0.5 ${
                                rule.enabled ? 'translate-x-4.5' : 'translate-x-0.5'
                              }`}
                            />
                          </div>
                        </button>
                      </div>

                      {/* Title & Description */}
                      <div>
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug">
                          {rule.name}
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mt-1">
                          {rule.description}
                        </p>
                      </div>

                      {/* Structured Info Fields: Gatilho & Destinatário */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div
                          className={`p-3 rounded-xl border ${
                            isDarkMode
                              ? 'bg-slate-950/70 border-slate-800'
                              : 'bg-slate-50 border-slate-200/80'
                          }`}
                        >
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                            Gatilho / Quando Disparar
                          </span>
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
                            {triggerInfo?.label || rule.trigger}
                          </span>
                        </div>

                        <div
                          className={`p-3 rounded-xl border ${
                            isDarkMode
                              ? 'bg-slate-950/70 border-slate-800'
                              : 'bg-slate-50 border-slate-200/80'
                          }`}
                        >
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                            Quem Recebe no WhatsApp
                          </span>
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
                            {RECIPIENT_LABELS[rule.recipientTarget]}
                            {rule.customPhone ? ` (+${rule.customPhone})` : ''}
                          </span>
                        </div>
                      </div>

                      {/* Schedule Time Picker if rule is time-based */}
                      {(rule.scheduleTime || triggerInfo?.hasSchedule) && (
                        <div
                          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3.5 rounded-xl border text-xs ${
                            isDarkMode
                              ? 'bg-emerald-950/15 border-emerald-500/25 text-slate-200'
                              : 'bg-emerald-50/60 border-emerald-200 text-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Clock size={15} className="text-emerald-500 shrink-0" />
                            <span className="font-semibold">
                              Horário programado pelo Administrador:
                            </span>
                          </div>
                          <input
                            type="time"
                            value={rule.scheduleTime || '07:30'}
                            onChange={e => handleScheduleTimeChange(rule.id, e.target.value)}
                            className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold border focus:outline-none focus:ring-2 focus:ring-emerald-500/40 min-w-[115px] ${
                              isDarkMode
                                ? 'bg-slate-900 border-slate-700 text-emerald-400'
                                : 'bg-white border-emerald-300 text-emerald-800 shadow-2xs'
                            }`}
                          />
                        </div>
                      )}

                      {/* Message Template Preview Box */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          <span>Modelo da Mensagem Automática</span>
                          <span className="font-mono text-[10px]">WhatsApp Template</span>
                        </div>
                        <div
                          className={`p-3.5 rounded-xl border font-mono text-xs leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto ${
                            isDarkMode
                              ? 'bg-slate-950 border-slate-800 text-slate-200'
                              : 'bg-slate-50 border-slate-200/90 text-slate-800'
                          }`}
                        >
                          {rule.template}
                        </div>
                      </div>
                    </div>

                    {/* Footer Metadata + Well-Framed Action Buttons */}
                    <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                        <Send size={13} className="text-emerald-500 shrink-0" />
                        <span className="font-semibold">{rule.totalSentCount || 0} envios</span>
                        {rule.lastTriggeredAt && (
                          <>
                            <span>·</span>
                            <span className="truncate">Último: {rule.lastTriggeredAt}</span>
                          </>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleTestRuleNow(rule)}
                          disabled={isTesting}
                          className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all whitespace-nowrap ${
                            isDarkMode
                              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25'
                              : 'bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700 shadow-2xs'
                          }`}
                        >
                          {isTesting ? (
                            <RefreshCw size={13} className="animate-spin shrink-0" />
                          ) : (
                            <Play size={13} className="shrink-0" />
                          )}
                          <span>Testar Disparo</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(rule)}
                          className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-colors whitespace-nowrap ${
                            isDarkMode
                              ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white'
                              : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
                          }`}
                          title="Editar Regra e Mensagem"
                        >
                          <Edit2 size={13} className="shrink-0" />
                          <span>Editar</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteRule(rule.id)}
                          className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-colors whitespace-nowrap ${
                            isDarkMode
                              ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
                              : 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100'
                          }`}
                          title="Excluir Regra"
                        >
                          <Trash2 size={13} className="shrink-0" />
                          <span>Excluir</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SUBVIEW 2: SUGGESTIONS GALLERY */}
        {activeSubView === 'suggestions' && (
          <div className="space-y-6">
            <div
              className={`p-5 sm:p-6 rounded-2xl border ${
                isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
              }`}
            >
              <div className="max-w-3xl">
                <h3 className="text-base sm:text-lg font-bold mb-1">
                  Sugestões de Automação Recomendadas para sua Operação
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  Ative com um clique modelos prontos para reduzir esquecimentos da equipe, avisar clientes quando o motorista sair para entrega e enviar resumos diários à diretoria.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
                {allSuggestions.map((sug, idx) => {
                  const alreadyActive = rules.some(
                    r => r.name.toLowerCase() === sug.name.toLowerCase() && r.enabled
                  );
                  const triggerInfo = TRIGGER_METADATA[sug.trigger];

                  return (
                    <div
                      key={idx}
                      className={`p-5 rounded-2xl border flex flex-col justify-between gap-4 ${
                        isDarkMode
                          ? 'bg-slate-950/70 border-slate-800'
                          : 'bg-slate-50/80 border-slate-200'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                              isDarkMode
                                ? 'bg-slate-900 border-slate-700 text-emerald-400'
                                : 'bg-white border-slate-200 text-emerald-700'
                            }`}
                          >
                            {CATEGORY_LABELS[sug.category]?.label}
                          </span>
                          {sug.scheduleTime && (
                            <span className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-slate-500">
                              <Clock size={13} className="text-emerald-500" />
                              Horário: {sug.scheduleTime}
                            </span>
                          )}
                        </div>

                        <div>
                          <h4 className="text-base font-bold">{sug.name}</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
                            {sug.description}
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <div
                            className={`p-2.5 rounded-xl border ${
                              isDarkMode
                                ? 'bg-slate-900 border-slate-800'
                                : 'bg-white border-slate-200'
                            }`}
                          >
                            <span className="block text-[10px] font-bold uppercase text-slate-400">
                              Gatilho
                            </span>
                            <span className="font-semibold line-clamp-1">
                              {triggerInfo?.label || sug.trigger}
                            </span>
                          </div>
                          <div
                            className={`p-2.5 rounded-xl border ${
                              isDarkMode
                                ? 'bg-slate-900 border-slate-800'
                                : 'bg-white border-slate-200'
                            }`}
                          >
                            <span className="block text-[10px] font-bold uppercase text-slate-400">
                              Destinatário
                            </span>
                            <span className="font-semibold line-clamp-1">
                              {RECIPIENT_LABELS[sug.recipientTarget]}
                            </span>
                          </div>
                        </div>

                        <div
                          className={`p-3 rounded-xl border font-mono text-xs whitespace-pre-wrap leading-relaxed ${
                            isDarkMode
                              ? 'bg-slate-900 border-slate-800 text-slate-300'
                              : 'bg-white border-slate-200 text-slate-700'
                          }`}
                        >
                          {sug.template}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleActivateSuggestion(sug)}
                        className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors ${
                          alreadyActive
                            ? isDarkMode
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
                        }`}
                      >
                        <Check size={15} />
                        <span>
                          {alreadyActive ? 'Já Ativa nas Regras (Ver Regra)' : 'Ativar esta Automação'}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* SUBVIEW 3: PHONE DIRECTORY FOR AUTOMATION */}
        {activeSubView === 'directory' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Card: Admin & Logistics Group */}
            <form
              onSubmit={handleSaveDirectory}
              className={`lg:col-span-5 p-5 sm:p-6 rounded-2xl border space-y-5 ${
                isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 shrink-0">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold">Destinos Principais (Admin & Logística)</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                    Defina o número do Administrador que receberá os avisos de status de tarefas e baixas de entregas.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold mb-1.5">
                    Nome do Administrador / Gestor Principal
                  </label>
                  <input
                    type="text"
                    value={directory.adminName}
                    onChange={e => setDirectory({ ...directory, adminName: e.target.value })}
                    placeholder="Ex: Administrador"
                    className={inputBaseClass}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1.5">
                    Seu WhatsApp de Administrador (DDD + Número) *
                  </label>
                  <input
                    type="text"
                    value={directory.adminPhone}
                    onChange={e =>
                      setDirectory({ ...directory, adminPhone: e.target.value.replace(/\D/g, '') })
                    }
                    placeholder="Ex: 5583999998888"
                    className={`${inputBaseClass} font-mono`}
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Se você digitar apenas DDD + Número (ex: 83999998888), o sistema adiciona o DDI 55 automaticamente.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1.5">
                    WhatsApp do Grupo de Logística / Expedição
                  </label>
                  <input
                    type="text"
                    value={directory.logisticsGroupPhone}
                    onChange={e =>
                      setDirectory({
                        ...directory,
                        logisticsGroupPhone: e.target.value.replace(/\D/g, '')
                      })
                    }
                    placeholder="Ex: 5583999990002"
                    className={`${inputBaseClass} font-mono`}
                  />
                </div>

                {/* Direct W-API Gateway Fields inside Directory */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      Credenciais W-API (Para Envio Real no Celular)
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isWapiConfigured
                          ? 'bg-emerald-500/15 text-emerald-500'
                          : 'bg-amber-500/15 text-amber-500'
                      }`}
                    >
                      {isWapiConfigured ? 'W-API Configurada' : 'Pendente'}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1">
                      Código ID da Instância da W-API (Não o nome)
                    </label>
                    <input
                      type="text"
                      value={wapiInstanceId}
                      onChange={e => setWapiInstanceId(sanitizeWapiInstanceId(e.target.value))}
                      placeholder="Ex: LITE-9X8Z... (ou cole a URL da W-API)"
                      className={`${inputBaseClass} font-mono ${
                        isInstanceNameInsteadOfId ? 'border-rose-500 ring-1 ring-rose-500/40' : ''
                      }`}
                    />
                    {isInstanceNameInsteadOfId ? (
                      <p className="text-[11px] font-semibold text-rose-500 mt-1 leading-snug">
                        ⚠️ Você digitou o nome (&quot;{wapiInstanceId.trim()}&quot;). No painel w-api.app, copie o código ID da instância (sem espaços) que aparece abaixo/ao lado do nome.
                      </p>
                    ) : (
                      <p className="text-[11px] text-slate-500 mt-1">
                        Dica: Você também pode colar a URL inteira da W-API que extraímos o ID automaticamente.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1">
                      Token Bearer da W-API
                    </label>
                    <input
                      type="password"
                      value={wapiToken}
                      onChange={e => setWapiToken(e.target.value)}
                      placeholder="Cole seu Token Bearer da W-API"
                      className={`${inputBaseClass} font-mono`}
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-2xs cursor-pointer"
                >
                  <Check size={15} />
                  <span>Salvar Telefone & Credenciais W-API</span>
                </button>

                <button
                  type="button"
                  disabled={isSendingDirectTest}
                  onClick={handleDirectAdminTestSend}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-colors cursor-pointer ${
                    isDarkMode
                      ? 'bg-slate-800 border-slate-700 text-emerald-400 hover:bg-slate-700'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  {isSendingDirectTest ? (
                    <RefreshCw size={15} className="animate-spin" />
                  ) : (
                    <Send size={15} />
                  )}
                  <span>Enviar Mensagem de Teste para Meu Celular Agora</span>
                </button>
              </div>
            </form>

            {/* Right Card: Collaborator & Driver Phone Mapping */}
            <div
              className={`lg:col-span-7 p-5 sm:p-6 rounded-2xl border space-y-5 ${
                isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500 shrink-0">
                    <Users size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold">
                      Telefones de Colaboradores & Motoristas
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                      Os números de telefone cadastrados no <strong>Perfil do Usuário</strong> são sincronizados automaticamente para o envio de tarefas e entregas no WhatsApp.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isSyncingProfiles}
                  onClick={async () => {
                    setIsSyncingProfiles(true);
                    try {
                      const synced = await syncCollaboratorPhonesFromProfiles();
                      loadData();
                      showToast(
                        `${synced.length} telefone(s) sincronizado(s) dos perfis de colaboradores!`,
                        'success'
                      );
                    } finally {
                      setIsSyncingProfiles(false);
                    }
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer ${
                    isDarkMode
                      ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20'
                      : 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                  }`}
                >
                  <RefreshCw size={13} className={isSyncingProfiles ? 'animate-spin' : ''} />
                  <span>Sincronizar Perfis</span>
                </button>
              </div>

              {/* Well-proportioned Add Collaborator Form Box */}
              <div
                className={`p-4 rounded-2xl border space-y-3.5 ${
                  isDarkMode
                    ? 'bg-slate-950/70 border-slate-800'
                    : 'bg-slate-50 border-slate-200/80'
                }`}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold mb-1">
                      Nome do Colaborador ou Motorista
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Roberto Silva"
                      value={newCollabName}
                      onChange={e => setNewCollabName(e.target.value)}
                      className={inputBaseClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1">
                      WhatsApp (DDI 55 + DDD + Número)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 5583988887777"
                      value={newCollabPhone}
                      onChange={e => setNewCollabPhone(e.target.value)}
                      className={`${inputBaseClass} font-mono`}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddCollaboratorPhone}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-2xs"
                >
                  <Plus size={15} />
                  <span>Vincular Telefone na Agenda</span>
                </button>
              </div>

              {/* Registered Collaborators List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 px-1">
                  <span>Contatos Cadastrados ({Object.keys(directory.collaboratorPhones).length})</span>
                  <span>Número de WhatsApp</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-80 overflow-y-auto pr-1">
                  {Object.entries(directory.collaboratorPhones).map(([nameKey, phoneVal]) => {
                    const isFromProfile = profilePhones.some(
                      p =>
                        p.name.toLowerCase() === nameKey.toLowerCase() ||
                        normalizeBrazilPhone(p.phone) === normalizeBrazilPhone(phoneVal)
                    );
                    return (
                      <div
                        key={nameKey}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                          isDarkMode
                            ? 'bg-slate-950/60 border-slate-800'
                            : 'bg-slate-50 border-slate-200/90'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold capitalize block truncate text-slate-900 dark:text-slate-100">
                              {nameKey}
                            </span>
                            {isFromProfile && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-500/15 text-indigo-500 shrink-0">
                                Perfil
                              </span>
                            )}
                          </div>
                          <span className="font-mono tabular-nums text-[11px] text-emerald-600 dark:text-emerald-400">
                            +{phoneVal}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveCollaboratorPhone(nameKey)}
                          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors shrink-0 flex items-center gap-1 ${
                            isDarkMode
                              ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
                              : 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100'
                          }`}
                          title="Remover telefone"
                        >
                          <Trash2 size={12} />
                          <span>Remover</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SUBVIEW 4: REAL-TIME DISPATCH LOGS */}
        {activeSubView === 'logs' && (
          <div
            className={`rounded-2xl border overflow-hidden ${
              isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
            }`}
          >
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold">Histórico de Envios Automáticos</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Registro de todas as mensagens disparadas pelas regras de tarefas e entregas.
                </p>
              </div>
              {logs.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    clearAutomationLogs();
                    showToast('Histórico limpo.', 'info');
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-colors self-start sm:self-auto ${
                    isDarkMode
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
                      : 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100'
                  }`}
                >
                  <Trash2 size={13} />
                  <span>Limpar Histórico</span>
                </button>
              )}
            </div>

            {logs.length === 0 ? (
              <div className="p-12 text-center space-y-2.5">
                <MessageCircle size={36} className="mx-auto text-slate-400 opacity-50" />
                <p className="text-sm font-bold">Nenhum disparo registrado ainda</p>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  Assim que você criar uma tarefa, alterar um status, finalizar uma entrega ou clicar em &quot;Testar Disparo&quot;, o registro aparecerá aqui.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr
                      className={`border-b text-[11px] font-bold uppercase tracking-wider text-slate-500 ${
                        isDarkMode
                          ? 'border-slate-800 bg-slate-950/50'
                          : 'border-slate-200 bg-slate-50'
                      }`}
                    >
                      <th className="py-3 px-4">Horário</th>
                      <th className="py-3 px-4">Regra Acionada</th>
                      <th className="py-3 px-4">Destinatário</th>
                      <th className="py-3 px-4">Mensagem Enviada</th>
                      <th className="py-3 px-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {logs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-3.5 px-4 font-mono tabular-nums whitespace-nowrap text-slate-500">
                          {log.timestamp}
                        </td>
                        <td className="py-3.5 px-4 font-bold">{log.ruleName}</td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold">{log.recipientName}</div>
                          <div className="text-[11px] font-mono tabular-nums text-slate-400">
                            +{log.recipientPhone}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 max-w-md">
                          <div className="line-clamp-2 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                            {log.message}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${
                              log.status === 'sent'
                                ? isDarkMode
                                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                  : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                : isDarkMode
                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                                : 'bg-amber-50 border-amber-200 text-amber-700'
                            }`}
                          >
                            {log.status === 'sent' ? (
                              <CheckCircle2 size={12} />
                            ) : (
                              <AlertTriangle size={12} />
                            )}
                            {log.status === 'sent'
                              ? 'Enviado via W-API'
                              : 'Simulado (Configure W-API)'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* SUBVIEW 5: BLINDAGEM ANTI-BANIMENTO (AUTOMATIC PROTECTION RULES) */}
        {activeSubView === 'antiban' && (
          <div className="space-y-6">
            {/* Top Master Banner & Health Score */}
            <div
              className={`p-5 sm:p-6 rounded-2xl border flex flex-col lg:flex-row lg:items-center justify-between gap-5 ${
                isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                    antiBanConfig.enabled
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-500'
                      : 'bg-amber-500/15 border-amber-500/30 text-amber-500'
                  }`}
                >
                  <ShieldCheck size={26} />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-base sm:text-lg font-bold">
                      Blindagem Automática Anti-Banimento do Chip
                    </h3>
                    <span
                      className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold border ${
                        antiBanConfig.enabled
                          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-500'
                          : 'bg-amber-500/15 border-amber-500/30 text-amber-500'
                      }`}
                    >
                      {antiBanConfig.enabled
                        ? `Proteção Ativa • Saúde ${antiBanStats.healthScore}%`
                        : 'Blindagem Pausada'}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-3xl leading-relaxed">
                    Estas regras protegem automaticamente seu número contra bloqueios e restrições do WhatsApp: enfileiram disparos simultâneos com atraso humano aleatório, simulam digitação, evitam textos idênticos (hash único) e controlam o volume por minuto, hora e dia.
                  </p>
                  {antiBanStats.lastProtectedAction && (
                    <p className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 pt-1">
                      🛡️ Última ação de proteção: {antiBanStats.lastProtectedAction}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    handleUpdateAntiBan(
                      { enabled: !antiBanConfig.enabled },
                      antiBanConfig.enabled
                        ? 'Blindagem Anti-Ban pausada.'
                        : 'Blindagem Anti-Ban ativada com sucesso!'
                    )
                  }
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold border flex items-center gap-2 transition-all cursor-pointer ${
                    antiBanConfig.enabled
                      ? isDarkMode
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                      : 'bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      antiBanConfig.enabled ? 'bg-emerald-500 animate-pulse' : 'bg-white'
                    }`}
                  />
                  <span>
                    {antiBanConfig.enabled ? 'Blindagem Geral Ativa' : 'Ativar Blindagem Geral'}
                  </span>
                </button>
              </div>
            </div>

            {/* Live Anti-Ban Telemetry & Counters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div
                className={`p-4 rounded-2xl border space-y-2 ${
                  isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                  <span>Cadência no Último Minuto</span>
                  <Clock size={15} className="text-emerald-500" />
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold font-mono tabular-nums">
                    {antiBanStats.sentLastMinute}{' '}
                    <span className="text-xs font-normal text-slate-400">
                      / {antiBanConfig.maxMessagesPerMinute} máx
                    </span>
                  </span>
                  <span className="text-[11px] font-mono text-emerald-500">
                    Fila: {antiBanStats.queuedCount}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        (antiBanStats.sentLastMinute / Math.max(1, antiBanConfig.maxMessagesPerMinute)) * 100
                      )}%`
                    }}
                  />
                </div>
              </div>

              <div
                className={`p-4 rounded-2xl border space-y-2 ${
                  isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                  <span>Volume na Última Hora</span>
                  <Zap size={15} className="text-blue-500" />
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold font-mono tabular-nums">
                    {antiBanStats.sentLastHour}{' '}
                    <span className="text-xs font-normal text-slate-400">
                      / {antiBanConfig.maxMessagesPerHour} máx
                    </span>
                  </span>
                  <span className="text-[11px] font-mono text-blue-500">
                    {Math.round(
                      (antiBanStats.sentLastHour / Math.max(1, antiBanConfig.maxMessagesPerHour)) * 100
                    )}
                    %
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        (antiBanStats.sentLastHour / Math.max(1, antiBanConfig.maxMessagesPerHour)) * 100
                      )}%`
                    }}
                  />
                </div>
              </div>

              <div
                className={`p-4 rounded-2xl border space-y-2 ${
                  isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                  <span>Volume Acumulado Hoje</span>
                  <BarChart3 size={15} className="text-indigo-500" />
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold font-mono tabular-nums">
                    {antiBanStats.sentToday}{' '}
                    <span className="text-xs font-normal text-slate-400">
                      / {antiBanConfig.maxMessagesPerDay} dia
                    </span>
                  </span>
                  <span className="text-[11px] font-mono text-indigo-500">
                    {Math.round(
                      (antiBanStats.sentToday / Math.max(1, antiBanConfig.maxMessagesPerDay)) * 100
                    )}
                    %
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        (antiBanStats.sentToday / Math.max(1, antiBanConfig.maxMessagesPerDay)) * 100
                      )}%`
                    }}
                  />
                </div>
              </div>

              <div
                className={`p-4 rounded-2xl border space-y-2 ${
                  isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                  <span>Ações de Blindagem</span>
                  <ShieldCheck size={15} className="text-emerald-500" />
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold font-mono tabular-nums">
                    {antiBanStats.humanizedMessagesCount}
                  </span>
                  <span className="text-[11px] font-mono text-amber-500">
                    {antiBanStats.blockedDuplicatesCount} duplicadas barradas
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Mensagens com variação dinâmica de texto/hash
                </p>
              </div>
            </div>

            {/* 3 Pre-configured Protection Profiles */}
            <div
              className={`p-5 rounded-2xl border space-y-4 ${
                isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
              }`}
            >
              <div>
                <h4 className="text-sm font-bold">
                  1. Nível de Maturação do Chip (Perfis Automáticos de Aquecimento)
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Escolha o perfil adequado para o tempo de uso do seu número no WhatsApp ou personalize qualquer regra abaixo:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {[
                  {
                    id: 'conservative' as const,
                    title: 'Conservador (Chip Novo / Aquecimento)',
                    badge: 'Máxima Segurança',
                    desc: 'Ideal para números recém-conectados no QR Code. Intervalo de 8s a 18s entre envios, máx. 3/min e 120/dia.'
                  },
                  {
                    id: 'balanced' as const,
                    title: 'Equilibrado (Operação Recomendada)',
                    badge: 'Padrão Ideal',
                    desc: 'Equilíbrio perfeito para avisos de tarefas e entregas do dia a dia. Intervalo de 4s a 11s, máx. 6/min e 250/dia.'
                  },
                  {
                    id: 'intensive' as const,
                    title: 'Intensivo (Chip Antigo / Maturado)',
                    badge: 'Alta Vazão',
                    desc: 'Para números antigos que já conversam diariamente com a equipe e clientes. Intervalo de 2s a 6s, máx. 12/min e 500/dia.'
                  }
                ].map(prof => {
                  const isSelected = antiBanConfig.profile === prof.id;
                  return (
                    <button
                      key={prof.id}
                      type="button"
                      onClick={() => handleSelectAntiBanProfile(prof.id)}
                      className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between gap-3 cursor-pointer ${
                        isSelected
                          ? isDarkMode
                            ? 'bg-emerald-950/30 border-emerald-500 ring-1 ring-emerald-500/40'
                            : 'bg-emerald-50/80 border-emerald-600 ring-1 ring-emerald-500/30'
                          : isDarkMode
                          ? 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                          : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold">{prof.title}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                              isSelected
                                ? 'bg-emerald-600 text-white'
                                : isDarkMode
                                ? 'bg-slate-800 text-slate-400'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {isSelected ? 'Ativo' : prof.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                          {prof.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 5 Detailed Automatic Anti-Ban Rule Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* RULE 1: CADÊNCIA HUMANA & FILA ANTI-RAJADA */}
              <div
                className={`p-5 rounded-2xl border space-y-4 ${
                  isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">
                      Regra Anti-Ban #1 • Fila Sequencial
                    </span>
                    <h4 className="text-sm sm:text-base font-bold mt-0.5">
                      Cadência Humana & Atraso Aleatório (Anti-Rajada)
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Quando várias tarefas ou entregas são criadas ao mesmo tempo, o sistema nunca dispara tudo no mesmo segundo: ele cria uma fila e aguarda um tempo aleatório entre cada mensagem.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateAntiBan(
                        { randomDelayEnabled: !antiBanConfig.randomDelayEnabled },
                        'Configuração de cadência aleatória atualizada!'
                      )
                    }
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border shrink-0 cursor-pointer ${
                      antiBanConfig.randomDelayEnabled
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-500'
                        : 'bg-slate-500/10 border-slate-500/30 text-slate-400'
                    }`}
                  >
                    {antiBanConfig.randomDelayEnabled ? 'Ativa' : 'Pausada'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold mb-1">
                      Intervalo Mínimo (segundos)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={antiBanConfig.minDelaySeconds}
                      onChange={e =>
                        handleUpdateAntiBan({ minDelaySeconds: Number(e.target.value) })
                      }
                      className={`${inputBaseClass} font-mono`}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold mb-1">
                      Intervalo Máximo (segundos)
                    </label>
                    <input
                      type="number"
                      min={2}
                      max={120}
                      value={antiBanConfig.maxDelaySeconds}
                      onChange={e =>
                        handleUpdateAntiBan({ maxDelaySeconds: Number(e.target.value) })
                      }
                      className={`${inputBaseClass} font-mono`}
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2.5 pt-1 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={antiBanConfig.simulateTyping}
                    onChange={e =>
                      handleUpdateAntiBan(
                        { simulateTyping: e.target.checked },
                        'Simulação de digitação na W-API atualizada!'
                      )
                    }
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                  />
                  <span>
                    Simular presença humana (&quot;Digitando...&quot; proporcional ao tamanho do texto na W-API)
                  </span>
                </label>
              </div>

              {/* RULE 2: LIMITE DE VOLUME E PAUSA DE RESPIRO */}
              <div
                className={`p-5 rounded-2xl border space-y-4 ${
                  isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500">
                      Regra Anti-Ban #2 • Controle de Vazão
                    </span>
                    <h4 className="text-sm sm:text-base font-bold mt-0.5">
                      Limites por Minuto, Hora e Dia + Pausa de Respiro
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Impede picos anormais de tráfego que acionam os algoritmos anti-spam da Meta e faz uma pausa automática de respiro a cada lote de envios.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateAntiBan(
                        { rateLimitEnabled: !antiBanConfig.rateLimitEnabled },
                        'Limites de volume atualizados!'
                      )
                    }
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border shrink-0 cursor-pointer ${
                      antiBanConfig.rateLimitEnabled
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-500'
                        : 'bg-slate-500/10 border-slate-500/30 text-slate-400'
                    }`}
                  >
                    {antiBanConfig.rateLimitEnabled ? 'Ativa' : 'Pausada'}
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2.5 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold mb-1">Máx / Minuto</label>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={antiBanConfig.maxMessagesPerMinute}
                      onChange={e =>
                        handleUpdateAntiBan({ maxMessagesPerMinute: Number(e.target.value) })
                      }
                      className={`${inputBaseClass} font-mono`}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold mb-1">Máx / Hora</label>
                    <input
                      type="number"
                      min={5}
                      max={300}
                      value={antiBanConfig.maxMessagesPerHour}
                      onChange={e =>
                        handleUpdateAntiBan({ maxMessagesPerHour: Number(e.target.value) })
                      }
                      className={`${inputBaseClass} font-mono`}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold mb-1">Máx / Dia</label>
                    <input
                      type="number"
                      min={10}
                      max={2000}
                      value={antiBanConfig.maxMessagesPerDay}
                      onChange={e =>
                        handleUpdateAntiBan({ maxMessagesPerDay: Number(e.target.value) })
                      }
                      className={`${inputBaseClass} font-mono`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold mb-1">
                      Lote antes do Respiro (msgs)
                    </label>
                    <input
                      type="number"
                      min={3}
                      max={50}
                      value={antiBanConfig.burstThreshold}
                      onChange={e =>
                        handleUpdateAntiBan({ burstThreshold: Number(e.target.value) })
                      }
                      className={`${inputBaseClass} font-mono`}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold mb-1">
                      Pausa de Respiro (segundos)
                    </label>
                    <input
                      type="number"
                      min={5}
                      max={120}
                      value={antiBanConfig.pauseSecondsOnBurst}
                      onChange={e =>
                        handleUpdateAntiBan({ pauseSecondsOnBurst: Number(e.target.value) })
                      }
                      className={`${inputBaseClass} font-mono`}
                    />
                  </div>
                </div>
              </div>

              {/* RULE 3: FILTRO ANTI-DUPLICIDADE E COOLDOWN POR CONTATO */}
              <div
                className={`p-5 rounded-2xl border space-y-4 ${
                  isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">
                      Regra Anti-Ban #3 • Proteção por Destinatário
                    </span>
                    <h4 className="text-sm sm:text-base font-bold mt-0.5">
                      Bloqueio de Duplicidade & Cooldown por Contato
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Evita que cliques duplos ou edições seguidas na mesma tarefa/entrega disparem mensagens repetidas para o mesmo número em curto espaço de tempo.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateAntiBan(
                        { deduplicationEnabled: !antiBanConfig.deduplicationEnabled },
                        'Filtro anti-duplicidade atualizado!'
                      )
                    }
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border shrink-0 cursor-pointer ${
                      antiBanConfig.deduplicationEnabled
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-500'
                        : 'bg-slate-500/10 border-slate-500/30 text-slate-400'
                    }`}
                  >
                    {antiBanConfig.deduplicationEnabled ? 'Ativa' : 'Pausada'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold mb-1">
                      Bloquear texto idêntico por (min)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={180}
                      value={antiBanConfig.blockDuplicateWindowMinutes}
                      onChange={e =>
                        handleUpdateAntiBan({
                          blockDuplicateWindowMinutes: Number(e.target.value)
                        })
                      }
                      className={`${inputBaseClass} font-mono`}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold mb-1">
                      Intervalo mín. mesmo contato (seg)
                    </label>
                    <input
                      type="number"
                      min={2}
                      max={120}
                      value={antiBanConfig.recipientCooldownSeconds}
                      onChange={e =>
                        handleUpdateAntiBan({
                          recipientCooldownSeconds: Number(e.target.value)
                        })
                      }
                      className={`${inputBaseClass} font-mono`}
                    />
                  </div>
                </div>
              </div>

              {/* RULE 4: POLIMORFISMO DE MENSAGEM (VARIAÇÃO DINÂMICA + HASH ÚNICO) */}
              <div
                className={`p-5 rounded-2xl border space-y-4 ${
                  isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-500">
                      Regra Anti-Ban #4 • Polimorfismo Anti-Filtro
                    </span>
                    <h4 className="text-sm sm:text-base font-bold mt-0.5">
                      Variação Dinâmica de Saudação & Protocolo Único
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Altera sutilmente a saudação de abertura conforme o horário do dia e adiciona um protocolo único no rodapé para que cada mensagem tenha assinatura digital exclusiva.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateAntiBan(
                        { dynamicVariationEnabled: !antiBanConfig.dynamicVariationEnabled },
                        'Polimorfismo de mensagem atualizado!'
                      )
                    }
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border shrink-0 cursor-pointer ${
                      antiBanConfig.dynamicVariationEnabled
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-500'
                        : 'bg-slate-500/10 border-slate-500/30 text-slate-400'
                    }`}
                  >
                    {antiBanConfig.dynamicVariationEnabled ? 'Ativa' : 'Pausada'}
                  </button>
                </div>

                <div className="space-y-2 pt-1">
                  <label className="flex items-center gap-2.5 text-xs font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={antiBanConfig.varyGreetings}
                      onChange={e =>
                        handleUpdateAntiBan({ varyGreetings: e.target.checked })
                      }
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                    />
                    <span>
                      Alternar saudações automaticamente (Bom dia / Boa tarde / Olá, tudo bem?)
                    </span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={antiBanConfig.appendUniqueProtocol}
                      onChange={e =>
                        handleUpdateAntiBan({ appendUniqueProtocol: e.target.checked })
                      }
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                    />
                    <span>
                      Inserir protocolo micro-hash único no rodapé (_🔒 Ref: #A8F2 • 14:30_)
                    </span>
                  </label>
                </div>

                <div
                  className={`p-3 rounded-xl border font-mono text-[11px] whitespace-pre-wrap ${
                    isDarkMode
                      ? 'bg-slate-950 border-slate-800 text-slate-300'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <span className="block text-[10px] font-bold uppercase text-emerald-500 mb-1">
                    Exemplo Real de Mensagem Humanizada:
                  </span>
                  {humanizeWhatsAppMessage(
                    'Olá *Carlos*, você recebeu uma nova tarefa: *Conferência de Estoque*.',
                    antiBanConfig
                  )}
                </div>
              </div>
            </div>

            {/* RULE 5: JANELA DE HORÁRIO COMERCIAL SEGURO */}
            <div
              className={`p-5 rounded-2xl border space-y-4 ${
                isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">
                    Regra Anti-Ban #5 • Janela de Horário Comercial
                  </span>
                  <h4 className="text-sm sm:text-base font-bold mt-0.5">
                    Restrição de Horário Seguro (Prevenção de Denúncias Noturnas)
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Quando ativada, impede que lembretes automáticos sejam disparados de madrugada ou fora do expediente comercial.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    handleUpdateAntiBan(
                      { safeHoursEnabled: !antiBanConfig.safeHoursEnabled },
                      antiBanConfig.safeHoursEnabled
                        ? 'Restrição de horário desativada (envio 24h liberado).'
                        : 'Janela de horário seguro ativada!'
                    )
                  }
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border shrink-0 cursor-pointer ${
                    antiBanConfig.safeHoursEnabled
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-500'
                      : 'bg-slate-500/10 border-slate-500/30 text-slate-400'
                  }`}
                >
                  {antiBanConfig.safeHoursEnabled
                    ? `Restrito (${antiBanConfig.safeHoursStart} às ${antiBanConfig.safeHoursEnd})`
                    : 'Liberado 24h (Opcional)'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center pt-1">
                <div>
                  <label className="block text-[11px] font-bold mb-1">
                    Início do Horário Seguro
                  </label>
                  <input
                    type="time"
                    value={antiBanConfig.safeHoursStart}
                    onChange={e => handleUpdateAntiBan({ safeHoursStart: e.target.value })}
                    className={`${inputBaseClass} font-mono`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold mb-1">
                    Fim do Horário Seguro
                  </label>
                  <input
                    type="time"
                    value={antiBanConfig.safeHoursEnd}
                    onChange={e => handleUpdateAntiBan({ safeHoursEnd: e.target.value })}
                    className={`${inputBaseClass} font-mono`}
                  />
                </div>
                <div className="pt-4">
                  <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={antiBanConfig.allowHighPriorityOutsideSafeHours}
                      onChange={e =>
                        handleUpdateAntiBan({
                          allowHighPriorityOutsideSafeHours: e.target.checked
                        })
                      }
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                    />
                    <span>Permitir tarefas de Prioridade Alta/Urgente fora do horário</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CREATE / EDIT RULE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs">
          <div
            className={`w-full max-w-3xl rounded-2xl border shadow-2xl flex flex-col max-h-[90vh] overflow-hidden ${
              isDarkMode
                ? 'bg-slate-900 border-slate-800 text-slate-100'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-500">
                  <Zap size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold">
                    {editingRuleId ? 'Editar Regra de Automação' : 'Nova Regra de Envio Automático'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Configure o gatilho, o destinatário, o horário e personalize a mensagem com variáveis.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className={`p-2 rounded-xl border transition-colors ${
                  isDarkMode
                    ? 'border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                    : 'border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable Form Content */}
            <form onSubmit={handleSaveRule} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="p-6 space-y-5 overflow-y-auto flex-1">
                {/* Row 1: Nome da Regra & Gatilho */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold mb-1.5">Nome da Regra *</label>
                    <input
                      type="text"
                      required
                      value={formState.name}
                      onChange={e => setFormState({ ...formState, name: e.target.value })}
                      placeholder="Ex: Aviso de Tarefa Criada"
                      className={inputBaseClass}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <label className="block text-xs font-bold">
                        Quando disparar? (Gatilho) *
                      </label>
                      <button
                        type="button"
                        onClick={() => handleOpenCreateTriggerModal()}
                        className="px-2.5 py-0.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        title="Criar um novo gatilho personalizado / definir quando disparar"
                      >
                        <Plus size={12} />
                        <span>Criar Gatilho / Quando Disparar</span>
                      </button>
                    </div>
                    <select
                      value={formState.trigger}
                      onChange={e => {
                        const nextTrigger = e.target.value as AutomationTriggerType;
                        const meta = allTriggersMap[nextTrigger] || TRIGGER_METADATA[nextTrigger];
                        setFormState({
                          ...formState,
                          trigger: nextTrigger,
                          category: meta?.category || formState.category,
                          recipientTarget: meta?.defaultRecipient || formState.recipientTarget,
                          scheduleTime: meta?.defaultScheduleTime || formState.scheduleTime
                        });
                      }}
                      className={inputBaseClass}
                    >
                      {Object.entries(allTriggersMap).map(([key, meta]) => (
                        <option key={key} value={key}>
                          {meta.isCustom ? `⚡ [Personalizado] ${meta.label}` : meta.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Row 2: Destinatário & Descrição Curta */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold mb-1.5">
                      Quem deve receber a mensagem? *
                    </label>
                    <select
                      value={formState.recipientTarget}
                      onChange={e =>
                        setFormState({
                          ...formState,
                          recipientTarget: e.target.value as RecipientTarget
                        })
                      }
                      className={inputBaseClass}
                    >
                      {Object.entries(RECIPIENT_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1.5">
                      Descrição / Objetivo da Regra
                    </label>
                    <input
                      type="text"
                      value={formState.description}
                      onChange={e => setFormState({ ...formState, description: e.target.value })}
                      placeholder="Explicação resumida da automação..."
                      className={inputBaseClass}
                    />
                  </div>
                </div>

                {/* Conditional Row: Horário Pré-definido e/ou Número Customizado */}
                {(allTriggersMap[formState.trigger]?.hasSchedule ||
                  formState.recipientTarget === 'custom_number') && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {allTriggersMap[formState.trigger]?.hasSchedule && (
                      <div>
                        <label className="block text-xs font-bold mb-1.5">
                          Horário Pré-definido para Disparo
                        </label>
                        <input
                          type="time"
                          value={formState.scheduleTime}
                          onChange={e =>
                            setFormState({ ...formState, scheduleTime: e.target.value })
                          }
                          className={`${inputBaseClass} font-mono`}
                        />
                      </div>
                    )}

                    {formState.recipientTarget === 'custom_number' && (
                      <div>
                        <label className="block text-xs font-bold mb-1.5">
                          WhatsApp de Destino (DDI 55 + DDD + Número)
                        </label>
                        <input
                          type="text"
                          value={formState.customPhone}
                          onChange={e =>
                            setFormState({ ...formState, customPhone: e.target.value })
                          }
                          placeholder="Ex: 5583999990001"
                          className={`${inputBaseClass} font-mono`}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Dynamic Variables Bar */}
                <div
                  className={`p-3.5 rounded-xl border ${
                    isDarkMode
                      ? 'bg-slate-950/70 border-slate-800'
                      : 'bg-slate-50 border-slate-200/90'
                  }`}
                >
                  <label className="block text-xs font-bold mb-2">
                    Variáveis Dinâmicas (clique para inserir na mensagem)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(allTriggersMap[formState.trigger]?.availableVariables || []).map(v => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => insertVariableIntoTemplate(v)}
                        className={`px-2.5 py-1.5 rounded-lg font-mono text-xs font-semibold border transition-colors ${
                          isDarkMode
                            ? 'bg-slate-900 border-slate-700 text-emerald-400 hover:bg-emerald-500/15 hover:border-emerald-500/40'
                            : 'bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-50 shadow-2xs'
                        }`}
                      >
                        + {v}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message Template & Live Preview Side-by-Side on Desktop */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold mb-1.5">
                      Modelo da Mensagem do WhatsApp *
                    </label>
                    <textarea
                      rows={6}
                      required
                      value={formState.template}
                      onChange={e => setFormState({ ...formState, template: e.target.value })}
                      className={`${inputBaseClass} font-mono leading-relaxed h-40 resize-none`}
                    />
                  </div>

                  <div>
                    <span className="block text-xs font-bold mb-1.5">
                      Pré-visualização Real no WhatsApp
                    </span>
                    <div
                      className={`p-3.5 rounded-xl border text-xs whitespace-pre-wrap leading-relaxed h-40 overflow-y-auto ${
                        isDarkMode
                          ? 'bg-emerald-950/20 border-emerald-800/50 text-slate-200'
                          : 'bg-emerald-50/70 border-emerald-200 text-slate-800'
                      }`}
                    >
                      {previewText}
                    </div>
                  </div>
                </div>
              </div>

              {/* Sticky Modal Footer */}
              <div
                className={`px-6 py-4 border-t flex items-center justify-between gap-3 shrink-0 ${
                  isDarkMode
                    ? 'bg-slate-900 border-slate-800'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={formState.enabled}
                    onChange={e => setFormState({ ...formState, enabled: e.target.checked })}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                  />
                  <span>Deixar regra ativa imediatamente</span>
                </label>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-colors ${
                      isDarkMode
                        ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors flex items-center gap-1.5"
                  >
                    <Check size={15} />
                    <span>Salvar Regra</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE / EDIT TRIGGER ("CRIAR NOVO GATILHO PARA QUALQUER AÇÃO") MODAL */}
      {isTriggerModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs">
          <div
            className={`w-full max-w-2xl rounded-2xl border shadow-2xl flex flex-col max-h-[90vh] overflow-hidden ${
              isDarkMode
                ? 'bg-slate-900 border-slate-800 text-slate-100'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            {/* Trigger Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-500">
                  <Zap size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold">
                    {editingTriggerId
                      ? 'Editar Gatilho do Sistema'
                      : 'Criar Novo Gatilho (Para Qualquer Ação do Sistema)'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Crie um gatilho vinculado a qualquer ação do aplicativo. Depois, basta selecioná-lo ao criar sua regra.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTriggerModalOpen(false)}
                className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                  isDarkMode
                    ? 'border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                    : 'border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <X size={16} />
              </button>
            </div>

            {/* Trigger Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* 1. Escolha a Ação do Aplicativo */}
              <div className="space-y-3">
                <label className="block text-xs font-bold">
                  1. Qual ação do aplicativo vai acionar este gatilho? *
                </label>

                <select
                  value={triggerForm.selectedActionKey}
                  onChange={e => {
                    const key = e.target.value;
                    const found = SYSTEM_ACTION_CATALOG.find(a => a.actionKey === key);
                    if (found) {
                      const cleanActionText = found.actionLabel.includes(': ')
                        ? found.actionLabel.split(': ').slice(1).join(': ')
                        : found.actionLabel;
                      const autoLabel =
                        key === 'custom_action'
                          ? triggerForm.customActionDescription || ''
                          : `Quando ${cleanActionText.charAt(0).toLowerCase()}${cleanActionText.slice(1)}`;
                      setTriggerForm(prev => ({
                        ...prev,
                        selectedActionKey: key,
                        label: autoLabel,
                        category: found.category,
                        defaultRecipient: found.defaultRecipient,
                        firingMode: found.defaultFiringMode,
                        hasSchedule: found.defaultFiringMode === 'scheduled_time',
                        availableVariables: [...found.defaultVariables]
                      }));
                    }
                  }}
                  className={inputBaseClass}
                >
                  {(['Comunicação & CRM', 'Principal', 'Operações', 'Resultados', 'Administração'] as const).map(
                    sectionName => {
                      const sectionModuleKeys = SIDEBAR_MODULE_OPTIONS.filter(
                        m => m.section === sectionName
                      ).map(m => m.key);
                      const actionsInSection = SYSTEM_ACTION_CATALOG.filter(
                        a => a.actionKey !== 'custom_action' && sectionModuleKeys.includes(a.category)
                      );
                      return (
                        <optgroup key={sectionName} label={`Menu Lateral — ${sectionName}`}>
                          {actionsInSection.map(a => (
                            <option key={a.actionKey} value={a.actionKey}>
                              {a.actionLabel}
                            </option>
                          ))}
                        </optgroup>
                      );
                    }
                  )}
                  <optgroup label="Personalizado">
                    <option value="custom_action">
                      ⚡ Outra ação personalizada do sistema (digitar livremente)
                    </option>
                  </optgroup>
                </select>

                {triggerForm.selectedActionKey === 'custom_action' && (
                  <div>
                    <label className="block text-[11px] font-bold text-indigo-400 mb-1">
                      Descreva a ação do aplicativo que deve disparar o gatilho *
                    </label>
                    <input
                      type="text"
                      value={triggerForm.customActionDescription}
                      onChange={e =>
                        setTriggerForm(prev => ({
                          ...prev,
                          customActionDescription: e.target.value,
                          label: e.target.value
                        }))
                      }
                      placeholder="Ex: Quando um orçamento for aprovado / Quando alterar limite de crédito..."
                      className={inputBaseClass}
                    />
                  </div>
                )}
              </div>

              {/* 2. Quando Disparar ao Ocorrer a Ação */}
              <div>
                <label className="block text-xs font-bold mb-2">
                  2. Quando disparar ao ocorrer essa ação? *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    {
                      id: 'system_event',
                      title: 'Imediatamente na Ação (Tempo Real)',
                      desc: 'Dispara no exato momento em que a ação é realizada',
                      icon: Zap
                    },
                    {
                      id: 'status_change',
                      title: 'Quando Atingir um Status Específico',
                      desc: 'Dispara quando o status mudar para o valor definido',
                      icon: RefreshCw
                    },
                    {
                      id: 'scheduled_time',
                      title: 'Em Horário Fixo / Programado',
                      desc: 'Dispara diariamente no horário configurado',
                      icon: Clock
                    },
                    {
                      id: 'delay_after_event',
                      title: 'Tempo Após a Ação (Follow-up)',
                      desc: 'Aguarda X minutos após a ação para disparar',
                      icon: History
                    }
                  ].map(modeOption => {
                    const ModeIcon = modeOption.icon;
                    const isSelected = triggerForm.firingMode === modeOption.id;
                    return (
                      <button
                        key={modeOption.id}
                        type="button"
                        onClick={() =>
                          setTriggerForm(prev => ({
                            ...prev,
                            firingMode: modeOption.id as TriggerFiringMode,
                            hasSchedule: modeOption.id === 'scheduled_time'
                          }))
                        }
                        className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 cursor-pointer ${
                          isSelected
                            ? isDarkMode
                              ? 'bg-indigo-500/15 border-indigo-500 text-indigo-200 shadow-xs'
                              : 'bg-indigo-50 border-indigo-500 text-indigo-900 shadow-xs'
                            : isDarkMode
                            ? 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div
                          className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                            isSelected
                              ? 'bg-indigo-600 text-white'
                              : isDarkMode
                              ? 'bg-slate-800 text-slate-400'
                              : 'bg-white text-slate-500'
                          }`}
                        >
                          <ModeIcon size={14} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold leading-snug">{modeOption.title}</div>
                          <div className="text-[11px] opacity-75 mt-0.5 leading-snug">
                            {modeOption.desc}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Nome do Gatilho & Parâmetro de Disparo */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                <div className={triggerForm.firingMode === 'system_event' ? 'sm:col-span-12' : 'sm:col-span-8'}>
                  <label className="block text-xs font-bold mb-1.5">
                    3. Nome do Gatilho (como aparecerá na lista de &quot;Quando disparar?&quot; da regra) *
                  </label>
                  <input
                    type="text"
                    value={triggerForm.label}
                    onChange={e => setTriggerForm({ ...triggerForm, label: e.target.value })}
                    placeholder="Ex: Quando uma nova venda é registrada / Quando entrega sair para rota..."
                    className={inputBaseClass}
                  />
                </div>

                {triggerForm.firingMode === 'scheduled_time' && (
                  <div className="sm:col-span-4">
                    <label className="block text-xs font-bold mb-1.5">
                      Horário Padrão *
                    </label>
                    <input
                      type="time"
                      value={triggerForm.defaultScheduleTime}
                      onChange={e =>
                        setTriggerForm({
                          ...triggerForm,
                          defaultScheduleTime: e.target.value,
                          hasSchedule: true
                        })
                      }
                      className={`${inputBaseClass} font-mono`}
                    />
                  </div>
                )}

                {triggerForm.firingMode === 'status_change' && (
                  <div className="sm:col-span-4">
                    <label className="block text-xs font-bold mb-1.5">
                      Qual Status Dispara? *
                    </label>
                    <input
                      type="text"
                      value={triggerForm.conditionStatusValue}
                      onChange={e =>
                        setTriggerForm({ ...triggerForm, conditionStatusValue: e.target.value })
                      }
                      placeholder="Ex: Finalizada, Em Rota..."
                      className={inputBaseClass}
                    />
                  </div>
                )}

                {triggerForm.firingMode === 'delay_after_event' && (
                  <div className="sm:col-span-4">
                    <label className="block text-xs font-bold mb-1.5">
                      Aguardar (Minutos)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={1440}
                      value={triggerForm.delayMinutes}
                      onChange={e =>
                        setTriggerForm({
                          ...triggerForm,
                          delayMinutes: Math.max(1, Number(e.target.value) || 15)
                        })
                      }
                      className={`${inputBaseClass} font-mono`}
                    />
                  </div>
                )}
              </div>

              {/* 4. Módulo do Sistema (todas as opções do Menu Lateral) & 5. Destinatário Sugerido */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1.5">
                    4. Módulo do Sistema (Menu Lateral)
                  </label>
                  <select
                    value={triggerForm.category}
                    onChange={e => {
                      const nextCat = e.target.value as AutomationCategory;
                      const matchingAction = SYSTEM_ACTION_CATALOG.find(
                        a => a.category === nextCat && a.actionKey !== 'custom_action'
                      );
                      if (matchingAction && triggerForm.selectedActionKey !== 'custom_action') {
                        const cleanActionText = matchingAction.actionLabel.includes(': ')
                          ? matchingAction.actionLabel.split(': ').slice(1).join(': ')
                          : matchingAction.actionLabel;
                        setTriggerForm(prev => ({
                          ...prev,
                          category: nextCat,
                          selectedActionKey: matchingAction.actionKey,
                          label: `Quando ${cleanActionText.charAt(0).toLowerCase()}${cleanActionText.slice(1)}`,
                          defaultRecipient: matchingAction.defaultRecipient,
                          firingMode: matchingAction.defaultFiringMode,
                          hasSchedule: matchingAction.defaultFiringMode === 'scheduled_time',
                          availableVariables: [...matchingAction.defaultVariables]
                        }));
                      } else {
                        setTriggerForm(prev => ({
                          ...prev,
                          category: nextCat
                        }));
                      }
                    }}
                    className={inputBaseClass}
                  >
                    {(
                      [
                        'Principal',
                        'Comunicação & CRM',
                        'Operações',
                        'Resultados',
                        'Administração'
                      ] as const
                    ).map(secTitle => (
                      <optgroup key={secTitle} label={secTitle}>
                        {SIDEBAR_MODULE_OPTIONS.filter(m => m.section === secTitle).map(mod => (
                          <option key={mod.key} value={mod.key}>
                            {mod.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                    <optgroup label="Outras Categorias">
                      <option value="clients">Avisos Gerais a Clientes</option>
                      <option value="management">Diretoria & Resumos Gerais</option>
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1.5">
                    5. Destinatário Padrão Sugerido
                  </label>
                  <select
                    value={triggerForm.defaultRecipient}
                    onChange={e =>
                      setTriggerForm({
                        ...triggerForm,
                        defaultRecipient: e.target.value as RecipientTarget
                      })
                    }
                    className={inputBaseClass}
                  >
                    {Object.entries(RECIPIENT_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 6. Variáveis Dinâmicas do Gatilho */}
              <div
                className={`p-3.5 rounded-xl border space-y-2.5 ${
                  isDarkMode
                    ? 'bg-slate-950/70 border-slate-800'
                    : 'bg-slate-50 border-slate-200/90'
                }`}
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <label className="block text-xs font-bold">
                    6. Variáveis que este Gatilho fornece para a mensagem
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={newVarInput}
                      onChange={e => setNewVarInput(e.target.value)}
                      placeholder="Nova variável (ex: valor)"
                      className={`px-2.5 py-1 rounded-lg text-xs border font-mono ${
                        isDarkMode
                          ? 'bg-slate-900 border-slate-700 text-white'
                          : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const clean = newVarInput.trim().replace(/[{}]/g, '');
                        if (!clean) return;
                        const token = `{${clean}}`;
                        if (!triggerForm.availableVariables.includes(token)) {
                          setTriggerForm(prev => ({
                            ...prev,
                            availableVariables: [...prev.availableVariables, token]
                          }));
                        }
                        setNewVarInput('');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer"
                    >
                      + Adicionar
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {[
                    '{colaborador}',
                    '{criador}',
                    '{cliente}',
                    '{motorista}',
                    '{veiculo}',
                    '{produto}',
                    '{valor}',
                    '{tarefa}',
                    '{status}',
                    '{prioridade}',
                    '{prazo}',
                    '{endereco}',
                    '{bairro}',
                    '{cidade}',
                    '{vendedor}',
                    '{turno}',
                    '{horario}',
                    '{data}'
                  ].map(varToken => {
                    const isSelected = triggerForm.availableVariables.includes(varToken);
                    return (
                      <button
                        key={varToken}
                        type="button"
                        onClick={() =>
                          setTriggerForm(prev => ({
                            ...prev,
                            availableVariables: isSelected
                              ? prev.availableVariables.filter(x => x !== varToken)
                              : [...prev.availableVariables, varToken]
                          }))
                        }
                        className={`px-2 py-1 rounded-lg font-mono text-[11px] font-semibold border transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-600 border-emerald-500 text-white'
                            : isDarkMode
                            ? 'bg-slate-900 border-slate-800 text-slate-400'
                            : 'bg-white border-slate-200 text-slate-600'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}
                        {varToken}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Trigger Modal Footer - Strictly saves the trigger */}
            <div
              className={`px-6 py-4 border-t flex items-center justify-end gap-3 shrink-0 ${
                isDarkMode
                  ? 'bg-slate-900 border-slate-800'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <button
                type="button"
                onClick={() => setIsTriggerModalOpen(false)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                  isDarkMode
                    ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleSaveCustomTrigger}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Check size={15} />
                <span>{editingTriggerId ? 'Salvar Alterações do Gatilho' : 'Salvar Novo Gatilho'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
