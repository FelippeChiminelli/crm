import type { Lead, LossReason } from '../../../types'
import { getLossReasonLabel } from '../../../utils/constants'

interface ReactivateLeadModalProps {
  isOpen: boolean
  lead: Lead
  lossReasons: LossReason[]
  notes: string
  setNotes: (v: string) => void
  isLoading: boolean
  onClose: () => void
  onConfirm: () => void
}

export function ReactivateLeadModal(props: ReactivateLeadModalProps) {
  const { isOpen, lead, lossReasons, notes, setNotes, isLoading, onClose, onConfirm } = props
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Reativar Lead</h3>

          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800"><strong>Lead:</strong> {lead.name}</p>
            <p className="text-sm text-yellow-800 mt-2">
              <strong>Motivo da perda:</strong> {getLossReasonLabel(lead.loss_reason_category, lossReasons)}
            </p>
            {lead.loss_reason_notes && <p className="text-sm text-yellow-800 mt-1">{lead.loss_reason_notes}</p>}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Motivo da reativação (opcional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Cliente retornou interesse, nova oportunidade identificada..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              disabled={isLoading}
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              disabled={isLoading}
            >
              {isLoading ? 'Reativando...' : 'Reativar Lead'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
