import { useNavigate } from 'react-router-dom'
import { ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline'
import { useAuthContext } from '../../contexts/AuthContext'
import { ds } from '../../utils/designSystem'
import { Badge } from '../../components/ui/Badge'
import AuctaLogo from '../../assets/logo-aucta.svg'

interface PartnerLayoutProps {
  title: string
  subtitle?: string
  children: React.ReactNode
}

/** Layout enxuto da area Aucta Admin, reutilizando tokens do design system. */
export function PartnerLayout({ title, subtitle, children }: PartnerLayoutProps) {
  const navigate = useNavigate()
  const { logout, user } = useAuthContext()

  const handleSignOut = async () => {
    try {
      await logout()
    } finally {
      navigate('/auth')
    }
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gray-50">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <img src={AuctaLogo} alt="Aucta" className="h-9 w-9 object-contain flex-shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-base font-bold text-gray-900">{title}</h1>
              <Badge variant="warning" appearance="light" size="sm">
                Aucta admin
              </Badge>
            </div>
            {subtitle && <p className="truncate text-xs text-gray-500">{subtitle}</p>}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-gray-500 sm:block">{user?.email}</span>
          <button
            onClick={handleSignOut}
            className={ds.button('ghost')}
            title="Sair"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl p-4">{children}</div>
      </main>
    </div>
  )
}

export default PartnerLayout
