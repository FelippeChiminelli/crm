import { useState } from 'react'
import { EyeIcon, EyeSlashIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline'
import { useToastContext } from '../../contexts/ToastContext'

interface InstanceTokenDisplayProps {
  token: string | null | undefined
}

function maskToken(token: string) {
  if (token.length <= 16) return '*'.repeat(token.length)
  return `${token.slice(0, 8)}${'*'.repeat(Math.min(20, token.length - 12))}${token.slice(-4)}`
}

export function InstanceTokenDisplay({ token }: InstanceTokenDisplayProps) {
  const [revealed, setRevealed] = useState(false)
  const { showSuccess } = useToastContext()

  const copyToClipboard = () => {
    if (!token) return
    navigator.clipboard.writeText(token)
    showSuccess('Token copiado!')
  }

  if (!token) {
    return (
      <div className="text-sm text-gray-600">
        <span className="font-medium">Token da instância:</span>{' '}
        <span className="text-gray-400 italic">Não disponível</span>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-sm text-gray-600">
      <span className="font-medium">Token:</span>
      <code className="text-xs font-mono text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded break-all">
        {revealed ? token : maskToken(token)}
      </code>
      <button
        type="button"
        onClick={() => setRevealed((v) => !v)}
        className="p-1 text-gray-400 hover:text-gray-600"
        title={revealed ? 'Ocultar' : 'Revelar'}
      >
        {revealed ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
      </button>
      <button
        type="button"
        onClick={copyToClipboard}
        className="p-1 text-gray-400 hover:text-gray-600"
        title="Copiar"
      >
        <ClipboardDocumentIcon className="h-4 w-4" />
      </button>
    </div>
  )
}
