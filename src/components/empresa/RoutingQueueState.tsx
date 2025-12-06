import { 
  ClockIcon,
  UserGroupIcon,
  ArrowPathIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import { ds } from '../../utils/designSystem'
import { useStandardizedLoading } from '../../hooks/useStandardizedLoading'
import { ErrorCard, SuccessCard } from '../ui/LoadingStates'
import { resetQueue } from '../../services/leadRoutingService'
import { useConfirm } from '../../hooks/useConfirm'
import type { QueueState } from '../../types'

interface RoutingQueueStateProps {
  queueState: QueueState | null
  onRefresh: () => void
}

export function RoutingQueueState({ queueState, onRefresh }: RoutingQueueStateProps) {
  const { confirm } = useConfirm()

  const {
    loading,
    error,
    success,
    executeAsync
  } = useStandardizedLoading()

  const handleReset = async () => {
    const confirmed = await confirm({
      title: 'Resetar fila de distribuição?',
      message: 'Isso fará com que o próximo lead seja atribuído ao primeiro vendedor da lista. Esta ação não pode ser desfeita.',
      confirmText: 'Resetar',
      type: 'danger'
    })

    if (!confirmed) return

    await executeAsync(async () => {
      await resetQueue()
      await onRefresh()
    })
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Nunca'
    
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Agora mesmo'
    if (diffMins < 60) return `Há ${diffMins} minuto${diffMins > 1 ? 's' : ''}`
    if (diffHours < 24) return `Há ${diffHours} hora${diffHours > 1 ? 's' : ''}`
    if (diffDays < 7) return `Há ${diffDays} dia${diffDays > 1 ? 's' : ''}`
    
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className={ds.card()}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Estado Atual da Fila</h3>
          <button
            onClick={handleReset}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 focus:ring-2 focus:ring-red-200 transition-all duration-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            title="Resetar fila"
          >
            <TrashIcon className="w-4 h-4" />
            Resetar
          </button>
        </div>

        {/* Mensagens */}
        {error && <ErrorCard message={error} />}
        {success && <SuccessCard message={success} />}

        {/* Informações da Fila */}
        <div className="space-y-4">
          {/* Último Vendedor */}
          <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
            <div className="p-2 bg-blue-100 rounded-lg">
              <UserGroupIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-700 mb-1">
                Último lead atribuído para:
              </div>
              {queueState?.ultimo_vendedor ? (
                <div className="text-lg font-semibold text-gray-900">
                  {queueState.ultimo_vendedor.name}
                </div>
              ) : (
                <div className="text-sm text-gray-500 italic">
                  Nenhum lead atribuído ainda
                </div>
              )}
            </div>
          </div>

          {/* Próximo Vendedor */}
          <div className="flex items-start space-x-3 p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="p-2 bg-green-100 rounded-lg">
              <ArrowPathIcon className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-700 mb-1">
                Próximo na fila:
              </div>
              {queueState?.proximo_vendedor ? (
                <div className="text-lg font-semibold text-green-700">
                  {queueState.proximo_vendedor.name}
                </div>
              ) : (
                <div className="text-sm text-gray-500 italic">
                  Nenhum vendedor ativo
                </div>
              )}
            </div>
          </div>

          {/* Última Atualização */}
          <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
            <ClockIcon className="w-5 h-5 text-gray-400" />
            <div className="flex-1">
              <div className="text-sm text-gray-600">
                <span className="font-medium">Última atualização:</span>{' '}
                {formatDate(queueState?.updated_at || null)}
              </div>
            </div>
          </div>

          {/* Estatísticas */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {queueState?.total_vendedores_ativos || 0}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                Vendedores ativos
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {queueState?.ultimo_vendedor ? '🟢' : '⚪'}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                Status da fila
              </div>
            </div>
          </div>
        </div>

        {/* Aviso se não há vendedores ativos */}
        {queueState && queueState.total_vendedores_ativos === 0 && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              ⚠️ Nenhum vendedor ativo na rotação. Ative pelo menos um vendedor na tabela abaixo.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

