import React, { useState, useEffect } from 'react'
import { MainLayout } from '../components/layout/MainLayout'
import { CalendarView } from '../components/agenda/CalendarView'
import { getEventTypes } from '../services/eventService'
import { getLeads } from '../services/leadService'
import { useEventLogic } from '../hooks/useEventLogic'
import { useEvents } from '../hooks/useEvents'
import { 
  PlusIcon, 
  CalendarIcon, 
  XMarkIcon,
  MapPinIcon,
  UserGroupIcon,
  Bars3Icon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  FireIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'
import type { EventType, Lead, Task, CreateEventData, UpdateEventData, Event } from '../types'

// Tipo personalizado para o formulário que inclui campos de tempo
interface FormEventData extends Omit<CreateEventData, 'start_date' | 'end_date'> {
  start_date: string
  end_date: string
  start_time: string
  end_time: string
  type_id: string
}
import { supabase } from '../services/supabaseClient'
import EditTaskModal from '../components/tasks/EditTaskModal'
import { updateTask } from '../services/taskService'
import { useToastContext } from '../contexts/ToastContext'
import { ds } from '../utils/designSystem'
import { isOverdueLocal, combineDateAndTimeToLocal } from '../utils/date'
import { useRef } from 'react'
import { useDeleteConfirmation } from '../hooks/useDeleteConfirmation'

const AgendaPage: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [eventTypes, setEventTypes] = useState<EventType[]>([])
  const [leads, setLeads] = useState<Lead[]>([])

  const { handleCreateEvent, handleUpdateEvent, handleDeleteEvent, loading: actionLoading, error: actionError, success, clearMessages } = useEventLogic()
  const { events, tasks: allTasks, refetch } = useEvents()
  const [calendarRefreshKey, setCalendarRefreshKey] = useState(0)
  const { showSuccess, showError } = useToastContext()
  const { executeDelete, isDeleting } = useDeleteConfirmation({
    defaultConfirmMessage: 'Tem certeza que deseja excluir este evento?',
    defaultErrorContext: 'ao excluir evento'
  })

  // Estado para modal de edição de tarefa
  const [showEditTaskModal, setShowEditTaskModal] = useState(false)
  const [selectedTaskForEdit, setSelectedTaskForEdit] = useState<Task | null>(null)

  // Estado para sidebar
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Responsividade: fechar sidebar em telas pequenas
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) { // lg breakpoint
        setSidebarOpen(false)
      } else {
        setSidebarOpen(true)
      }
    }

    handleResize() // Verificar no carregamento
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Teste de conexão básico
  useEffect(() => {
    async function testConnection() {
      try {
        console.log('🔍 Testando conexão Supabase...')
        
        const { error } = await supabase
          .from('events')
          .select('count')
          .limit(1)
        
        if (error) {
          console.error('❌ Erro na conexão:', error)
        } else {
          console.log('✅ Conexão funcionando')
        }
      } catch (err) {
        console.error('❌ Erro inesperado:', err)
      }
    }
    
    testConnection()
  }, [])

  useEffect(() => {
    const loadData = async () => {
      try {
        const [eventTypesResponse, leadsResponse] = await Promise.all([
          getEventTypes(),
          getLeads()
        ])
        
        if (eventTypesResponse.data) {
          setEventTypes(eventTypesResponse.data)
        }
        if (leadsResponse.data) {
          setLeads(leadsResponse.data)
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error)
      }
    }

    loadData()
  }, [])

  useEffect(() => {
    if (success) {
      showSuccess(success)
      refetch()
      setCalendarRefreshKey(prev => prev + 1)
      setModalOpen(false)
      setEditingEvent(null)
      // Evitar loop de re-render por sucesso persistente
      clearMessages()
    }
  }, [success, showSuccess, refetch, clearMessages])

  const lastErrorRef = useRef<string | null>(null)
  useEffect(() => {
    if (actionError && actionError !== lastErrorRef.current) {
      lastErrorRef.current = actionError
      showError(actionError)
    }
  }, [actionError])

  const handleOpenCreateModal = () => {
    setEditingEvent(null)
    setModalOpen(true)
  }

  const handleEventEdit = (event: Event) => {
    setEditingEvent(event)
    setModalOpen(true)
  }

  const handleTaskClick = async (task: Task) => {
    setSelectedTaskForEdit(task)
    setShowEditTaskModal(true)
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

  const [formData, setFormData] = useState<FormEventData>({
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    start_time: '',
    end_time: '',
    location: '',
    type_id: '',
    lead_id: '',
    participants: []
  })

  const handleCreateEventSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    
    if (!formData.title || !formData.start_date || !formData.start_time) {
      showError('Por favor, preencha todos os campos obrigatórios')
      return
    }

    // Converter para ISO (UTC) usando fuso UTC-3
    const startDateObj = combineDateAndTimeToLocal(formData.start_date, formData.start_time)
    const endDateObj = combineDateAndTimeToLocal(formData.end_date || formData.start_date, formData.end_time || formData.start_time)
    const startDateTime = startDateObj.toISOString()
    const endDateTime = endDateObj.toISOString()

    const eventData: CreateEventData = {
      title: formData.title,
      description: formData.description,
      start_date: startDateTime,
      end_date: endDateTime,
      timezone: 'America/Sao_Paulo',
      location: formData.location,
      lead_id: formData.lead_id,
      participants: formData.participants
    }

    if (editingEvent) {
      await handleUpdateEvent(editingEvent.id, eventData as UpdateEventData, refetch)
    } else {
      const created = await handleCreateEvent(eventData, refetch)
      if (created) {
        // Recarregar toda a página conforme solicitado
        window.location.reload()
      }
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      start_date: '',
      end_date: '',
      start_time: '',
      end_time: '',
      location: '',
      type_id: '',
      lead_id: '',
      participants: []
    })
    setEditingEvent(null)
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    resetForm()
  }

  useEffect(() => {
    if (editingEvent) {
      const startDate = new Date(editingEvent.start_date)
      const endDate = new Date(editingEvent.end_date)
      
      setFormData({
        title: editingEvent.title,
        description: editingEvent.description || '',
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        start_time: startDate.toTimeString().slice(0, 5),
        end_time: endDate.toTimeString().slice(0, 5),
        location: editingEvent.location || '',
        type_id: editingEvent.event_type_id || '',
        lead_id: editingEvent.lead_id || '',
        participants: editingEvent.participants || []
      })
    }
  }, [editingEvent])

  // Calcular estatísticas
  const todayEvents = events.filter(e => {
    const eventDate = new Date(e.start_date)
    const today = new Date()
    return eventDate.toDateString() === today.toDateString()
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

  return (
    <MainLayout>
      <div className="h-full flex bg-white relative" style={{ height: '100vh' }}>
        {/* Overlay para mobile */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div className={`${
          sidebarOpen ? 'w-80' : 'w-0'
        } transition-all duration-300 overflow-hidden border-r border-gray-200 bg-gray-50 flex flex-col relative z-50 lg:relative lg:z-auto ${
          sidebarOpen ? 'lg:w-80' : 'lg:w-0'
        } ${sidebarOpen ? 'fixed lg:relative' : ''}`}>
          {sidebarOpen && (
            <>
              {/* Header do Sidebar */}
              <div className="p-4 border-b border-gray-200 bg-white">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Painel</h2>
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="p-1 rounded hover:bg-gray-100 transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>

              {/* Estatísticas Rápidas */}
              <div className="p-4 space-y-3">
                <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide">Estatísticas</h3>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium text-gray-700">Eventos</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{events.length}</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2">
                      <ChartBarIcon className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-medium text-gray-700">Tarefas</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{allTasks.length}</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2">
                      <FireIcon className="w-5 h-5 text-orange-600" />
                      <span className="text-sm font-medium text-gray-700">Urgentes</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{urgentTasks.length}</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2">
                      <CheckCircleIcon className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-medium text-gray-700">Concluídas</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{completedTasks.length}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2">
                      <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
                      <span className="text-sm font-medium text-gray-700">Atrasadas</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{overdueTasks.length}</span>
                  </div>
                </div>
              </div>

              {/* Legendas */}
              <div className="p-4 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide mb-3">Legendas</h3>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-purple-600 rounded border border-purple-700"></div>
                    <span className="text-sm text-gray-700">Eventos</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-blue-600 rounded border-2 border-dashed border-blue-700"></div>
                    <span className="text-sm text-gray-700">Tarefas</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-orange-600 rounded border border-orange-700"></div>
                    <span className="text-sm text-gray-700">Alta Prioridade</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-green-600 rounded border border-green-700"></div>
                    <span className="text-sm text-gray-700">Concluídas</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-red-600 rounded border border-red-700"></div>
                    <span className="text-sm text-gray-700">Atrasadas</span>
                  </div>
                </div>
              </div>

              {/* Resumo do Dia */}
              <div className="p-4 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide mb-3">Hoje</h3>
                
                <div className="space-y-2">
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 mb-1">
                      <CalendarIcon className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">{todayEvents.length} evento(s)</span>
                    </div>
                    <p className="text-xs text-blue-700">Agendados para hoje</p>
                  </div>

                  <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="flex items-center gap-2 mb-1">
                      <ExclamationTriangleIcon className="w-4 h-4 text-orange-600" />
                      <span className="text-sm font-medium text-orange-900">{pendingTasks.length} pendente(s)</span>
                    </div>
                    <p className="text-xs text-orange-700">Tarefas aguardando</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Área Principal */}
        <div className="flex-1 flex flex-col min-w-0 h-full">
          {/* Cabeçalho simples estilo Google */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
            <div className="flex items-center gap-3">
              {!sidebarOpen && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 rounded hover:bg-gray-100 transition-colors"
                >
                  <Bars3Icon className="w-5 h-5 text-gray-600" />
                </button>
              )}
              <h1 className="text-2xl font-normal text-gray-900">Agenda</h1>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Botão Criar */}
              <button
                onClick={handleOpenCreateModal}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                <PlusIcon className="w-4 h-4" />
                Criar
              </button>
            </div>
          </div>
          
          {/* Calendário */}
          <div className="flex-1 overflow-hidden h-full" style={{ height: 'calc(100vh - 120px)' }}>
            <CalendarView onEventEdit={handleEventEdit} onTaskEdit={handleTaskClick} refreshKey={calendarRefreshKey} />
          </div>
        </div>
      </div>
        
      {/* Modal para criar/editar evento */}
      {modalOpen && (
        <div className={ds.modal.overlay()}>
          <div className={`${ds.modal.container()} max-w-2xl max-h-[95vh] flex flex-col`}>
            {/* Header */}
            <div className={`${ds.modal.header()} flex-shrink-0`}>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <CalendarIcon className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                  <h2 className={ds.modal.title()}>
                    {editingEvent ? 'Editar Evento' : 'Novo Evento'}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {editingEvent ? 'Modifique as informações do evento' : 'Preencha as informações do evento'}
                  </p>
                </div>
              </div>
              <button 
                onClick={handleCloseModal}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className={`${ds.modal.content()} flex-1 overflow-y-auto`}>
              <form id="agenda-event-form" onSubmit={handleCreateEventSubmit} className="space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Título *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-500 transition-all duration-200 text-sm"
                      placeholder="Ex: Reunião com cliente"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descrição
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-500 transition-all duration-200 text-sm min-h-[100px] resize-y"
                      placeholder="Detalhes sobre o evento..."
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Data de Início *
                      </label>
                      <input
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-500 transition-all duration-200 text-sm"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Horário de Início *
                      </label>
                      <input
                        type="time"
                        value={formData.start_time}
                        onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-500 transition-all duration-200 text-sm"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Data de Término
                      </label>
                      <input
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-500 transition-all duration-200 text-sm"
                        min={formData.start_date}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Horário de Término
                      </label>
                      <input
                        type="time"
                        value={formData.end_time}
                        onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-500 transition-all duration-200 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <MapPinIcon className="w-4 h-4 inline mr-1" />
                      Local
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-500 transition-all duration-200 text-sm"
                      placeholder="Ex: Sala de reuniões, endereço..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tipo de Evento
                      </label>
                      <select
                        value={formData.type_id}
                        onChange={(e) => setFormData({ ...formData, type_id: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-500 transition-all duration-200 text-sm"
                      >
                        <option value="">Selecionar tipo</option>
                        {eventTypes.map((type) => (
                          <option key={type.id} value={type.id}>
                            {type.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <UserGroupIcon className="w-4 h-4 inline mr-1" />
                        Lead Relacionado
                      </label>
                      <select
                        value={formData.lead_id}
                        onChange={(e) => setFormData({ ...formData, lead_id: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-500 transition-all duration-200 text-sm"
                      >
                        <option value="">Selecionar lead</option>
                        {leads.map((lead) => (
                          <option key={lead.id} value={lead.id}>
                            {lead.name} - {lead.company}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className={`${ds.modal.footer()} flex-shrink-0`}>
              {editingEvent && (
                <button
                  type="button"
                  onClick={async () => {
                    if (!editingEvent) return
                    try {
                      const result = await executeDelete(
                        async () => {
                          await handleDeleteEvent(editingEvent.id, refetch)
                        },
                        'Tem certeza que deseja excluir este evento? Esta ação não pode ser desfeita.',
                        'ao excluir evento'
                      )
                      if (result) {
                        await refetch()
                        setCalendarRefreshKey(prev => prev + 1)
                        setModalOpen(false)
                        setEditingEvent(null)
                      }
                    } catch (err) {
                      console.error('Erro ao excluir evento:', err)
                      showError('Erro ao excluir evento')
                    }
                  }}
                  disabled={actionLoading || isDeleting}
                  className={`${ds.button('outline')} border-red-300 text-red-600 hover:bg-red-50`}
                >
                  {isDeleting ? 'Excluindo...' : 'Excluir'}
                </button>
              )}
              <button
                type="button"
                onClick={handleCloseModal}
                className={ds.button('secondary')}
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="agenda-event-form"
                disabled={actionLoading || !formData.title || !formData.start_date || !formData.start_time}
                className={ds.button('primary')}
              >
                {actionLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{editingEvent ? 'Atualizando...' : 'Criando...'}</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <CalendarIcon className="w-4 h-4" />
                    <span>{editingEvent ? 'Atualizar Evento' : 'Criar Evento'}</span>
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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
    </MainLayout>
  )
}

export default AgendaPage