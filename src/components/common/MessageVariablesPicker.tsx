import React from 'react'
import type { MessageVariable } from '../../constants/messageVariables'

interface Props {
  variables: MessageVariable[]
  onInsert: (token: string) => void
  helpText?: string
}

/**
 * Lista de chips clicáveis que inserem variáveis dinâmicas no texto da mensagem.
 * Reutilizável entre campanhas, automações e outros editores de mensagem.
 */
export const MessageVariablesPicker: React.FC<Props> = ({
  variables,
  onInsert,
  helpText = 'Clique nas variáveis abaixo para inserir no texto:',
}) => {
  return (
    <div className="mt-2">
      <p className="text-[10px] lg:text-xs text-gray-500">{helpText}</p>
      <div className="flex flex-wrap gap-1.5 mt-1.5">
        {variables.map((v) => (
          <button
            key={v.token}
            type="button"
            onClick={() => onInsert(v.token)}
            className="px-2 py-1 text-xs bg-green-50 text-green-700 border border-green-200 rounded-md hover:bg-green-100 transition-colors font-mono"
          >
            {v.token} <span className="text-green-500 font-sans">({v.label})</span>
          </button>
        ))}
      </div>
    </div>
  )
}
