import type { MetaCapiConfig } from '../../types'

interface MetaCapiTokenRowProps {
  config: MetaCapiConfig
  savingId: string | null
  onEdit: (config: MetaCapiConfig) => void
  onDelete: (config: MetaCapiConfig) => void
}

function statusBadge(ativo: boolean) {
  return ativo
    ? { label: 'Ativo', cls: 'bg-green-100 text-green-800' }
    : { label: 'Inativo', cls: 'bg-yellow-100 text-yellow-800' }
}

export function MetaCapiTokenRow({
  config,
  savingId,
  onEdit,
  onDelete,
}: MetaCapiTokenRowProps) {
  const status = statusBadge(config.ativo)
  const isBusy = savingId === config.id

  return (
    <div className="p-3 lg:p-6 hover:bg-gray-50 transition-colors">
      {/* Mobile */}
      <div className="lg:hidden space-y-3">
        <div className="flex items-start gap-2">
          <div
            className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${
              config.ativo ? 'bg-green-500' : 'bg-yellow-500'
            }`}
          />
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-gray-900 truncate">
              {config.name}
            </h4>
            <p className="text-xs text-gray-600 truncate">
              Token permanente salvo
            </p>
          </div>
        </div>

        <span
          className={`inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-medium ${status.cls}`}
        >
          {status.label}
        </span>

        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => onEdit(config)}
            disabled={isBusy}
            className="px-2 py-1.5 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 text-[10px] font-medium disabled:opacity-50"
          >
            Editar
          </button>
          <button
            type="button"
            onClick={() => onDelete(config)}
            disabled={isBusy}
            className="px-2 py-1.5 border border-red-300 rounded text-red-600 hover:bg-red-50 text-[10px] font-medium disabled:opacity-50"
          >
            {savingId === config.id ? 'Excluindo...' : 'Excluir'}
          </button>
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden lg:flex lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <div
              className={`w-3 h-3 rounded-full ${
                config.ativo ? 'bg-green-500' : 'bg-yellow-500'
              }`}
            />
            <h4 className="text-lg font-semibold text-gray-900 truncate">
              {config.name}
            </h4>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.cls}`}
            >
              {status.label}
            </span>
          </div>
          <p className="text-sm text-gray-600">
            <span className="font-medium">Token permanente:</span> salvo com
            segurança
          </p>
          {config.test_event_code && (
            <p className="text-xs text-gray-500 mt-0.5">
              Código de teste: {config.test_event_code}
            </p>
          )}
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => onEdit(config)}
            disabled={isBusy}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm disabled:opacity-50"
          >
            Editar
          </button>
          <button
            type="button"
            onClick={() => onDelete(config)}
            disabled={isBusy}
            className="px-3 py-1.5 border border-red-300 rounded-lg text-red-600 hover:bg-red-50 transition-colors text-sm disabled:opacity-50"
          >
            {savingId === config.id ? 'Excluindo...' : 'Excluir'}
          </button>
        </div>
      </div>
    </div>
  )
}
