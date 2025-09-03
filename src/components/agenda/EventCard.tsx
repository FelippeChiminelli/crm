import React from 'react'
import type { Event, EventType, Lead, Task, Profile } from '../../types'

interface EventCardProps {
  event: Event
  eventType?: EventType
  lead?: Lead
  task?: Task
  participants?: Profile[]
}

export const EventCard: React.FC<EventCardProps> = ({ event, eventType, lead, task, participants }) => {
  return (
    <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 shadow-sm w-full max-w-xs">
      <div className="flex items-center gap-2 mb-1">
        {eventType && (
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: eventType.color }} />
        )}
        <span className="font-semibold text-gray-900 text-sm truncate">{event.title}</span>
      </div>
      <div className="text-xs text-gray-600 mb-1">
        {event.all_day ? 'Dia inteiro' : (
          <>
            {new Date(event.start_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            {' - '}
            {new Date(event.end_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </>
        )}
      </div>
      {eventType && (
        <div className="text-xs text-gray-500 mb-1">Tipo: {eventType.name}</div>
      )}
      {event.location && (
        <div className="text-xs text-gray-500 mb-1">Local: {event.location}</div>
      )}
      {lead && (
        <div className="text-xs text-gray-500 mb-1">Lead: {lead.name}</div>
      )}
      {task && (
        <div className="text-xs text-gray-500 mb-1">Tarefa: {task.title}</div>
      )}
      {participants && participants.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {participants.map(p => (
            <span key={p.uuid} className="inline-block bg-primary-100 text-primary-700 rounded px-2 py-0.5 text-xs font-medium">
              {p.full_name.split(' ')[0]}
            </span>
          ))}
        </div>
      )}
      {event.notes && (
        <div className="text-xs text-gray-400 mt-2">{event.notes}</div>
      )}
    </div>
  )
} 