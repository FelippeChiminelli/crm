import { formatVariableToken } from '../../../services/contracts/contractVariableCatalog'
import type { ContractVariable } from '../../../types'

interface ContractVariablePickerProps {
  variables: ContractVariable[]
  requiredVariables: string[]
  onInsert: (token: string) => void
  onToggleRequired: (key: string) => void
}

/**
 * Lista as variáveis disponíveis: clicar insere o token no cursor do editor, e
 * o asterisco marca a variável como obrigatória (a emissão é bloqueada se ela
 * estiver vazia no lead).
 */
export function ContractVariablePicker({
  variables,
  requiredVariables,
  onInsert,
  onToggleRequired,
}: ContractVariablePickerProps) {
  const groups = variables.reduce<Record<string, ContractVariable[]>>((acc, variable) => {
    acc[variable.group] = acc[variable.group] || []
    acc[variable.group].push(variable)
    return acc
  }, {})

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-medium text-gray-900">Variáveis</h4>
        <p className="text-xs text-gray-500 mt-1">
          Clique para inserir no texto. Use o asterisco para exigir o preenchimento.
        </p>
      </div>

      {Object.entries(groups).map(([group, groupVariables]) => (
        <div key={group}>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            {group}
          </p>
          <div className="space-y-1">
            {groupVariables.map((variable) => {
              const isRequired = requiredVariables.includes(variable.key)
              return (
                <div key={variable.key} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onInsert(formatVariableToken(variable.key))}
                    title={`Inserir ${formatVariableToken(variable.key)}`}
                    className="flex-1 text-left px-2 py-1 text-xs bg-white border border-gray-200 rounded hover:border-orange-300 hover:bg-orange-50 transition-colors truncate"
                  >
                    {variable.label}
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleRequired(variable.key)}
                    title={isRequired ? 'Deixar de exigir' : 'Exigir preenchimento'}
                    className={`w-6 h-6 flex items-center justify-center rounded border text-sm font-bold transition-colors ${
                      isRequired
                        ? 'bg-red-50 border-red-200 text-red-600'
                        : 'bg-white border-gray-200 text-gray-300 hover:text-gray-500'
                    }`}
                  >
                    *
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
