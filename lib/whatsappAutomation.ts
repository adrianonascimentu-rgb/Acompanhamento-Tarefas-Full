export type AutomationTriggerType =
  | 'task_created'
  | 'task_status_changed'
  | 'task_overdue_reminder'
  | 'driver_daily_schedule'
  | 'delivery_finalized'
  | 'driver_unfinalized_reminder'
  | 'delivery_out_for_client'
  | 'demand_created'
  | 'special_delivery_alert'
  | 'daily_executive_summary';

export type AutomationCategory =
  | 'tasks'
  | 'deliveries'
  | 'clients'
  | 'demands'
  | 'management';

export type RecipientTarget =
  | 'assigned_collaborator'
  | 'admin_or_creator'
  | 'assigned_driver'
  | 'delivery_client'
  | 'custom_number';

export interface WhatsAppAutomationRule {
  id: string;
  name: string;
  description: string;
  category: AutomationCategory;
  trigger: AutomationTriggerType;
  enabled: boolean;
  recipientTarget: RecipientTarget;
  customPhone?: string;
  scheduleTime?: string; // e.g., "07:30" or "18:00"
  conditionStatus?: string[]; // e.g., ["Em Andamento", "Concluída", "Revisão"]
  template: string;
  lastTriggeredAt?: string;
  totalSentCount: number;
  isSuggested?: boolean;
}

export interface WhatsAppAutomationLog {
  id: string;
  ruleId: string;
  ruleName: string;
  trigger: AutomationTriggerType;
  recipientName: string;
  recipientPhone: string;
  message: string;
  timestamp: string;
  createdAt?: string;
  category?: AutomationCategory;
  status: 'sent' | 'simulated' | 'failed';
}

export interface WhatsAppTrafficEvent {
  id: string;
  createdAt: string; // ISO string
  timeLabel: string; // HH:mm
  direction: 'outbound' | 'inbound';
  mode: 'auto' | 'manual';
  status: 'sent' | 'failed';
  recipientName: string;
  recipientPhone: string;
  text: string;
  category: AutomationCategory | 'manual_chat';
  ruleName?: string;
}

export interface AutomationDirectoryConfig {
  adminName: string;
  adminPhone: string;
  logisticsGroupPhone: string;
  collaboratorPhones: Record<string, string>; // key: lowercase name or id -> phone
}

const RULES_STORAGE_KEY = 'whatsapp_automation_rules_v2_real';
const LOGS_STORAGE_KEY = 'whatsapp_automation_logs_v2_real';
const DIRECTORY_STORAGE_KEY = 'whatsapp_automation_directory_v1';
const CHATS_INBOX_SYNC_KEY = 'whatsapp_automated_inbox_messages_v2_real';
const TRAFFIC_EVENTS_STORAGE_KEY = 'whatsapp_real_traffic_events_v1';

export const DEFAULT_DIRECTORY_CONFIG: AutomationDirectoryConfig = {
  adminName: 'Adriano Nascimento (Admin)',
  adminPhone: '',
  logisticsGroupPhone: '',
  collaboratorPhones: {}
};

export const DEFAULT_AUTOMATION_RULES: WhatsAppAutomationRule[] = [
  {
    id: 'rule-task-created',
    name: 'Aviso de Nova Tarefa Delegada',
    description: 'Quando o administrador ou gestor cria uma tarefa, envia mensagem automática para o colaborador escolhido.',
    category: 'tasks',
    trigger: 'task_created',
    enabled: true,
    recipientTarget: 'assigned_collaborator',
    template:
      '📌 *Nova Tarefa Atribuída a Você*\n\nOlá *{colaborador}*, *{criador}* delegou uma nova tarefa no sistema:\n\n• *Tarefa:* {tarefa}\n• *Prioridade:* {prioridade}\n• *Prazo:* {prazo}\n• *Detalhes:* {descricao}\n\nAcesse o painel para iniciar o atendimento.',
    totalSentCount: 0
  },
  {
    id: 'rule-task-status',
    name: 'Notificação de Mudança de Status da Tarefa',
    description: 'Quando o colaborador altera o status da tarefa, o administrador ou criador recebe atualização imediata no WhatsApp.',
    category: 'tasks',
    trigger: 'task_status_changed',
    enabled: true,
    recipientTarget: 'admin_or_creator',
    conditionStatus: ['Em Andamento', 'Revisão', 'Concluída', 'Pendente'],
    template:
      '🔄 *Atualização de Status de Tarefa*\n\nO colaborador *{colaborador}* atualizou uma tarefa:\n\n• *Tarefa:* {tarefa}\n• *Novo Status:* {status}\n• *Progresso:* {progresso}%\n• *Horário:* {horario}',
    totalSentCount: 0
  },
  {
    id: 'rule-driver-daily-schedule',
    name: 'Roteiro Diário de Entregas para Motorista',
    description: 'Envia automaticamente em horário pré-definido a lista de entregas agendadas do dia para cada motorista escalado.',
    category: 'deliveries',
    trigger: 'driver_daily_schedule',
    enabled: true,
    recipientTarget: 'assigned_driver',
    scheduleTime: '07:30',
    template:
      '🚚 *Roteiro de Entregas do Dia ({data})*\n\nBom dia, *{motorista}*! Você possui *{total_entregas} entrega(s)* programada(s) para hoje no veículo *{veiculo}*:\n\n{lista_entregas}\n\nBom trabalho e dirija com segurança! A cada entrega concluída, dê baixa pelo aplicativo.',
    totalSentCount: 0
  },
  {
    id: 'rule-delivery-finalized-admin',
    name: 'Aviso de Entrega Finalizada ao Administrador',
    description: 'A cada entrega finalizada ou atualizada pelo motorista no app, o administrador recebe confirmação instantânea.',
    category: 'deliveries',
    trigger: 'delivery_finalized',
    enabled: true,
    recipientTarget: 'admin_or_creator',
    conditionStatus: ['Finalizada', 'Em Andamento'],
    template:
      '✅ *Status de Entrega Atualizado*\n\n• *Motorista:* {motorista} ({veiculo})\n• *Status:* {status}\n• *Produto/Pedido:* {produto}\n• *Destino:* {endereco} - {bairro}/{cidade}\n• *Vendedor:* {vendedor}\n• *Horário da Baixa:* {horario}',
    totalSentCount: 0
  },
  {
    id: 'rule-driver-unfinalized-reminder',
    name: 'Lembrete de Entrega Pendente (Esquecimento de Baixa)',
    description: 'Se o motorista esquecer de finalizar alguma entrega do dia até o horário limite, envia lembrete automático cobrando a baixa.',
    category: 'deliveries',
    trigger: 'driver_unfinalized_reminder',
    enabled: true,
    recipientTarget: 'assigned_driver',
    scheduleTime: '17:30',
    template:
      '⏰ *Lembrete de Baixa de Entrega Pendente*\n\nOlá *{motorista}*, identificamos que você ainda possui *{quantidade_pendente} entrega(s)* agendada(s) para hoje sem baixa no sistema:\n\n{lista_entregas}\n\nCaso já tenha realizado a entrega, por favor acesse o aplicativo agora e marque como *Finalizada*.',
    totalSentCount: 0
  },
  {
    id: 'rule-client-delivery-enroute',
    name: 'Aviso ao Cliente: Pedido Saiu para Entrega',
    description: 'Sugestão: Quando o motorista inicia a rota ("Em Andamento"), avisa automaticamente o cliente no WhatsApp que a entrega está a caminho.',
    category: 'clients',
    trigger: 'delivery_out_for_client',
    enabled: true,
    recipientTarget: 'delivery_client',
    isSuggested: true,
    template:
      '📦 *Seu Pedido Saiu para Entrega!*\n\nOlá! Informamos que seu pedido (*{produto}*) já está em rota de entrega com nosso motorista *{motorista}* ({veiculo}).\n\n• *Endereço de destino:* {endereco}, {bairro}\n• *Turno previsto:* {turno}\n\nPor favor, mantenha alguém no local para o recebimento.',
    totalSentCount: 0
  },
  {
    id: 'rule-task-overdue-alert',
    name: 'Cobrança Automática de Tarefa Atrasada / Vencendo Hoje',
    description: 'Sugestão: Envia alerta matinal ao colaborador responsável quando uma tarefa estiver atrasada ou vencendo no dia.',
    category: 'tasks',
    trigger: 'task_overdue_reminder',
    enabled: true,
    recipientTarget: 'assigned_collaborator',
    scheduleTime: '08:30',
    isSuggested: true,
    template:
      '⚠️ *Atenção: Prazo de Tarefa*\n\nOlá *{colaborador}*, a tarefa *" {tarefa} "* (Prioridade: {prioridade}) possui vencimento em *{prazo}* e consta com status *{status}*.\n\nPor favor, atualize o andamento no sistema ou conclua a atividade.',
    totalSentCount: 0
  },
  {
    id: 'rule-demand-material-created',
    name: 'Alerta de Nova Demanda / Pedido de Material',
    description: 'Sugestão: Notifica o administrador/compras assim que um colaborador registrar falta de material ou demanda de estoque.',
    category: 'demands',
    trigger: 'demand_created',
    enabled: true,
    recipientTarget: 'admin_or_creator',
    isSuggested: true,
    template:
      '📋 *Nova Demanda de {categoria}*\n\n• *Solicitante:* {colaborador}\n• *Horário:* {horario}\n• *Descrição / Itens:*\n{descricao}',
    totalSentCount: 0
  },
  {
    id: 'rule-executive-daily-summary',
    name: 'Resumo Executivo Diário para Diretoria (Fechamento)',
    description: 'Sugestão: Envia no fim do expediente um boletim executivo ao Administrador com o balanço de entregas e tarefas do dia.',
    category: 'management',
    trigger: 'daily_executive_summary',
    enabled: false,
    recipientTarget: 'admin_or_creator',
    scheduleTime: '18:15',
    isSuggested: true,
    template:
      '📊 *Boletim Diário de Operações ({data})*\n\nResumo consolidado do dia:\n• *Entregas Concluídas:* {entregas_concluidas}\n• *Entregas Pendentes:* {quantidade_pendente}\n• *Tarefas Concluídas Hoje:* {tarefas_concluidas}\n• *Tarefas em Aberto:* {tarefas_pendentes}\n\nPainel atualizado em tempo real.',
    totalSentCount: 0
  }
];

export const TRIGGER_METADATA: Record<
  AutomationTriggerType,
  {
    label: string;
    category: AutomationCategory;
    defaultRecipient: RecipientTarget;
    availableVariables: string[];
    hasSchedule?: boolean;
  }
> = {
  task_created: {
    label: 'Quando uma nova tarefa é criada',
    category: 'tasks',
    defaultRecipient: 'assigned_collaborator',
    availableVariables: ['{colaborador}', '{criador}', '{tarefa}', '{prioridade}', '{prazo}', '{descricao}', '{horario}']
  },
  task_status_changed: {
    label: 'Quando o status da tarefa é alterado',
    category: 'tasks',
    defaultRecipient: 'admin_or_creator',
    availableVariables: ['{colaborador}', '{tarefa}', '{status}', '{progresso}', '{prioridade}', '{horario}']
  },
  task_overdue_reminder: {
    label: 'Quando tarefa estiver atrasada ou vencendo no dia',
    category: 'tasks',
    defaultRecipient: 'assigned_collaborator',
    availableVariables: ['{colaborador}', '{tarefa}', '{prioridade}', '{prazo}', '{status}'],
    hasSchedule: true
  },
  driver_daily_schedule: {
    label: 'Horário pré-definido: Roteiro diário de entregas do motorista',
    category: 'deliveries',
    defaultRecipient: 'assigned_driver',
    availableVariables: ['{motorista}', '{veiculo}', '{data}', '{total_entregas}', '{lista_entregas}'],
    hasSchedule: true
  },
  delivery_finalized: {
    label: 'Quando o motorista finalizar ou atualizar entrega',
    category: 'deliveries',
    defaultRecipient: 'admin_or_creator',
    availableVariables: ['{motorista}', '{veiculo}', '{status}', '{produto}', '{endereco}', '{bairro}', '{cidade}', '{vendedor}', '{horario}']
  },
  driver_unfinalized_reminder: {
    label: 'Lembrete automático: Motorista esqueceu de finalizar entrega',
    category: 'deliveries',
    defaultRecipient: 'assigned_driver',
    availableVariables: ['{motorista}', '{quantidade_pendente}', '{lista_entregas}', '{horario}'],
    hasSchedule: true
  },
  delivery_out_for_client: {
    label: 'Quando entrega iniciar rota (Avisar Cliente)',
    category: 'clients',
    defaultRecipient: 'delivery_client',
    availableVariables: ['{produto}', '{motorista}', '{veiculo}', '{endereco}', '{bairro}', '{cidade}', '{turno}']
  },
  demand_created: {
    label: 'Quando colaborador abre Demanda / Pedido de Material',
    category: 'demands',
    defaultRecipient: 'admin_or_creator',
    availableVariables: ['{colaborador}', '{categoria}', '{descricao}', '{horario}']
  },
  special_delivery_alert: {
    label: 'Quando uma Entrega Especial for agendada',
    category: 'deliveries',
    defaultRecipient: 'custom_number',
    availableVariables: ['{data}', '{turno}', '{motorista}', '{veiculo}', '{produto}', '{endereco}']
  },
  daily_executive_summary: {
    label: 'Horário pré-definido: Resumo Diário para Diretoria',
    category: 'management',
    defaultRecipient: 'admin_or_creator',
    availableVariables: ['{data}', '{entregas_concluidas}', '{quantidade_pendente}', '{tarefas_concluidas}', '{tarefas_pendentes}'],
    hasSchedule: true
  }
};

export function getAutomationRules(): WhatsAppAutomationRule[] {
  if (typeof window === 'undefined') return DEFAULT_AUTOMATION_RULES;
  try {
    const raw = localStorage.getItem(RULES_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(DEFAULT_AUTOMATION_RULES));
      return DEFAULT_AUTOMATION_RULES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch (e) {
    console.warn('Error loading WhatsApp automation rules:', e);
  }
  return DEFAULT_AUTOMATION_RULES;
}

export function saveAutomationRules(rules: WhatsAppAutomationRule[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(rules));
    window.dispatchEvent(new Event('whatsapp-automation-updated'));
  } catch (e) {
    console.warn('Error saving WhatsApp automation rules:', e);
  }
}

export function getAutomationLogs(): WhatsAppAutomationLog[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOGS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveAutomationLog(log: WhatsAppAutomationLog): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getAutomationLogs();
    const updated = [log, ...current].slice(0, 100);
    localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('whatsapp-automation-updated'));
  } catch (e) {
    console.warn('Error saving WhatsApp automation log:', e);
  }
}

export function clearAutomationLogs(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(LOGS_STORAGE_KEY);
  window.dispatchEvent(new Event('whatsapp-automation-updated'));
}

export function getDirectoryConfig(): AutomationDirectoryConfig {
  if (typeof window === 'undefined') return DEFAULT_DIRECTORY_CONFIG;
  try {
    const raw = localStorage.getItem(DIRECTORY_STORAGE_KEY);
    if (!raw) return DEFAULT_DIRECTORY_CONFIG;
    const parsed = JSON.parse(raw);

    // Strip any old fictional placeholder phones from earlier sessions so only real phones remain
    const cleanedCollab: Record<string, string> = {};
    if (parsed?.collaboratorPhones && typeof parsed.collaboratorPhones === 'object') {
      Object.entries(parsed.collaboratorPhones).forEach(([k, v]) => {
        const phoneStr = normalizeBrazilPhone(String(v || ''));
        if (phoneStr && !isPlaceholderPhone(phoneStr)) {
          cleanedCollab[k] = phoneStr;
        }
      });
    }

    const rawAdmin = normalizeBrazilPhone(parsed?.adminPhone || '');
    const rawGroup = normalizeBrazilPhone(parsed?.logisticsGroupPhone || '');

    return {
      adminName: parsed?.adminName || DEFAULT_DIRECTORY_CONFIG.adminName,
      adminPhone: isPlaceholderPhone(rawAdmin) ? '' : rawAdmin,
      logisticsGroupPhone: isPlaceholderPhone(rawGroup) ? '' : rawGroup,
      collaboratorPhones: cleanedCollab
    };
  } catch {
    return DEFAULT_DIRECTORY_CONFIG;
  }
}

export function saveDirectoryConfig(config: AutomationDirectoryConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DIRECTORY_STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(new Event('whatsapp-automation-updated'));
  } catch (e) {
    console.warn('Error saving directory config:', e);
  }
}

const DEMO_PLACEHOLDER_PHONES = new Set([
  '5583999990001',
  '5583999990002',
  '5511999999999',
  '5583988881001',
  '5583988881002',
  '5583988881003',
  '5583988881004',
  '5583988881005',
  '5583988881006',
  '5583988881007',
  '5511888888888',
  '5511777777777',
  '5511965432100'
]);

export function normalizeBrazilPhone(raw?: string): string {
  const digits = String(raw || '').replace(/\D/g, '');
  if ((digits.length === 10 || digits.length === 11) && !digits.startsWith('55')) {
    return `55${digits}`;
  }
  return digits;
}

export function isPlaceholderPhone(phone?: string): boolean {
  const clean = normalizeBrazilPhone(phone);
  return !clean || DEMO_PLACEHOLDER_PHONES.has(clean);
}

export function resolveRecipientPhone(
  target: RecipientTarget,
  payload: Record<string, any>,
  customPhone?: string
): { name: string; phone: string } {
  const dir = getDirectoryConfig();
  const normalizedAdminPhone = normalizeBrazilPhone(dir.adminPhone);
  const hasRealAdminPhone = !isPlaceholderPhone(normalizedAdminPhone);

  if (target === 'custom_number' && customPhone) {
    const cleanCustom = normalizeBrazilPhone(customPhone);
    return {
      name: payload.recipientName || 'Destinatário Configurado',
      phone: isPlaceholderPhone(cleanCustom) && hasRealAdminPhone ? normalizedAdminPhone : cleanCustom
    };
  }

  if (target === 'admin_or_creator') {
    const creatorName = payload.criador || dir.adminName;
    const creatorPhone = normalizeBrazilPhone(payload.creatorPhone || normalizedAdminPhone);
    return { name: creatorName, phone: creatorPhone };
  }

  if (target === 'assigned_collaborator') {
    const collabName = String(payload.colaborador || 'Colaborador');
    const explicitPhone = payload.collaboratorPhone || payload.phone;
    const mappedRaw =
      explicitPhone ||
      dir.collaboratorPhones[collabName.toLowerCase()] ||
      dir.collaboratorPhones[collabName.split(' ')[0].toLowerCase()];
    const mappedPhone = normalizeBrazilPhone(mappedRaw);

    const finalPhone =
      !mappedPhone || (isPlaceholderPhone(mappedPhone) && hasRealAdminPhone)
        ? normalizedAdminPhone
        : mappedPhone;

    return { name: collabName, phone: finalPhone };
  }

  if (target === 'assigned_driver') {
    const driverName = String(payload.motorista || 'Motorista');
    const explicitPhone = payload.driverPhone || payload.phone;
    const mappedRaw =
      explicitPhone ||
      dir.collaboratorPhones[driverName.toLowerCase()] ||
      dir.collaboratorPhones[driverName.split(' ')[0].toLowerCase()];
    const mappedPhone = normalizeBrazilPhone(mappedRaw);

    const finalPhone =
      !mappedPhone || (isPlaceholderPhone(mappedPhone) && hasRealAdminPhone)
        ? normalizedAdminPhone
        : mappedPhone;

    return { name: driverName, phone: finalPhone };
  }

  if (target === 'delivery_client') {
    const clientPhone = normalizeBrazilPhone(payload.cliente_telefone || payload.phone || '');
    return {
      name: payload.cliente || `Cliente (${payload.bairro || 'Entrega'})`,
      phone: clientPhone.length >= 12 ? clientPhone : normalizedAdminPhone
    };
  }

  return { name: dir.adminName, phone: normalizedAdminPhone };
}

export function interpolateTemplate(template: string, variables: Record<string, any>): string {
  const nowStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const todayStr = new Date().toLocaleDateString('pt-BR');

  const merged: Record<string, string> = {
    horario: nowStr,
    data: todayStr,
    colaborador: 'Colaborador',
    criador: 'Administração',
    tarefa: 'Tarefa Operacional',
    status: 'Em Andamento',
    prioridade: 'Alta',
    prazo: todayStr,
    progresso: '0',
    descricao: 'Sem observações adicionais',
    motorista: 'Motorista da Frota',
    veiculo: 'Veículo Padrão',
    endereco: 'Endereço cadastrado',
    bairro: 'Centro',
    cidade: 'João Pessoa',
    produto: 'Mercadoria',
    vendedor: 'Equipe Comercial',
    turno: 'Comercial',
    total_entregas: '1',
    quantidade_pendente: '1',
    lista_entregas: '• 1x Entrega programada',
    categoria: 'Geral',
    entregas_concluidas: '0',
    tarefas_concluidas: '0',
    tarefas_pendentes: '0',
  };

  Object.entries(variables).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v).trim() !== '') {
      merged[k] = String(v);
    }
  });

  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => {
    return merged[key] !== undefined ? merged[key] : match;
  });
}

export function getWhatsAppTrafficEvents(): WhatsAppTrafficEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(TRAFFIC_EVENTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((ev: WhatsAppTrafficEvent) => !isPlaceholderPhone(ev.recipientPhone))
      : [];
  } catch {
    return [];
  }
}

export function recordWhatsAppTrafficEvent(
  event: Omit<WhatsAppTrafficEvent, 'id' | 'createdAt' | 'timeLabel'>
): WhatsAppTrafficEvent | null {
  if (typeof window === 'undefined') return null;
  const cleanPhone = normalizeBrazilPhone(event.recipientPhone);
  if (!cleanPhone || isPlaceholderPhone(cleanPhone)) return null;

  try {
    const now = new Date();
    const newEvent: WhatsAppTrafficEvent = {
      ...event,
      recipientPhone: cleanPhone,
      id: `traffic-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: now.toISOString(),
      timeLabel: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };
    const current = getWhatsAppTrafficEvents();
    const updated = [newEvent, ...current].slice(0, 500);
    localStorage.setItem(TRAFFIC_EVENTS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('whatsapp-traffic-updated'));
    return newEvent;
  } catch {
    return null;
  }
}

export function recordMessageInWhatsAppFeed(
  recipientName: string,
  recipientPhone: string,
  text: string,
  status: 'sent' | 'delivered' | 'read' | 'failed' = 'sent'
) {
  if (typeof window === 'undefined') return;
  const cleanPhone = normalizeBrazilPhone(recipientPhone);
  if (!cleanPhone || isPlaceholderPhone(cleanPhone)) return;

  try {
    const raw = localStorage.getItem(CHATS_INBOX_SYNC_KEY);
    const list = raw ? JSON.parse(raw) : [];
    list.unshift({
      id: 'auto-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      recipientName,
      recipientPhone: cleanPhone,
      text,
      status,
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      createdAt: new Date().toISOString()
    });
    localStorage.setItem(CHATS_INBOX_SYNC_KEY, JSON.stringify(list.slice(0, 100)));
    window.dispatchEvent(new Event('whatsapp-automation-message-sent'));
  } catch {}
}

export function getAutomatedInboxMessages(): Array<{
  id: string;
  recipientName: string;
  recipientPhone: string;
  text: string;
  status?: 'sent' | 'delivered' | 'read' | 'failed';
  time: string;
  createdAt: string;
}> {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CHATS_INBOX_SYNC_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list)
      ? list.filter(item => !isPlaceholderPhone(item.recipientPhone))
      : [];
  } catch {
    return [];
  }
}

export async function triggerWhatsAppAutomation(
  trigger: AutomationTriggerType,
  variables: Record<string, any>,
  options?: {
    forceRuleId?: string;
    forceRecipientPhone?: string;
    forceRecipientName?: string;
  }
): Promise<{ triggeredCount: number; logs: WhatsAppAutomationLog[]; lastError?: string }> {
  const rules = getAutomationRules();
  const matchingRules = rules.filter(r => {
    if (options?.forceRuleId) return r.id === options.forceRuleId;
    if (!r.enabled || r.trigger !== trigger) return false;
    if (r.conditionStatus && r.conditionStatus.length > 0 && variables.status) {
      return r.conditionStatus.some(s => s.toLowerCase() === String(variables.status).toLowerCase());
    }
    return true;
  });

  if (matchingRules.length === 0) {
    return { triggeredCount: 0, logs: [] };
  }

  const providerMode = (typeof window !== 'undefined' && localStorage.getItem('whatsapp_provider_mode')) || 'alternative';
  const altServerUrl = (typeof window !== 'undefined' && localStorage.getItem('whatsapp_alt_server_url')) || 'https://api.w-api.app';
  const altApiKey = (typeof window !== 'undefined' && localStorage.getItem('whatsapp_alt_api_key')) || '';
  const altInstance = (typeof window !== 'undefined' && localStorage.getItem('whatsapp_alt_instance')) || '';

  const createdLogs: WhatsAppAutomationLog[] = [];
  const now = new Date();
  const nowFormatted = `Hoje, ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  let lastError: string | undefined;

  for (const rule of matchingRules) {
    const resolved = resolveRecipientPhone(
      rule.recipientTarget,
      variables,
      rule.customPhone
    );

    const recipientName = options?.forceRecipientName || resolved.name;
    const recipientPhone = normalizeBrazilPhone(options?.forceRecipientPhone || resolved.phone);

    if (!recipientPhone || isPlaceholderPhone(recipientPhone)) {
      lastError = 'Nenhum número real de destino cadastrado para este envio.';
      continue;
    }

    const finalMessage = interpolateTemplate(rule.template, {
      ...variables,
      colaborador: variables.colaborador || recipientName,
      motorista: variables.motorista || recipientName
    });

    let sendStatus: 'sent' | 'simulated' | 'failed' = 'failed';

    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipientPhone,
          message: finalMessage,
          providerMode,
          altServerUrl,
          altApiKey,
          altInstance
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success && !data.simulated) {
        sendStatus = 'sent';
      } else if (data.simulated) {
        sendStatus = 'simulated';
        if (data.error) lastError = data.error;
      } else {
        sendStatus = 'failed';
        lastError = data.error || 'Falha ao enviar pela W-API';
      }
    } catch (err: any) {
      sendStatus = 'failed';
      lastError = err?.message || 'Erro de conexão ao disparar WhatsApp';
    }

    const logEntry: WhatsAppAutomationLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ruleId: rule.id,
      ruleName: rule.name,
      trigger: rule.trigger,
      recipientName,
      recipientPhone,
      message: finalMessage,
      timestamp: nowFormatted,
      createdAt: now.toISOString(),
      category: rule.category,
      status: sendStatus
    };

    saveAutomationLog(logEntry);
    if (sendStatus === 'sent') {
      recordMessageInWhatsAppFeed(recipientName, recipientPhone, finalMessage, 'sent');
    }
    recordWhatsAppTrafficEvent({
      direction: 'outbound',
      mode: 'auto',
      status: sendStatus === 'sent' ? 'sent' : 'failed',
      recipientName,
      recipientPhone,
      text: finalMessage,
      category: rule.category,
      ruleName: rule.name
    });
    createdLogs.push(logEntry);
  }

  // Update counters on rules only when actually sent
  if (createdLogs.some(l => l.status === 'sent')) {
    const updatedRules = rules.map(r => {
      const wasSent = createdLogs.some(l => l.ruleId === r.id && l.status === 'sent');
      if (!wasSent) return r;
      return {
        ...r,
        totalSentCount: (r.totalSentCount || 0) + 1,
        lastTriggeredAt: nowFormatted
      };
    });
    saveAutomationRules(updatedRules);
  }

  return { triggeredCount: createdLogs.length, logs: createdLogs, lastError };
}
