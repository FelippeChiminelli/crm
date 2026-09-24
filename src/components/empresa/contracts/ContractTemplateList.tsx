import { PencilIcon, CheckIcon, NoSymbolIcon } from '@heroicons/react/24/outline'
import { ds } from '../../../utils/designSystem'
import type { ContractTemplate } from '../../../types'

interface ContractTemplateListProps {
  templates: ContractTemplate[]
  onEdit: (template: ContractTemplate) => void
  onToggleActive: (template: ContractTemplate) => void
}

export function ContractTemplateList({
  templates,
  onEdit,
  onToggleActive,
}: ContractTemplateListProps) {
  if (templates.length === 0) {
    return (
      <div className={`${ds.card()} p-6`}>
        <div className="text-center py-12">
          <p className="text-gray-600 mb-2">Nenhum modelo de contrato criado</p>
          <p className="text-sm text-gray-500">
            Crie um modelo para emitir contratos automaticamente após a venda.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`${ds.card()} p-6`}>
      <div className="space-y-2">
        {templates.map((template) => (
          <div
            key={template.id}
            className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
              template.is_active
                ? 'bg-white border-gray-200 hover:border-gray-300'
                : 'bg-gray-50 border-gray-200 opacity-60'
            }`}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900 truncate">
                  {template.name}
                </span>
                {!template.is_active && (
                  <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full">
                    Anulado
                  </span>
                )}
                {template.required_variables.length > 0 && (
                  <span className="text-xs px-2 py-0.5 bg-red-50 text-red-600 rounded-full">
                    {template.required_variables.length} obrigatória(s)
                  </span>
                )}
              </div>
              {template.description && (
                <p className="text-xs text-gray-500 mt-1 truncate">{template.description}</p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => onEdit(template)}
                className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                title="Editar"
              >
                <PencilIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => onToggleActive(template)}
                className={`p-2 transition-colors ${
                  template.is_active
                    ? 'text-gray-400 hover:text-red-600'
                    : 'text-gray-400 hover:text-green-600'
                }`}
                title={template.is_active ? 'Anular' : 'Reativar'}
              >
                {template.is_active ? (
                  <NoSymbolIcon className="w-4 h-4" />
                ) : (
                  <CheckIcon className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
