'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { useUI } from '@/hooks/useUI';
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
  ArrowRight
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
  clearAutomationLogs,
  getDirectoryConfig,
  saveDirectoryConfig,
  triggerWhatsAppAutomation,
  interpolateTemplate,
  DEFAULT_AUTOMATION_RULES
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

const CATEGORY_LABELS: Record<AutomationCategory | 'all', { label: string; shortLabel: string; icon: any }> = {
  all: { label: 'Todas as Regras', shortLabel: 'Todas', icon: Zap },
  tasks: { label: 'Tarefas & Equipe', shortLabel: 'Tarefas', icon: ClipboardList },
  deliveries: { label: 'Entregas & Motoristas', shortLabel: 'Entregas', icon: Truck },
  clients: { label: 'Avisos a Clientes', shortLabel: 'Clientes', icon: Users },
  demands: { label: 'Estoque & Demandas', shortLabel: 'Demandas', icon: Package },
  management: { label: 'Diretoria & Resumos', shortLabel: 'Diretoria', icon: BarChart3 }
};

const RECIPIENT_LABELS: Record<RecipientTarget, string> = {
  assigned_collaborator: 'Colaborador escolhido na tarefa',
  admin_or_creator: 'Administrador / Criador da tarefa',
  assigned_driver: 'Motorista escalado na entrega',
  delivery_client: 'Cliente da entrega (telefone do pedido)',
  custom_number: 'Número fixo ou Grupo do WhatsApp'
};

export default function WhatsAppAutomations() {
  const { isDarkMode } = useTheme();
  const { showToast } = useUI();

  const [rules, setRules] = useState<WhatsAppAutomationRule[]>([]);
  const [logs, setLogs] = useState<WhatsAppAutomationLog[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<AutomationCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSubView, setActiveSubView] = useState<'rules' | 'suggestions' | 'logs' | 'directory'>('rules');

  // Rule Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [testingRuleId, setTestingRuleId] = useState<string | null>(null);

  // Directory State
  const [directory, setDirectory] = useState(getDirectoryConfig());
  const [newCollabName, setNewCollabName] = useState('');
  const [newCollabPhone, setNewCollabPhone] = useState('');

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

  const loadData = () => {
    setRules(getAutomationRules());
    setLogs(getAutomationLogs());
    setDirectory(getDirectoryConfig());
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('whatsapp-automation-updated', handleUpdate);
    return () => window.removeEventListener('whatsapp-automation-updated', handleUpdate);
  }, []);

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

  const handleOpenCreateModal = () => {
    setEditingRuleId(null);
    setFormState({
      name: '',
      description: '',
      category: 'tasks',
      trigger: 'task_created',
      recipientTarget: 'assigned_collaborator',
      customPhone: '',
      scheduleTime: '07:30',
      template:
        '📌 *Nova Tarefa Atribuída*\n\nOlá *{colaborador}*, *{criador}* criou a tarefa *{tarefa}* (Prioridade: {prioridade}) com prazo para *{prazo}*.',
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

    const triggerMeta = TRIGGER_METADATA[formState.trigger];
    const hasSchedule = Boolean(triggerMeta?.hasSchedule);

    if (editingRuleId) {
      const updated = rules.map(r =>
        r.id === editingRuleId
          ? {
              ...r,
              name: formState.name.trim(),
              description: formState.description.trim() || triggerMeta.label,
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
        description: formState.description.trim() || triggerMeta.label,
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

  const handleTestRuleNow = async (rule: WhatsAppAutomationRule) => {
    setTestingRuleId(rule.id);
    try {
      const sampleVariables: Record<string, any> = {
        colaborador: 'Carlos',
        criador: directory.adminName,
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

      const res = await triggerWhatsAppAutomation(rule.trigger, sampleVariables, {
        forceRuleId: rule.id
      });

      if (res.triggeredCount > 0) {
        const log = res.logs[0];
        showToast(
          `Disparo enviado para ${log.recipientName} (${log.recipientPhone})!`,
          'success'
        );
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
    saveDirectoryConfig(directory);
    showToast('Agenda de telefones de automação salva com sucesso!', 'success');
  };

  const handleAddCollaboratorPhone = () => {
    if (!newCollabName.trim() || !newCollabPhone.trim()) {
      showToast('Informe o nome do colaborador/motorista e o WhatsApp.', 'warning');
      return;
    }
    const cleanPhone = newCollabPhone.replace(/\D/g, '');
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
    saveDirectoryConfig(updatedDir);
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
                Regras de Envio Automático via WhatsApp
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
                Configure gatilhos automáticos para tarefas delegadas, mudanças de status, roteiros diários de motoristas e lembretes de baixa de entrega.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
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
              onClick={handleOpenCreateModal}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-2 shadow-sm transition-colors whitespace-nowrap"
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
              <div className="text-sm font-bold font-mono tabular-nums truncate">
                +{directory.adminPhone} ({directory.adminName})
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
                <span>Gerenciar telefones</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* Main Section Switcher Tabs (Well-framed 4-tab bar) */}
        <div
          className={`grid grid-cols-2 lg:grid-cols-4 gap-2 p-1.5 rounded-2xl border ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-200/70 border-slate-200'
          }`}
        >
          {[
            { id: 'rules', label: 'Regras Configuradas', icon: Zap, count: rules.length },
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
                {(Object.keys(CATEGORY_LABELS) as Array<AutomationCategory | 'all'>).map(catKey => {
                  const { label, icon: CatIcon } = CATEGORY_LABELS[catKey];
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

            {/* Rules Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {filteredRules.map(rule => {
                const triggerInfo = TRIGGER_METADATA[rule.trigger];
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
                            Gatilho de Disparo
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
                    WhatsApp do Administrador (com DDI 55 + DDD)
                  </label>
                  <input
                    type="text"
                    value={directory.adminPhone}
                    onChange={e =>
                      setDirectory({ ...directory, adminPhone: e.target.value.replace(/\D/g, '') })
                    }
                    placeholder="Ex: 5583999990001"
                    className={`${inputBaseClass} font-mono`}
                  />
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
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-2xs"
              >
                <Check size={15} />
                <span>Salvar Configurações de Destino</span>
              </button>
            </form>

            {/* Right Card: Collaborator & Driver Phone Mapping */}
            <div
              className={`lg:col-span-7 p-5 sm:p-6 rounded-2xl border space-y-5 ${
                isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500 shrink-0">
                  <Users size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold">
                    Telefones de Colaboradores & Motoristas
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                    Vincule o nome do colaborador ou motorista ao número de WhatsApp para o envio automático de tarefas delegadas e roteiros de entrega.
                  </p>
                </div>
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
                  {Object.entries(directory.collaboratorPhones).map(([nameKey, phoneVal]) => (
                    <div
                      key={nameKey}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                        isDarkMode
                          ? 'bg-slate-950/60 border-slate-800'
                          : 'bg-slate-50 border-slate-200/90'
                      }`}
                    >
                      <div className="min-w-0">
                        <span className="font-bold capitalize block truncate text-slate-900 dark:text-slate-100">
                          {nameKey}
                        </span>
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
                  ))}
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
                              isDarkMode
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            }`}
                          >
                            <CheckCircle2 size={12} />
                            {log.status === 'sent' ? 'Enviado via Gateway' : 'Disparado'}
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
                    <label className="block text-xs font-bold mb-1.5">
                      Quando disparar? (Gatilho) *
                    </label>
                    <select
                      value={formState.trigger}
                      onChange={e => {
                        const nextTrigger = e.target.value as AutomationTriggerType;
                        const meta = TRIGGER_METADATA[nextTrigger];
                        setFormState({
                          ...formState,
                          trigger: nextTrigger,
                          category: meta.category,
                          recipientTarget: meta.defaultRecipient
                        });
                      }}
                      className={inputBaseClass}
                    >
                      {Object.entries(TRIGGER_METADATA).map(([key, meta]) => (
                        <option key={key} value={key}>
                          {meta.label}
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
                {(TRIGGER_METADATA[formState.trigger]?.hasSchedule ||
                  formState.recipientTarget === 'custom_number') && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {TRIGGER_METADATA[formState.trigger]?.hasSchedule && (
                      <div>
                        <label className="block text-xs font-bold mb-1.5">
                          Horário Pré-definido pelo Administrador
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
                    {(TRIGGER_METADATA[formState.trigger]?.availableVariables || []).map(v => (
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
    </div>
  );
}
