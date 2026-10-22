import { Link } from 'react-router-dom'
import { ClockIcon } from '@heroicons/react/24/outline'
import { useAuthContext } from '../../../contexts/AuthContext'

const VARIANT_CLASSES = {
  button: 'inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors',
  icon: 'inline-flex items-center justify-center h-9 w-9 rounded-md border border-gray-300 bg-white hover:bg-gray-50 active:bg-gray-100 transition-colors text-gray-700',
  chat: 'p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200/60 rounded-full transition-colors'
} as const

interface LeadsSemContatoButtonProps {
  /** button: ícone + texto; icon: quadrado compacto; chat: redondo do header do chat */
  variant?: keyof typeof VARIANT_CLASSES
  className?: string
}

/** Atalho para /leads/sem-contato, visível só para admin. */
export function LeadsSemContatoButton({ variant = 'button', className = '' }: LeadsSemContatoButtonProps) {
  const { isAdmin } = useAuthContext()
  if (!isAdmin) return null

  return (
    <Link
      to="/leads/sem-contato"
      className={`${VARIANT_CLASSES[variant]} ${className}`}
      title="Leads sem contato"
      aria-label="Leads sem contato"
    >
      <ClockIcon className={variant === 'icon' ? 'w-4 h-4' : 'w-5 h-5'} />
      {variant === 'button' && <span>Sem contato</span>}
    </Link>
  )
}
