import React, { useState, useEffect, useCallback } from 'react'
import { MainLayout } from '../components/layout/MainLayout'
import { CalendarView } from '../components/agenda/CalendarView'
import { useEvents } from '../hooks/useEvents'
import { useBookingLogic } from '../hooks/useBookingLogic'
import { 
  PlusIcon, 
  CalendarIcon, 
  XMarkIcon,
  Bars3Icon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  FireIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  CalendarDaysIcon,
  PencilSquareIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import type { Task, BookingCalendar, CreateBookingCalendarData, UpdateBookingCalendarData, Profile, BookingAvailability, Booking, UpdateBookingData } from '../types'
import EditTaskModal from '../components/tasks/EditTaskModal'
import { NewTaskModal } from '../components/tasks/NewTaskModal'
import { updateTask } from '../services/taskService'
import { useToastContext } from '../contexts/ToastContext'
import { isOverdueLocal } from '../utils/date'
import { BookingCalendarForm, NewBookingModal, BookingDetailModal } from '../components/booking'
import { updateBooking } from '../services/bookingService'
import { useDeleteConfirmation } from '../hooks/useDeleteConfirmation'
import { usePermissionCheck } from '../routes/PermissionRoute'
import { getLeads } from '../services/leadService'
import { supabase } from '../services/supabaseClient'
import { getUserEmpresaId } from '../services/authService'

const AgendaPage: React.FC = () => {
  const { tasks: allTasks, bookings, refetch, loading: eventsLoading } = useEvents()
  const [calendarRefreshKey, setCalendarRefreshKey] = useState(0)
  const [reloading, setReloading] = useState(false)
  const { showSuccess, showError } = useToastContext()
  const { checkAdminOnly } = usePermissionCheck()
  
  // Apenas admins podem configurar agendas
  const isAdmin = checkAdminOnly()

  // Estado para modal de edição de tarefa
  const [showEditTaskModal, setShowEditTaskModal] = useState(false)
  const [selectedTaskForEdit, setSelectedTaskForEdit] = useState<Task | null>(null)
  const [showNewTaskModal, setShowNewTaskModal] = useState(false)

  // Estado para modal de visualização de agendamento
  const [showBookingDetailModal, setShowBookingDetailModal] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)

  // Estado para sidebar
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // ===== Estados para Booking/Agendas =====
  const {
    calendars,
    selectedCalendar,
    setSelectedCalendar,
    bookingTypes,
    saving,
    loadCalendars,
    loadCalendarDetails,
    handleCreateCalendar,
    handleUpdateCalendar,
    handleDeleteCalendar,
    handleAddOwner,
    handleRemoveOwner,
    handleUpdateOwner,
    handleSetAvailability,
    handleCreateBookingType,
    handleUpdateBookingType,
    handleDeleteBookingType,
    handleCreateBooking,
    loadAvailableSlots,
    loadBookingTypes
  } = useBookingLogic()

  const { executeDelete } = useDeleteConfirmation({
    defaultConfirmMessage: 'Tem certeza que deseja excluir esta agenda?',
    defaultErrorContext: 'ao excluir agenda'
  })

  const [showConfigModal, setShowConfigModal] = useState(false)
  const [editingCalendar, setEditingCalendar] = useState<BookingCalendar | null>(null)
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [showCalendarSelector, setShowCalendarSelector] = useState(false)
  const [availableUsers, setAvailableUsers] = useState<Profile[]>([])

  // Carregar usuários disponíveis para adicionar como owners
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const empresaId = await getUserEmpresaId()
        if (!empresaId) return

        const { data } = await supabase
          .from('profiles')
          .select('uuid, full_name, email, phone')
          .eq('empresa_id', empresaId)
          .order('full_name')

        if (data) {
          setAvailableUsers(data as Profile[])
        }
      } catch (error) {
        console.error('Erro ao carregar usuários:', error)
      }
    }

    loadUsers()
  }, [])

  // Responsividade: sidebar visível apenas em desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) { // lg breakpoint
        setSidebarOpen(true)
      }
    }

    handleResize() // Verificar no carregamento
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // ===== Handlers de Tarefa =====
  const handleTaskClick = async (task: Task) => {
    setSelectedTaskForEdit(task)
    setShowEditTaskModal(true)
  }

  // ===== Handlers de Agendamento =====
  const handleBookingClick = (booking: Booking) => {
    setSelectedBooking(booking)
    setShowBookingDetailModal(true)
  }

  const handleUpdateBooking = async (id: string, data: UpdateBookingData) => {
    try {
      await updateBooking(id, data)
      showSuccess('Agendamento atualizado!')
      refetch()
      setCalendarRefreshKey(prev => prev + 1)
      // Atualizar o booking selecionado com os novos dados
      if (selectedBooking && selectedBooking.id === id) {
        setSelectedBooking(prev => prev ? { ...prev, ...data } : null)
      }
    } catch (error) {
      console.error('Erro ao atualizar agendamento:', error)
      showError('Erro ao atualizar agendamento')
    }
  }

  const handleTaskSave = async (taskData: Partial<Task>) => {
    if (!selectedTaskForEdit) return

    try {
      await updateTask(selectedTaskForEdit.id, taskData)
      showSuccess('Tarefa atualizada com sucesso!')
      setShowEditTaskModal(false)
      setSelectedTaskForEdit(null)
      refetch()
      setCalendarRefreshKey(prev => prev + 1)
    } catch (error) {
      console.error('Erro ao atualizar tarefa:', error)
      showError('Erro ao atualizar tarefa')
    }
  }

  // ===== Handlers de Agenda/Booking =====
  const handleOpenConfigModal = () => {
    setEditingCalendar(null)
    setShowConfigModal(true)
  }

  const handleEditCalendar = async (calendar: BookingCalendar) => {
    const details = await loadCalendarDetails(calendar.id)
    setEditingCalendar(details)
    setShowConfigModal(true)
  }

  const handleCloseConfigModal = () => {
    setShowConfigModal(false)
    setEditingCalendar(null)
  }

  const handleCalendarSubmit = async (data: CreateBookingCalendarData | UpdateBookingCalendarData) => {
    if (editingCalendar) {
      await handleUpdateCalendar(editingCalendar.id, data as UpdateBookingCalendarData)
      const updated = await loadCalendarDetails(editingCalendar.id)
      setEditingCalendar(updated)
    } else {
      const created = await handleCreateCalendar(data as CreateBookingCalendarData)
      handleCloseConfigModal()
      const details = await loadCalendarDetails(created.id)
      setEditingCalendar(details)
      setShowConfigModal(true)
    }
  }

  const handleDeleteCalendarClick = async (calendar: BookingCalendar) => {
    await executeDelete(
      () => handleDeleteCalendar(calendar.id),
      `Excluir agenda "${calendar.name}"? Todos os agendamentos associados também serão excluídos.`,
      'ao excluir agenda'
    )
    handleCloseConfigModal()
  }

  // Wrapper para atualizar editingCalendar após operações
  const refreshEditingCalendar = async () => {
    if (editingCalendar) {
      const updated = await loadCalendarDetails(editingCalendar.id)
      setEditingCalendar(updated)
      loadCalendars()
    }
  }

  // Wrappers para operações que precisam atualizar o estado
  const handleAddOwnerWithRefresh = async (user_id: string, role: 'admin' | 'member') => {
    if (!editingCalendar) return
    await handleAddOwner(editingCalendar.id, { user_id, role })
    await refreshEditingCalendar()
  }

  const handleRemoveOwnerWithRefresh = async (owner_id: string) => {
    await handleRemoveOwner(owner_id)
    await refreshEditingCalendar()
  }

  const handleUpdateOwnerWithRefresh = async (owner_id: string, data: { can_receive_bookings?: boolean; booking_weight?: number }) => {
    await handleUpdateOwner(owner_id, data)
    await refreshEditingCalendar()
  }

  const handleSaveAvailabilityWithRefresh = async (data: Omit<BookingAvailability, 'id' | 'calendar_id' | 'created_at'>[]) => {
    if (!editingCalendar) return
    await handleSetAvailability(editingCalendar.id, data)
    await refreshEditingCalendar()
  }

  const handleCreateBookingTypeWithRefresh = async (data: { name: string; duration_minutes: number; color?: string; description?: string }) => {
    if (!editingCalendar) return
    await handleCreateBookingType({ ...data, calendar_id: editingCalendar.id })
    await refreshEditingCalendar()
  }

  const handleUpdateBookingTypeWithRefresh = async (id: string, data: { name?: string; duration_minutes?: number; is_active?: boolean }) => {
    await handleUpdateBookingType(id, data)
    await refreshEditingCalendar()
  }

  const handleDeleteBookingTypeWithRefresh = async (id: string) => {
    await handleDeleteBookingType(id)
    await refreshEditingCalendar()
  }

  // Handler para novo agendamento
  const handleOpenNewBooking = async (calendar?: BookingCalendar) => {
    const active = calendars.filter(c => c.is_active)
    if (active.length === 0) return

    if (calendar) {
      await openBookingForCalendar(calendar)
      return
    }

    if (active.length === 1) {
      await openBookingForCalendar(active[0])
      return
    }

    setShowCalendarSelector(true)
  }

  const openBookingForCalendar = async (calendar: BookingCalendar) => {
    setSelectedCalendar(calendar)
    await loadBookingTypes(calendar.id)
    setShowCalendarSelector(false)
    setShowBookingModal(true)
  }

  const handleReload = async () => {
    setReloading(true)
    try {
      await Promise.all([refetch(), loadCalendars()])
      setCalendarRefreshKey(prev => prev + 1)
    } finally {
      setReloading(false)
    }
  }

  const isRefreshing = reloading || eventsLoading

  // Buscar leads
  const searchLeads = useCallback(async (query: string) => {
    const result = await getLeads({ search: query, limit: 10 })
    return result.data || []
  }, [])

  // Calcular estatísticas
  const todayBookings = (bookings || []).filter(b => {
    const bookingDate = new Date(b.start_datetime)
    const today = new Date()
    return bookingDate.toDateString() === today.toDateString() && 
           ['pending', 'confirmed'].includes(b.status)
  })

  const urgentTasks = allTasks.filter(task => 
    task.priority === 'alta' || task.priority === 'urgente'
  )

  const completedTasks = allTasks.filter(task => task.status === 'concluida')
  const pendingTasks = allTasks.filter(task => task.status === 'pendente')
  const overdueTasks = allTasks.filter(task => {
    if (!task.due_date) return false
    if (task.status === 'concluida' || task.status === 'cancelada') return false
    return isOverdueLocal(task.due_date, task.due_time)
  })

  const activeCalendars = calendars.filter(c => c.is_active)

  return (
    <MainLayout>
      <div className="h-full flex bg-white relative lg:h-screen overflow-hidden">
        {/* Sidebar - Apenas Desktop */}
        <div className={`hidden lg:flex ${
          sidebarOpen ? 'w-80' : 'w-0'
        } transition-all duration-300 overflow-hidden border-r border-gray-200 bg-gray-50 flex-col`}>
          {sidebarOpen && (
            <>
              {/* Header do Sidebar */}
              <div className="p-3 lg:p-4 border-b border-gray-200 bg-white">
                <div className="flex items-center justify-between">
                  <h2 className="text-base lg:text-lg font-semibold text-gray-900">Painel</h2>
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="p-1.5 rounded hover:bg-gray-100 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                  >
                    <XMarkIcon className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>

              {/* Estatísticas Rápidas */}
              <div className="p-3 lg:p-4 space-y-2 lg:space-y-3">
                <h3 className="text-xs lg:text-sm font-semibold text-gray-700 uppercase tracking-wide">Estatísticas</h3>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 lg:p-3 bg-white rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2">
                      <ChartBarIcon className="w-4 h-4 lg:w-5 lg:h-5 text-blue-600" />
                      <span className="text-xs lg:text-sm font-medium text-gray-700">Tarefas</span>
                    </div>
                    <span className="text-xs lg:text-sm font-bold text-gray-900">{allTasks.length}</span>
                  </div>

                  <div className="flex items-center justify-between p-2 lg:p-3 bg-white rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 lg:w-5 lg:h-5 text-indigo-600" />
                      <span className="text-xs lg:text-sm font-medium text-gray-700">Agendamentos</span>
                    </div>
                    <span className="text-xs lg:text-sm font-bold text-gray-900">{(bookings || []).length}</span>
                  </div>

                  <div className="flex items-center justify-between p-2 lg:p-3 bg-white rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2">
                      <FireIcon className="w-4 h-4 lg:w-5 lg:h-5 text-orange-600" />
                      <span className="text-xs lg:text-sm font-medium text-gray-700">Urgentes</span>
                    </div>
                    <span className="text-xs lg:text-sm font-bold text-gray-900">{urgentTasks.length}</span>
                  </div>

                  <div className="flex items-center justify-between p-2 lg:p-3 bg-white rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2">
                      <CheckCircleIcon className="w-4 h-4 lg:w-5 lg:h-5 text-green-600" />
                      <span className="text-xs lg:text-sm font-medium text-gray-700">Concluídas</span>
                    </div>
                    <span className="text-xs lg:text-sm font-bold text-gray-900">{completedTasks.length}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 lg:p-3 bg-white rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2">
                      <ExclamationTriangleIcon className="w-4 h-4 lg:w-5 lg:h-5 text-red-600" />
                      <span className="text-xs lg:text-sm font-medium text-gray-700">Atrasadas</span>
                    </div>
                    <span className="text-xs lg:text-sm font-bold text-gray-900">{overdueTasks.length}</span>
                  </div>
                </div>
              </div>

              {/* Minhas Agendas */}
              <div className="p-3 lg:p-4 border-t border-gray-200">
                <div className="flex items-center justify-between mb-2 lg:mb-3">
                  <h3 className="text-xs lg:text-sm font-semibold text-gray-700 uppercase tracking-wide">Minhas Agendas</h3>
                  {isAdmin && (
                    <button
                      onClick={handleOpenConfigModal}
                      className="p-1 rounded hover:bg-gray-200 transition-colors"
                      title="Configurar agendas"
                    >
                      <Cog6ToothIcon className="w-4 h-4 text-gray-500" />
                    </button>
                  )}
                </div>
                
                {activeCalendars.length > 0 ? (
                  <div className="space-y-2">
                    {activeCalendars.map(calendar => (
                      <div 
                        key={calendar.id}
                        className="flex items-center justify-between p-2 lg:p-2.5 bg-white rounded-lg border border-gray-200 hover:border-indigo-300 transition-colors group"
                      >
                        <button
                          onClick={() => handleOpenNewBooking(calendar)}
                          className="flex items-center gap-2 flex-1 min-w-0 text-left"
                        >
                          <div 
                            className="w-3 h-3 rounded-full flex-shrink-0" 
                            style={{ backgroundColor: calendar.color || '#6366f1' }}
                          />
                          <span className="text-xs lg:text-sm font-medium text-gray-700 truncate">
                            {calendar.name}
                          </span>
                        </button>
                        {isAdmin && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEditCalendar(calendar)
                            }}
                            className="p-1 rounded hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Editar agenda"
                          >
                            <PencilSquareIcon className="w-3.5 h-3.5 text-gray-400" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : isAdmin ? (
                  <button
                    onClick={handleOpenConfigModal}
                    className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-center hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
                  >
                    <CalendarDaysIcon className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                    <span className="text-xs text-gray-500">Criar primeira agenda</span>
                  </button>
                ) : (
                  <div className="text-center py-3">
                    <CalendarDaysIcon className="w-6 h-6 text-gray-300 mx-auto mb-1" />
                    <span className="text-xs text-gray-400">Nenhuma agenda disponível</span>
                  </div>
                )}
              </div>

              {/* Legendas */}
              <div className="p-3 lg:p-4 border-t border-gray-200">
                <h3 className="text-xs lg:text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2 lg:mb-3">Legendas</h3>
                
                <div className="space-y-1.5 lg:space-y-2">
                  <div className="flex items-center gap-2 lg:gap-3">
                    <div className="w-3 h-3 lg:w-4 lg:h-4 bg-blue-600 rounded border-2 border-dashed border-blue-700"></div>
                    <span className="text-xs lg:text-sm text-gray-700">Tarefas</span>
                  </div>
                  
                  <div className="flex items-center gap-2 lg:gap-3">
                    <div className="w-3 h-3 lg:w-4 lg:h-4 bg-indigo-500 rounded border border-indigo-600"></div>
                    <span className="text-xs lg:text-sm text-gray-700">Agendamentos</span>
                  </div>
                  
                  <div className="flex items-center gap-2 lg:gap-3">
                    <div className="w-3 h-3 lg:w-4 lg:h-4 bg-orange-600 rounded border border-orange-700"></div>
                    <span className="text-xs lg:text-sm text-gray-700">Alta Prioridade</span>
                  </div>
                  
                  <div className="flex items-center gap-2 lg:gap-3">
                    <div className="w-3 h-3 lg:w-4 lg:h-4 bg-green-600 rounded border border-green-700"></div>
                    <span className="text-xs lg:text-sm text-gray-700">Concluídas</span>
                  </div>
                  
                  <div className="flex items-center gap-2 lg:gap-3">
                    <div className="w-3 h-3 lg:w-4 lg:h-4 bg-red-600 rounded border border-red-700"></div>
                    <span className="text-xs lg:text-sm text-gray-700">Atrasadas</span>
                  </div>
                </div>
              </div>

              {/* Resumo do Dia */}
              <div className="p-3 lg:p-4 border-t border-gray-200">
                <h3 className="text-xs lg:text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2 lg:mb-3">Hoje</h3>
                
                <div className="space-y-2">
                  <div className="p-2 lg:p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                    <div className="flex items-center gap-2 mb-1">
                      <CalendarIcon className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs lg:text-sm font-semibold text-indigo-900">{todayBookings.length} agendamento(s)</span>
                    </div>
                    <p className="text-[10px] lg:text-xs text-indigo-700">Atendimentos marcados</p>
                  </div>

                  <div className="p-2 lg:p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="flex items-center gap-2 mb-1">
                      <ExclamationTriangleIcon className="w-4 h-4 text-orange-600" />
                      <span className="text-xs lg:text-sm font-semibold text-orange-900">{pendingTasks.length} pendente(s)</span>
                    </div>
                    <p className="text-[10px] lg:text-xs text-orange-700">Tarefas aguardando</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Área Principal */}
        <div className="flex-1 flex flex-col min-w-0 h-full w-full">
          {/* Cabeçalho - Desktop */}
          <div className="hidden lg:flex items-center justify-between p-4 border-b border-gray-200 bg-white w-full">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded hover:bg-gray-100 transition-colors"
              >
                <Bars3Icon className="w-5 h-5 text-gray-600" />
              </button>
              <h1 className="text-2xl font-normal text-gray-900">Agenda</h1>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={handleReload}
                disabled={isRefreshing}
                className="inline-flex items-center justify-center p-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Atualizar dados"
              >
                <ArrowPathIcon className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
              {isAdmin && (
                <button
                  onClick={handleOpenConfigModal}
                  className="p-2 rounded hover:bg-gray-100 transition-colors"
                  title="Configurar agendas"
                >
                  <Cog6ToothIcon className="w-5 h-5 text-gray-600" />
                </button>
              )}
              <button
                onClick={() => handleOpenNewBooking()}
                disabled={calendars.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title={calendars.length === 0 ? 'Crie uma agenda primeiro' : 'Novo agendamento'}
              >
                <CalendarDaysIcon className="w-4 h-4" />
                Novo Agendamento
              </button>
              <button
                onClick={() => setShowNewTaskModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors"
              >
                <PlusIcon className="w-4 h-4" />
                Nova Tarefa
              </button>
            </div>
          </div>

          {/* Cabeçalho - Mobile */}
          <div className="block lg:hidden p-3 border-b border-gray-200 bg-white w-full">
            <div className="flex items-center justify-between gap-2">
              {/* Título */}
              <h1 className="text-base font-bold text-gray-900">Agenda</h1>
              
              {/* Botões de Ação */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleReload}
                  disabled={isRefreshing}
                  className="flex-shrink-0 inline-flex items-center justify-center min-h-[32px] min-w-[32px] p-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Atualizar"
                >
                  <ArrowPathIcon className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
                {isAdmin && (
                  <button
                    onClick={handleOpenConfigModal}
                    className="p-1.5 rounded hover:bg-gray-100 transition-colors"
                    title="Configurar agendas"
                  >
                    <Cog6ToothIcon className="w-5 h-5 text-gray-600" />
                  </button>
                )}
                <button
                  onClick={() => handleOpenNewBooking()}
                  disabled={calendars.length === 0}
                  className="flex items-center justify-center gap-1 px-2 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-xs font-medium min-h-[32px] whitespace-nowrap disabled:opacity-50"
                >
                  <CalendarDaysIcon className="w-4 h-4" />
                  <span>Agendar</span>
                </button>
                <button
                  onClick={() => setShowNewTaskModal(true)}
                  className="flex items-center justify-center gap-1 px-2 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-xs font-medium min-h-[32px] whitespace-nowrap"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>Tarefa</span>
                </button>
              </div>
            </div>
          </div>
          
          {/* Calendário */}
          <div className="flex-1 overflow-hidden min-h-0 w-full">
            <CalendarView 
              onTaskEdit={handleTaskClick} 
              onBookingEdit={handleBookingClick}
              refreshKey={calendarRefreshKey} 
            />
          </div>
        </div>
      </div>

      {/* Modal de edição de tarefa */}
      {showEditTaskModal && selectedTaskForEdit && (
        <EditTaskModal
          isOpen={showEditTaskModal}
          onClose={() => {
            setShowEditTaskModal(false)
            setSelectedTaskForEdit(null)
          }}
          task={selectedTaskForEdit}
          onSubmit={handleTaskSave}
        />
      )}

      {/* Modal de nova tarefa */}
      <NewTaskModal
        isOpen={showNewTaskModal}
        onClose={() => setShowNewTaskModal(false)}
        onTaskCreated={() => {
          refetch()
          setCalendarRefreshKey(prev => prev + 1)
        }}
      />

      {/* Modal de configuração de agendas */}
      <BookingCalendarForm
        isOpen={showConfigModal}
        onClose={handleCloseConfigModal}
        calendar={editingCalendar}
        onSubmit={handleCalendarSubmit}
        onDelete={editingCalendar ? () => handleDeleteCalendarClick(editingCalendar) : undefined}
        saving={saving}
        availableUsers={availableUsers}
        onAddOwner={editingCalendar ? handleAddOwnerWithRefresh : undefined}
        onRemoveOwner={handleRemoveOwnerWithRefresh}
        onUpdateOwner={handleUpdateOwnerWithRefresh}
        onSaveAvailability={editingCalendar ? handleSaveAvailabilityWithRefresh : undefined}
        onCreateBookingType={editingCalendar ? handleCreateBookingTypeWithRefresh : undefined}
        onUpdateBookingType={handleUpdateBookingTypeWithRefresh}
        onDeleteBookingType={handleDeleteBookingTypeWithRefresh}
        calendars={calendars}
        onSelectCalendar={handleEditCalendar}
        onCreateNew={() => setEditingCalendar(null)}
      />

      {/* Modal de seleção de agenda */}
      {showCalendarSelector && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white w-full shadow-xl sm:max-w-md sm:w-[95%] max-h-[80vh] flex flex-col rounded-t-xl sm:rounded-xl">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-50">
                  <CalendarDaysIcon className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Selecione a Agenda</h2>
                  <p className="text-sm text-gray-500">Em qual agenda deseja agendar?</p>
                </div>
              </div>
              <button
                onClick={() => setShowCalendarSelector(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-2 overflow-y-auto">
              {calendars.filter(c => c.is_active).map(cal => (
                <button
                  key={cal.id}
                  onClick={() => openBookingForCalendar(cal)}
                  className="w-full p-4 rounded-lg border border-gray-200 text-left hover:border-indigo-400 hover:bg-indigo-50 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${cal.color || '#6366f1'}20` }}
                    >
                      <CalendarDaysIcon
                        className="w-5 h-5"
                        style={{ color: cal.color || '#6366f1' }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-medium text-gray-900 group-hover:text-indigo-700 transition-colors">
                        {cal.name}
                      </h4>
                      {cal.description && (
                        <p className="text-sm text-gray-500 truncate">{cal.description}</p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal de novo agendamento */}
      {selectedCalendar && (
        <NewBookingModal
          isOpen={showBookingModal}
          onClose={() => setShowBookingModal(false)}
          calendar={selectedCalendar}
          bookingTypes={bookingTypes}
          onSubmit={async (data) => {
            const result = await handleCreateBooking(data)
            if (result) {
              setShowBookingModal(false)
              refetch()
              setCalendarRefreshKey(prev => prev + 1)
            }
          }}
          loadAvailableSlots={loadAvailableSlots}
          searchLeads={searchLeads}
          saving={saving}
        />
      )}

      {/* Modal de detalhes do agendamento */}
      {selectedBooking && (
        <BookingDetailModal
          isOpen={showBookingDetailModal}
          onClose={() => {
            setShowBookingDetailModal(false)
            setSelectedBooking(null)
          }}
          booking={selectedBooking}
          onUpdate={handleUpdateBooking}
          saving={saving}
        />
      )}
    </MainLayout>
  )
}

export default AgendaPage
