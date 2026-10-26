import { useState } from 'react'
import { CheckIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline'

interface PairingCodeDisplayProps {
  code: string
}

export function PairingCodeDisplay({ code }: PairingCodeDisplayProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="mb-4">
      <p className="text-sm text-gray-600 mb-2">
        Ou, no WhatsApp, vá em Dispositivos conectados e conecte com o número de telefone usando o código abaixo
      </p>
      <div className="bg-gray-50 px-4 py-3 rounded-lg border-2 border-gray-200 flex items-center justify-between gap-3">
        <span className="text-2xl font-bold text-gray-900 tracking-wider font-mono">
          {code}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-white transition-colors"
          title="Copiar código"
        >
          {copied ? <CheckIcon className="w-4 h-4 text-green-600" /> : <ClipboardDocumentIcon className="w-4 h-4" />}
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
    </div>
  )
}
