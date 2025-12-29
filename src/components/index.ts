// Auth Components
export { LoginForm } from './auth/LoginForm'
export { RegisterForm } from './auth/RegisterForm'

// UI Components
export { StyledSelect } from './ui/StyledSelect'
export { ToastComponent, useToast, ToastContainer } from './ui/Toast'
export type { Toast, ToastType } from './ui/Toast'
export { Badge } from './ui/Badge'
export { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/Card'
export { ConfirmDialog } from './ui/ConfirmDialog'

// Loading State Components
export { 
  LoadingSpinner, 
  LoadingCard, 
  SkeletonLoader, 
  ErrorCard, 
  SuccessCard, 
  LoadingButton, 
  EmptyState, 
  InlineLoading, 
  LoadingOverlay 
} from './ui/LoadingStates'

// Layout Components
export { MainLayout } from './layout/MainLayout'
export { PageContainer } from './layout/PageContainer'

// Route Components
export { ProtectedRoute } from '../routes/ProtectedRoute'
export { PublicRoute } from '../routes/PublicRoute'

// Lead Components
export { LeadCard } from './LeadCard'

// Kanban Components
export { PipelineSelector } from './kanban/PipelineSelector'
export { StageColumn } from './kanban/StageColumn'
export { CreatePipelineModal } from './kanban/modals/CreatePipelineModal'
export { ManagePipelinesModal } from './kanban/modals/ManagePipelinesModal'
export { PipelineManagementModal } from './kanban/modals/PipelineManagementModal'
export { NewLeadModal } from './kanban/modals/NewLeadModal'
export { StageManager } from './kanban/modals/StageManager'
export { KanbanFiltersModal } from './kanban/KanbanFiltersModal'
export type { KanbanFilters } from './kanban/KanbanFiltersModal'

// Leads Components
export { LeadsFilters } from './leads/LeadsFilters'
export { LeadsStats } from './leads/LeadsStats'
export { LeadsGrid } from './leads/LeadsGrid'
export { LeadsList } from './leads/LeadsList'
export { ViewModeSelector } from './leads/ViewModeSelector'
export { LeadDetailModal } from './leads/LeadDetailModal'
export { LossReasonModal } from './leads/LossReasonModal'
export { SaleModal } from './leads/SaleModal'
export { LeadsFiltersModal } from './leads/LeadsFiltersModal'

// Lead Form Components
export { LeadBasicInfoForm } from './leads/forms/LeadBasicInfoForm'
export { LeadCustomFieldsForm } from './leads/forms/LeadCustomFieldsForm'

// Dashboard Components
export { StatCard } from './dashboard/StatCard'
export { DashboardStats } from './dashboard/DashboardStats'
export { DashboardChart } from './dashboard/DashboardChart'
export { DashboardAlerts } from './dashboard/DashboardAlerts'

// Tasks Components
export { NewTaskModal } from './tasks/NewTaskModal'
export { TaskViewModeSelector } from './tasks/TaskViewModeSelector'
export { TasksList } from './tasks/TasksList'
export { TasksStats } from './tasks/TasksStats'

// Chat Components
export { ChatSidebar } from './chat/ChatSidebar'
export { ChatWindow } from './chat/ChatWindow'
export { MessageBubble } from './chat/MessageBubble'
export { SendMessageBar } from './chat/SendMessageBar'
export { ConnectInstanceModal } from './chat/ConnectInstanceModal'

// Empresa Components
export { EmpresaOverview } from './empresa/EmpresaOverview'
export { EmpresaUsers } from './empresa/EmpresaUsers'
export { LeadRoutingTab } from './empresa/LeadRoutingTab'
export { RoutingVendorsTable } from './empresa/RoutingVendorsTable'
export { RoutingQueueState } from './empresa/RoutingQueueState'
export { RoutingSimulation } from './empresa/RoutingSimulation'
export { RoutingStats } from './empresa/RoutingStats'
export { RenameInstanceModal } from './empresa/RenameInstanceModal'

// Context Exports (for convenience)
export { useAdminContext } from '../contexts/AdminContext' 