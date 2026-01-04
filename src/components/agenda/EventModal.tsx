import React, { useState, useEffect } from 'react'
import { StyledSelect } from '../ui/StyledSelect'
import type { Event, CreateEventData, UpdateEventData, EventType, Lead, Task } from '../../types'
import { useEventLogic } from '../../hooks/useEventLogic'
import { useEscapeKey } from '../../hooks/useEscapeKey'

interface EventModalProps {
  open: boolean
  onClose: () => void
  initialEvent?: Event | null
  initialStart?: Date
  initialEnd?: Date
  eventTypes?: EventType[]
  leads?: Lead[]
  tasks?: Task[]
  onEventCreated?: () => void // nova prop opcional
}

export const EventModal: React.FC<EventModalProps> = ({
  open,
  onClose,
  initialEvent,
  initialStart,
  initialEnd,
  eventTypes = [],
  leads = [],
  tasks = [],
  onEventCreated // nova prop
}) => {
  const isEdit = !!initialEvent
  const { handleCreateEvent, handleUpdateEvent, loading, error, success } = useEventLogic()
  
  useEscapeKey(open, onClose)

  const [form, setForm] = useState<CreateEventData | UpdateEventData>({
    title: '',
    description: '',
    start_date: initialStart ? initialStart.toISOString() : '',
    end_date: initialEnd ? initialEnd.toISOString() : '',
    all_day: false,
    event_type_id: '',
    location: '',
    lead_id: '',
    task_id: '',
    notes: '',
    tags: []
  })

  useEffect(() => {
    if (initialEvent) {
      setForm({
        title: initialEvent.title,
        description: initialEvent.description || '',
        start_date: initialEvent.start_date,
        end_date: initialEvent.end_date,
        all_day: initialEvent.all_day,
        event_type_id: initialEvent.event_type_id || '',
        location: initialEvent.location || '',
        lead_id: initialEvent.lead_id || '',
        task_id: initialEvent.task_id || '',
        notes: initialEvent.notes || '',
        tags: initialEvent.tags || []
      })
    } else if (initialStart && initialEnd) {
      setForm(f => ({ ...f, start_date: initialStart.toISOString(), end_date: initialEnd.toISOString() }))
    }
  }, [initialEvent, initialStart, initialEnd])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value, type } = e.target
    let fieldValue: any = value
    if (type === 'checkbox' && e.target instanceof HTMLInputElement) {
      fieldValue = e.target.checked
    }
    setForm(f => ({
      ...f,
      [name]: fieldValue
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    console.log('[EventModal] Submit iniciado', { isEdit, form })
    if (isEdit && initialEvent) {
      await handleUpdateEvent(initialEvent.id, form as UpdateEventData)
      console.log('[EventModal] Evento editado')
    } else {
      await handleCreateEvent(form as CreateEventData)
      console.log('[EventModal] handleCreateEvent chamado')
      if (!error && onEventCreated) {
        console.log('[EventModal] Chamando onEventCreated')
        onEventCreated()
      }
    }
    if (!error) {
      console.log('[EventModal] Fechando modal via onClose')
      onClose()
    }
    if (error) {
      console.error('[EventModal] Erro ao criar/editar evento:', error)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-40 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-[90%] sm:w-[550px] lg:w-[600px] max-h-[85vh] overflow-y-auto p-6 relative">
        <button onClick={onClose} className="absolute top-2 right-2 text-gray-400 hover:text-gray-700">&times;</button>
        <h2 className="text-xl font-bold mb-4">{isEdit ? 'Editar Evento' : 'Novo Evento'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Título *</label>
            <input type="text" name="title" value={form.title} onChange={handleChange} required className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Descrição</label>
            <textarea name="description" value={form.description} onChange={handleChange} className="w-full border rounded px-3 py-2" />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Início *</label>
              <input type="datetime-local" name="start_date" value={form.start_date?.slice(0,16)} onChange={handleChange} required className="w-full border rounded px-3 py-2" />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Fim *</label>
              <input type="datetime-local" name="end_date" value={form.end_date?.slice(0,16)} onChange={handleChange} required className="w-full border rounded px-3 py-2" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" name="all_day" checked={!!form.all_day} onChange={handleChange} id="all_day" />
            <label htmlFor="all_day" className="text-sm">Dia inteiro</label>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Tipo</label>
            <StyledSelect
              options={[{ value: '', label: 'Selecione...' }, ...eventTypes.map(t => ({ value: t.id, label: t.name }))]}
              value={form.event_type_id || ''}
              onChange={(val) => setForm(f => ({ ...f, event_type_id: val }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Local</label>
            <input type="text" name="location" value={form.location} onChange={handleChange} className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Lead Relacionado</label>
            <StyledSelect
              options={[{ value: '', label: 'Nenhum' }, ...leads.map(l => ({ value: l.id, label: l.name }))]}
              value={form.lead_id || ''}
              onChange={(val) => setForm(f => ({ ...f, lead_id: val }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Tarefa Relacionada</label>
            <StyledSelect
              options={[{ value: '', label: 'Nenhuma' }, ...tasks.map(t => ({ value: t.id, label: t.title }))]}
              value={form.task_id || ''}
              onChange={(val) => setForm(f => ({ ...f, task_id: val }))}
            />
          </div>
          {/* Participantes e outros campos podem ser adicionados futuramente */}
          <div className="flex justify-end gap-2 mt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300">Cancelar</button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50">
              {loading ? 'Salvando...' : isEdit ? 'Salvar' : 'Criar'}
            </button>
          </div>
          {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
          {success && <div className="text-green-600 text-sm mt-2">{success}</div>}
        </form>
      </div>
    </div>
  )
} 