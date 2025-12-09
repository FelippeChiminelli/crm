// Tipos de empresa (multi-tenancy)
export interface Empresa {
  id: string
  nome: string
  cnpj?: string
  email?: string
  telefone?: string
  endereco?: string
  ativo: boolean
  plano: 'basico' | 'premium' | 'enterprise'
  max_usuarios: number
  created_at: string
  updated_at: string
}

// Tipos de autenticação
export interface Profile {
  uuid: string
  full_name: string
  phone: string
  email: string
  birth_date?: string
  gender?: 'masculino' | 'feminino'
  empresa_id?: string
  created_at?: string
  // Campos de roteamento de leads
  participa_rotacao?: boolean
  ordem_rotacao?: number | null
  peso_rotacao?: number
}

export interface CreateProfileData {
  uuid: string
  full_name: string
  phone: string
  email: string
  birth_date?: string
  gender?: 'masculino' | 'feminino'
  empresa_id?: string
}

// Tipos para empresa
export interface CreateEmpresaData {
  nome: string
  cnpj: string
  email?: string
  telefone?: string
  endereco?: string
  plano?: 'basico' | 'premium' | 'enterprise'
  max_usuarios?: number
}

export interface UpdateEmpresaData {
  nome?: string
  cnpj?: string
  email?: string
  telefone?: string
  endereco?: string
  plano?: 'basico' | 'premium' | 'enterprise'
  max_usuarios?: number
  ativo?: boolean
}

export interface EmpresaStats {
  usuarios: number
  leads: number
  pipelines: number
  maxUsuarios: number
  plano: string
  ativo: boolean
}

// Tipos de formulário
export interface LoginFormData {
  email: string
  password: string
}

export interface RegisterFormData {
  fullName: string
  phone: string
  email: string
  password: string
  confirmPassword: string
  birthDate: string
  gender: 'masculino' | 'feminino'
  // Dados da empresa (sempre obrigatório)
  empresaNome?: string
  empresaCnpj?: string
}

// Interface para criar novos usuários da empresa (admin only)
export interface CreateUserData {
  fullName: string
  email: string
  phone: string
  birthDate: string
  gender: 'masculino' | 'feminino' | 'outro'
  password: string
}

// Tipos de validação
export interface ValidationError {
  field: string
  message: string
}

export interface FormValidationResult {
  isValid: boolean
  errors: ValidationError[]
}

// Tipos de usuário
export interface UserProfile {
  id: string
  email: string
  profile: Profile | null
}

// Tipos de navegação
export interface RouteConfig {
  path: string
  element: React.ComponentType
  protected?: boolean
  roles?: string[]
}

// ===========================================
// SISTEMA DE ROLES E PERMISSÕES
// ===========================================

// Role/Papel do usuário
export interface Role {
  id: string
  name: string
  description?: string
  empresa_id: string
  is_system_role: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

// Permissão individual
export interface Permission {
  id: string
  name: string // ex: 'leads.create'
  description: string
  module: string // ex: 'leads', 'tasks', 'reports'
  action: string // ex: 'create', 'view', 'edit', 'delete'
  is_active: boolean
  created_at: string
}

// Relacionamento Role-Permission
export interface RolePermission {
  id: string
  role_id: string
  permission_id: string
  granted: boolean
  created_at: string
}

// Role com permissões populadas
export interface RoleWithPermissions extends Role {
  permissions: Permission[]
}

// Dados para criar um novo role
export interface CreateRoleData {
  name: string
  description?: string
  permission_ids: string[]
}

// Dados para atualizar um role
export interface UpdateRoleData {
  name?: string
  description?: string
  permission_ids?: string[]
  is_active?: boolean
}

// Dados para atualizar perfil do usuário
export interface UpdateProfileData {
  full_name?: string
  phone?: string
  email?: string
  birth_date?: string
  gender?: 'masculino' | 'feminino' | 'outro'
}

// Perfil com role e permissões
export interface ProfileWithRole extends Profile {
  role?: Role
  is_admin: boolean
}

// Módulos do sistema para agrupamento de permissões
export interface PermissionModule {
  name: string
  label: string
  permissions: Permission[]
}

// Matriz de permissões para interface
export interface PermissionMatrix {
  [roleName: string]: {
    [permissionName: string]: boolean
  }
}

// Estatísticas de roles
export interface RoleStats {
  total_roles: number
  total_permissions: number
  users_by_role: {
    [roleName: string]: number
  }
}

// Funil de Vendas (Kanban)
export type LeadCardVisibleField = 
  | 'company' 
  | 'value' 
  | 'phone' 
  | 'email' 
  | 'status' 
  | 'origin' 
  | 'created_at' 
  | 'tags' 
  | 'notes' 
  | 'last_contact_at'
  | 'pipeline_stage'
  | `custom_field_${string}` // Campos personalizados seguem o padrão custom_field_{id}

export interface Pipeline {
  id: string
  name: string
  description?: string
  active: boolean
  display_order?: number
  card_visible_fields?: LeadCardVisibleField[] // Campos visíveis nos cards do kanban
  empresa_id?: string
  created_at: string
  responsavel_id?: string // Vendedor responsável (usado no roteamento)
  
  // Relacionamento populado (opcional)
  responsavel?: Profile
}

export interface Stage {
  id: string
  pipeline_id: string
  name: string
  color: string
  position: number
  empresa_id?: string
  created_at: string
  is_inicial?: boolean // Define se é a etapa inicial da pipeline
}

export interface Lead {
  id: string
  pipeline_id: string
  stage_id: string
  responsible_uuid?: string
  name: string
  company?: string
  value?: number
  phone?: string
  email?: string
  origin?: string
  status?: string
  last_contact_at?: string
  estimated_close_at?: string
  tags?: string[]
  notes?: string
  empresa_id?: string
  created_at: string
  // Campos de motivo de perda
  loss_reason_category?: 'negociacao' | 'concorrencia' | 'timing' | 'sem_budget' | 
                         'financiamento_nao_aprovado' | 'sem_interesse' | 'nao_qualificado' | 'sem_resposta' | 'outro'
  loss_reason_notes?: string
  lost_at?: string
  // Campos de venda concluída
  sold_at?: string // Timestamp de quando foi marcado como vendido
  sold_value?: number // Valor final da venda (pode ser diferente do value estimado)
  sale_notes?: string // Notas sobre a venda (forma de pagamento, condições, etc)
  // Relacionamentos populados (opcionais)
  pipeline?: { name: string } | Pipeline
  stage?: { name: string; color?: string } | Stage
}

export interface LeadCustomField {
  id: string
  pipeline_id: string | null  // Permite campos globais (null) ou específicos do pipeline
  name: string
  type: 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'link'
  options?: string[]
  required: boolean
  position: number
  empresa_id?: string
  created_at: string
}

export interface LeadCustomValue {
  id: string
  lead_id: string
  field_id: string
  value: string
}

// Histórico de alterações do Lead
export interface LeadHistoryEntry {
  id: string
  lead_id: string
  empresa_id: string
  pipeline_id: string | null
  stage_id: string | null
  previous_pipeline_id: string | null
  previous_stage_id: string | null
  changed_at: string
  changed_by: string | null
  change_type: 'created' | 'pipeline_changed' | 'stage_changed' | 'both_changed' | 'marked_as_lost' | 'reactivated' | 'marked_as_sold' | 'sale_unmarked'
  notes: string | null
  created_at: string
  // Relacionamentos populados (opcionais)
  changed_by_user?: { full_name: string }
  pipeline?: { name: string }
  stage?: { name: string }
  previous_pipeline?: { name: string }
  previous_stage?: { name: string }
}

// Sistema de Tarefas e Atividades
export type TaskStatus = 'pendente' | 'em_andamento' | 'concluida' | 'cancelada' | 'atrasada'
export type TaskPriority = 'baixa' | 'media' | 'alta' | 'urgente'
export type TaskCommentType = 'comment' | 'status_change' | 'assignment_change' | 'due_date_change'
export type ReminderType = 'email' | 'push'

export interface TaskType {
  id: string
  name: string
  color: string
  icon: string
  empresa_id: string
  active: boolean
  created_at: string
}

export interface Task {
  id: string
  title: string
  description?: string
  empresa_id: string
  assigned_to?: string
  created_by: string
  lead_id?: string
  pipeline_id?: string
  task_type_id?: string
  status: TaskStatus
  priority: TaskPriority
  due_date?: string
  due_time?: string
  completed_at?: string
  started_at?: string
  tags?: string[]
  estimated_hours?: number
  actual_hours?: number
  created_at: string
  updated_at: string
  
  // Relacionamentos populados
  task_type?: TaskType
  assigned_user?: Profile
  created_user?: Profile
  lead?: Lead
  pipeline?: Pipeline
}

export interface TaskComment {
  id: string
  task_id: string
  user_id: string
  comment: string
  type: TaskCommentType
  metadata?: any
  created_at: string
  
  // Relacionamentos populados
  user?: Profile
}

export interface TaskReminder {
  id: string
  task_id: string
  user_id: string
  remind_at: string
  type: ReminderType
  sent: boolean
  sent_at?: string
  created_at: string
}

// Tipos para criação e atualização de tarefas
export interface CreateTaskData {
  title: string
  description?: string
  assigned_to?: string
  lead_id?: string
  pipeline_id?: string
  task_type_id?: string
  status?: TaskStatus
  priority?: TaskPriority
  due_date?: string
  due_time?: string
  tags?: string[]
  estimated_hours?: number
}

export interface UpdateTaskData {
  title?: string
  description?: string
  assigned_to?: string
  lead_id?: string
  pipeline_id?: string
  task_type_id?: string
  status?: TaskStatus
  priority?: TaskPriority
  due_date?: string
  due_time?: string
  tags?: string[]
  estimated_hours?: number
  actual_hours?: number
}

export interface CreateTaskCommentData {
  comment: string
  type?: TaskCommentType
  metadata?: any
}

export interface CreateTaskReminderData {
  remind_at: string
  type?: ReminderType
}

// Estatísticas de tarefas
export interface TaskStats {
  total_tasks: number
  pending_tasks: number
  in_progress_tasks: number
  completed_tasks: number
  overdue_tasks: number
  today_tasks: number
  this_week_tasks: number
}

// Filtros de tarefas
export interface TaskFilters {
  status?: TaskStatus[]
  priority?: TaskPriority[]
  assigned_to?: string[]
  created_by?: string[]
  task_type_id?: string[]
  lead_id?: string[]
  pipeline_id?: string[]
  due_date_from?: string
  due_date_to?: string
  search?: string
  tags?: string[]
} 

// ========================================
// SISTEMA DE COMUNICAÇÃO E TEMPLATES
// ========================================

// Tipos básicos de comunicação
export type MessageType = 'email' | 'sms'
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
export type TemplateCategory = 'geral' | 'boas_vindas' | 'follow_up' | 'cobranca' | 'agradecimento' | 'promocional'
export type NotificationType = 'info' | 'warning' | 'error' | 'success'

// Configurações de comunicação por empresa
export interface CommunicationSettings {
  id: string
  empresa_id: string
  
  // Email
  email_enabled: boolean
  smtp_host?: string
  smtp_port?: number
  smtp_user?: string
  smtp_pass?: string
  email_from_name?: string
  email_from_address?: string
  
  // Configurações gerais
  auto_response_enabled: boolean
  business_hours_start: string
  business_hours_end: string
  
  created_at: string
  updated_at: string
}

export interface CreateCommunicationSettingsData {
  email_enabled?: boolean
  smtp_host?: string
  smtp_port?: number
  smtp_user?: string
  smtp_pass?: string
  email_from_name?: string
  email_from_address?: string
  auto_response_enabled?: boolean
  business_hours_start?: string
  business_hours_end?: string
}

export interface UpdateCommunicationSettingsData extends CreateCommunicationSettingsData {}

// Templates de mensagens
export interface MessageTemplate {
  id: string
  empresa_id: string
  name: string
  description?: string
  category: TemplateCategory
  subject?: string // Para emails
  content: string
  type: MessageType
  active: boolean
  is_default: boolean
  available_variables: string[]
  created_by: string
  created_at: string
  updated_at: string
  
  // Relacionamentos populados
  created_user?: Profile
}

export interface CreateMessageTemplateData {
  name: string
  description?: string
  category: TemplateCategory
  subject?: string
  content: string
  type?: MessageType
  active?: boolean
  is_default?: boolean
  available_variables?: string[]
}

export interface UpdateMessageTemplateData extends CreateMessageTemplateData {}

// Mensagens enviadas (histórico)
export interface SentMessage {
  id: string
  empresa_id: string
  template_id?: string
  lead_id: string
  task_id?: string
  sent_by: string
  type: MessageType
  recipient_phone?: string
  recipient_email?: string
  subject?: string
  content: string
  status: MessageStatus
  external_id?: string
  api_response?: any
  error_message?: string
  delivery_attempts: number
  sent_at: string
  delivered_at?: string
  read_at?: string
  is_automated: boolean
  automation_trigger?: string
  created_at: string
  
  // Relacionamentos populados
  template?: MessageTemplate
  lead?: Lead
  task?: Task
  sent_user?: Profile
}

export interface CreateSentMessageData {
  template_id?: string
  lead_id: string
  task_id?: string
  type: MessageType
  recipient_phone?: string
  recipient_email?: string
  subject?: string
  content: string
  is_automated?: boolean
  automation_trigger?: string
}

// Tipos para automações
export type AutomationTriggerType = 
  | 'lead_created' 
  | 'lead_stage_changed' 
  | 'lead_stagnant' 
  | 'task_created' 
  | 'task_overdue' 
  | 'task_completed'
  | 'manual'

export type AutomationActionType = 
  | 'send_message' 
  | 'create_task' 
  | 'move_lead' 
  | 'send_notification'

// Regras simples de automação por empresa
export interface AutomationRule {
  id: string
  empresa_id: string
  name: string
  description?: string
  active: boolean
  event_type: 'lead_stage_changed' | 'lead_created' | 'task_created' | 'task_moved'
  // condition e action serão configuráveis e validadas na aplicação
  condition: Record<string, any>
  action: Record<string, any>
  created_at: string
  updated_at: string
}

export interface CreateAutomationRuleData {
  name: string
  description?: string
  active?: boolean
  event_type: AutomationRule['event_type']
  condition?: Record<string, any>
  action: Record<string, any>
}

export interface UpdateAutomationRuleData extends Partial<CreateAutomationRuleData> {}

export interface CommunicationAutomation {
  id: string
  empresa_id: string
  name: string
  description?: string
  active: boolean
  trigger_type: AutomationTriggerType
  trigger_config: Record<string, any>
  conditions: Record<string, any>
  action_type: AutomationActionType
  action_config: Record<string, any>
  template_id?: string
  delay_minutes: number
  business_hours_only: boolean
  total_executions: number
  successful_executions: number
  last_execution_at?: string
  created_by: string
  created_at: string
  updated_at: string
  
  // Relacionamentos populados
  template?: MessageTemplate
  created_user?: Profile
}

export interface CreateCommunicationAutomationData {
  name: string
  description?: string
  active?: boolean
  trigger_type: AutomationTriggerType
  trigger_config?: Record<string, any>
  conditions?: Record<string, any>
  action_type: AutomationActionType
  action_config: Record<string, any>
  template_id?: string
  delay_minutes?: number
  business_hours_only?: boolean
}

export interface UpdateCommunicationAutomationData extends CreateCommunicationAutomationData {}

// Notificações internas
export interface Notification {
  id: string
  empresa_id: string
  user_id: string
  title: string
  message: string
  type: NotificationType
  lead_id?: string
  task_id?: string
  read: boolean
  read_at?: string
  action_url?: string
  metadata: Record<string, any>
  created_at: string
  
  // Relacionamentos populados
  lead?: Lead
  task?: Task
}

export interface CreateNotificationData {
  user_id: string
  title: string
  message: string
  type?: NotificationType
  lead_id?: string
  task_id?: string
  action_url?: string
  metadata?: Record<string, any>
}

// Tipos para envio de mensagens via EvolutionAPI




// Variáveis disponíveis para templates
export interface TemplateVariable {
  key: string
  label: string
  description: string
  example: string
}

export const TEMPLATE_VARIABLES: TemplateVariable[] = [
  {
    key: 'nome',
    label: 'Nome do Lead',
    description: 'Nome completo do lead/cliente',
    example: 'João Silva'
  },
  {
    key: 'empresa',
    label: 'Empresa do Lead',
    description: 'Nome da empresa do lead',
    example: 'Empresa ABC Ltda'
  },
  {
    key: 'empresa_nome',
    label: 'Nome da Sua Empresa',
    description: 'Nome da empresa que está enviando a mensagem',
    example: 'Minha Empresa'
  },
  {
    key: 'telefone',
    label: 'Telefone do Lead',
    description: 'Número de telefone do lead',
    example: '(11) 99999-9999'
  },
  {
    key: 'email',
    label: 'Email do Lead',
    description: 'Endereço de email do lead',
    example: 'joao@email.com'
  },
  {
    key: 'valor',
    label: 'Valor do Lead',
    description: 'Valor estimado da oportunidade',
    example: 'R$ 5.000,00'
  },
  {
    key: 'pipeline',
    label: 'Nome do Pipeline',
    description: 'Nome do funil onde o lead está',
    example: 'Vendas B2B'
  },
  {
    key: 'stage',
    label: 'Etapa do Pipeline',
    description: 'Etapa atual do lead no funil',
    example: 'Negociação'
  },
  {
    key: 'responsavel',
    label: 'Responsável pelo Lead',
    description: 'Nome do usuário responsável',
    example: 'Maria Santos'
  }
]

// Filtros para mensagens e templates
export interface MessageFilters {
  type?: MessageType[]
  status?: MessageStatus[]
  template_id?: string[]
  lead_id?: string[]
  sent_by?: string[]
  date_from?: string
  date_to?: string
  search?: string
}

export interface TemplateFilters {
  category?: TemplateCategory[]
  type?: MessageType[]
  active?: boolean
  created_by?: string[]
  search?: string
}

// =====================================================
// SISTEMA DE AGENDA/EVENTOS
// =====================================================

// Tipos base
export type EventStatus = 'confirmed' | 'tentative' | 'cancelled'
export type ParticipantStatus = 'pending' | 'accepted' | 'declined' | 'tentative'
export type ParticipantRole = 'organizer' | 'attendee' | 'optional'
export type EventLeadRole = 'participant' | 'decision_maker' | 'influencer'
export type EventReminderType = 'notification' | 'email' | 'sms'

// Interfaces principais
export interface EventType {
  id: string
  name: string
  color: string
  icon: string
  empresa_id: string
  active: boolean
  created_at: string
}

export interface Event {
  id: string
  title: string
  description?: string
  empresa_id: string
  created_by: string
  lead_id?: string
  pipeline_id?: string
  event_type_id?: string
  task_id?: string
  start_date: string
  end_date: string
  all_day: boolean
  timezone: string
  location?: string
  meeting_url?: string
  status: EventStatus
  notes?: string
  tags?: string[]
  created_at: string
  updated_at: string
  
  // Relacionamentos populados
  event_type?: EventType
  created_user?: Profile
  lead?: Lead
  pipeline?: Pipeline
  task?: Task
  participants?: EventParticipant[]
  lead_relations?: EventLeadRelation[]
  reminders?: EventReminder[]
}

export interface EventParticipant {
  id: string
  event_id: string
  user_id: string
  status: ParticipantStatus
  role: ParticipantRole
  response_date?: string
  notes?: string
  created_at: string
  
  // Relacionamentos populados
  user?: Profile
  event?: Event
}

export interface EventLeadRelation {
  id: string
  event_id: string
  lead_id: string
  role: EventLeadRole
  created_at: string
  
  // Relacionamentos populados
  lead?: Lead
  event?: Event
}

export interface EventReminder {
  id: string
  event_id: string
  user_id: string
  remind_before_minutes: number
  type: EventReminderType
  sent: boolean
  sent_at?: string
  created_at: string
  
  // Relacionamentos populados
  user?: Profile
  event?: Event
}

// Interfaces para criação e atualização
export interface CreateEventData {
  title: string
  description?: string
  lead_id?: string
  pipeline_id?: string
  event_type_id?: string
  task_id?: string
  start_date: string
  end_date: string
  all_day?: boolean
  timezone?: string
  location?: string
  meeting_url?: string
  status?: EventStatus
  notes?: string
  tags?: string[]
  
  // Dados de participantes e relacionamentos (opcionais)
  participants?: {
    user_id: string
    role?: ParticipantRole
    notes?: string
  }[]
  lead_relations?: {
    lead_id: string
    role?: EventLeadRole
  }[]
  reminders?: {
    remind_before_minutes: number
    type?: EventReminderType
  }[]
}

export interface UpdateEventData {
  title?: string
  description?: string
  lead_id?: string
  pipeline_id?: string
  event_type_id?: string
  task_id?: string
  start_date?: string
  end_date?: string
  all_day?: boolean
  timezone?: string
  location?: string
  meeting_url?: string
  status?: EventStatus
  notes?: string
  tags?: string[]
}

// Interfaces para participantes
export interface CreateEventParticipantData {
  user_id: string
  role?: ParticipantRole
  notes?: string
}

export interface UpdateEventParticipantData {
  status?: ParticipantStatus
  role?: ParticipantRole
  notes?: string
}

// Interfaces para relacionamentos com leads
export interface CreateEventLeadRelationData {
  lead_id: string
  role?: EventLeadRole
}

// Interfaces para lembretes
export interface CreateEventReminderData {
  remind_before_minutes: number
  type?: EventReminderType
}

// Interfaces para tipos de eventos
export interface CreateEventTypeData {
  name: string
  color?: string
  icon?: string
  active?: boolean
}

export interface UpdateEventTypeData {
  name?: string
  color?: string
  icon?: string
  active?: boolean
}

// Estatísticas de eventos
export interface EventStats {
  total_events: number
  upcoming_events: number
  today_events: number
  this_week_events: number
  this_month_events: number
  overdue_events: number
}

// Filtros para eventos
export interface EventFilters {
  status?: EventStatus[]
  event_type_id?: string[]
  created_by?: string[]
  participant_user_id?: string[]
  lead_id?: string[]
  pipeline_id?: string[]
  start_date_from?: string
  start_date_to?: string
  all_day?: boolean
  search?: string
  tags?: string[]
}

// Configurações de visualização do calendário
export interface CalendarViewConfig {
  view: 'month' | 'week' | 'day' | 'agenda'
  current_date: string
  timezone: string
}

// Interface para sincronização com tarefas
export interface TaskToEventSync {
  task_id: string
  sync_enabled: boolean
  auto_create_event: boolean
  event_duration_minutes: number
}

// Interface para integração com calendários externos
export interface ExternalCalendarIntegration {
  id: string
  user_id: string
  provider: 'google' | 'outlook' | 'ical'
  access_token?: string
  refresh_token?: string
  calendar_id?: string
  sync_enabled: boolean
  last_sync_at?: string
  sync_direction: 'import' | 'export' | 'bidirectional'
  created_at: string
  updated_at: string
} 

// ===========================================
// TIPOS PARA CHAT/WHATSAPP
// ===========================================

export interface WhatsAppInstance {
  id: string
  name: string
  phone_number: string
  status: 'connected' | 'disconnected' | 'connecting' | 'open' | 'close'
  qr_code?: string
  empresa_id: string
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  id: string
  conversation_id: string // Mudança de lead_id para conversation_id
  instance_id: string
  message_type: 'text' | 'image' | 'audio' | 'document' | 'video'
  content: string
  media_url?: string
  direction: 'inbound' | 'outbound'
  status: 'sent' | 'delivered' | 'read' | 'failed'
  timestamp: string
  created_at: string
}

export interface ChatConversation {
  id: string
  lead_id?: string // Opcional agora
  lead_name: string
  lead_company?: string
  lead_phone: string
  lead_pipeline_id?: string // ID da pipeline do lead, se existir
  lead_tags?: string[] // Tags do lead
  instance_id: string
  nome_instancia?: string // Nome da instância WhatsApp
  last_message?: string
  last_message_time?: string
  unread_count: number
  status: 'active' | 'archived'
  created_at: string
  updated_at: string
  Nome_Whatsapp?: string // Nome do WhatsApp
}

export interface ConnectInstanceData {
  name: string
  phone_number: string
}

export interface SendMessageData {
  conversation_id: string // Mudança de lead_id para conversation_id
  instance_id: string
  message_type: 'text' | 'image' | 'audio' | 'document' | 'video'
  content: string
  media_url?: string
}

export interface ChatFilters {
  search?: string
  status?: 'active' | 'archived'
  instance_id?: string
  lead_id?: string
}

// ===========================================
// TIPOS PARA CONTROLE DE PERMISSÕES DE PIPELINE
// ===========================================

export interface UserPipelinePermission {
  id: string
  user_id: string
  pipeline_id: string
  empresa_id: string
  granted: boolean
  created_at: string
  updated_at: string
}

export interface PipelinePermissionData {
  user_id: string
  pipeline_id: string
  granted: boolean
}

// ===========================================
// TIPOS PARA API RESPONSES
// ===========================================

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface ConnectInstanceResponse {
  instance_id: string
  qr_code: string
  status: 'pending' | 'connected' | 'failed'
}

export interface SendMessageResponse {
  message_id: string
  status: 'sent' | 'failed'
  error?: string
}

// ===========================================
// SISTEMA DE ANALYTICS E RELATÓRIOS
// ===========================================

// Tipos de métricas disponíveis
export type MetricType = 
  | 'leads_by_pipeline'
  | 'leads_by_stage'
  | 'leads_by_origin'
  | 'average_response_time'
  | 'first_response_time'
  | 'conversion_rate_by_stage'
  | 'average_lead_value'
  | 'leads_over_time'
  | 'total_leads'
  | 'total_value'

// Tipos de visualização
export type VisualizationType = 
  | 'kpi_card'
  | 'bar_chart'
  | 'pie_chart'
  | 'line_chart'
  | 'data_table'
  | 'funnel_chart'
  | 'comparison_card'

// Intervalo para séries temporais
export type TimeInterval = 'day' | 'week' | 'month' | 'quarter' | 'year'

// Período de análise
export interface AnalyticsPeriod {
  start: string // ISO date
  end: string   // ISO date
}

// Filtros de analytics para leads/pipeline
export interface LeadAnalyticsFilters {
  period: AnalyticsPeriod
  pipelines?: string[]
  stages?: string[]
  origins?: string[]
  status?: string[]
  comparePeriod?: AnalyticsPeriod // Para comparação entre períodos
}

// Filtros de analytics para chat
export interface ChatAnalyticsFilters {
  period: AnalyticsPeriod
  instances?: string[]
  comparePeriod?: AnalyticsPeriod // Para comparação entre períodos
  timeRange?: {
    start: string // formato HH:mm
    end: string // formato HH:mm
  }
  filterBy?: 'messages' | 'lead_transfer' // Critério de filtro: mensagens ou transferência do lead
}

// Filtros de analytics para tarefas
export interface TaskAnalyticsFilters {
  period: AnalyticsPeriod
  status?: TaskStatus[]
  priority?: TaskPriority[]
  assigned_to?: string[] // IDs dos usuários atribuídos
  pipeline_id?: string[] // Pipelines associados
  lead_id?: string[] // Leads associados
  task_type_id?: string[] // Tipos de tarefa
  comparePeriod?: AnalyticsPeriod // Para comparação entre períodos
}

// Filtros de analytics (compatibilidade com código legado)
export interface AnalyticsFilters {
  period: AnalyticsPeriod
  pipelines?: string[]
  stages?: string[]
  origins?: string[]
  responsibles?: string[]
  instances?: string[]
  status?: string[]
  comparePeriod?: AnalyticsPeriod // Para comparação entre períodos
}

// Configuração de uma métrica
export interface MetricConfig {
  id: string
  type: MetricType
  visualization: VisualizationType
  filters?: Partial<AnalyticsFilters>
  label?: string
  description?: string
}

// Configuração de relatório
export interface ReportConfig {
  filters: AnalyticsFilters
  metrics: MetricConfig[]
  layout?: 'grid' | 'list' | 'dashboard'
}

// Relatório salvo
export interface SavedReport {
  id: string
  empresa_id: string
  created_by: string
  name: string
  description?: string
  config: ReportConfig
  is_favorite: boolean
  is_shared: boolean
  created_at: string
  updated_at: string
  last_viewed_at?: string
  
  // Relacionamentos populados
  created_user?: Profile
}

// Dados para criar relatório
export interface CreateSavedReportData {
  name: string
  description?: string
  config: ReportConfig
  is_favorite?: boolean
  is_shared?: boolean
}

// Dados para atualizar relatório
export interface UpdateSavedReportData {
  name?: string
  description?: string
  config?: ReportConfig
  is_favorite?: boolean
  is_shared?: boolean
}

// Permissão de analytics
export interface AnalyticsPermission {
  id: string
  empresa_id: string
  user_id: string
  granted: boolean
  granted_by?: string
  created_at: string
  updated_at: string
  
  // Relacionamentos populados
  user?: Profile
  granted_by_user?: Profile
}

// Dados para conceder/revogar permissão
export interface AnalyticsPermissionData {
  user_id: string
  granted: boolean
}

// Resultado de métrica genérico
export interface MetricResult {
  metric_type: MetricType
  value: any // Pode ser number, array, object dependendo da métrica
  formatted_value?: string
  unit?: string
  change?: number // % de mudança vs período anterior
  trend?: 'up' | 'down' | 'stable'
}

// Resultado para "Leads por Pipeline"
export interface LeadsByPipelineResult {
  pipeline_id: string
  pipeline_name: string
  count: number
  percentage: number
  total_value: number
}

// Resultado para "Leads por Estágio"
export interface LeadsByStageResult {
  stage_id: string
  stage_name: string
  stage_position: number
  pipeline_id: string
  pipeline_name: string
  count: number
  percentage: number
  total_value: number
  average_value: number
}

// Resultado para "Leads por Origem"
export interface LeadsByOriginResult {
  origin: string
  count: number
  percentage: number
  total_value: number
  average_value: number
  conversion_rate?: number
}

// Resultado para "Taxa de Conversão"
export interface ConversionRateResult {
  stage_from_id: string
  stage_from_name: string
  stage_to_id: string
  stage_to_name: string
  total_leads: number
  converted_leads: number
  conversion_rate: number
  average_time_days: number
}

// Resultado para "Tempo Médio"
export interface AverageTimeResult {
  instance_id?: string
  instance_name?: string
  average_seconds: number
  average_formatted: string // "2h 30min"
  median_seconds?: number
  total_conversations: number
}

// Resultado para série temporal
export interface TimeSeriesPoint {
  date: string // ISO date
  value: number
  label?: string
  metadata?: Record<string, any>
}

// Resultado de funil
export interface FunnelStageData {
  stage_id: string
  stage_name: string
  stage_position: number
  count: number
  percentage: number
  drop_off_rate?: number
  avg_time_minutes?: number
  avg_time_formatted?: string
}

// Estatísticas gerais de analytics
export interface AnalyticsStats {
  total_leads: number
  total_value: number
  average_value: number
  active_pipelines: number
  active_users: number
  period: AnalyticsPeriod
}

// Taxa de conversão detalhada entre estágios
export interface DetailedConversionRate {
  stage_from_id: string
  stage_from_name: string
  stage_to_id: string
  stage_to_name: string
  pipeline_id: string
  pipeline_name: string
  total_leads_entered: number // Total que entrou no estágio origem
  converted_to_next: number // Quantos foram para o próximo estágio
  conversion_rate: number // % de conversão
  lost_leads: number // Quantos foram perdidos
  loss_rate: number // % de perda
  avg_time_to_convert_minutes: number // Tempo médio para converter
  avg_time_to_convert_formatted: string // Tempo formatado
}

// Tempo médio em cada estágio do funil
export interface StageTimeMetrics {
  stage_id: string
  stage_name: string
  stage_position: number
  pipeline_id: string
  pipeline_name: string
  total_leads: number // Total de leads que passaram por este estágio
  avg_time_minutes: number // Tempo médio no estágio (em minutos)
  avg_time_formatted: string // Tempo formatado (Ex: "2d 5h 30min")
  median_time_minutes: number // Mediana para lidar com outliers
  min_time_minutes: number // Tempo mínimo
  max_time_minutes: number // Tempo máximo
  leads_stuck: number // Leads que ficaram mais de X dias (estagnados)
}

// ===========================================
// SISTEMA DE ROTEAMENTO DE LEADS
// ===========================================

// Estado da fila de distribuição por empresa
export interface LeadDistributionState {
  empresa_id: string
  ultimo_vendedor_id: string | null
  updated_at: string
  created_at: string
  
  // Relacionamento populado (opcional)
  ultimo_vendedor?: Profile
}

// Log de distribuição de leads
export interface LeadAssignmentLog {
  id: string
  empresa_id: string
  lead_id: string
  vendedor_id: string
  pipeline_id: string | null
  stage_id: string | null
  origem: string | null
  created_at: string
  
  // Relacionamentos populados (opcionais)
  lead?: Lead
  vendedor?: Profile
  pipeline?: Pipeline
  stage?: Stage
}

// Configuração de rotação de um vendedor
export interface VendorRotationConfig {
  uuid: string
  full_name: string
  email: string
  participa_rotacao: boolean
  ordem_rotacao: number | null
  peso_rotacao: number
  is_admin: boolean
  
  // Pipeline associada (se houver)
  pipeline?: {
    id: string
    name: string
  }
}

// Resultado da função assign_lead
export interface AssignLeadResult {
  vendedor_id: string
  pipeline_id: string
  stage_id: string
}

// Dados para atualizar configuração de rotação de um vendedor
export interface UpdateVendorRotationData {
  participa_rotacao?: boolean
  ordem_rotacao?: number | null
  peso_rotacao?: number
}

// Estado da fila com informações completas
export interface QueueState {
  ultimo_vendedor: {
    id: string
    name: string
  } | null
  proximo_vendedor: {
    id: string
    name: string
  } | null
  updated_at: string | null
  total_vendedores_ativos: number
}

// Dados para simulação de roteamento
export interface SimulateRoutingResult {
  vendedor: {
    id: string
    name: string
  }
  pipeline: {
    id: string
    name: string
  }
  stage: {
    id: string
    name: string
  }
  posicao_na_fila: number
  total_vendedores: number
}

// Estatísticas de roteamento
export interface RoutingStats {
  total_distribuicoes: number
  distribuicoes_hoje: number
  distribuicoes_semana: number
  distribuicoes_mes: number
  por_vendedor: {
    vendedor_id: string
    vendedor_name: string
    total: number
    hoje: number
    semana: number
    mes: number
  }[]
  por_origem: {
    origem: string
    total: number
    porcentagem: number
  }[]
}

// Filtros para log de distribuição
export interface RoutingLogFilters {
  vendedor_id?: string[]
  pipeline_id?: string[]
  origem?: string[]
  date_from?: string
  date_to?: string
  limit?: number
  offset?: number
} 
