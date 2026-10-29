export type BuiltInAutomationTriggerType =
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

export type AutomationTriggerType = BuiltInAutomationTriggerType | (string & {});

export type TriggerFiringMode =
  | 'system_event'
  | 'scheduled_time'
  | 'status_change'
  | 'delay_after_event';

export interface WhatsAppCustomTrigger {
  id: string;
  label: string;
  systemActionKey?: string;
  actionDescription?: string;
  category: AutomationCategory;
  defaultRecipient: RecipientTarget;
  availableVariables: string[];
  hasSchedule?: boolean;
  defaultScheduleTime?: string;
  firingMode?: TriggerFiringMode;
  conditionStatusValue?: string;
  delayMinutes?: number;
  isCustom?: boolean;
  createdAt?: string;
}

export interface SystemActionOption {
  actionKey: string;
  actionLabel: string;
  category: AutomationCategory;
  defaultRecipient: RecipientTarget;
  defaultFiringMode: TriggerFiringMode;
  defaultVariables: string[];
}

export interface SidebarModuleOption {
  key: AutomationCategory;
  label: string;
  section: 'Principal' | 'Comunicação & CRM' | 'Operações' | 'Resultados' | 'Administração';
  href: string;
}

export const SIDEBAR_MODULE_OPTIONS: SidebarModuleOption[] = [
  // Principal
  { key: 'home', label: 'Início', section: 'Principal', href: '/' },
  { key: 'products', label: 'Catálogo de Peças', section: 'Principal', href: '/products' },
  { key: 'split_table', label: 'Tabela de Split', section: 'Principal', href: '/tabela-split' },
  { key: 'loyalty', label: 'Clientes Fidelidade', section: 'Principal', href: '/clientes-fidelidade' },
  { key: 'tasks', label: 'Tarefas', section: 'Principal', href: '/tasks' },
  { key: 'demands', label: 'Demandas', section: 'Principal', href: '/demands' },
  { key: 'routes', label: 'Rotas & GPS', section: 'Principal', href: '/routes' },

  // Comunicação & CRM
  { key: 'whatsapp', label: 'WhatsApp', section: 'Comunicação & CRM', href: '/whatsapp' },
  { key: 'leads', label: 'Leads', section: 'Comunicação & CRM', href: '/leads' },
  { key: 'social_media', label: 'Site', section: 'Comunicação & CRM', href: '/social-media' },

  // Operações
  { key: 'deliveries', label: 'Entregas', section: 'Operações', href: '/deliveries' },
  { key: 'shipping_calculator', label: 'Cálculo de Frete', section: 'Operações', href: '/shipping-calculator' },
  { key: 'truck_history', label: 'Caminhão Reposição', section: 'Operações', href: '/reports/truck-history' },
  { key: 'transfers', label: 'Transferências', section: 'Operações', href: '/transfers' },
  { key: 'warranties', label: 'Garantias', section: 'Operações', href: '/warranties' },
  { key: 'assistances', label: 'Assistência Técnica', section: 'Operações', href: '/warranties/assistances' },
  { key: 'price_research', label: 'Pesquisa Concorrentes', section: 'Operações', href: '/price-research' },
  { key: 'mercado_livre', label: 'Pesquisa Mercado Livre', section: 'Operações', href: '/mercado-livre' },

  // Resultados
  { key: 'sales', label: 'Vendas', section: 'Resultados', href: '/sales-results' },
  { key: 'reports', label: 'Relatórios', section: 'Resultados', href: '/reports' },

  // Administração
  { key: 'live_panel', label: 'Painel Ao Vivo (GPS)', section: 'Administração', href: '/painel-ao-vivo' },
  { key: 'collaborators', label: 'Equipe', section: 'Administração', href: '/collaborators' },
  { key: 'commissions', label: 'Comissionados', section: 'Administração', href: '/admin/commissions' },
  { key: 'settings', label: 'Configurações', section: 'Administração', href: '/admin/settings' },
  { key: 'adriano_commissions', label: 'Comissões Adriano', section: 'Administração', href: '/admin/comissoes-adriano' }
];

export const SYSTEM_ACTION_CATALOG: SystemActionOption[] = [
  // Comunicação & CRM -> Leads
  {
    actionKey: 'lead_created',
    actionLabel: 'Leads: Captar / pesquisar ou cadastrar novo Lead na prospecção',
    category: 'leads',
    defaultRecipient: 'assigned_collaborator',
    defaultFiringMode: 'system_event',
    defaultVariables: ['{cliente}', '{bairro}', '{cidade}', '{vendedor}', '{horario}', '{data}']
  },
  {
    actionKey: 'lead_distributed',
    actionLabel: 'Leads: Distribuir / atribuir Lead para vendedor',
    category: 'leads',
    defaultRecipient: 'assigned_collaborator',
    defaultFiringMode: 'system_event',
    defaultVariables: ['{vendedor}', '{cliente}', '{bairro}', '{cidade}', '{endereco}', '{horario}', '{data}']
  },
  {
    actionKey: 'lead_status_changed',
    actionLabel: 'Leads: Alterar status do Lead no funil (Novo, Em Contato, Qualificado, Convertido)',
    category: 'leads',
    defaultRecipient: 'assigned_collaborator',
    defaultFiringMode: 'status_change',
    defaultVariables: ['{cliente}', '{status}', '{vendedor}', '{bairro}', '{cidade}', '{horario}', '{data}']
  },
  {
    actionKey: 'lead_converted_loyalty',
    actionLabel: 'Leads: Converter Lead em Cliente Fidelidade',
    category: 'leads',
    defaultRecipient: 'admin_or_creator',
    defaultFiringMode: 'system_event',
    defaultVariables: ['{cliente}', '{vendedor}', '{cidade}', '{valor}', '{horario}', '{data}']
  },
  {
    actionKey: 'lead_imported_sheet',
    actionLabel: 'Leads: Importar planilha / lista de novos Leads',
    category: 'leads',
    defaultRecipient: 'admin_or_creator',
    defaultFiringMode: 'system_event',
    defaultVariables: ['{colaborador}', '{cidade}', '{horario}', '{data}']
  },

  // Comunicação & CRM -> WhatsApp & Site
  {
    actionKey: 'whatsapp_message_received',
    actionLabel: 'WhatsApp: Receber nova mensagem ou resposta de cliente',
    category: 'whatsapp',
    defaultRecipient: 'assigned_collaborator',
    defaultFiringMode: 'system_event',
    defaultVariables: ['{cliente}', '{descricao}', '{horario}', '{data}']
  },
  {
    actionKey: 'whatsapp_campaign_dispatched',
    actionLabel: 'WhatsApp: Iniciar ou concluir disparo de Campanha / Promoção',
    category: 'whatsapp',
    defaultRecipient: 'admin_or_creator',
    defaultFiringMode: 'system_event',
    defaultVariables: ['{produto}', '{status}', '{horario}', '{data}']
  },
  {
    actionKey: 'site_order_or_post_created',
    actionLabel: 'Site: Publicar oferta, banner ou receber contato pelo Site',
    category: 'social_media',
    defaultRecipient: 'admin_or_creator',
    defaultFiringMode: 'system_event',
    defaultVariables: ['{produto}', '{valor}', '{cliente}', '{horario}', '{data}']
  },

  // Principal -> Início, Catálogo de Peças, Tabela de Split, Clientes Fidelidade, Tarefas, Demandas, Rotas & GPS
  {
    actionKey: 'home_alert_generated',
    actionLabel: 'Início: Novo aviso ou indicador crítico no Painel Inicial',
    category: 'home',
    defaultRecipient: 'admin_or_creator',
    defaultFiringMode: 'system_event',
    defaultVariables: ['{colaborador}', '{status}', '{descricao}', '{horario}', '{data}']
  },
  {
    actionKey: 'product_created_or_updated',
    actionLabel: 'Catálogo de Peças: Cadastrar novo item ou atualizar preço/estoque',
    category: 'products',
    defaultRecipient: 'admin_or_creator',
    defaultFiringMode: 'system_event',
    defaultVariables: ['{produto}', '{categoria}', '{valor}', '{status}', '{horario}', '{data}']
  },
  {
    actionKey: 'stock_critical_alert',
    actionLabel: 'Catálogo de Peças: Produto atingir estoque mínimo / ruptura',
    category: 'products',
    defaultRecipient: 'admin_or_creator',
    defaultFiringMode: 'system_event',
    defaultVariables: ['{produto}', '{categoria}', '{status}', '{horario}', '{data}']
  },
  {
    actionKey: 'split_calculated',
    actionLabel: 'Tabela de Split: Cadastrar, alterar ou consultar item na Tabela de Split',
    category: 'split_table',
    defaultRecipient: 'admin_or_creator',
    defaultFiringMode: 'system_event',
    defaultVariables: ['{produto}', '{categoria}', '{valor}', '{data}', '{horario}']
  },
  {
    actionKey: 'client_registered',
    actionLabel: 'Clientes Fidelidade: Cadastrar novo cliente ou registrar compra no Clube',
    category: 'loyalty',
    defaultRecipient: 'delivery_client',
    defaultFiringMode: 'system_event',
    defaultVariables: ['{cliente}', '{cidade}', '{vendedor}', '{valor}', '{data}']
  },
  {
    actionKey: 'loyalty_reward_reached',
    actionLabel: 'Clientes Fidelidade: Cliente atingir meta ou resgatar prêmio',
    category: 'loyalty',
    defaultRecipient: 'delivery_client',
    defaultFiringMode: 'system_event',
    defaultVariables: ['{cliente}', '{produto}', '{valor}', '{status}', '{data}']
  },
  {
    actionKey: 'task_created',
    actionLabel: 'Tarefas: Criar nova tarefa para colaborador',
    category: 'tasks',
    defaultRecipient: 'assigned_collaborator',
    defaultFiringMode: 'system_event',
    defaultVariables: ['{colaborador}', '{criador}', '{tarefa}', '{prioridade}', '{prazo}', '{descricao}', '{horario}']
  },
  {
    actionKey: 'task_status_changed',
    actionLabel: 'Tarefas: Alterar status ou progresso de tarefa',
    category: 'tasks',
    defaultRecipient: 'admin_or_creator',
    defaultFiringMode: 'status_change',
    defaultVariables: ['{colaborador}', '{tarefa}', '{status}', '{progresso}', '{prioridade}', '{horario}']
  },
  {
    actionKey: 'task_completed',
    actionLabel: 'Tarefas: Concluir / finalizar tarefa',
    category: 'tasks',
    defaultRecipient: 'admin_or_creator',
    defaultFiringMode: 'status_change',
    defaultVariables: ['{colaborador}', '{tarefa}', '{status}', '{horario}', '{data}']
  },
  {
    actionKey: 'task_overdue_reminder',
    actionLabel: 'Tarefas: Tarefa atrasada ou vencendo no dia',
    category: 'tasks',
    defaultRecipient: 'assigned_collaborator',
    defaultFiringMode: 'scheduled_time',
    defaultVariables: ['{colaborador}', '{tarefa}', '{prioridade}', '{prazo}', '{status}']
  },
  {
    actionKey: 'demand_created',
    actionLabel: 'Demandas: Abrir nova demanda ou pedido de material / compra',
    category: 'demands',
    defaultRecipient: 'admin_or_creator',
    defaultFiringMode: 'system_event',
    defaultVariables: ['{colaborador}', '{categoria}', '{descricao}', '{horario}']
  },
  {
    actionKey: 'demand_status_changed',
    actionLabel: 'Demandas: Atualizar status ou aprovar demanda de material',
    category: 'demands',
    defaultRecipient: 'assigned_collaborator',
    defaultFiringMode: 'status_change',
    defaultVariables: ['{colaborador}', '{categoria}', '{status}', '{descricao}', '{horario}']
  },
  {
    actionKey: 'route_gps_updated',
    actionLabel: 'Rotas & GPS: Iniciar rota, desvio ou atualizar rastreamento GPS',
    category: 'routes',
    defaultRecipient: 'assigned_driver',
    defaultFiringMode: 'system_event',
    defaultVariables: ['{motorista}', '{veiculo}', '{endereco}', '{bairro}', '{cidade}', '{horario}']
  },

  // Operações -> Entregas, Cálculo de Frete, Caminhão Reposição, Transferências, Garantias, Assistência Técnica, Pesquisa Concorrentes, Pesquisa Mercado Livre
  {
    actionKey: 'delivery_scheduled',
    actionLabel: 'Entregas: Agendar nova entrega no romaneio',
    category: 'deliveries',
    defaultRecipient: 'assigned_driver',
    defaultFiringMode: 'system_event',
    defaultVariables: ['{motorista}', '{veiculo}', '{produto}', '{endereco}', '{bairro}', '{cidade}', '{turno}', '{data}']
  },
  {
    actionKey: 'delivery_out_for_client',
    actionLabel: 'Entregas: Motorista iniciar rota de entrega (Avisar Cliente)',
    category: 'deliveries',
    defaultRecipient: 'delivery_client',
    defaultFiringMode: 'status_change',
    defaultVariables: ['{cliente}', '{produto}', '{motorista}', '{veiculo}', '{endereco}', '{bairro}', '{cidade}', '{turno}']
  },
  {
    actionKey: 'delivery_finalized',
    actionLabel: 'Entregas: Finalizar ou dar baixa em entrega',
    category: 'deliveries',
    defaultRecipient: 'admin_or_creator',
    defaultFiringMode: 'status_change',
    defaultVariables: ['{motorista}', '{veiculo}', '{status}', '{produto}', '{endereco}', '{bairro}', '{cidade}', '{vendedor}', '{horario}']
  },
  {
    actionKey: 'special_delivery_alert',
    actionLabel: 'Entregas: Reservar Entrega ou Retirada Especial',
    category: 'deliveries',
    defaultRecipient: 'custom_number',
    defaultFiringMode: 'system_event',
    defaultVariables: ['{data}', '{turno}', '{motorista}', '{veiculo}', '{produto}', '{endereco}']
  },
  {
    actionKey: 'driver_daily_schedule',
    actionLabel: 'Entregas: Disparo de roteiro diário de entregas do motorista',
    category: 'deliveries',
    defaultRecipient: 'assigned_driver',
    defaultFiringMode: 'scheduled_time',
    defaultVariables: ['{motorista}', '{veiculo}', '{data}', '{total_entregas}', '{lista_entregas}']
  },
  {
    actionKey: 'driver_unfinalized_reminder',
    actionLabel: 'Entregas: Entrega pendente sem baixa no fim do expediente',
    category: 'deliveries',
    defaultRecipient: 'assigned_driver',
    defaultFiringMode: 'scheduled_time',
    defaultVariables: ['{motorista}', '{quantidade_pendente}', '{lista_entregas}', '{horario}']
  },
  {
    actionKey: 'shipping_quote_calculated',
    actionLabel: 'Cálculo de Frete: Gerar cotação ou simulação de frete para entrega',
    category: 'shipping_calculator',
    defaultRecipient: 'assigned_collaborator',
    defaultFiringMode: 'system_event',
    defaultVariables: ['{cliente}', '{endereco}', '{bairro}', '{cidade}', '{valor}', '{veiculo}', '{horario}']
  },
  {
    actionKey: 'truck_replenishment_logged',
    actionLabel: 'Caminhão Reposição: Registrar saída, chegada ou conferência do caminhão',
    category: 'truck_history',
    defaultRecipient: 'admin_or_creator',
    defaultFiringMode: 'system_event',
    defaultVariables: ['{motorista}', '{veiculo}', '{produto}', '{status}', '{data}', '{horario}']
  },
  {
    actionKey: 'transfer_created_or_received',
    actionLabel: 'Transferências: Solicitar, enviar ou confirmar transferência entre lojas/estoque',
    category: 'transfers',
    defaultRecipient: 'admin_or_creator',
    defaultFiringMode: 'system_event',
    defaultVariables: ['{colaborador}', '{produto}', '{status}', '{descricao}', '{horario}', '{data}']
  },
  {
    actionKey: 'warranty_opened_or_updated',
    actionLabel: 'Garantias: Registrar nova solicitação de garantia ou atualizar laudo',
    category: 'warranties',
    defaultRecipient: 'delivery_client',
    defaultFiringMode: 'system_event',
    defaultVariables: ['{cliente}', '{produto}', '{status}', '{descricao}', '{horario}', '{data}']
  },
  {
    actionKey: 'assistance_ticket_updated',
    actionLabel: 'Assistência Técnica: Abrir ordem de serviço ou atualizar reparo técnico',
    category: 'assistances',
    defaultRecipient: 'delivery_client',
    defaultFiringMode: 'status_change',
    defaultVariables: ['{cliente}', '{produto}', '{status}', '{valor}', '{descricao}', '{horario}', '{data}']
  },
  {
    actionKey: 'competitor_price_recorded',
    actionLabel: 'Pesquisa Concorrentes: Registrar preço de concorrente ou divergência de mercado',
    category: 'price_research',
    defaultRecipient: 'admin_or_creator',
    defaultFiringMode: 'system_event',
    defaultVariables: ['{colaborador}', '{produto}', '{valor}', '{cidade}', '{horario}', '{data}']
  },
  {
    actionKey: 'mercado_livre_research_alert',
    actionLabel: 'Pesquisa Mercado Livre: Monitorar preço ou oportunidade no Mercado Livre',
    category: 'mercado_livre',
    defaultRecipient: 'admin_or_creator',
    defaultFiringMode: 'system_event',
    defaultVariables: ['{produto}', '{valor}', '{status}', '{horario}', '{data}']
  },

  // Resultados -> Vendas & Relatórios
  {
    actionKey: 'sale_created',
    actionLabel: 'Vendas: Registrar nova venda, pedido comercial ou meta batida',
    category: 'sales',
    defaultRecipient: 'delivery_client',
    defaultFiringMode: 'system_event',
    defaultVariables: ['{cliente}', '{vendedor}', '{produto}', '{valor}', '{horario}', '{data}']
  },
  {
    actionKey: 'report_generated',
    actionLabel: 'Relatórios: Emitir relatório gerencial ou fechamento de ciclo',
    category: 'reports',
    defaultRecipient: 'admin_or_creator',
    defaultFiringMode: 'system_event',
    defaultVariables: ['{criador}', '{data}', '{horario}', '{descricao}']
  },
  {
    actionKey: 'daily_executive_summary',
    actionLabel: 'Relatórios: Boletim / Resumo executivo diário para Diretoria',
    category: 'reports',
    defaultRecipient: 'admin_or_creator',
    defaultFiringMode: 'scheduled_time',
    defaultVariables: ['{data}', '{entregas_concluidas}', '{quantidade_pendente}', '{tarefas_concluidas}', '{tarefas_pendentes}']
  },

  // Administração -> Painel Ao Vivo (GPS), Equipe, Comissionados, Configurações, Comissões Adriano
  {
    actionKey: 'live_gps_alert',
    actionLabel: 'Painel Ao Vivo (GPS): Alerta de frota, parada prolongada ou chegada em tempo real',
    category: 'live_panel',
    defaultRecipient: 'admin_or_creator',
    defaultFiringMode: 'system_event',
    defaultVariables: ['{motorista}', '{veiculo}', '{endereco}', '{status}', '{horario}']
  },
  {
    actionKey: 'collaborator_updated',
    actionLabel: 'Equipe: Cadastrar novo colaborador, motorista ou atualizar escala',
    category: 'collaborators',
    defaultRecipient: 'assigned_collaborator',
    defaultFiringMode: 'system_event',
    defaultVariables: ['{colaborador}', '{status}', '{horario}', '{data}']
  },
  {
    actionKey: 'commission_closed',
    actionLabel: 'Comissionados: Fechar ou liberar comissão de parceiro / vendedor',
    category: 'commissions',
    defaultRecipient: 'assigned_collaborator',
    defaultFiringMode: 'system_event',
    defaultVariables: ['{colaborador}', '{vendedor}', '{valor}', '{status}', '{data}']
  },
  {
    actionKey: 'system_settings_changed',
    actionLabel: 'Configurações: Alterar parâmetros gerais ou integrações do sistema',
    category: 'settings',
    defaultRecipient: 'admin_or_creator',
    defaultFiringMode: 'system_event',
    defaultVariables: ['{criador}', '{descricao}', '{horario}', '{data}']
  },
  {
    actionKey: 'adriano_commission_recorded',
    actionLabel: 'Comissões Adriano: Lançar ou consolidar apuração em Comissões Adriano',
    category: 'adriano_commissions',
    defaultRecipient: 'admin_or_creator',
    defaultFiringMode: 'system_event',
    defaultVariables: ['{vendedor}', '{produto}', '{valor}', '{status}', '{data}', '{horario}']
  },

  // Ação Personalizada Livre
  {
    actionKey: 'custom_action',
    actionLabel: 'Outra ação personalizada do sistema (digitar livremente)',
    category: 'leads',
    defaultRecipient: 'admin_or_creator',
    defaultFiringMode: 'system_event',
    defaultVariables: ['{colaborador}', '{cliente}', '{motorista}', '{produto}', '{valor}', '{status}', '{horario}', '{data}']
  }
];

export type AutomationCategory =
  | 'home'
  | 'products'
  | 'split_table'
  | 'loyalty'
  | 'tasks'
  | 'demands'
  | 'routes'
  | 'whatsapp'
  | 'leads'
  | 'social_media'
  | 'deliveries'
  | 'shipping_calculator'
  | 'truck_history'
  | 'transfers'
  | 'warranties'
  | 'assistances'
  | 'price_research'
  | 'mercado_livre'
  | 'sales'
  | 'reports'
  | 'live_panel'
  | 'collaborators'
  | 'commissions'
  | 'settings'
  | 'adriano_commissions'
  | 'clients'
  | 'management'
  | (string & {});

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
  timestamp: string; // ISO string for analytics compatibility
  timeLabel: string; // HH:mm
  direction: 'outbound' | 'inbound';
  mode: 'auto' | 'manual';
  status: 'sent' | 'delivered' | 'failed';
  recipientName: string;
  recipientPhone: string;
  phone: string;
  text?: string;
  category: AutomationCategory | 'manual_chat' | string;
  ruleName?: string;
}

export interface AutomationDirectoryConfig {
  adminName: string;
  adminPhone: string;
  logisticsGroupPhone: string;
  collaboratorPhones: Record<string, string>; // key: lowercase name or id -> phone
}

export interface WhatsAppProviderConfig {
  providerMode: 'meta' | 'alternative' | 'simulation';
  altServerUrl: string;
  altApiKey: string;
  altInstance: string;
  qrStatus?: 'idle' | 'generating' | 'waiting' | 'connected';
  qrPhoneConnected?: string;
}

export interface CollaboratorProfilePhone {
  id: string;
  name: string;
  phone: string;
  role: string;
  type?: string;
}

export type WhatsAppAntiBanProfile = 'conservative' | 'balanced' | 'intensive' | 'custom';

export interface WhatsAppAntiBanConfig {
  enabled: boolean;
  profile: WhatsAppAntiBanProfile;
  // Regra 1: Cadência Inteligente & Atraso Randômico (Anti-Rajada)
  randomDelayEnabled: boolean;
  minDelaySeconds: number;
  maxDelaySeconds: number;
  simulateTyping: boolean;
  // Regra 2: Limite de Volume (Minuto / Hora / Dia) & Pausa de Respiro
  rateLimitEnabled: boolean;
  maxMessagesPerMinute: number;
  maxMessagesPerHour: number;
  maxMessagesPerDay: number;
  burstThreshold: number;
  pauseSecondsOnBurst: number;
  // Regra 3: Anti-Spam por Destinatário & Bloqueio de Duplicidade
  deduplicationEnabled: boolean;
  blockDuplicateWindowMinutes: number;
  recipientCooldownSeconds: number;
  // Regra 4: Polimorfismo & Humanização Dinâmica de Mensagem
  dynamicVariationEnabled: boolean;
  varyGreetings: boolean;
  appendUniqueProtocol: boolean;
  // Regra 5: Janela de Horário Comercial Seguro (Anti-Denúncia Noturna)
  safeHoursEnabled: boolean;
  safeHoursStart: string;
  safeHoursEnd: string;
  allowHighPriorityOutsideSafeHours: boolean;
  updatedAt?: string;
}

export interface WhatsAppAntiBanStats {
  sentLastMinute: number;
  sentLastHour: number;
  sentToday: number;
  queuedCount: number;
  blockedDuplicatesCount: number;
  blockedRateLimitCount: number;
  humanizedMessagesCount: number;
  lastDelayAppliedSeconds: number;
  consecutiveBurstCount: number;
  healthScore: number;
  lastProtectedAction?: string;
}

export const RULES_STORAGE_KEY = 'whatsapp_automation_rules_v2_real';
export const CUSTOM_TRIGGERS_STORAGE_KEY = 'whatsapp_custom_triggers_v1';
export const LOGS_STORAGE_KEY = 'whatsapp_automation_logs_v2_real';
export const DIRECTORY_STORAGE_KEY = 'whatsapp_automation_directory_v1';
export const CHATS_INBOX_SYNC_KEY = 'whatsapp_automated_inbox_messages_v2_real';
export const TRAFFIC_EVENTS_STORAGE_KEY = 'whatsapp_real_traffic_events_v1';
export const REAL_CHATS_STORAGE_KEY = 'whatsapp_real_chats_v2';
export const REAL_MESSAGES_STORAGE_KEY = 'whatsapp_real_messages_v2';
export const DELETED_CHATS_STORAGE_KEY = 'whatsapp_deleted_chat_ids_v1';
export const PROFILE_PHONES_CACHE_KEY = 'whatsapp_profile_phones_cache_v1';
export const ANTIBAN_CONFIG_STORAGE_KEY = 'whatsapp_antiban_config_v1';
export const ANTIBAN_STATS_STORAGE_KEY = 'whatsapp_antiban_runtime_stats_v1';

export const ANTIBAN_PROFILE_PRESETS: Record<
  Exclude<WhatsAppAntiBanProfile, 'custom'>,
  Omit<WhatsAppAntiBanConfig, 'enabled' | 'profile' | 'updatedAt'>
> = {
  conservative: {
    randomDelayEnabled: true,
    minDelaySeconds: 8,
    maxDelaySeconds: 18,
    simulateTyping: true,
    rateLimitEnabled: true,
    maxMessagesPerMinute: 3,
    maxMessagesPerHour: 25,
    maxMessagesPerDay: 120,
    burstThreshold: 6,
    pauseSecondsOnBurst: 45,
    deduplicationEnabled: true,
    blockDuplicateWindowMinutes: 30,
    recipientCooldownSeconds: 25,
    dynamicVariationEnabled: true,
    varyGreetings: true,
    appendUniqueProtocol: true,
    safeHoursEnabled: true,
    safeHoursStart: '07:00',
    safeHoursEnd: '20:30',
    allowHighPriorityOutsideSafeHours: true
  },
  balanced: {
    randomDelayEnabled: true,
    minDelaySeconds: 4,
    maxDelaySeconds: 11,
    simulateTyping: true,
    rateLimitEnabled: true,
    maxMessagesPerMinute: 6,
    maxMessagesPerHour: 45,
    maxMessagesPerDay: 250,
    burstThreshold: 10,
    pauseSecondsOnBurst: 30,
    deduplicationEnabled: true,
    blockDuplicateWindowMinutes: 15,
    recipientCooldownSeconds: 12,
    dynamicVariationEnabled: true,
    varyGreetings: true,
    appendUniqueProtocol: true,
    safeHoursEnabled: false,
    safeHoursStart: '07:00',
    safeHoursEnd: '21:30',
    allowHighPriorityOutsideSafeHours: true
  },
  intensive: {
    randomDelayEnabled: true,
    minDelaySeconds: 2,
    maxDelaySeconds: 6,
    simulateTyping: true,
    rateLimitEnabled: true,
    maxMessagesPerMinute: 12,
    maxMessagesPerHour: 90,
    maxMessagesPerDay: 500,
    burstThreshold: 18,
    pauseSecondsOnBurst: 20,
    deduplicationEnabled: true,
    blockDuplicateWindowMinutes: 5,
    recipientCooldownSeconds: 6,
    dynamicVariationEnabled: true,
    varyGreetings: true,
    appendUniqueProtocol: true,
    safeHoursEnabled: false,
    safeHoursStart: '06:00',
    safeHoursEnd: '22:30',
    allowHighPriorityOutsideSafeHours: true
  }
};

export const DEFAULT_ANTIBAN_CONFIG: WhatsAppAntiBanConfig = {
  enabled: true,
  profile: 'balanced',
  ...ANTIBAN_PROFILE_PRESETS.balanced
};

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
  string,
  {
    label: string;
    category: AutomationCategory;
    defaultRecipient: RecipientTarget;
    availableVariables: string[];
    hasSchedule?: boolean;
    defaultScheduleTime?: string;
    firingMode?: TriggerFiringMode;
    conditionStatusValue?: string;
    delayMinutes?: number;
    isCustom?: boolean;
  }
> = {
  task_created: {
    label: 'Quando uma nova tarefa é criada',
    category: 'tasks',
    defaultRecipient: 'assigned_collaborator',
    availableVariables: ['{colaborador}', '{criador}', '{tarefa}', '{prioridade}', '{prazo}', '{descricao}', '{horario}'],
    firingMode: 'system_event'
  },
  task_status_changed: {
    label: 'Quando o status da tarefa é alterado',
    category: 'tasks',
    defaultRecipient: 'admin_or_creator',
    availableVariables: ['{colaborador}', '{tarefa}', '{status}', '{progresso}', '{prioridade}', '{horario}'],
    firingMode: 'status_change'
  },
  task_overdue_reminder: {
    label: 'Quando tarefa estiver atrasada ou vencendo no dia',
    category: 'tasks',
    defaultRecipient: 'assigned_collaborator',
    availableVariables: ['{colaborador}', '{tarefa}', '{prioridade}', '{prazo}', '{status}'],
    hasSchedule: true,
    defaultScheduleTime: '08:30',
    firingMode: 'scheduled_time'
  },
  driver_daily_schedule: {
    label: 'Horário pré-definido: Roteiro diário de entregas do motorista',
    category: 'deliveries',
    defaultRecipient: 'assigned_driver',
    availableVariables: ['{motorista}', '{veiculo}', '{data}', '{total_entregas}', '{lista_entregas}'],
    hasSchedule: true,
    defaultScheduleTime: '07:30',
    firingMode: 'scheduled_time'
  },
  delivery_finalized: {
    label: 'Quando o motorista finalizar ou atualizar entrega',
    category: 'deliveries',
    defaultRecipient: 'admin_or_creator',
    availableVariables: ['{motorista}', '{veiculo}', '{status}', '{produto}', '{endereco}', '{bairro}', '{cidade}', '{vendedor}', '{horario}'],
    firingMode: 'status_change'
  },
  driver_unfinalized_reminder: {
    label: 'Lembrete automático: Motorista esqueceu de finalizar entrega',
    category: 'deliveries',
    defaultRecipient: 'assigned_driver',
    availableVariables: ['{motorista}', '{quantidade_pendente}', '{lista_entregas}', '{horario}'],
    hasSchedule: true,
    defaultScheduleTime: '17:30',
    firingMode: 'scheduled_time'
  },
  delivery_out_for_client: {
    label: 'Quando entrega iniciar rota (Avisar Cliente)',
    category: 'clients',
    defaultRecipient: 'delivery_client',
    availableVariables: ['{produto}', '{motorista}', '{veiculo}', '{endereco}', '{bairro}', '{cidade}', '{turno}'],
    firingMode: 'status_change'
  },
  demand_created: {
    label: 'Quando colaborador abre Demanda / Pedido de Material',
    category: 'demands',
    defaultRecipient: 'admin_or_creator',
    availableVariables: ['{colaborador}', '{categoria}', '{descricao}', '{horario}'],
    firingMode: 'system_event'
  },
  special_delivery_alert: {
    label: 'Quando uma Entrega Especial for agendada',
    category: 'deliveries',
    defaultRecipient: 'custom_number',
    availableVariables: ['{data}', '{turno}', '{motorista}', '{veiculo}', '{produto}', '{endereco}'],
    firingMode: 'system_event'
  },
  daily_executive_summary: {
    label: 'Horário pré-definido: Resumo Diário para Diretoria',
    category: 'management',
    defaultRecipient: 'admin_or_creator',
    availableVariables: ['{data}', '{entregas_concluidas}', '{quantidade_pendente}', '{tarefas_concluidas}', '{tarefas_pendentes}'],
    hasSchedule: true,
    defaultScheduleTime: '18:15',
    firingMode: 'scheduled_time'
  }
};

export function getCustomTriggers(): WhatsAppCustomTrigger[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CUSTOM_TRIGGERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(t => t && typeof t.id === 'string' && typeof t.label === 'string');
    }
  } catch (e) {
    console.warn('Error loading custom WhatsApp triggers:', e);
  }
  return [];
}

export function saveCustomTriggers(triggers: WhatsAppCustomTrigger[], syncCloud = true): WhatsAppCustomTrigger[] {
  if (typeof window === 'undefined') return triggers;
  try {
    localStorage.setItem(CUSTOM_TRIGGERS_STORAGE_KEY, JSON.stringify(triggers));
    // Also mirror in runtime TRIGGER_METADATA so any consumer immediately resolves it
    for (const t of triggers) {
      TRIGGER_METADATA[t.id] = {
        label: t.label,
        category: t.category,
        defaultRecipient: t.defaultRecipient,
        availableVariables: t.availableVariables,
        hasSchedule: Boolean(t.hasSchedule),
        defaultScheduleTime: t.defaultScheduleTime,
        firingMode: t.firingMode,
        conditionStatusValue: t.conditionStatusValue,
        delayMinutes: t.delayMinutes,
        isCustom: true
      };
    }
    window.dispatchEvent(new Event('whatsapp-automation-updated'));
    if (syncCloud) {
      void pushWhatsAppCloudUpdate({
        customTriggers: triggers,
        forceTriggersUpdate: true
      });
    }
  } catch (e) {
    console.warn('Error saving custom WhatsApp triggers:', e);
  }
  return triggers;
}

export function deleteCustomTrigger(triggerId: string, syncCloud = true): WhatsAppCustomTrigger[] {
  const current = getCustomTriggers();
  const next = current.filter(t => t.id !== triggerId);
  delete TRIGGER_METADATA[triggerId];
  return saveCustomTriggers(next, syncCloud);
}

export function getAllTriggerMetadata(): Record<
  string,
  {
    label: string;
    category: AutomationCategory;
    defaultRecipient: RecipientTarget;
    availableVariables: string[];
    hasSchedule?: boolean;
    defaultScheduleTime?: string;
    firingMode?: TriggerFiringMode;
    conditionStatusValue?: string;
    delayMinutes?: number;
    isCustom?: boolean;
  }
> {
  const customList = getCustomTriggers();
  const merged = { ...TRIGGER_METADATA };
  for (const t of customList) {
    merged[t.id] = {
      label: t.label,
      category: t.category,
      defaultRecipient: t.defaultRecipient,
      availableVariables: t.availableVariables?.length
        ? t.availableVariables
        : ['{colaborador}', '{cliente}', '{produto}', '{status}', '{horario}', '{data}'],
      hasSchedule: Boolean(t.hasSchedule),
      defaultScheduleTime: t.defaultScheduleTime,
      firingMode: t.firingMode,
      conditionStatusValue: t.conditionStatusValue,
      delayMinutes: t.delayMinutes,
      isCustom: true
    };
    TRIGGER_METADATA[t.id] = merged[t.id];
  }
  return merged;
}

export function getProviderConfig(): WhatsAppProviderConfig {
  if (typeof window === 'undefined') {
    return {
      providerMode: 'alternative',
      altServerUrl: 'https://api.w-api.app',
      altApiKey: '',
      altInstance: '',
      qrStatus: 'connected',
      qrPhoneConnected: ''
    };
  }
  const providerMode = (localStorage.getItem('whatsapp_provider_mode') as any) || 'alternative';
  const altServerUrl = localStorage.getItem('whatsapp_alt_server_url') || 'https://api.w-api.app';
  const altApiKey = localStorage.getItem('whatsapp_alt_api_key') || '';
  const altInstance = localStorage.getItem('whatsapp_alt_instance') || '';
  const qrStatus = (localStorage.getItem('whatsapp_qr_status') as any) || 'connected';
  const qrPhoneConnected = localStorage.getItem('whatsapp_qr_phone') || '';
  return {
    providerMode,
    altServerUrl,
    altApiKey,
    altInstance,
    qrStatus,
    qrPhoneConnected
  };
}

export function saveProviderConfig(config: Partial<WhatsAppProviderConfig>, syncCloud = true): WhatsAppProviderConfig {
  const current = getProviderConfig();
  const next: WhatsAppProviderConfig = {
    providerMode: config.providerMode ?? current.providerMode ?? 'alternative',
    altServerUrl: (config.altServerUrl ?? current.altServerUrl ?? 'https://api.w-api.app').trim() || 'https://api.w-api.app',
    altApiKey: (config.altApiKey ?? current.altApiKey ?? '').trim().replace(/^Bearer\s+/i, ''),
    altInstance: (config.altInstance ?? current.altInstance ?? '').trim(),
    qrStatus: config.qrStatus ?? current.qrStatus ?? 'connected',
    qrPhoneConnected: config.qrPhoneConnected ?? current.qrPhoneConnected ?? ''
  };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('whatsapp_provider_mode', next.providerMode);
      localStorage.setItem('whatsapp_alt_server_url', next.altServerUrl);
      localStorage.setItem('whatsapp_alt_api_key', next.altApiKey);
      localStorage.setItem('whatsapp_alt_instance', next.altInstance);
      if (next.qrStatus) localStorage.setItem('whatsapp_qr_status', next.qrStatus);
      if (next.qrPhoneConnected !== undefined) localStorage.setItem('whatsapp_qr_phone', next.qrPhoneConnected);
      window.dispatchEvent(new Event('whatsapp-automation-updated'));
    } catch {}
    if (syncCloud) {
      void pushWhatsAppCloudUpdate({
        providerConfig: next,
        forceProviderUpdate: true
      });
    }
  }
  return next;
}

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

export function saveAutomationRules(rules: WhatsAppAutomationRule[], syncCloud = true): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(rules));
    window.dispatchEvent(new Event('whatsapp-automation-updated'));
    if (syncCloud) {
      void pushWhatsAppCloudUpdate({
        rules,
        forceRulesUpdate: true
      });
    }
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

export function saveAutomationLog(log: WhatsAppAutomationLog, syncCloud = true): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getAutomationLogs();
    const updated = [log, ...current].slice(0, 100);
    localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('whatsapp-automation-updated'));
    if (syncCloud) {
      void pushWhatsAppCloudUpdate({ logs: updated });
    }
  } catch (e) {
    console.warn('Error saving WhatsApp automation log:', e);
  }
}

export function clearAutomationLogs(syncCloud = true): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(LOGS_STORAGE_KEY);
  window.dispatchEvent(new Event('whatsapp-automation-updated'));
  if (syncCloud) {
    void pushWhatsAppCloudUpdate({ logs: [], clearLogs: true });
  }
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

    // Also include all collaborator phones registered in user profiles (profiles.phone)
    try {
      const rawProfiles = localStorage.getItem(PROFILE_PHONES_CACHE_KEY);
      if (rawProfiles) {
        const profileList = JSON.parse(rawProfiles);
        if (Array.isArray(profileList)) {
          profileList.forEach((p: any) => {
            const pName = String(p?.name || '').trim().toLowerCase();
            const pPhone = normalizeBrazilPhone(p?.phone || '');
            if (pName && pPhone && !isPlaceholderPhone(pPhone)) {
              cleanedCollab[pName] = pPhone;
            }
          });
        }
      }
    } catch {}

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

export function saveDirectoryConfig(
  config: AutomationDirectoryConfig,
  options?: { syncCloud?: boolean; replaceCollaboratorPhones?: boolean }
): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DIRECTORY_STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(new Event('whatsapp-automation-updated'));
    if (options?.syncCloud !== false) {
      void pushWhatsAppCloudUpdate({
        directory: config,
        forceDirectoryUpdate: true,
        replaceCollaboratorPhones: Boolean(options?.replaceCollaboratorPhones)
      });
    }
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

export function formatPhoneDisplay(raw?: string): string {
  const digits = normalizeBrazilPhone(raw);
  if (!digits) return '';
  const local = digits.startsWith('55') && digits.length >= 12 ? digits.slice(2) : digits;
  if (local.length === 11) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  }
  if (local.length === 10) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  }
  return `+${digits}`;
}

export function isPlaceholderPhone(phone?: string): boolean {
  const clean = normalizeBrazilPhone(phone);
  return !clean || clean.length < 10 || DEMO_PLACEHOLDER_PHONES.has(clean);
}

function normalizeSearchKey(str?: string): string {
  return String(str || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function getCachedProfilePhones(): CollaboratorProfilePhone[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PROFILE_PHONES_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCachedProfilePhones(list: CollaboratorProfilePhone[]): void {
  if (typeof window === 'undefined' || !Array.isArray(list)) return;
  try {
    localStorage.setItem(PROFILE_PHONES_CACHE_KEY, JSON.stringify(list));
    const dir = getDirectoryConfig();
    const nextCollab = { ...dir.collaboratorPhones };
    let changed = false;
    for (const p of list) {
      const cleanName = String(p.name || '').trim().toLowerCase();
      const cleanPhone = normalizeBrazilPhone(p.phone);
      if (cleanName && cleanPhone && !isPlaceholderPhone(cleanPhone)) {
        if (nextCollab[cleanName] !== cleanPhone) {
          nextCollab[cleanName] = cleanPhone;
          changed = true;
        }
      }
    }
    if (changed) {
      localStorage.setItem(
        DIRECTORY_STORAGE_KEY,
        JSON.stringify({
          ...dir,
          collaboratorPhones: nextCollab
        })
      );
      window.dispatchEvent(new Event('whatsapp-automation-updated'));
    }
  } catch {}
}

export async function syncCollaboratorPhonesFromProfiles(): Promise<CollaboratorProfilePhone[]> {
  if (typeof window === 'undefined') return [];
  try {
    const res = await fetch(`/api/collaborators?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return getCachedProfilePhones();
    const data = await res.json().catch(() => null);
    const collaborators = Array.isArray(data?.collaborators) ? data.collaborators : [];
    const profilePhones: CollaboratorProfilePhone[] = [];

    for (const c of collaborators) {
      if (c?.status === 'Inativo') continue;
      const cleanName = String(c?.name || '').trim();
      const cleanPhone = normalizeBrazilPhone(c?.phone || c?.whatsapp || '');
      if (!cleanName || isPlaceholderPhone(cleanPhone)) continue;
      profilePhones.push({
        id: String(c.id || ''),
        name: cleanName,
        phone: cleanPhone,
        role: String(c.role || 'Colaborador').trim(),
        type: String(c.type || 'user').trim()
      });
    }

    if (profilePhones.length > 0) {
      saveCachedProfilePhones(profilePhones);
    }
    return profilePhones;
  } catch {
    return getCachedProfilePhones();
  }
}

export function findCollaboratorProfilePhone(
  nameOrId?: string,
  explicitPhone?: string,
  collaboratorId?: string
): string {
  const cleanExplicit = normalizeBrazilPhone(explicitPhone);
  if (cleanExplicit && !isPlaceholderPhone(cleanExplicit)) {
    return cleanExplicit;
  }

  const profiles = getCachedProfilePhones();
  const dir = getDirectoryConfig();
  const targetId = String(collaboratorId || '').trim();
  const targetKey = normalizeSearchKey(nameOrId);
  const targetFirst = targetKey.split(' ')[0];

  // 1. Lookup in User Profiles cache first (source of truth from user profile registration)
  if (targetId) {
    const byId = profiles.find(p => p.id === targetId);
    if (byId && !isPlaceholderPhone(byId.phone)) {
      return normalizeBrazilPhone(byId.phone);
    }
  }

  if (targetKey) {
    const exactProfile = profiles.find(p => normalizeSearchKey(p.name) === targetKey || p.id === nameOrId);
    if (exactProfile && !isPlaceholderPhone(exactProfile.phone)) {
      return normalizeBrazilPhone(exactProfile.phone);
    }

    const partialProfile = profiles.find(p => {
      const pNorm = normalizeSearchKey(p.name);
      const pFirst = pNorm.split(' ')[0];
      return (
        pNorm.startsWith(targetKey) ||
        targetKey.startsWith(pNorm) ||
        (targetFirst.length >= 3 && pFirst === targetFirst)
      );
    });
    if (partialProfile && !isPlaceholderPhone(partialProfile.phone)) {
      return normalizeBrazilPhone(partialProfile.phone);
    }
  }

  // 2. Lookup in Directory collaboratorPhones map
  if (nameOrId) {
    const lowerRaw = String(nameOrId).trim().toLowerCase();
    const firstRaw = lowerRaw.split(' ')[0];
    const directMatch = dir.collaboratorPhones[lowerRaw] || dir.collaboratorPhones[firstRaw];
    if (directMatch && !isPlaceholderPhone(directMatch)) {
      return normalizeBrazilPhone(directMatch);
    }

    for (const [k, v] of Object.entries(dir.collaboratorPhones)) {
      const kNorm = normalizeSearchKey(k);
      const kFirst = kNorm.split(' ')[0];
      if (
        kNorm === targetKey ||
        kNorm.startsWith(targetKey) ||
        targetKey.startsWith(kNorm) ||
        (targetFirst.length >= 3 && kFirst === targetFirst)
      ) {
        if (!isPlaceholderPhone(v)) {
          return normalizeBrazilPhone(v);
        }
      }
    }
  }

  return '';
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
    const creatorProfilePhone = findCollaboratorProfilePhone(creatorName, payload.creatorPhone, payload.criadorId);
    const creatorPhone = creatorProfilePhone || normalizedAdminPhone;
    return { name: creatorName, phone: creatorPhone };
  }

  if (target === 'assigned_collaborator') {
    const collabName = String(payload.colaborador || 'Colaborador');
    const explicitPhone = payload.collaboratorPhone || payload.phone;
    const mappedPhone = findCollaboratorProfilePhone(
      collabName,
      explicitPhone,
      payload.colaboradorId || payload.collaboratorId || payload.profileId
    );

    const finalPhone =
      !mappedPhone || (isPlaceholderPhone(mappedPhone) && hasRealAdminPhone)
        ? normalizedAdminPhone
        : mappedPhone;

    return { name: collabName, phone: finalPhone };
  }

  if (target === 'assigned_driver') {
    const driverName = String(payload.motorista || 'Motorista');
    const explicitPhone = payload.driverPhone || payload.phone;
    const mappedPhone = findCollaboratorProfilePhone(
      driverName,
      explicitPhone,
      payload.driverId || payload.motoristaId || payload.profileId
    );

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
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((ev: any) => !isPlaceholderPhone(ev.recipientPhone || ev.phone))
      .map((ev: any) => ({
        ...ev,
        createdAt: ev.createdAt || ev.timestamp || new Date().toISOString(),
        timestamp: ev.timestamp || ev.createdAt || new Date().toISOString(),
        recipientPhone: normalizeBrazilPhone(ev.recipientPhone || ev.phone),
        phone: normalizeBrazilPhone(ev.phone || ev.recipientPhone),
        status: ev.status === 'sent' ? 'delivered' : ev.status
      }));
  } catch {
    return [];
  }
}

export function recordWhatsAppTrafficEvent(
  event: {
    direction: 'outbound' | 'inbound';
    mode: 'auto' | 'manual';
    status: 'sent' | 'delivered' | 'failed';
    recipientName: string;
    recipientPhone: string;
    text?: string;
    category: AutomationCategory | 'manual_chat' | string;
    ruleName?: string;
  },
  syncCloud = true
): WhatsAppTrafficEvent | null {
  if (typeof window === 'undefined') return null;
  const cleanPhone = normalizeBrazilPhone(event.recipientPhone);
  if (!cleanPhone || isPlaceholderPhone(cleanPhone)) return null;

  try {
    const now = new Date();
    const nowIso = now.toISOString();
    const normalizedStatus = event.status === 'sent' ? 'delivered' : event.status;
    const newEvent: WhatsAppTrafficEvent = {
      ...event,
      status: normalizedStatus,
      recipientPhone: cleanPhone,
      phone: cleanPhone,
      id: `traffic-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: nowIso,
      timestamp: nowIso,
      timeLabel: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };
    const current = getWhatsAppTrafficEvents();
    const updated = [newEvent, ...current].slice(0, 500);
    localStorage.setItem(TRAFFIC_EVENTS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('whatsapp-traffic-updated'));
    if (syncCloud) {
      void pushWhatsAppCloudUpdate({ trafficEvents: updated });
    }
    return newEvent;
  } catch {
    return null;
  }
}

export function recordMessageInWhatsAppFeed(
  recipientName: string,
  recipientPhone: string,
  text: string,
  status: 'sent' | 'delivered' | 'read' | 'failed' = 'sent',
  syncCloud = true
) {
  if (typeof window === 'undefined') return;
  const cleanPhone = normalizeBrazilPhone(recipientPhone);
  if (!cleanPhone || isPlaceholderPhone(cleanPhone)) return;

  try {
    const raw = localStorage.getItem(CHATS_INBOX_SYNC_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const newItem = {
      id: 'auto-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      recipientName,
      recipientPhone: cleanPhone,
      text,
      status,
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      createdAt: new Date().toISOString()
    };
    list.unshift(newItem);
    const trimmed = list.slice(0, 100);
    localStorage.setItem(CHATS_INBOX_SYNC_KEY, JSON.stringify(trimmed));
    window.dispatchEvent(new Event('whatsapp-automation-message-sent'));
    if (syncCloud) {
      void pushWhatsAppCloudUpdate({ automatedInboxMessages: trimmed });
    }
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

export function applyCloudStateToLocalStorage(cloudState: any, profilePhones?: CollaboratorProfilePhone[]): void {
  if (typeof window === 'undefined' || !cloudState || typeof cloudState !== 'object') return;
  try {
    if (Array.isArray(profilePhones) && profilePhones.length > 0) {
      localStorage.setItem(PROFILE_PHONES_CACHE_KEY, JSON.stringify(profilePhones));
    }

    if (cloudState.providerConfig && typeof cloudState.providerConfig === 'object') {
      const pc = cloudState.providerConfig;
      if (pc.providerMode) localStorage.setItem('whatsapp_provider_mode', pc.providerMode);
      if (pc.altServerUrl) localStorage.setItem('whatsapp_alt_server_url', pc.altServerUrl);
      if (pc.altApiKey !== undefined) localStorage.setItem('whatsapp_alt_api_key', pc.altApiKey);
      if (pc.altInstance !== undefined) localStorage.setItem('whatsapp_alt_instance', pc.altInstance);
      if (pc.qrStatus) localStorage.setItem('whatsapp_qr_status', pc.qrStatus);
      if (pc.qrPhoneConnected !== undefined) localStorage.setItem('whatsapp_qr_phone', pc.qrPhoneConnected);
    }

    if (cloudState.directory && typeof cloudState.directory === 'object') {
      localStorage.setItem(DIRECTORY_STORAGE_KEY, JSON.stringify(cloudState.directory));
    }

    if (Array.isArray(cloudState.rules) && cloudState.rules.length > 0) {
      localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(cloudState.rules));
    }

    if (Array.isArray(cloudState.customTriggers) && cloudState.customTriggers.length > 0) {
      localStorage.setItem(CUSTOM_TRIGGERS_STORAGE_KEY, JSON.stringify(cloudState.customTriggers));
    }

    if (Array.isArray(cloudState.deletedChatIds)) {
      localStorage.setItem(DELETED_CHATS_STORAGE_KEY, JSON.stringify(cloudState.deletedChatIds));
    }

    if (Array.isArray(cloudState.chats)) {
      localStorage.setItem(REAL_CHATS_STORAGE_KEY, JSON.stringify(cloudState.chats));
    }

    if (cloudState.chatMessages && typeof cloudState.chatMessages === 'object') {
      localStorage.setItem(REAL_MESSAGES_STORAGE_KEY, JSON.stringify(cloudState.chatMessages));
    }

    if (Array.isArray(cloudState.automatedInboxMessages)) {
      localStorage.setItem(CHATS_INBOX_SYNC_KEY, JSON.stringify(cloudState.automatedInboxMessages));
    }

    if (Array.isArray(cloudState.logs)) {
      localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(cloudState.logs));
    }

    if (Array.isArray(cloudState.trafficEvents)) {
      localStorage.setItem(TRAFFIC_EVENTS_STORAGE_KEY, JSON.stringify(cloudState.trafficEvents));
    }

    if (cloudState.antiBanConfig && typeof cloudState.antiBanConfig === 'object') {
      const mergedAntiBan: WhatsAppAntiBanConfig = {
        ...DEFAULT_ANTIBAN_CONFIG,
        ...cloudState.antiBanConfig
      };
      localStorage.setItem(ANTIBAN_CONFIG_STORAGE_KEY, JSON.stringify(mergedAntiBan));
    }

    if (Array.isArray(cloudState.customerContacts) && cloudState.customerContacts.length > 0) {
      localStorage.setItem('whatsapp_customer_contacts_v1', JSON.stringify(cloudState.customerContacts));
    }

    if (Array.isArray(cloudState.campaigns) && cloudState.campaigns.length > 0) {
      localStorage.setItem('whatsapp_campaigns_v1', JSON.stringify(cloudState.campaigns));
    }

    window.dispatchEvent(new Event('whatsapp-cloud-synced'));
    window.dispatchEvent(new Event('whatsapp-automation-updated'));
    window.dispatchEvent(new Event('whatsapp-traffic-updated'));
    window.dispatchEvent(new Event('whatsapp-antiban-updated'));
    window.dispatchEvent(new Event('whatsapp-campaigns-updated'));
  } catch (err) {
    console.warn('Error applying WhatsApp cloud state to localStorage:', err);
  }
}

export function getAntiBanConfig(): WhatsAppAntiBanConfig {
  if (typeof window === 'undefined') return DEFAULT_ANTIBAN_CONFIG;
  try {
    const raw = localStorage.getItem(ANTIBAN_CONFIG_STORAGE_KEY);
    if (!raw) return DEFAULT_ANTIBAN_CONFIG;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return DEFAULT_ANTIBAN_CONFIG;
    return {
      ...DEFAULT_ANTIBAN_CONFIG,
      ...parsed
    };
  } catch {
    return DEFAULT_ANTIBAN_CONFIG;
  }
}

export function saveAntiBanConfig(
  config: WhatsAppAntiBanConfig,
  syncCloud = true
): WhatsAppAntiBanConfig {
  const normalized: WhatsAppAntiBanConfig = {
    ...DEFAULT_ANTIBAN_CONFIG,
    ...config,
    minDelaySeconds: Math.max(1, Number(config.minDelaySeconds) || 4),
    maxDelaySeconds: Math.max(
      Math.max(1, Number(config.minDelaySeconds) || 4),
      Number(config.maxDelaySeconds) || 11
    ),
    maxMessagesPerMinute: Math.max(1, Number(config.maxMessagesPerMinute) || 6),
    maxMessagesPerHour: Math.max(5, Number(config.maxMessagesPerHour) || 45),
    maxMessagesPerDay: Math.max(10, Number(config.maxMessagesPerDay) || 250),
    burstThreshold: Math.max(2, Number(config.burstThreshold) || 10),
    pauseSecondsOnBurst: Math.max(5, Number(config.pauseSecondsOnBurst) || 30),
    blockDuplicateWindowMinutes: Math.max(1, Number(config.blockDuplicateWindowMinutes) || 15),
    recipientCooldownSeconds: Math.max(2, Number(config.recipientCooldownSeconds) || 12),
    updatedAt: new Date().toISOString()
  };

  if (typeof window !== 'undefined') {
    localStorage.setItem(ANTIBAN_CONFIG_STORAGE_KEY, JSON.stringify(normalized));
    window.dispatchEvent(new Event('whatsapp-antiban-updated'));
    window.dispatchEvent(new Event('whatsapp-automation-updated'));
    if (syncCloud) {
      void pushWhatsAppCloudUpdate({
        antiBanConfig: normalized,
        forceAntiBanUpdate: true
      });
    }
  }
  return normalized;
}

// Runtime tracking for sequential Anti-Ban Queue
let activeQueueLength = 0;
let lastDispatchCompletedAt = 0;
let consecutiveBurstCounter = 0;
const lastRecipientSentAtMap = new Map<string, number>();
let dispatchChainPromise: Promise<any> = Promise.resolve();

interface RuntimeAntiBanCounters {
  blockedDuplicatesCount: number;
  blockedRateLimitCount: number;
  humanizedMessagesCount: number;
  lastDelayAppliedSeconds: number;
  lastProtectedAction?: string;
}

function getRuntimeCounters(): RuntimeAntiBanCounters {
  if (typeof window === 'undefined') {
    return {
      blockedDuplicatesCount: 0,
      blockedRateLimitCount: 0,
      humanizedMessagesCount: 0,
      lastDelayAppliedSeconds: 0
    };
  }
  try {
    const raw = localStorage.getItem(ANTIBAN_STATS_STORAGE_KEY);
    if (!raw) {
      return {
        blockedDuplicatesCount: 0,
        blockedRateLimitCount: 0,
        humanizedMessagesCount: 0,
        lastDelayAppliedSeconds: 0
      };
    }
    return {
      blockedDuplicatesCount: 0,
      blockedRateLimitCount: 0,
      humanizedMessagesCount: 0,
      lastDelayAppliedSeconds: 0,
      ...JSON.parse(raw)
    };
  } catch {
    return {
      blockedDuplicatesCount: 0,
      blockedRateLimitCount: 0,
      humanizedMessagesCount: 0,
      lastDelayAppliedSeconds: 0
    };
  }
}

function updateRuntimeCounters(patch: Partial<RuntimeAntiBanCounters>) {
  if (typeof window === 'undefined') return;
  try {
    const current = getRuntimeCounters();
    const updated = { ...current, ...patch };
    localStorage.setItem(ANTIBAN_STATS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('whatsapp-antiban-updated'));
  } catch {}
}

export function getAntiBanLiveStats(): WhatsAppAntiBanStats {
  const cfg = getAntiBanConfig();
  const events = getWhatsAppTrafficEvents().filter(
    ev => ev.direction === 'outbound' && (ev.status === 'sent' || ev.status === 'delivered')
  );
  const nowMs = Date.now();
  const oneMinAgo = nowMs - 60 * 1000;
  const oneHourAgo = nowMs - 60 * 60 * 1000;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTodayMs = startOfToday.getTime();

  let sentLastMinute = 0;
  let sentLastHour = 0;
  let sentToday = 0;

  for (const ev of events) {
    const t = new Date(ev.createdAt || ev.timestamp).getTime();
    if (isNaN(t)) continue;
    if (t >= oneMinAgo) sentLastMinute++;
    if (t >= oneHourAgo) sentLastHour++;
    if (t >= startOfTodayMs) sentToday++;
  }

  const counters = getRuntimeCounters();

  // Compute health score (0-100) based on enabled protections and current load vs limits
  let score = cfg.enabled ? 100 : 45;
  if (cfg.enabled) {
    if (!cfg.randomDelayEnabled) score -= 18;
    if (!cfg.rateLimitEnabled) score -= 15;
    if (!cfg.deduplicationEnabled) score -= 12;
    if (!cfg.dynamicVariationEnabled) score -= 12;
    const hourRatio = sentLastHour / Math.max(1, cfg.maxMessagesPerHour);
    const dayRatio = sentToday / Math.max(1, cfg.maxMessagesPerDay);
    if (hourRatio > 0.85 || dayRatio > 0.85) score -= 15;
    else if (hourRatio > 0.6 || dayRatio > 0.6) score -= 5;
  }

  return {
    sentLastMinute,
    sentLastHour,
    sentToday,
    queuedCount: activeQueueLength,
    blockedDuplicatesCount: counters.blockedDuplicatesCount,
    blockedRateLimitCount: counters.blockedRateLimitCount,
    humanizedMessagesCount: counters.humanizedMessagesCount,
    lastDelayAppliedSeconds: counters.lastDelayAppliedSeconds,
    consecutiveBurstCount: consecutiveBurstCounter,
    healthScore: Math.max(10, Math.min(100, score)),
    lastProtectedAction: counters.lastProtectedAction
  };
}

function getContextualGreeting(): string {
  const hour = new Date().getHours();
  const timeGreeting = hour >= 5 && hour < 12 ? 'Bom dia' : hour >= 12 && hour < 18 ? 'Boa tarde' : 'Boa noite';
  const options = [
    `Olá! ${timeGreeting}`,
    `${timeGreeting}, tudo bem?`,
    `Oi, ${timeGreeting.toLowerCase()}`,
    `Olá`,
    `${timeGreeting}`
  ];
  return options[Math.floor(Math.random() * options.length)];
}

export function humanizeWhatsAppMessage(rawText: string, config = getAntiBanConfig()): string {
  if (!config.enabled || !config.dynamicVariationEnabled) return rawText;
  let result = rawText;

  // 1. Vary standard greeting openings so repeated templates aren't byte-identical at the start
  if (config.varyGreetings) {
    const greeting = getContextualGreeting();
    if (/^(Olá|Oi|Bom dia|Boa tarde|Boa noite)\b/i.test(result)) {
      result = result.replace(/^(Olá|Oi|Bom dia|Boa tarde|Boa noite)(!|,)?/i, `${greeting},`);
    } else {
      result = result.replace(/\n\n(Olá|Oi|Bom dia|Boa tarde|Boa noite)(!|,)?/i, `\n\n${greeting},`);
    }
  }

  // 2. Append subtle unique operational verification hash + timestamp so every message has a unique payload hash
  if (config.appendUniqueProtocol && !result.includes('Protocolo #') && !result.includes('Ref: #')) {
    const shortHash = Math.random().toString(36).substring(2, 6).toUpperCase();
    const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    result = `${result}\n\n_🔒 Ref: #${shortHash} • ${timeStr}_`;
  }

  return result;
}

function normalizeMessageForComparison(text: string): string {
  return String(text || '')
    .replace(/_🔒 Ref: #[A-Z0-9]+ • \d{2}:\d{2}_/g, '')
    .replace(/^(Olá|Oi|Bom dia|Boa tarde|Boa noite)[^\n]*/im, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function isWithinSafeHours(config = getAntiBanConfig()): boolean {
  if (!config.enabled || !config.safeHoursEnabled) return true;
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [startH, startM] = (config.safeHoursStart || '07:00').split(':').map(Number);
  const [endH, endM] = (config.safeHoursEnd || '21:30').split(':').map(Number);
  const startMinutes = (isNaN(startH) ? 7 : startH) * 60 + (isNaN(startM) ? 0 : startM);
  const endMinutes = (isNaN(endH) ? 21 : endH) * 60 + (isNaN(endM) ? 30 : endM);

  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }
  return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
}

export async function executeSafeWhatsAppSend(params: {
  to: string;
  recipientName: string;
  message: string;
  providerMode: string;
  altServerUrl: string;
  altApiKey: string;
  altInstance: string;
  isManualChat?: boolean;
  isDirectTest?: boolean;
  isHighPriority?: boolean;
}): Promise<{
  ok: boolean;
  status: 'sent' | 'simulated' | 'failed' | 'blocked_antiban';
  finalMessage: string;
  delayAppliedSeconds: number;
  error?: string;
  data?: any;
}> {
  const cleanTo = normalizeBrazilPhone(params.to);
  const config = getAntiBanConfig();

  // Check 1: Anti-Duplication Window (same phone + same message content within blockDuplicateWindowMinutes)
  if (
    config.enabled &&
    config.deduplicationEnabled &&
    !params.isDirectTest &&
    !params.isManualChat
  ) {
    const windowMs = (config.blockDuplicateWindowMinutes || 15) * 60 * 1000;
    const nowMs = Date.now();
    const targetFingerprint = normalizeMessageForComparison(params.message);
    const recentEvents = getWhatsAppTrafficEvents();

    const isDuplicate = recentEvents.some(ev => {
      if (ev.direction !== 'outbound') return false;
      if (ev.status !== 'sent' && ev.status !== 'delivered') return false;
      if (normalizeBrazilPhone(ev.recipientPhone) !== cleanTo) return false;
      const evTime = new Date(ev.createdAt || ev.timestamp).getTime();
      if (isNaN(evTime) || nowMs - evTime > windowMs) return false;
      return normalizeMessageForComparison(ev.text || '') === targetFingerprint;
    });

    if (isDuplicate) {
      const counters = getRuntimeCounters();
      const actionMsg = `Duplicidade bloqueada para +${cleanTo} (mesma mensagem enviada há menos de ${config.blockDuplicateWindowMinutes} min).`;
      updateRuntimeCounters({
        blockedDuplicatesCount: counters.blockedDuplicatesCount + 1,
        lastProtectedAction: actionMsg
      });
      return {
        ok: false,
        status: 'blocked_antiban',
        finalMessage: params.message,
        delayAppliedSeconds: 0,
        error: `Proteção Anti-Ban: ${actionMsg}`
      };
    }
  }

  // Check 2: Safe Hours Window
  if (
    config.enabled &&
    config.safeHoursEnabled &&
    !params.isDirectTest &&
    !params.isManualChat &&
    !(config.allowHighPriorityOutsideSafeHours && params.isHighPriority)
  ) {
    if (!isWithinSafeHours(config)) {
      const actionMsg = `Envio automático retido fora da janela de horário seguro (${config.safeHoursStart} às ${config.safeHoursEnd}).`;
      updateRuntimeCounters({ lastProtectedAction: actionMsg });
      return {
        ok: false,
        status: 'blocked_antiban',
        finalMessage: params.message,
        delayAppliedSeconds: 0,
        error: `Proteção Anti-Ban: ${actionMsg}`
      };
    }
  }

  // Check 3: Hourly & Daily Rate Limits
  if (config.enabled && config.rateLimitEnabled && !params.isDirectTest) {
    const liveStats = getAntiBanLiveStats();
    if (liveStats.sentToday >= config.maxMessagesPerDay) {
      const counters = getRuntimeCounters();
      const actionMsg = `Limite diário de segurança atingido (${config.maxMessagesPerDay} mensagens/dia).`;
      updateRuntimeCounters({
        blockedRateLimitCount: counters.blockedRateLimitCount + 1,
        lastProtectedAction: actionMsg
      });
      return {
        ok: false,
        status: 'blocked_antiban',
        finalMessage: params.message,
        delayAppliedSeconds: 0,
        error: `Proteção Anti-Ban: ${actionMsg}`
      };
    }
    if (liveStats.sentLastHour >= config.maxMessagesPerHour) {
      const counters = getRuntimeCounters();
      const actionMsg = `Limite por hora atingido (${config.maxMessagesPerHour} mensagens/hora). Aguarde para proteger o chip.`;
      updateRuntimeCounters({
        blockedRateLimitCount: counters.blockedRateLimitCount + 1,
        lastProtectedAction: actionMsg
      });
      return {
        ok: false,
        status: 'blocked_antiban',
        finalMessage: params.message,
        delayAppliedSeconds: 0,
        error: `Proteção Anti-Ban: ${actionMsg}`
      };
    }
  }

  // Enqueue into the sequential cadence queue so concurrent sends never collide
  activeQueueLength++;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('whatsapp-antiban-updated'));
  }

  const runTask = async () => {
    try {
      let delayMs = 0;

      if (config.enabled && !params.isDirectTest) {
        const now = Date.now();
        const elapsedSinceLastSend = lastDispatchCompletedAt > 0 ? now - lastDispatchCompletedAt : Infinity;

        // 1. Random cadence delay if another message was sent recently
        if (config.randomDelayEnabled && !params.isManualChat) {
          const minMs = Math.max(1, config.minDelaySeconds) * 1000;
          const maxMs = Math.max(minMs, config.maxDelaySeconds * 1000);
          const randomJitterMs = Math.floor(minMs + Math.random() * (maxMs - minMs + 1));

          if (elapsedSinceLastSend < randomJitterMs) {
            delayMs = Math.max(delayMs, randomJitterMs - elapsedSinceLastSend);
          } else if (activeQueueLength > 1) {
            delayMs = Math.max(delayMs, randomJitterMs);
          }
        }

        // 2. Per-recipient cooldown if sending multiple messages to the exact same phone number
        if (config.deduplicationEnabled && !params.isManualChat) {
          const lastRecipientSent = lastRecipientSentAtMap.get(cleanTo) || 0;
          const elapsedForRecipient = lastRecipientSent > 0 ? now - lastRecipientSent : Infinity;
          const cooldownMs = (config.recipientCooldownSeconds || 12) * 1000;
          if (elapsedForRecipient < cooldownMs) {
            delayMs = Math.max(delayMs, cooldownMs - elapsedForRecipient);
          }
        }

        // 3. Per-minute rate limit smoothing
        if (config.rateLimitEnabled) {
          const currentStats = getAntiBanLiveStats();
          if (currentStats.sentLastMinute >= config.maxMessagesPerMinute) {
            delayMs = Math.max(delayMs, 12000);
          }
        }

        // 4. Burst breathing pause every N consecutive messages
        if (
          config.rateLimitEnabled &&
          consecutiveBurstCounter > 0 &&
          consecutiveBurstCounter % config.burstThreshold === 0 &&
          !params.isManualChat
        ) {
          delayMs = Math.max(delayMs, Math.min(config.pauseSecondsOnBurst * 1000, 25000));
        }
      }

      const appliedDelaySec = Math.round(delayMs / 1000);
      if (delayMs > 0) {
        updateRuntimeCounters({
          lastDelayAppliedSeconds: appliedDelaySec,
          lastProtectedAction: `Cadência inteligente aplicou intervalo de ${appliedDelaySec}s antes de enviar para +${cleanTo}.`
        });
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }

      // Apply dynamic text variation / humanization for automated dispatches
      const finalMessage =
        params.isManualChat
          ? params.message
          : humanizeWhatsAppMessage(params.message, config);

      if (finalMessage !== params.message) {
        const counters = getRuntimeCounters();
        updateRuntimeCounters({
          humanizedMessagesCount: counters.humanizedMessagesCount + 1,
          lastDelayAppliedSeconds: appliedDelaySec
        });
      }

      // Calculate natural typing simulation delay for W-API (1 to 4 seconds)
      const typingDelaySeconds =
        config.enabled && config.simulateTyping
          ? Math.min(5, Math.max(1, Math.round(finalMessage.length / 95) + Math.floor(Math.random() * 2)))
          : 1;

      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: cleanTo,
          message: finalMessage,
          providerMode: params.providerMode,
          altServerUrl: params.altServerUrl,
          altApiKey: params.altApiKey,
          altInstance: params.altInstance,
          delayMessage: typingDelaySeconds
        })
      });

      const data = await res.json().catch(() => ({}));
      lastDispatchCompletedAt = Date.now();
      lastRecipientSentAtMap.set(cleanTo, lastDispatchCompletedAt);
      consecutiveBurstCounter++;

      if (res.ok && data.success && !data.simulated) {
        return {
          ok: true,
          status: 'sent' as const,
          finalMessage,
          delayAppliedSeconds: appliedDelaySec || typingDelaySeconds,
          data
        };
      } else if (data.simulated) {
        return {
          ok: false,
          status: 'simulated' as const,
          finalMessage,
          delayAppliedSeconds: appliedDelaySec,
          error: data.error,
          data
        };
      } else {
        return {
          ok: false,
          status: 'failed' as const,
          finalMessage,
          delayAppliedSeconds: appliedDelaySec,
          error: data.error || 'Falha ao enviar pela W-API',
          data
        };
      }
    } catch (err: any) {
      return {
        ok: false,
        status: 'failed' as const,
        finalMessage: params.message,
        delayAppliedSeconds: 0,
        error: err?.message || 'Erro de conexão ao disparar WhatsApp'
      };
    } finally {
      activeQueueLength = Math.max(0, activeQueueLength - 1);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('whatsapp-antiban-updated'));
      }
    }
  };

  const resultPromise = dispatchChainPromise.then(runTask, runTask);
  dispatchChainPromise = resultPromise.catch(() => {});
  return resultPromise;
}

export async function pushWhatsAppCloudUpdate(payload: Record<string, any>): Promise<any> {
  if (typeof window === 'undefined') return null;
  try {
    const res = await fetch('/api/whatsapp/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.success && data?.state) {
      applyCloudStateToLocalStorage(data.state, data.profilePhones);
      return data.state;
    }
  } catch (err) {
    console.warn('Error pushing WhatsApp cloud update:', err);
  }
  return null;
}

export async function syncWhatsAppStateWithCloud(): Promise<any> {
  if (typeof window === 'undefined') return null;
  try {
    const localProvider = getProviderConfig();
    const localDirectory = getDirectoryConfig();
    const localRules = getAutomationRules();
    const localLogs = getAutomationLogs();
    const localAutoInbox = getAutomatedInboxMessages();
    const localTraffic = getWhatsAppTrafficEvents();
    const localAntiBan = getAntiBanConfig();

    let localChats: any[] = [];
    let localMessages: Record<string, any[]> = {};
    let localDeletedIds: string[] = [];

    try {
      const rawChats = localStorage.getItem(REAL_CHATS_STORAGE_KEY);
      if (rawChats) {
        const parsed = JSON.parse(rawChats);
        if (Array.isArray(parsed)) localChats = parsed;
      }
    } catch {}

    try {
      const rawMsgs = localStorage.getItem(REAL_MESSAGES_STORAGE_KEY);
      if (rawMsgs) {
        const parsed = JSON.parse(rawMsgs);
        if (parsed && typeof parsed === 'object') localMessages = parsed;
      }
    } catch {}

    try {
      const rawDel = localStorage.getItem(DELETED_CHATS_STORAGE_KEY);
      if (rawDel) {
        const parsed = JSON.parse(rawDel);
        if (Array.isArray(parsed)) localDeletedIds = parsed;
      }
    } catch {}

    const res = await fetch('/api/whatsapp/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        providerConfig: localProvider,
        directory: localDirectory,
        rules: localRules,
        antiBanConfig: localAntiBan,
        customerContacts: getCustomerContacts(),
        campaigns: getWhatsAppCampaigns(),
        chats: localChats,
        deletedChatIds: localDeletedIds,
        chatMessages: localMessages,
        automatedInboxMessages: localAutoInbox,
        logs: localLogs,
        trafficEvents: localTraffic
      })
    });

    const data = await res.json().catch(() => null);
    if (res.ok && data?.success && data?.state) {
      applyCloudStateToLocalStorage(data.state, data.profilePhones);
      return data.state;
    }
  } catch (err) {
    console.warn('Error syncing WhatsApp state with cloud:', err);
  }
  return null;
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
  // Ensure device has the latest cloud directory, profile phones, and W-API config before resolving recipients
  const initialDir = getDirectoryConfig();
  const initialProv = getProviderConfig();
  if (!initialDir.adminPhone || !initialProv.altApiKey || !initialProv.altInstance) {
    await syncWhatsAppStateWithCloud();
  }

  // Ensure collaborator phones from user profiles are loaded when sending to a collaborator or driver
  const cachedProfiles = getCachedProfilePhones();
  const targetCollabOrDriver = variables.colaborador || variables.motorista;
  if (
    cachedProfiles.length === 0 ||
    (targetCollabOrDriver &&
      !findCollaboratorProfilePhone(
        targetCollabOrDriver,
        variables.collaboratorPhone || variables.driverPhone || variables.phone,
        variables.colaboradorId || variables.driverId
      ))
  ) {
    await syncCollaboratorPhonesFromProfiles();
  }

  const rules = getAutomationRules();
  const customTriggers = getCustomTriggers();
  const matchingRules = rules.filter(r => {
    if (options?.forceRuleId) return r.id === options.forceRuleId;
    if (!r.enabled) return false;
    if (r.trigger !== trigger) {
      const customTrig = customTriggers.find(ct => ct.id === r.trigger);
      if (!customTrig || customTrig.systemActionKey !== trigger) return false;
      if (
        customTrig.firingMode === 'status_change' &&
        customTrig.conditionStatusValue &&
        variables.status &&
        customTrig.conditionStatusValue.toLowerCase() !== String(variables.status).toLowerCase()
      ) {
        return false;
      }
    }
    if (r.conditionStatus && r.conditionStatus.length > 0 && variables.status) {
      return r.conditionStatus.some(s => s.toLowerCase() === String(variables.status).toLowerCase());
    }
    return true;
  });

  if (matchingRules.length === 0) {
    return { triggeredCount: 0, logs: [] };
  }

  const currentProv = getProviderConfig();
  const providerMode = currentProv.providerMode || 'alternative';
  const altServerUrl = currentProv.altServerUrl || 'https://api.w-api.app';
  const altApiKey = currentProv.altApiKey || '';
  const altInstance = currentProv.altInstance || '';

  const createdLogs: WhatsAppAutomationLog[] = [];
  const now = new Date();
  const nowFormatted = `Hoje, ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  let lastError: string | undefined;

  const isDirectTest = Boolean(options?.forceRuleId);
  const isHighPriority =
    String(variables.prioridade || '').toLowerCase() === 'alta' ||
    String(variables.prioridade || '').toLowerCase() === 'urgente' ||
    trigger === 'special_delivery_alert';

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

    const baseInterpolatedMessage = interpolateTemplate(rule.template, {
      ...variables,
      colaborador: variables.colaborador || recipientName,
      motorista: variables.motorista || recipientName
    });

    const dispatchResult = await executeSafeWhatsAppSend({
      to: recipientPhone,
      recipientName,
      message: baseInterpolatedMessage,
      providerMode,
      altServerUrl,
      altApiKey,
      altInstance,
      isDirectTest,
      isHighPriority
    });

    if (dispatchResult.status === 'blocked_antiban') {
      lastError = dispatchResult.error;
      continue;
    }

    const sendStatus: 'sent' | 'simulated' | 'failed' = dispatchResult.status;
    const finalMessage = dispatchResult.finalMessage;
    if (dispatchResult.error) {
      lastError = dispatchResult.error;
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
      createdAt: new Date().toISOString(),
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

// ============================================================================
// MASS CAMPAIGNS, CUSTOMER AUDIENCE & REPLY TRACKING ENGINE
// ============================================================================

const CUSTOMER_CONTACTS_STORAGE_KEY = 'whatsapp_customer_contacts_v1';
const CAMPAIGNS_STORAGE_KEY = 'whatsapp_campaigns_v1';

export type WhatsAppCampaignCategory =
  | 'novidades'
  | 'promocao'
  | 'acao_loja'
  | 'queima_estoque'
  | 'vip_cupom'
  | 'pos_venda';

export interface WhatsAppCustomerContact {
  id: string;
  name: string;
  phone: string;
  tags: string[];
  cityOrNeighborhood?: string;
  notes?: string;
  optOut?: boolean;
  lastCampaignAt?: string;
  lastReplyAt?: string;
  lastReplyText?: string;
  createdAt: string;
}

export type CampaignRecipientStatus =
  | 'pending'
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'replied'
  | 'failed'
  | 'skipped_optout'
  | 'blocked_antiban';

export type CampaignReplyIntent =
  | 'interesse'
  | 'duvida'
  | 'agradecimento'
  | 'optout'
  | 'outro';

export type CampaignFollowUpStatus =
  | 'aguardando_atendimento'
  | 'em_atendimento'
  | 'convertido'
  | 'arquivado';

export interface WhatsAppCampaignRecipient {
  id: string;
  customerId?: string;
  name: string;
  phone: string;
  tags: string[];
  status: CampaignRecipientStatus;
  sentMessage?: string;
  sentAt?: string;
  sentAtIso?: string;
  delayAppliedSeconds?: number;
  error?: string;
  repliedAt?: string;
  repliedAtIso?: string;
  replyText?: string;
  replyIntent?: CampaignReplyIntent;
  followUpStatus?: CampaignFollowUpStatus;
  followUpNotes?: string;
}

export interface WhatsAppCampaign {
  id: string;
  name: string;
  category: WhatsAppCampaignCategory;
  storeName: string;
  couponCode?: string;
  ctaLinkOrAction?: string;
  template: string;
  targetTags: string[];
  status: 'draft' | 'running' | 'paused' | 'completed';
  includeOptOutFooter: boolean;
  triggerWhenMode?: 'immediate' | 'scheduled' | 'event';
  scheduledDate?: string;
  scheduledTime?: string;
  triggerEventName?: string;
  recipients: WhatsAppCampaignRecipient[];
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  updatedAt: string;
}

export const CUSTOMER_SEGMENT_TAGS = [
  'VIP',
  'Varejo',
  'Atacado',
  'Obras & Construção',
  'Novidades',
  'Promoções',
  'Pós-Venda',
  'Reativação'
];

export const CAMPAIGN_CATEGORY_META: Record<
  WhatsAppCampaignCategory,
  { label: string; badgeColor: string; description: string }
> = {
  novidades: {
    label: 'Novidades da Loja',
    badgeColor: 'blue',
    description: 'Lançamentos, reposição de mercadorias e novos produtos em estoque'
  },
  promocao: {
    label: 'Promoção & Ofertas',
    badgeColor: 'emerald',
    description: 'Descontos especiais, ofertas da semana e condições imperdíveis'
  },
  acao_loja: {
    label: 'Ação da Loja & Eventos',
    badgeColor: 'purple',
    description: 'Sábado premiado, café na loja, feirão de fábrica e ações presenciais'
  },
  queima_estoque: {
    label: 'Queima de Estoque',
    badgeColor: 'amber',
    description: 'Liquidação relâmpago de pontas de estoque com giro rápido'
  },
  vip_cupom: {
    label: 'Clube VIP & Cupom',
    badgeColor: 'rose',
    description: 'Condição exclusiva ou cupom de desconto para clientes recorrentes'
  },
  pos_venda: {
    label: 'Pós-Venda & Retorno',
    badgeColor: 'cyan',
    description: 'Acompanhamento de satisfação, recompra e relacionamento ativo'
  }
};

export const STORE_CAMPAIGN_TEMPLATES: Array<{
  id: string;
  title: string;
  category: WhatsAppCampaignCategory;
  couponCode?: string;
  template: string;
}> = [
  {
    id: 'tpl-novidades-estoque',
    title: 'Chegaram Novidades na Loja',
    category: 'novidades',
    couponCode: 'NOVIDADE10',
    template:
      'Olá, *{primeiro_nome}*! Tudo bem?\n\nAcabaram de chegar novidades incríveis aqui na *{loja}*! Separamos condições especiais para você conferir em primeira mão:\n\n✨ *Destaques da Semana:*\n• Produtos selecionados a pronta-entrega\n• Condições facilitadas e entrega rápida\n• Cupom especial: *{cupom}*\n\nResponda *EU QUERO* aqui no WhatsApp que te envio o catálogo atualizado ou separo seu pedido agora mesmo!'
  },
  {
    id: 'tpl-promocao-relampago',
    title: 'Promoção Relâmpago / Oferta da Semana',
    category: 'promocao',
    couponCode: 'OFERTA15',
    template:
      'Oi, *{primeiro_nome}*! Passando com uma oportunidade especial da *{loja}* para você:\n\n🔥 *PROMOÇÃO DA SEMANA LIBERADA!*\nLiberamos descontos reais em itens selecionados da loja somente até esgotar o lote atual.\n\n🎟️ Apresente ou informe o código *{cupom}* no atendimento.\n\nQuer saber os valores ou garantir o seu? Me chama aqui dizendo qual item você procura!'
  },
  {
    id: 'tpl-acao-loja-fim-semana',
    title: 'Ação Especial na Loja / Feirão',
    category: 'acao_loja',
    couponCode: 'VIPFEIRAO',
    template:
      'Olá, *{primeiro_nome}*! Convite especial da equipe *{loja}* 🎯\n\nPreparamos uma *Ação Especial na Loja* com preços direto de fábrica, atendimento prioritário e entrega agilizada para sua região!\n\n📍 Você pode garantir os mesmos preços da ação diretamente por aqui no WhatsApp.\n\nResponda *ORÇAMENTO* ou mande sua lista para nossa equipe cotar agora para você!'
  },
  {
    id: 'tpl-queima-estoque',
    title: 'Queima de Estoque / Últimas Unidades',
    category: 'queima_estoque',
    couponCode: 'LIQUIDA20',
    template:
      '*{primeiro_nome}*, alerta de oportunidade na *{loja}*! ⚡\n\nAbrimos nossa *Queima de Estoque* em lotes selecionados com preços abaixo da tabela para giro rápido.\n\n✅ Pronta-entrega imediata\n✅ Reserva rápida pelo WhatsApp\n\nResponda *TABELA* aqui na conversa que te mando os itens disponíveis antes que acabem!'
  },
  {
    id: 'tpl-clube-vip',
    title: 'Benefício Exclusivo Cliente VIP',
    category: 'vip_cupom',
    couponCode: 'CLIENTEVIP',
    template:
      'Olá, *{primeiro_nome}*! Como você é um cliente especial da *{loja}*, liberamos um benefício exclusivo no seu cadastro hoje:\n\n🎁 *Condição VIP + Brinde/Desconto com o cupom {cupom}*\n\nPrecisa repor algum item ou fazer uma cotação rápida? É só responder esta mensagem que já te atendo com prioridade!'
  },
  {
    id: 'tpl-pos-venda',
    title: 'Pós-Venda & Pesquisa de Satisfação',
    category: 'pos_venda',
    couponCode: 'VOLTE10',
    template:
      'Oi, *{primeiro_nome}*! Aqui é da *{loja}*.\n\nPassando para saber se deu tudo certo com sua última compra/entrega e se você ficou satisfeito(a) com nosso atendimento!\n\nPara sua próxima compra, deixamos o cupom *{cupom}* ativo no seu número. Qualquer dúvida ou necessidade, estamos à disposição por aqui!'
  }
];

export function getCustomerContacts(): WhatsAppCustomerContact[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CUSTOMER_CONTACTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((c: any) => c && c.phone && !isPlaceholderPhone(c.phone))
      .map((c: any) => ({
        ...c,
        phone: normalizeBrazilPhone(c.phone),
        tags: Array.isArray(c.tags) && c.tags.length > 0 ? c.tags : ['Varejo']
      }));
  } catch {
    return [];
  }
}

export function saveCustomerContacts(
  contacts: WhatsAppCustomerContact[],
  syncCloud = true
): WhatsAppCustomerContact[] {
  const dedupedMap = new Map<string, WhatsAppCustomerContact>();
  for (const c of contacts) {
    const cleanPhone = normalizeBrazilPhone(c.phone);
    if (!cleanPhone || isPlaceholderPhone(cleanPhone)) continue;
    const existing = dedupedMap.get(cleanPhone);
    if (existing) {
      const mergedTags = Array.from(new Set([...(existing.tags || []), ...(c.tags || [])]));
      dedupedMap.set(cleanPhone, {
        ...existing,
        ...c,
        phone: cleanPhone,
        tags: mergedTags.length > 0 ? mergedTags : ['Varejo']
      });
    } else {
      dedupedMap.set(cleanPhone, {
        ...c,
        id: c.id || `cust-${cleanPhone}`,
        phone: cleanPhone,
        tags: Array.isArray(c.tags) && c.tags.length > 0 ? c.tags : ['Varejo'],
        createdAt: c.createdAt || new Date().toISOString()
      });
    }
  }

  const finalContacts = Array.from(dedupedMap.values());
  if (typeof window !== 'undefined') {
    localStorage.setItem(CUSTOMER_CONTACTS_STORAGE_KEY, JSON.stringify(finalContacts));
    window.dispatchEvent(new Event('whatsapp-campaigns-updated'));
    if (syncCloud) {
      void pushWhatsAppCloudUpdate({
        customerContacts: finalContacts,
        forceCustomersUpdate: true
      });
    }
  }
  return finalContacts;
}

export function importCustomersFromWhatsAppChatsAndDeliveries(): {
  importedCount: number;
  totalCount: number;
  contacts: WhatsAppCustomerContact[];
} {
  if (typeof window === 'undefined') {
    return { importedCount: 0, totalCount: 0, contacts: [] };
  }

  const current = getCustomerContacts();
  const existingPhones = new Set(current.map(c => normalizeBrazilPhone(c.phone)));
  const profilePhones = new Set(
    getCachedProfilePhones().map(p => normalizeBrazilPhone(p.phone))
  );

  const newlyFound: WhatsAppCustomerContact[] = [];

  // 1. Scan real WhatsApp chats (whatsapp_chats_v2)
  try {
    const rawChats = localStorage.getItem(REAL_CHATS_STORAGE_KEY);
    if (rawChats) {
      const chats = JSON.parse(rawChats);
      if (Array.isArray(chats)) {
        for (const ch of chats) {
          const cleanPhone = normalizeBrazilPhone(ch?.phone);
          if (!cleanPhone || isPlaceholderPhone(cleanPhone)) continue;
          // Skip internal team members unless they are already customers
          const roleLower = String(ch?.roleOrDept || '').toLowerCase();
          const isInternalCollab =
            profilePhones.has(cleanPhone) ||
            roleLower.includes('(perfil)') ||
            roleLower.includes('motorista') ||
            roleLower.includes('colaborador');
          if (isInternalCollab && existingPhones.size > 0) continue;

          if (!existingPhones.has(cleanPhone)) {
            existingPhones.add(cleanPhone);
            newlyFound.push({
              id: `cust-${cleanPhone}`,
              name: String(ch.name || `Cliente ${cleanPhone.slice(-4)}`).trim(),
              phone: cleanPhone,
              tags: ['Varejo', 'Novidades', 'Promoções'],
              cityOrNeighborhood: ch.roleOrDept && !isInternalCollab ? ch.roleOrDept : 'Atendimento WhatsApp',
              optOut: false,
              createdAt: new Date().toISOString()
            });
          }
        }
      }
    }
  } catch {}

  // 2. If still no external contacts and admin/profile phones exist, allow importing from chats so admin can test
  if (current.length === 0 && newlyFound.length === 0) {
    try {
      const rawChats = localStorage.getItem(REAL_CHATS_STORAGE_KEY);
      if (rawChats) {
        const chats = JSON.parse(rawChats);
        if (Array.isArray(chats)) {
          for (const ch of chats) {
            const cleanPhone = normalizeBrazilPhone(ch?.phone);
            if (!cleanPhone || isPlaceholderPhone(cleanPhone)) continue;
            if (!existingPhones.has(cleanPhone)) {
              existingPhones.add(cleanPhone);
              newlyFound.push({
                id: `cust-${cleanPhone}`,
                name: String(ch.name || `Contato ${cleanPhone.slice(-4)}`).trim(),
                phone: cleanPhone,
                tags: ['VIP', 'Novidades', 'Promoções'],
                cityOrNeighborhood: ch.roleOrDept || 'WhatsApp',
                optOut: false,
                createdAt: new Date().toISOString()
              });
            }
          }
        }
      }
    } catch {}
  }

  const combined = saveCustomerContacts([...newlyFound, ...current]);
  return {
    importedCount: newlyFound.length,
    totalCount: combined.length,
    contacts: combined
  };
}

export function importCustomersFromBulkText(
  rawText: string,
  defaultTags: string[] = ['Varejo', 'Promoções']
): { importedCount: number; contacts: WhatsAppCustomerContact[] } {
  const lines = String(rawText || '')
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  const current = getCustomerContacts();
  const newItems: WhatsAppCustomerContact[] = [];

  for (const line of lines) {
    // Supports "Nome, Telefone, Bairro/Tag" or "Nome; Telefone" or "Nome - Telefone" or just "Telefone"
    const parts = line.split(/[,;|\t]+/).map(p => p.trim()).filter(Boolean);
    let name = '';
    let phone = '';
    let extraTagOrCity = '';

    if (parts.length >= 2) {
      // Find which part looks like a phone number
      const phoneIdx = parts.findIndex(p => p.replace(/\D/g, '').length >= 10);
      if (phoneIdx !== -1) {
        phone = normalizeBrazilPhone(parts[phoneIdx]);
        name = parts[phoneIdx === 0 ? 1 : 0] || `Cliente ${phone.slice(-4)}`;
        extraTagOrCity = parts.find((_, idx) => idx !== phoneIdx && idx !== (phoneIdx === 0 ? 1 : 0)) || '';
      }
    } else {
      // Try splitting by hyphen "João Silva - 83999998888"
      const dashMatch = line.match(/^(.+?)\s*[-:]\s*([+\d()\s-]{10,})$/);
      if (dashMatch) {
        name = dashMatch[1].trim();
        phone = normalizeBrazilPhone(dashMatch[2]);
      } else {
        const digits = line.replace(/\D/g, '');
        if (digits.length >= 10) {
          phone = normalizeBrazilPhone(digits);
          const alphaPart = line.replace(/[+\d()\s-]+/g, ' ').trim();
          name = alphaPart.length >= 2 ? alphaPart : `Cliente ${phone.slice(-4)}`;
        }
      }
    }

    if (phone && !isPlaceholderPhone(phone)) {
      const tags = Array.from(
        new Set([
          ...defaultTags,
          ...(extraTagOrCity &&CUSTOMER_SEGMENT_TAGS.includes(extraTagOrCity) ? [extraTagOrCity] : [])
        ])
      );
      newItems.push({
        id: `cust-${phone}`,
        name: name || `Cliente ${phone.slice(-4)}`,
        phone,
        tags: tags.length > 0 ? tags : ['Varejo'],
        cityOrNeighborhood: extraTagOrCity || undefined,
        optOut: false,
        createdAt: new Date().toISOString()
      });
    }
  }

  const updated = saveCustomerContacts([...newItems, ...current]);
  return {
    importedCount: newItems.length,
    contacts: updated
  };
}

export function getWhatsAppCampaigns(): WhatsAppCampaign[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CAMPAIGNS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveWhatsAppCampaigns(
  campaigns: WhatsAppCampaign[],
  syncCloud = true
): WhatsAppCampaign[] {
  if (typeof window !== 'undefined') {
    localStorage.setItem(CAMPAIGNS_STORAGE_KEY, JSON.stringify(campaigns));
    window.dispatchEvent(new Event('whatsapp-campaigns-updated'));
    if (syncCloud) {
      void pushWhatsAppCloudUpdate({
        campaigns,
        forceCampaignsUpdate: true
      });
    }
  }
  return campaigns;
}

export function interpolateCampaignMessage(
  template: string,
  params: {
    customerName: string;
    storeName?: string;
    couponCode?: string;
    includeOptOutFooter?: boolean;
  }
): string {
  const fullName = String(params.customerName || 'Cliente').trim();
  const firstName = fullName.split(/\s+/)[0] || 'Cliente';
  const hour = new Date().getHours();
  const saudacao = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const todayStr = new Date().toLocaleDateString('pt-BR');

  const vars: Record<string, string> = {
    nome: fullName,
    primeiro_nome: firstName,
    cliente: fullName,
    saudacao,
    loja: params.storeName || 'Nossa Loja',
    cupom: params.couponCode || 'VIP10',
    data: todayStr
  };

  let body = String(template || '').replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => {
    const k = String(key).toLowerCase();
    return vars[k] !== undefined ? vars[k] : match;
  });

  if (
    params.includeOptOutFooter &&
    !body.toLowerCase().includes('responda sair') &&
    !body.toLowerCase().includes('digite sair')
  ) {
    body = `${body.trim()}\n\n_Caso não queira mais receber nossas novidades, responda SAIR._`;
  }

  return body;
}

function classifyCustomerReplyIntent(text: string): CampaignReplyIntent {
  const norm = normalizeSearchKey(text);
  if (
    /\b(sair|parar|cancelar|descadastrar|nao quero|pare|remover|bloqueia)\b/.test(norm)
  ) {
    return 'optout';
  }
  if (
    /\b(quero|eu quero|valor|preco|quanto|orcamento|cotacao|tabela|separar|reserva|reservar|tem|comprar|entrega|pix|cartao|manda|envia|catalogo|interesse|pedido)\b/.test(
      norm
    )
  ) {
    return 'interesse';
  }
  if (
    text.includes('?') ||
    /\b(como|onde|qual|quais|funciona|horario|aberto|endereco|frete|prazo|garantia|duvida)\b/.test(norm)
  ) {
    return 'duvida';
  }
  if (/\b(obrigado|obrigada|valeu|show|top|perfeito|otimo|beleza|ok|combinado)\b/.test(norm)) {
    return 'agradecimento';
  }
  return 'outro';
}

/**
 * Automatically scans real WhatsApp chat messages (whatsapp_chat_messages_v2)
 * and correlates customer replies back to active/completed campaigns & customer records.
 */
export function syncCampaignRepliesFromChatMessages(): {
  campaigns: WhatsAppCampaign[];
  newRepliesDetected: number;
} {
  if (typeof window === 'undefined') {
    return { campaigns: [], newRepliesDetected: 0 };
  }

  const campaigns = getWhatsAppCampaigns();
  if (campaigns.length === 0) {
    return { campaigns: [], newRepliesDetected: 0 };
  }

  let chatMessagesMap: Record<string, any[]> = {};
  try {
    const rawMsgs = localStorage.getItem(REAL_MESSAGES_STORAGE_KEY);
    if (rawMsgs) {
      const parsed = JSON.parse(rawMsgs);
      if (parsed && typeof parsed === 'object') {
        chatMessagesMap = parsed;
      }
    }
  } catch {}

  // Build a lookup from normalized phone -> list of inbound messages
  const inboundByPhone = new Map<string, any[]>();
  for (const [chatId, msgs] of Object.entries(chatMessagesMap)) {
    if (!Array.isArray(msgs)) continue;
    const chatPhone = normalizeBrazilPhone(chatId.replace(/^chat-/, ''));
    if (!chatPhone) continue;

    const inboundMsgs = msgs.filter(
      m =>
        m &&
        m.text &&
        m.sender !== 'user' &&
        m.sender !== 'me' &&
        !String(m.text).startsWith('📋')
    );

    if (inboundMsgs.length > 0) {
      const existing = inboundByPhone.get(chatPhone) || [];
      inboundByPhone.set(chatPhone, [...existing, ...inboundMsgs]);
    }
  }

  let newRepliesDetected = 0;
  let campaignsChanged = false;
  const customers = getCustomerContacts();
  let customersChanged = false;

  const updatedCampaigns = campaigns.map(camp => {
    let campModified = false;
    const updatedRecipients = (camp.recipients || []).map(rec => {
      if (
        rec.status !== 'sent' &&
        rec.status !== 'delivered' &&
        rec.status !== 'read' &&
        rec.status !== 'replied'
      ) {
        return rec;
      }

      const cleanPhone = normalizeBrazilPhone(rec.phone);
      const inboundList = inboundByPhone.get(cleanPhone) || [];
      if (inboundList.length === 0) return rec;

      const sentTimeMs = rec.sentAtIso ? new Date(rec.sentAtIso).getTime() : 0;
      // Find the latest inbound message that arrived after sentTimeMs (with 60s clock tolerance)
      const matchingReplies = inboundList.filter(m => {
        if (!m.createdAt) return true;
        const msgMs = new Date(m.createdAt).getTime();
        if (isNaN(msgMs) || !sentTimeMs) return true;
        return msgMs >= sentTimeMs - 60000;
      });

      if (matchingReplies.length === 0) return rec;

      const latestReply = matchingReplies[matchingReplies.length - 1];
      const replyText = String(latestReply.text || '').trim();
      if (!replyText) return rec;

      if (rec.status === 'replied' && rec.replyText === replyText) {
        return rec;
      }

      const intent = classifyCustomerReplyIntent(replyText);
      const replyTimeLabel =
        latestReply.time ||
        new Date(latestReply.createdAt || Date.now()).toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit'
        });
      const replyIso = latestReply.createdAt || new Date().toISOString();

      campModified = true;
      campaignsChanged = true;
      newRepliesDetected++;

      // Update customer contact record (lastReplyText and optOut if requested)
      const custIdx = customers.findIndex(c => normalizeBrazilPhone(c.phone) === cleanPhone);
      if (custIdx !== -1) {
        customers[custIdx] = {
          ...customers[custIdx],
          lastReplyAt: replyTimeLabel,
          lastReplyText: replyText,
          optOut: intent === 'optout' ? true : customers[custIdx].optOut
        };
        customersChanged = true;
      }

      return {
        ...rec,
        status: 'replied' as CampaignRecipientStatus,
        repliedAt: replyTimeLabel,
        repliedAtIso: replyIso,
        replyText,
        replyIntent: intent,
        followUpStatus:
          rec.followUpStatus ||
          (intent === 'optout'
            ? 'arquivado'
            : intent === 'interesse' || intent === 'duvida'
            ? 'aguardando_atendimento'
            : 'em_atendimento')
      };
    });

    if (!campModified) return camp;
    return {
      ...camp,
      recipients: updatedRecipients,
      updatedAt: new Date().toISOString()
    };
  });

  if (customersChanged) {
    saveCustomerContacts(customers, true);
  }
  if (campaignsChanged) {
    saveWhatsAppCampaigns(updatedCampaigns, true);
  }

  return {
    campaigns: campaignsChanged ? updatedCampaigns : campaigns,
    newRepliesDetected
  };
}

/**
 * Records a message directly in the WhatsApp Chat history (`whatsapp_chats_v2` + `whatsapp_chat_messages_v2`)
 * so that every campaign broadcast or simulated reply appears seamlessly inside the "Conversas" tab.
 */
export function appendCampaignMessageToChatHistory(params: {
  phone: string;
  name: string;
  text: string;
  sender: 'user' | 'client';
  campaignName?: string;
}): void {
  if (typeof window === 'undefined') return;
  const cleanPhone = normalizeBrazilPhone(params.phone);
  if (!cleanPhone || isPlaceholderPhone(cleanPhone)) return;

  const chatId = `chat-${cleanPhone}`;
  const now = new Date();
  const timeLabel = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const nowIso = now.toISOString();

  try {
    // 1. Update messages map
    const rawMsgs = localStorage.getItem(REAL_MESSAGES_STORAGE_KEY);
    const messagesMap: Record<string, any[]> = rawMsgs ? JSON.parse(rawMsgs) : {};
    const existingList = Array.isArray(messagesMap[chatId]) ? messagesMap[chatId] : [];

    const newMsg = {
      id: `camp-msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      text: params.text,
      sender: params.sender,
      time: timeLabel,
      createdAt: nowIso,
      status: 'delivered',
      isAutomated: params.sender === 'user',
      campaignName: params.campaignName
    };

    messagesMap[chatId] = [...existingList, newMsg].slice(-250);
    localStorage.setItem(REAL_MESSAGES_STORAGE_KEY, JSON.stringify(messagesMap));

    // 2. Ensure chat exists in whatsapp_chats_v2
    const rawChats = localStorage.getItem(REAL_CHATS_STORAGE_KEY);
    const chatsList: any[] = rawChats ? JSON.parse(rawChats) : [];
    const existingIdx = chatsList.findIndex(
      c => c && (c.id === chatId || normalizeBrazilPhone(c.phone) === cleanPhone)
    );

    if (existingIdx !== -1) {
      const prev = chatsList[existingIdx];
      chatsList[existingIdx] = {
        ...prev,
        id: chatId,
        name: params.name || prev.name,
        phone: cleanPhone,
        lastMessage: params.text,
        lastMessageSender: params.sender,
        lastMessageStatus: 'delivered',
        time: timeLabel,
        unread: params.sender === 'client' ? (prev.unread || 0) + 1 : prev.unread || 0
      };
    } else {
      chatsList.unshift({
        id: chatId,
        name: params.name || `Cliente ${cleanPhone.slice(-4)}`,
        phone: cleanPhone,
        lastMessage: params.text,
        lastMessageSender: params.sender,
        lastMessageStatus: 'delivered',
        time: timeLabel,
        unread: params.sender === 'client' ? 1 : 0,
        online: true,
        type: 'contact',
        roleOrDept: 'Cliente (Campanha)',
        tags: ['Cliente', 'Campanha']
      });
    }

    localStorage.setItem(REAL_CHATS_STORAGE_KEY, JSON.stringify(chatsList));
    window.dispatchEvent(new Event('whatsapp-cloud-synced'));
  } catch (err) {
    console.warn('Error appending campaign message to chat history:', err);
  }
}

/**
 * Safely dispatches a single campaign recipient message through the Anti-Ban Engine
 * (`executeSafeWhatsAppSend`) and updates the chat history + traffic analytics.
 */
export async function dispatchCampaignRecipient(params: {
  campaign: WhatsAppCampaign;
  recipient: WhatsAppCampaignRecipient;
  isTestToAdmin?: boolean;
  overridePhone?: string;
}): Promise<{
  ok: boolean;
  status: CampaignRecipientStatus;
  finalMessage: string;
  delayAppliedSeconds: number;
  error?: string;
}> {
  const currentProv = getProviderConfig();
  const providerMode = currentProv.providerMode || 'alternative';
  const altServerUrl = currentProv.altServerUrl || 'https://api.w-api.app';
  const altApiKey = currentProv.altApiKey || '';
  const altInstance = currentProv.altInstance || '';

  const targetPhone = normalizeBrazilPhone(params.overridePhone || params.recipient.phone);
  if (!targetPhone || isPlaceholderPhone(targetPhone)) {
    return {
      ok: false,
      status: 'failed',
      finalMessage: '',
      delayAppliedSeconds: 0,
      error: 'Número de telefone inválido.'
    };
  }

  const interpolated = interpolateCampaignMessage(params.campaign.template, {
    customerName: params.recipient.name,
    storeName: params.campaign.storeName,
    couponCode: params.campaign.couponCode,
    includeOptOutFooter: params.campaign.includeOptOutFooter
  });

  const result = await executeSafeWhatsAppSend({
    to: targetPhone,
    recipientName: params.recipient.name,
    message: interpolated,
    providerMode,
    altServerUrl,
    altApiKey,
    altInstance,
    isDirectTest: Boolean(params.isTestToAdmin),
    isHighPriority: false
  });

  if (result.status === 'blocked_antiban') {
    return {
      ok: false,
      status: 'blocked_antiban',
      finalMessage: result.finalMessage,
      delayAppliedSeconds: result.delayAppliedSeconds,
      error: result.error
    };
  }

  if (result.status === 'sent' || result.status === 'simulated') {
    appendCampaignMessageToChatHistory({
      phone: targetPhone,
      name: params.recipient.name,
      text: result.finalMessage,
      sender: 'user',
      campaignName: params.campaign.name
    });
    recordMessageInWhatsAppFeed(
      params.recipient.name,
      targetPhone,
      result.finalMessage,
      'sent',
      false
    );
    recordWhatsAppTrafficEvent(
      {
        direction: 'outbound',
        mode: 'auto',
        status: 'sent',
        recipientName: params.recipient.name,
        recipientPhone: targetPhone,
        text: result.finalMessage,
        category: `campanha_${params.campaign.category}`,
        ruleName: `Campanha: ${params.campaign.name}`
      },
      false
    );

    return {
      ok: true,
      status: 'sent',
      finalMessage: result.finalMessage,
      delayAppliedSeconds: result.delayAppliedSeconds
    };
  }

  return {
    ok: false,
    status: 'failed',
    finalMessage: result.finalMessage,
    delayAppliedSeconds: result.delayAppliedSeconds,
    error: result.error || 'Erro no envio'
  };
}

