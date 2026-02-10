import {
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline'
import type { Lead, LossReason } from '../../../types'

interface LeadStatusSectionProps {
  lead: Lead
  lossReasons: LossReason[]
}

function formatDateTime(iso: string | undefined | null): string {
  if (!iso) return '-'
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function formatCurrency(value: number | undefined | null): string {
  if (!value && value !== 0) return '-'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function LeadStatusSection({ lead, lossReasons }: LeadStatusSectionProps) {
  const isLost = !!lead.loss_reason_category
  const isSold = !!lead.sold_at

  const lossReasonName = lossReasons.find(r => r.id === lead.loss_reason_category)?.name || lead.loss_reason_category

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 space-y-4">
      {/* Info de Venda */}
      {isSold && (
        <div>
          <h3 className="text-sm font-semibold text-green-700 flex items-center gap-2 mb-3">
            <CheckCircleIcon className="w-4 h-4" />
            Venda Concluída
          </h3>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Valor da venda</span>
              <span className="text-sm font-semibold text-green-700">{formatCurrency(lead.sold_value)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Data da venda</span>
              <span className="text-sm text-gray-900">{formatDateTime(lead.sold_at)}</span>
            </div>
            {lead.sale_notes && (
              <div className="pt-2 border-t border-green-200">
                <p className="text-xs text-gray-600 mb-1">Observações da venda</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{lead.sale_notes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Info de Perda */}
      {isLost && (
        <div>
          <h3 className="text-sm font-semibold text-red-700 flex items-center gap-2 mb-3">
            <ExclamationTriangleIcon className="w-4 h-4" />
            Lead Perdido
          </h3>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Motivo</span>
              <span className="text-sm text-gray-900 capitalize">{lossReasonName || '-'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Data da perda</span>
              <span className="text-sm text-gray-900">{formatDateTime(lead.lost_at)}</span>
            </div>
            {lead.loss_reason_notes && (
              <div className="pt-2 border-t border-red-200">
                <p className="text-xs text-gray-600 mb-1">Detalhes</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{lead.loss_reason_notes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Info do Sistema */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-3">
          <InformationCircleIcon className="w-4 h-4 text-gray-500" />
          Informações do Sistema
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
          <div className="py-1">
            <p className="text-xs text-gray-500">Criado em</p>
            <p className="text-sm text-gray-900 flex items-center gap-1">
              <ClockIcon className="w-3.5 h-3.5 text-gray-400" />
              {formatDateTime(lead.created_at)}
            </p>
          </div>
          {lead.last_contact_at && (
            <div className="py-1">
              <p className="text-xs text-gray-500">Último contato</p>
              <p className="text-sm text-gray-900 flex items-center gap-1">
                <ClockIcon className="w-3.5 h-3.5 text-gray-400" />
                {formatDateTime(lead.last_contact_at)}
              </p>
            </div>
          )}
          {lead.estimated_close_at && (
            <div className="py-1">
              <p className="text-xs text-gray-500">Previsão de fechamento</p>
              <p className="text-sm text-gray-900 flex items-center gap-1">
                <ClockIcon className="w-3.5 h-3.5 text-gray-400" />
                {formatDateTime(lead.estimated_close_at)}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
