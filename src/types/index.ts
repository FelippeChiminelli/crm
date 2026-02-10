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
  // Campo de mensagens de saudação
  greeting_message?: boolean
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
  greeting_message?: boolean
}

// Perfil com role e permissões
export interface ProfileWithRole extends Profile {
  role?: Role
  is_admin: boolean
  empresa_nome?: string // Nome da empresa
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

// Campos predefinidos disponíveis no formulário de mudança de estágio
export type StageChangeFormField = 'observations' | 'change_reason' | 'next_action' | 'expected_date'

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
  show_sold_leads?: boolean // Mostrar leads vendidos no kanban
  show_lost_leads?: boolean // Mostrar leads perdidos no kanban
  require_stage_change_notes?: boolean // Exige formulário ao mudar de estágio
  stage_change_form_fields?: StageChangeFormField[] // Campos predefinidos no formulário
  
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
  loss_reason_category?: string | null // Pode ser UUID (novo) ou valor antigo (ex: 'negociacao')
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
  type: 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'link' | 'vehicle'
  options?: string[]
  required: boolean
  position: number
  empresa_id?: string
  created_at: string
}

export interface LossReason {
  id: string
  empresa_id: string
  name: string
  pipeline_id: string | null
  position: number
  is_active: boolean
  created_at: string
  updated_at: string
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
  event_type: 'lead_stage_changed' | 'lead_created' | 'task_created' | 'task_moved' | 'lead_marked_sold' | 'lead_marked_lost'
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
// CONFIGURAÇÕES DO CALENDÁRIO
// =====================================================

// Configurações de visualização do calendário
export interface CalendarViewConfig {
  view: 'month' | 'week' | 'day' | 'agenda'
  current_date: string
  timezone: string
}

// ===========================================
// TIPOS PARA CHAT/WHATSAPP
// =========================================== 

export interface WhatsAppInstance {
  id: string
  name: string
  display_name?: string | null
  phone_number: string
  status: 'connected' | 'disconnected' | 'connecting' | 'open' | 'close'
  qr_code?: string
  empresa_id: string
  created_at: string
  updated_at: string
  auto_create_leads?: boolean
  default_pipeline_id?: string | null
  default_stage_id?: string | null
  default_responsible_uuid?: string | null
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
  default_responsible_uuid?: string
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

// Filtros de analytics para vendas
export interface SalesAnalyticsFilters {
  period: AnalyticsPeriod
  pipelines?: string[]
  origins?: string[]
  responsibles?: string[] // IDs dos vendedores/responsáveis
  comparePeriod?: AnalyticsPeriod // Para comparação entre períodos
}

// Funil de conversão por pipeline (novo)
export interface PipelineFunnelStageData {
  stage_id: string
  stage_name: string
  position: number
  total_leads: number
  conversion_rate_from_start: number // % do total inicial
  conversion_rate_from_previous: number // % da etapa anterior
  pipeline_id: string
  pipeline_name: string
}

export interface PipelineFunnelData {
  pipeline_id: string
  pipeline_name: string
  stages: PipelineFunnelStageData[]
  total_entrada: number
  total_vendas: number
  total_perdas: number
  taxa_conversao_final: number
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
  total_sales: number // Quantidade de vendas confirmadas
  sales_value: number // Valor total das vendas confirmadas
  total_lost: number // Quantidade de leads perdidos
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
  pipeline_rotacao_id?: string | null // Pipeline específica para roteamento
  
  // Pipeline associada (se houver) - pipeline de roteamento ou fallback para responsavel_id
  pipeline?: {
    id: string
    name: string
  }
  
  // Pipelines disponíveis para este vendedor (baseado em permissões)
  available_pipelines?: Array<{
    id: string
    name: string
  }>
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
  pipeline_rotacao_id?: string | null // Pipeline específica para roteamento
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

// ===========================================
// CAMPANHAS DE WHATSAPP
// ===========================================

// Status possíveis de uma campanha
export type WhatsAppCampaignStatus = 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'failed'

// Tipo de mensagem da campanha
export type WhatsAppCampaignMessageType = 'text' | 'image' | 'video' | 'audio'

// Modo de seleção de leads para campanha
export type CampaignSelectionMode = 'stage' | 'tags'

// Tipo de evento do log
export type WhatsAppCampaignLogEventType = 'started' | 'paused' | 'resumed' | 'completed' | 'failed' | 'recipient_sent' | 'recipient_failed' | 'n8n_triggered' | 'n8n_trigger_failed'

// Campanha de WhatsApp
export interface WhatsAppCampaign {
  id: string
  empresa_id: string
  
  // Informações básicas
  name: string
  description?: string
  
  // Instância WhatsApp
  instance_id: string // Instância que enviará as mensagens
  
  // Responsável
  responsible_uuid?: string // Quem é responsável pela campanha
  
  // Configuração da mensagem
  message_type: WhatsAppCampaignMessageType
  message_text?: string // Texto da mensagem ou legenda da mídia
  media_url?: string // URL da mídia (image, video, audio)
  media_filename?: string
  media_size_bytes?: number
  
  // Modo de seleção de leads
  selection_mode?: CampaignSelectionMode // 'stage' (padrão) ou 'tags'
  selected_tags?: string[] // Tags selecionadas (quando selection_mode = 'tags')
  selected_lead_ids?: string[] // IDs dos leads selecionados (quando selection_mode = 'tags')
  
  // Lógica de movimentação de leads
  pipeline_id: string // Pipeline onde buscar leads (ou destino quando mode = 'tags')
  from_stage_id?: string // Stage de origem (de onde os leads saem) - opcional quando mode = 'tags'
  to_stage_id?: string // Stage de destino (para onde vão após envio) - opcional se "manter na atual"
  
  // Status e execução
  status: WhatsAppCampaignStatus
  scheduled_at?: string
  started_at?: string
  completed_at?: string
  
  // Estatísticas
  total_recipients: number
  messages_sent: number
  messages_failed: number
  
  // Controle de envio
  messages_per_batch: number // Quantidade limite por disparo
  interval_min_minutes: number // Intervalo mínimo em minutos
  interval_max_minutes: number // Intervalo máximo em minutos
  
  // Auditoria
  created_by?: string
  created_at: string
  updated_at: string
  
  // Relacionamentos populados (opcional)
  created_user?: Profile
  responsible_user?: Profile // Usuário responsável
  pipeline?: Pipeline
  from_stage?: Stage
  to_stage?: Stage
}

// Dados para criar campanha
export interface CreateWhatsAppCampaignData {
  name: string
  description?: string
  instance_id: string
  responsible_uuid?: string
  message_type: WhatsAppCampaignMessageType
  message_text?: string
  media_url?: string
  media_filename?: string
  media_size_bytes?: number
  selection_mode?: CampaignSelectionMode // 'stage' (padrão) ou 'tags'
  selected_tags?: string[] // Tags selecionadas (quando selection_mode = 'tags')
  selected_lead_ids?: string[] // IDs dos leads selecionados (quando selection_mode = 'tags')
  pipeline_id: string
  from_stage_id?: string // Opcional quando selection_mode = 'tags'
  to_stage_id?: string // Opcional se "manter na atual"
  scheduled_at?: string
  messages_per_batch?: number
  interval_min_minutes?: number
  interval_max_minutes?: number
}

// Dados para atualizar campanha
export interface UpdateWhatsAppCampaignData {
  name?: string
  description?: string
  instance_id?: string
  responsible_uuid?: string
  message_type?: WhatsAppCampaignMessageType
  message_text?: string
  media_url?: string
  media_filename?: string
  media_size_bytes?: number
  selection_mode?: CampaignSelectionMode
  selected_tags?: string[]
  selected_lead_ids?: string[] // IDs dos leads selecionados (quando selection_mode = 'tags')
  pipeline_id?: string
  from_stage_id?: string | null // Pode ser null quando selection_mode = 'tags'
  to_stage_id?: string
  status?: WhatsAppCampaignStatus
  scheduled_at?: string
  started_at?: string
  completed_at?: string
  messages_per_batch?: number
  interval_min_minutes?: number
  interval_max_minutes?: number
  messages_sent?: number
  messages_failed?: number
  total_recipients?: number
}

// Log de campanha
export interface WhatsAppCampaignLog {
  id: string
  campaign_id: string
  empresa_id: string
  event_type: WhatsAppCampaignLogEventType
  message?: string
  metadata?: Record<string, any>
  recipient_id?: string
  lead_id?: string
  created_at: string
  
  // Relacionamentos populados (opcional)
  lead?: Lead
}

// Dados para criar log
export interface CreateWhatsAppCampaignLogData {
  campaign_id: string
  event_type: WhatsAppCampaignLogEventType
  message?: string
  metadata?: Record<string, any>
  recipient_id?: string
  lead_id?: string
}

// Estatísticas da campanha (resumo)
export interface WhatsAppCampaignStats {
  total_campaigns: number
  active_campaigns: number
  completed_campaigns: number
  total_messages_sent: number
  total_messages_failed: number
  success_rate: number
}

// ===========================================
// SISTEMA DE ESTOQUE DE VEÍCULOS
// ===========================================

// Veículo
export interface Vehicle {
  id: string
  external_id?: number
  empresa_id: string
  titulo_veiculo?: string
  modelo_veiculo?: string
  marca_veiculo?: string
  ano_veiculo?: number // Ano do modelo
  ano_fabric_veiculo?: number // Ano de fabricação
  color_veiculo?: string
  combustivel_veiculo?: string
  cambio_veiculo?: string
  quilometragem_veiculo?: number
  plate_veiculo?: string
  price_veiculo?: number
  promotion_price?: number
  accessories_veiculo?: string
  created_at: string
  updated_at: string
  
  // Relacionamentos populados (opcional)
  images?: VehicleImage[]
}

// Imagem do veículo
export interface VehicleImage {
  id: string
  vehicle_id: string
  empresa_id: string
  url: string
  position: number
  created_at: string
}

// Dados para criar veículo
export interface CreateVehicleData {
  external_id?: number
  titulo_veiculo?: string
  modelo_veiculo?: string
  marca_veiculo?: string
  ano_veiculo?: number
  ano_fabric_veiculo?: number
  color_veiculo?: string
  combustivel_veiculo?: string
  cambio_veiculo?: string
  quilometragem_veiculo?: number
  plate_veiculo?: string
  price_veiculo?: number
  promotion_price?: number
  accessories_veiculo?: string
}

// Dados para atualizar veículo
export interface UpdateVehicleData {
  external_id?: number
  titulo_veiculo?: string
  modelo_veiculo?: string
  marca_veiculo?: string
  ano_veiculo?: number
  ano_fabric_veiculo?: number
  color_veiculo?: string
  combustivel_veiculo?: string
  cambio_veiculo?: string
  quilometragem_veiculo?: number
  plate_veiculo?: string
  price_veiculo?: number
  promotion_price?: number
  accessories_veiculo?: string
}

// Dados para criar imagem de veículo
export interface CreateVehicleImageData {
  vehicle_id: string
  url: string
  position: number
}

// Filtros de busca de veículos
export interface VehicleFilters {
  search?: string // Busca por título, marca, modelo
  marca?: string[]
  combustivel?: string[]
  cambio?: string[]
  ano_min?: number
  ano_max?: number
  price_min?: number
  price_max?: number
  quilometragem_max?: number
  only_promotion?: boolean
  sort_by?: 'price_asc' | 'price_desc' | 'year_desc' | 'year_asc' | 'created_desc' | 'created_asc'
}

// Estatísticas de veículos
export interface VehicleStats {
  total_vehicles: number
  total_value: number
  average_price: number
  vehicles_on_promotion: number
  vehicles_by_brand: {
    brand: string
    count: number
    total_value: number
  }[]
  vehicles_by_year: {
    year: number
    count: number
  }[]
}

// Dados para importação de veículos (CSV)
export interface VehicleImportData {
  titulo_veiculo?: string
  marca_veiculo?: string
  modelo_veiculo?: string
  ano_veiculo?: number
  ano_fabric_veiculo?: number
  color_veiculo?: string
  combustivel_veiculo?: string
  cambio_veiculo?: string
  quilometragem_veiculo?: number
  plate_veiculo?: string
  price_veiculo?: number
  promotion_price?: number
  accessories_veiculo?: string
  image_urls?: string[] // URLs separadas por vírgula
}

// Resultado da importação
export interface VehicleImportResult {
  success: number
  failed: number
  errors: {
    row: number
    message: string
  }[]
}

// =====================================================
// SISTEMA DE AGENDAS PERSONALIZADAS (BOOKING)
// =====================================================

export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
export type CalendarOwnerRole = 'admin' | 'member'

// Agenda personalizada
export interface BookingCalendar {
  id: string
  empresa_id: string
  name: string
  description?: string
  color: string
  timezone: string
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
  // Configurações de link público (opcionais até rodar migration)
  public_slug?: string
  is_public?: boolean
  create_lead_on_booking?: boolean
  default_pipeline_id?: string
  default_stage_id?: string
  min_advance_hours?: number
  max_advance_days?: number
  // Populados
  owners?: BookingCalendarOwner[]
  availability?: BookingAvailability[]
  booking_types?: BookingType[]
}

// Dono/responsável da agenda
export interface BookingCalendarOwner {
  id: string
  calendar_id: string
  user_id: string
  role: CalendarOwnerRole
  can_receive_bookings: boolean
  booking_weight: number
  created_at: string
  // Populado
  user?: Profile
}

// Horário de disponibilidade
export interface BookingAvailability {
  id: string
  calendar_id: string
  day_of_week: number // 0=domingo, 6=sábado
  start_time: string // HH:mm
  end_time: string // HH:mm
  is_active: boolean
  created_at?: string
}

// Tipo de atendimento
export interface BookingType {
  id: string
  calendar_id: string
  name: string
  description?: string
  duration_minutes: number
  buffer_before_minutes: number
  buffer_after_minutes: number
  color: string
  price?: number
  max_per_day?: number
  min_advance_hours: number
  is_active: boolean
  position: number
  created_at?: string
}

// Bloqueio de horário
export interface BookingBlock {
  id: string
  calendar_id: string
  start_datetime: string
  end_datetime: string
  reason?: string
  created_by: string
  created_at?: string
}

// Agendamento
export interface Booking {
  id: string
  empresa_id: string
  calendar_id: string
  booking_type_id: string
  assigned_to: string
  lead_id?: string
  client_name?: string
  client_phone?: string
  client_email?: string
  start_datetime: string
  end_datetime: string
  status: BookingStatus
  notes?: string
  event_id?: string
  created_by: string
  created_at: string
  updated_at?: string
  // Populados
  calendar?: BookingCalendar
  booking_type?: BookingType
  assigned_user?: Profile
  lead?: Lead
  event?: Event
}

// =====================================================
// BOOKING - Interfaces de criação/atualização
// =====================================================

export interface CreateBookingCalendarData {
  name: string
  description?: string
  color?: string
  timezone?: string
  owners?: { user_id: string; role?: CalendarOwnerRole; can_receive_bookings?: boolean; booking_weight?: number }[]
  availability?: Omit<BookingAvailability, 'id' | 'calendar_id' | 'created_at'>[]
  // Configurações de link público
  public_slug?: string
  is_public?: boolean
  create_lead_on_booking?: boolean
  default_pipeline_id?: string
  default_stage_id?: string
  min_advance_hours?: number
  max_advance_days?: number
}

export interface UpdateBookingCalendarData {
  name?: string
  description?: string
  color?: string
  timezone?: string
  is_active?: boolean
  // Configurações de link público
  public_slug?: string
  is_public?: boolean
  create_lead_on_booking?: boolean
  default_pipeline_id?: string | null
  default_stage_id?: string | null
  min_advance_hours?: number
  max_advance_days?: number
}

export interface CreateBookingCalendarOwnerData {
  user_id: string
  role?: CalendarOwnerRole
  can_receive_bookings?: boolean
  booking_weight?: number
}

export interface UpdateBookingCalendarOwnerData {
  role?: CalendarOwnerRole
  can_receive_bookings?: boolean
  booking_weight?: number
}

export interface CreateBookingTypeData {
  calendar_id: string
  name: string
  description?: string
  duration_minutes: number
  buffer_before_minutes?: number
  buffer_after_minutes?: number
  color?: string
  price?: number
  max_per_day?: number
  min_advance_hours?: number
}

export interface UpdateBookingTypeData {
  name?: string
  description?: string
  duration_minutes?: number
  buffer_before_minutes?: number
  buffer_after_minutes?: number
  color?: string
  price?: number
  max_per_day?: number
  min_advance_hours?: number
  is_active?: boolean
  position?: number
}

export interface CreateBookingBlockData {
  calendar_id: string
  start_datetime: string
  end_datetime: string
  reason?: string
}

export interface CreateBookingData {
  calendar_id: string
  booking_type_id: string
  start_datetime: string
  lead_id?: string
  client_name?: string
  client_phone?: string
  client_email?: string
  notes?: string
}

export interface UpdateBookingData {
  start_datetime?: string
  end_datetime?: string
  status?: BookingStatus
  notes?: string
  lead_id?: string
  client_name?: string
  client_phone?: string
  client_email?: string
}

// =====================================================
// BOOKING - Filtros e utilitários
// =====================================================

export interface BookingFilters {
  calendar_id?: string
  status?: BookingStatus[]
  assigned_to?: string[]
  lead_id?: string
  date_from?: string
  date_to?: string
  search?: string
}

export interface BookingCalendarFilters {
  is_active?: boolean
  search?: string
}

// Slot disponível para agendamento
export interface AvailableSlot {
  start: Date
  end: Date
  owner_id: string
  owner_name: string
}

// Estatísticas de booking
export interface BookingStats {
  total_calendars: number
  total_bookings: number
  bookings_today: number
  bookings_this_week: number
  bookings_pending: number
  bookings_completed: number
  bookings_cancelled: number
}

// Dados para criação de booking público (sem autenticação)
export interface CreatePublicBookingData {
  calendar_id: string
  booking_type_id: string
  start_datetime: string
  end_datetime: string
  client_name: string
  client_phone: string
  client_email?: string
  notes?: string
}

// Calendário público (retornado para usuários anônimos)
export interface PublicBookingCalendar {
  id: string
  name: string
  description?: string
  color: string
  timezone: string
  min_advance_hours: number
  max_advance_days: number
  booking_types: BookingType[]
  availability: BookingAvailability[]
}

// ===========================================
// SISTEMA DE DASHBOARDS PERSONALIZADOS
// ===========================================

// Tipos de widgets disponíveis
export type DashboardWidgetType = 'kpi' | 'bar_chart' | 'line_chart' | 'pie_chart' | 'table' | 'funnel'

// Permissão de compartilhamento
export type DashboardSharePermission = 'view' | 'edit'

// Categorias de métricas
export type MetricCategory = 'leads' | 'sales' | 'losses' | 'chat' | 'tasks' | 'custom_fields' | 'calculations'

// Dashboard personalizado
export interface CustomDashboard {
  id: string
  empresa_id: string
  created_by: string
  name: string
  description?: string
  is_default: boolean
  created_at: string
  updated_at: string
  // Relacionamentos populados
  created_user?: Profile
  widgets?: DashboardWidget[]
  shares?: DashboardShare[]
  // Permissão do usuário atual
  user_permission?: DashboardSharePermission | 'owner'
}

// Widget do dashboard
export interface DashboardWidget {
  id: string
  dashboard_id: string
  widget_type: DashboardWidgetType
  metric_key: string
  title: string
  config: DashboardWidgetConfig
  position_x: number
  position_y: number
  width: number
  height: number
  created_at: string
}

// Tipo de filtro de status para campos personalizados
export type CustomFieldStatusFilter = 'all' | 'active' | 'sold' | 'lost'

// Configuração do widget (armazenado em JSONB)
export interface DashboardWidgetConfig {
  // Filtros específicos do widget
  pipelines?: string[]
  stages?: string[]
  origins?: string[]
  responsibles?: string[]
  instances?: string[]
  status?: string[]
  priority?: string[]
  // Filtro de status para campos personalizados
  statusFilter?: CustomFieldStatusFilter
  // ID do campo personalizado (para métricas de campos customizados)
  customFieldId?: string
  // ID do cálculo personalizado
  calculationId?: string
  // Configurações visuais
  showLegend?: boolean
  showValues?: boolean
  colorScheme?: string
  // Configurações de período
  useDashboardPeriod?: boolean
  customPeriod?: {
    start: string
    end: string
  }
  // Outras configurações específicas por tipo
  [key: string]: unknown
}

// Compartilhamento de dashboard
export interface DashboardShare {
  id: string
  dashboard_id: string
  shared_with_user_id?: string
  shared_with_all: boolean
  permission: DashboardSharePermission
  created_at: string
  // Relacionamentos populados
  shared_with_user?: Profile
}

// Dados para criar dashboard
export interface CreateCustomDashboardData {
  name: string
  description?: string
  is_default?: boolean
}

// Dados para atualizar dashboard
export interface UpdateCustomDashboardData {
  name?: string
  description?: string
  is_default?: boolean
}

// Dados para criar widget
export interface CreateDashboardWidgetData {
  dashboard_id: string
  widget_type: DashboardWidgetType
  metric_key: string
  title: string
  config?: DashboardWidgetConfig
  position_x?: number
  position_y?: number
  width?: number
  height?: number
}

// Dados para atualizar widget
export interface UpdateDashboardWidgetData {
  widget_type?: DashboardWidgetType
  metric_key?: string
  title?: string
  config?: DashboardWidgetConfig
  position_x?: number
  position_y?: number
  width?: number
  height?: number
}

// Dados para criar compartilhamento
export interface CreateDashboardShareData {
  dashboard_id: string
  shared_with_user_id?: string
  shared_with_all?: boolean
  permission: DashboardSharePermission
}

// Dados para atualizar compartilhamento
export interface UpdateDashboardShareData {
  permission: DashboardSharePermission
}

// Definição de uma métrica disponível
export interface AvailableMetric {
  key: string
  label: string
  description: string
  category: MetricCategory
  supportedWidgets: DashboardWidgetType[]
  defaultConfig?: Partial<DashboardWidgetConfig>
}

// Definição de um tipo de widget
export interface WidgetTypeDefinition {
  type: DashboardWidgetType
  label: string
  description: string
  icon: string
  minWidth: number
  minHeight: number
  maxWidth: number
  maxHeight: number
  defaultWidth: number
  defaultHeight: number
}

// =====================================================
// CÁLCULOS PERSONALIZADOS
// =====================================================

// Operadores suportados
export type CalculationOperator = '+' | '-' | '*' | '/'

// Node da árvore de fórmula
export interface CalculationNode {
  type: 'operation' | 'metric' | 'custom_field' | 'constant'
  // operation
  operator?: CalculationOperator
  left?: CalculationNode
  right?: CalculationNode
  // metric (ex: 'leads_total', 'sales_total_value')
  metricKey?: string
  // custom_field
  customFieldId?: string
  // constant
  value?: number
}

// Formato do resultado
export type CalculationResultFormat = 'number' | 'currency' | 'percentage'

// Cálculo salvo no banco
export interface DashboardCalculation {
  id: string
  empresa_id: string
  created_by: string
  name: string
  description?: string
  formula: CalculationNode
  result_format: CalculationResultFormat
  created_at: string
  updated_at: string
}

// Dados para criar cálculo
export interface CreateCalculationData {
  name: string
  description?: string
  formula: CalculationNode
  result_format: CalculationResultFormat
}

// Dados para atualizar cálculo
export interface UpdateCalculationData {
  name?: string
  description?: string
  formula?: CalculationNode
  result_format?: CalculationResultFormat
}

