import { useState, useCallback, useEffect } from 'react'
import {
  XMarkIcon,
  LinkIcon,
  ClipboardDocumentIcon,
  TrashIcon,
  TvIcon,
  CheckIcon
} from '@heroicons/react/24/outline'
import type { CustomDashboard, AnalyticsPeriod } from '../../../types'
import { generateShareToken, revokeShareToken, updateSharePeriod } from '../../../services/customDashboardService'
import { getTodayLocalDateString, getLocalDateString } from '../../../utils/dateHelpers'

interface ShareLinkModalProps {
  isOpen: boolean
  dashboard: CustomDashboard | null
  onClose: () => void
  onDashboardUpdate: (dashboard: CustomDashboard) => void
}

export function ShareLinkModal({ isOpen, dashboard, onClose, onDashboardUpdate }: ShareLinkModalProps) {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [generating, setGenerating] = useState(false)
  const [revoking, setRevoking] = useState(false)
  const [updatingPeriod, setUpdatingPeriod] = useState(false)
  const [copied, setCopied] = useState(false)

  const hasActiveLink = dashboard?.share_active && dashboard?.share_token

  // Inicializar datas quando modal abre
  useEffect(() => {
    if (isOpen && dashboard) {
      if (dashboard.share_period) {
        setStartDate(dashboard.share_period.start)
        setEndDate(dashboard.share_period.end)
      } else {
        // Default: mês atual
        const today = getTodayLocalDateString()
        const d = new Date()
        const firstDay = getLocalDateString(new Date(d.getFullYear(), d.getMonth(), 1))
        setStartDate(firstDay)
        setEndDate(today)
      }
      setCopied(false)
    }
  }, [isOpen, dashboard])

  const getPublicUrl = useCallback(() => {
    if (!dashboard?.share_token) return ''
    return `${window.location.origin}/tv/${dashboard.share_token}`
  }, [dashboard?.share_token])

  const handleGenerate = useCallback(async () => {
    if (!dashboard || !startDate || !endDate) return
    setGenerating(true)
    try {
      const period: AnalyticsPeriod = { start: startDate, end: endDate }
      const token = await generateShareToken(dashboard.id, period)
      onDashboardUpdate({
        ...dashboard,
        share_token: token,
        share_period: period,
        share_active: true
      })
    } catch (error) {
      console.error('Erro ao gerar link:', error)
    } finally {
      setGenerating(false)
    }
  }, [dashboard, startDate, endDate, onDashboardUpdate])

  const handleRevoke = useCallback(async () => {
    if (!dashboard) return
    if (!confirm('Revogar o link público? Quem tiver o link não poderá mais acessar.')) return
    setRevoking(true)
    try {
      await revokeShareToken(dashboard.id)
      onDashboardUpdate({
        ...dashboard,
        share_token: null,
        share_period: null,
        share_active: false
      })
    } catch (error) {
      console.error('Erro ao revogar link:', error)
    } finally {
      setRevoking(false)
    }
  }, [dashboard, onDashboardUpdate])

  const handleUpdatePeriod = useCallback(async () => {
    if (!dashboard || !startDate || !endDate) return
    setUpdatingPeriod(true)
    try {
      const period: AnalyticsPeriod = { start: startDate, end: endDate }
      await updateSharePeriod(dashboard.id, period)
      onDashboardUpdate({ ...dashboard, share_period: period })
    } catch (error) {
      console.error('Erro ao atualizar período:', error)
    } finally {
      setUpdatingPeriod(false)
    }
  }, [dashboard, startDate, endDate, onDashboardUpdate])

  const handleCopy = useCallback(async () => {
    const url = getPublicUrl()
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
      const input = document.createElement('input')
      input.value = url
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [getPublicUrl])

  const periodChanged = dashboard?.share_period &&
    (startDate !== dashboard.share_period.start || endDate !== dashboard.share_period.end)

  if (!isOpen || !dashboard) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <TvIcon className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Link para TV</h2>
              <p className="text-xs text-gray-500">{dashboard.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="px-6 py-5 space-y-5">
          {/* Período */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Período de dados exibido
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Data Início</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Data Fim</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Link ativo */}
          {hasActiveLink ? (
            <div className="space-y-3">
              {/* URL */}
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Link público</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 truncate font-mono">
                    {getPublicUrl()}
                  </div>
                  <button
                    onClick={handleCopy}
                    className="shrink-0 p-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                    title="Copiar link"
                  >
                    {copied ? <CheckIcon className="w-5 h-5" /> : <ClipboardDocumentIcon className="w-5 h-5" />}
                  </button>
                </div>
                {copied && (
                  <p className="text-xs text-green-600 mt-1">Link copiado!</p>
                )}
              </div>

              {/* Status */}
              <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm text-green-700">Link ativo - atualiza automaticamente a cada 5 minutos</span>
              </div>

              {/* Ações */}
              <div className="flex items-center justify-between pt-2">
                {periodChanged ? (
                  <button
                    onClick={handleUpdatePeriod}
                    disabled={updatingPeriod}
                    className="px-4 py-2 text-sm font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
                  >
                    {updatingPeriod ? 'Salvando...' : 'Atualizar Período'}
                  </button>
                ) : (
                  <div />
                )}
                <button
                  onClick={handleRevoke}
                  disabled={revoking}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                >
                  <TrashIcon className="w-4 h-4" />
                  {revoking ? 'Revogando...' : 'Revogar Link'}
                </button>
              </div>
            </div>
          ) : (
            /* Gerar novo link */
            <div className="space-y-3">
              <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-sm text-gray-600">
                  Gere um link público para exibir este dashboard em TVs, reuniões ou qualquer tela.
                  O link não requer login e os dados atualizam automaticamente a cada 5 minutos.
                </p>
              </div>

              <button
                onClick={handleGenerate}
                disabled={generating || !startDate || !endDate}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium disabled:opacity-50"
              >
                <LinkIcon className="w-5 h-5" />
                {generating ? 'Gerando...' : 'Gerar Link Público'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
