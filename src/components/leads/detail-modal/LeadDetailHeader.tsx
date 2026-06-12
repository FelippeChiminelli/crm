import {
  XMarkIcon,
  PencilIcon,
  UserIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline'
import type { Lead } from '../../../types'

interface LeadDetailHeaderProps {
  lead: Lead
  isInitialLoading: boolean
  isEditing: boolean
  isReadOnly: boolean
  showEdit: boolean
  canNavigatePrevious: boolean
  canNavigateNext: boolean
  onNavigatePrevious: () => void
  onNavigateNext: () => void
  onOpenPage: () => void
  onEdit: () => void
  onMarkAsSold: () => void
  onMarkAsLost: () => void
  onReactivate: () => void
  onUnmarkSale: () => void
  onClose: () => void
}

const navButton = (enabled: boolean) =>
  `p-1.5 sm:p-2 rounded-md transition-colors touch-manipulation ${
    enabled ? 'text-gray-600 hover:bg-white hover:text-orange-600 active:bg-gray-200' : 'text-gray-300 cursor-not-allowed'
  }`

const actionEdit =
  'p-2 sm:px-2.5 sm:py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation flex items-center gap-1'

export function LeadDetailHeader(props: LeadDetailHeaderProps) {
  const {
    lead, isInitialLoading, isEditing, isReadOnly, showEdit,
    canNavigatePrevious, canNavigateNext, onNavigatePrevious, onNavigateNext,
    onOpenPage, onEdit, onMarkAsSold, onMarkAsLost, onReactivate, onUnmarkSale, onClose,
  } = props

  const showActions = !isInitialLoading && !isEditing && !isReadOnly
  const isLost = !!lead.loss_reason_category
  const isSold = !!lead.sold_at

  return (
    <div className="flex items-center justify-between p-2 sm:p-3 lg:p-4 border-b border-gray-200 bg-white flex-shrink-0 gap-2">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <div className="p-1.5 lg:p-2 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex-shrink-0 shadow-sm">
          <UserIcon className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-xs sm:text-sm lg:text-base font-semibold text-gray-900 truncate">{lead.name}</h3>
          <p className="text-[10px] lg:text-xs text-gray-500 truncate hidden sm:block">Detalhes do Lead</p>
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
        <button
          onClick={onOpenPage}
          className="hidden lg:flex p-2 rounded-lg text-gray-500 hover:text-orange-600 hover:bg-gray-100 active:bg-gray-200 transition-colors touch-manipulation"
          title="Abrir página do lead"
        >
          <ArrowTopRightOnSquareIcon className="w-4 h-4" />
        </button>

        <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
          <button onClick={onNavigatePrevious} disabled={!canNavigatePrevious} className={navButton(canNavigatePrevious)} title={canNavigatePrevious ? 'Lead anterior' : 'Primeiro lead'}>
            <ChevronLeftIcon className="w-4 h-4" />
          </button>
          <button onClick={onNavigateNext} disabled={!canNavigateNext} className={navButton(canNavigateNext)} title={canNavigateNext ? 'Próximo lead' : 'Último lead'}>
            <ChevronRightIcon className="w-4 h-4" />
          </button>
        </div>

        {showActions && !isLost && !isSold && (
          <div className="flex items-center gap-1 sm:gap-1.5">
            {showEdit && (
              <button onClick={onEdit} className={actionEdit} title="Editar lead">
                <PencilIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Editar</span>
              </button>
            )}
            <button onClick={onMarkAsSold} className="p-2 sm:px-2.5 sm:py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 active:bg-green-800 transition-colors touch-manipulation flex items-center gap-1" title="Marcar como venda concluída">
              <CheckCircleIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Vendido</span>
            </button>
            <button onClick={onMarkAsLost} className="p-2 sm:px-2.5 sm:py-1.5 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 active:bg-red-800 transition-colors touch-manipulation flex items-center gap-1" title="Marcar lead como perdido">
              <ExclamationTriangleIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Perdido</span>
            </button>
          </div>
        )}

        {showActions && isLost && (
          <div className="flex items-center gap-1 sm:gap-1.5">
            {showEdit && (
              <button onClick={onEdit} className={actionEdit} title="Editar lead">
                <PencilIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Editar</span>
              </button>
            )}
            <button onClick={onReactivate} className="p-2 sm:px-2.5 sm:py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 active:bg-green-800 transition-colors touch-manipulation flex items-center gap-1" title="Reativar lead">
              <ArrowPathIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Reativar</span>
            </button>
          </div>
        )}

        {showActions && isSold && (
          <div className="flex items-center gap-1 sm:gap-1.5">
            {showEdit && (
              <button onClick={onEdit} className={actionEdit} title="Editar lead">
                <PencilIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Editar</span>
              </button>
            )}
            <button onClick={onUnmarkSale} className="p-2 sm:px-2.5 sm:py-1.5 text-xs font-medium text-white bg-yellow-600 rounded-lg hover:bg-yellow-700 active:bg-yellow-800 transition-colors touch-manipulation flex items-center gap-1" title="Desmarcar venda">
              <ArrowPathIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Desmarcar</span>
            </button>
          </div>
        )}

        <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors touch-manipulation" title="Fechar">
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
