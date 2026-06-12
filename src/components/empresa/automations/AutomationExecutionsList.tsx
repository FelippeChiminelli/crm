import { useEffect, useState } from 'react'
import type { AutomationRunLog, AutomationRunStatus } from '../../../types'
import { listAutomationRuns } from '../../../services/automationRunLogService'
import { usePagination } from '../../../hooks/usePagination'
import { Pagination } from '../../common/Pagination'

interface AutomationExecutionsListProps {
  // Quando informado, fixa o filtro a uma única regra (modo modal por regra).
  ruleId?: string
  // Opções de regra para o filtro (modo global). Ignorado quando ruleId é definido.
  ruleOptions?: { id: string; name: string }[]
}

const STATUS_META: Record<AutomationRunStatus, { label: string; className: string }> = {
  success: { label: 'Sucesso', className: 'bg-green-100 text-green-800' },
  skipped: { label: 'Pulada', className: 'bg-yellow-100 text-yellow-800' },
  error: { label: 'Erro', className: 'bg-red-100 text-red-800' },
}

const ACTION_LABELS: Record<string, string> = {
  move_lead: 'Mover lead',
  assign_responsible: 'Atribuir responsável',
  create_task: 'Criar tarefa',
  mark_as_sold: 'Marcar como vendido',
  mark_as_lost: 'Marcar como perdido',
  call_webhook: 'Acionar webhook',
  send_whatsapp: 'Enviar WhatsApp',
}

function formatAction(actionType?: string | null): string {
  if (!actionType) return '—'
  return ACTION_LABELS[actionType] || actionType
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return iso
  }
}

function StatusBadge({ status }: { status: AutomationRunStatus }) {
  const meta = STATUS_META[status] || STATUS_META.success
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${meta.className}`}>
      {meta.label}
    </span>
  )
}

export function AutomationExecutionsList({ ruleId, ruleOptions }: AutomationExecutionsListProps) {
  const [rows, setRows] = useState<AutomationRunLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [statusFilter, setStatusFilter] = useState<AutomationRunStatus | ''>('')
  const [ruleFilter, setRuleFilter] = useState<string>('')
  const [fromDate, setFromDate] = useState<string>('')
  const [toDate, setToDate] = useState<string>('')

  const { pagination, setPage, setLimit, setTotal } = usePagination({ initialLimit: 25 })
  const { page, limit } = pagination

  // Busca depende apenas de valores primitivos (filtros/página) para evitar
  // loop de render: os setters de usePagination não são memoizados e mudam de
  // identidade a cada render, então não podem entrar nas dependências do efeito.
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    listAutomationRuns({
      ruleId: ruleId || (ruleFilter || undefined),
      status: statusFilter || undefined,
      from: fromDate ? new Date(`${fromDate}T00:00:00`).toISOString() : undefined,
      to: toDate ? new Date(`${toDate}T23:59:59`).toISOString() : undefined,
      page,
      pageSize: limit,
    })
      .then(({ data, count, error }) => {
        if (cancelled) return
        if (error) {
          setError('Não foi possível carregar as execuções.')
          setRows([])
          setTotal(0)
        } else {
          setRows(data)
          setTotal(count)
        }
      })
      .catch(() => {
        if (cancelled) return
        setError('Não foi possível carregar as execuções.')
        setRows([])
        setTotal(0)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ruleId, ruleFilter, statusFilter, fromDate, toDate, page, limit])

  // Filtros alteram o conjunto: volta para a primeira página.
  useEffect(() => {
    setPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ruleFilter, statusFilter, fromDate, toDate])

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3">
        {!ruleId && ruleOptions && ruleOptions.length > 0 && (
          <div>
            <label className="block text-xs text-gray-600 mb-1">Regra</label>
            <select
              className="border rounded px-3 py-2 text-sm min-w-[200px]"
              value={ruleFilter}
              onChange={e => setRuleFilter(e.target.value)}
            >
              <option value="">Todas</option>
              {ruleOptions.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs text-gray-600 mb-1">Status</label>
          <select
            className="border rounded px-3 py-2 text-sm"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as AutomationRunStatus | '')}
          >
            <option value="">Todos</option>
            <option value="success">Sucesso</option>
            <option value="skipped">Pulada</option>
            <option value="error">Erro</option>
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-600 mb-1">De</label>
          <input
            type="date"
            className="border rounded px-3 py-2 text-sm"
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs text-gray-600 mb-1">Até</label>
          <input
            type="date"
            className="border rounded px-3 py-2 text-sm"
            value={toDate}
            onChange={e => setToDate(e.target.value)}
          />
        </div>

        {(statusFilter || ruleFilter || fromDate || toDate) && (
          <button
            type="button"
            onClick={() => { setStatusFilter(''); setRuleFilter(''); setFromDate(''); setToDate('') }}
            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Conteúdo */}
      {loading ? (
        <div className="text-sm text-gray-600">Carregando execuções...</div>
      ) : error ? (
        <div className="text-sm text-red-600">{error}</div>
      ) : rows.length === 0 ? (
        <div className="text-sm text-gray-500 py-8 text-center border rounded">
          Nenhuma execução registrada para os filtros selecionados.
        </div>
      ) : (
        <div className="border rounded overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Data</th>
                {!ruleId && <th className="px-3 py-2 text-left font-medium text-gray-600">Regra</th>}
                <th className="px-3 py-2 text-left font-medium text-gray-600">Ação</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Alvo</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Status</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Detalhe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {rows.map(row => (
                <tr key={row.id} className="align-top">
                  <td className="px-3 py-2 whitespace-nowrap text-gray-700">{formatDateTime(row.created_at)}</td>
                  {!ruleId && <td className="px-3 py-2 text-gray-700">{row.rule_name || '—'}</td>}
                  <td className="px-3 py-2 text-gray-700">{formatAction(row.action_type)}</td>
                  <td className="px-3 py-2 text-gray-700">{row.target_label || '—'}</td>
                  <td className="px-3 py-2"><StatusBadge status={row.status} /></td>
                  <td className="px-3 py-2 text-gray-500 max-w-[280px]">
                    {row.status === 'error'
                      ? <span className="text-red-600">{row.error_message || 'Erro'}</span>
                      : <span>{(row.detail?.reason as string) || ''}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination
            pagination={pagination}
            onPageChange={setPage}
            onLimitChange={setLimit}
            limitOptions={[25, 50, 100]}
          />
        </div>
      )}
    </div>
  )
}
