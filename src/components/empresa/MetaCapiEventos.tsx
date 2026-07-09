import { useState, useEffect, useCallback } from 'react'
import { ArrowPathIcon } from '@heroicons/react/24/outline'
import { SkeletonLoader } from '../ui/LoadingStates'
import { listMetaCapiEvents } from '../../services/metaCapiService'
import type { MetaCapiEvent, MetaCapiEventStatus } from '../../types'
import { ds } from '../../utils/designSystem'

interface MetaCapiEventosProps {
  refreshKey?: number
}

const EVENT_NAME_META: Record<string, { className: string }> = {
  Lead: { className: 'bg-blue-100 text-blue-800' },
  Purchase: { className: 'bg-green-100 text-green-800' },
  CompleteRegistration: { className: 'bg-purple-100 text-purple-800' },
}

const STATUS_META: Record<
  MetaCapiEventStatus,
  { label: string; className: string }
> = {
  sent: { label: 'Enviado', className: 'bg-green-100 text-green-800' },
  error: { label: 'Erro', className: 'bg-red-100 text-red-800' },
  pending: { label: 'Pendente', className: 'bg-yellow-100 text-yellow-800' },
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

function EventNameBadge({ name }: { name: string }) {
  const meta = EVENT_NAME_META[name] ?? {
    className: 'bg-gray-100 text-gray-800',
  }
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${meta.className}`}
    >
      {name}
    </span>
  )
}

function StatusBadge({ status }: { status: MetaCapiEventStatus }) {
  const meta = STATUS_META[status] ?? STATUS_META.pending
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${meta.className}`}
    >
      {meta.label}
    </span>
  )
}

export function MetaCapiEventos({ refreshKey = 0 }: MetaCapiEventosProps) {
  const [events, setEvents] = useState<MetaCapiEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadEvents = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listMetaCapiEvents(20)
      setEvents(data)
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Erro ao carregar eventos'
      setError(message)
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadEvents()
  }, [loadEvents, refreshKey])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base lg:text-lg font-semibold text-gray-900">
            Histórico de eventos
          </h3>
          <p className="text-xs lg:text-sm text-gray-500 mt-1">
            Últimos 20 eventos enviados à Meta Conversions API.
          </p>
        </div>
        <button
          type="button"
          onClick={loadEvents}
          disabled={loading}
          className={`${ds.button('secondary')} text-sm`}
        >
          <ArrowPathIcon
            className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
          />
          Atualizar
        </button>
      </div>

      {loading ? (
        <SkeletonLoader lines={5} height="h-8" className="py-2" />
      ) : error ? (
        <div className="text-sm text-red-600 py-4">{error}</div>
      ) : events.length === 0 ? (
        <div className="text-center py-12 text-gray-500 border border-dashed border-gray-200 rounded-lg">
          <p className="text-sm">Nenhum evento enviado ainda</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">
                    Data/hora
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">
                    Pixel
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">
                    Evento
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">
                    Status
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">
                    Detalhe
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {events.map((event) => (
                  <tr key={event.id} className="align-top">
                    <td className="px-3 py-2 whitespace-nowrap text-gray-700">
                      {formatDateTime(event.created_at)}
                    </td>
                    <td className="px-3 py-2 text-gray-700">
                      {event.config?.name ??
                        event.config?.dataset_id ??
                        '—'}
                    </td>
                    <td className="px-3 py-2">
                      <EventNameBadge name={event.event_name} />
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge status={event.status} />
                    </td>
                    <td className="px-3 py-2 text-gray-500 max-w-xs">
                      {event.status === 'error' && event.error_message ? (
                        <span className="text-red-600">
                          {event.error_message}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
