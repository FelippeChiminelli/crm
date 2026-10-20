import { ArrowUpOnSquareIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { snooze } from '../../lib/promptSnooze'

export const IOS_INSTALL_SNOOZE_KEY = 'aucta.iosInstallBanner.snoozedAt'

interface IosInstallBannerProps {
  onClose: () => void
}

/** No iOS, Web Push só funciona com o app instalado na Tela de Início (iOS 16.4+). */
export function IosInstallBanner({ onClose }: IosInstallBannerProps) {
  const handleClose = () => {
    snooze(IOS_INSTALL_SNOOZE_KEY)
    onClose()
  }

  return (
    <div className="fixed bottom-4 inset-x-4 z-[99998] sm:left-auto sm:right-4 sm:max-w-sm">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-4 flex items-start gap-3">
        <div className="flex-shrink-0 p-2 bg-orange-100 rounded-lg">
          <ArrowUpOnSquareIcon className="w-6 h-6 text-orange-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-gray-900">Instale o app para receber notificações</h4>
          <p className="text-xs text-gray-600 mt-1">
            No Safari, toque em <strong>Compartilhar</strong> e depois em{' '}
            <strong>Adicionar à Tela de Início</strong>. Abra o Aucta pelo ícone instalado para ativar os avisos.
          </p>
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Fechar"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
