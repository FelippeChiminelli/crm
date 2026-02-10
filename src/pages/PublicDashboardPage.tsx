import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { TvIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import { supabase } from '../services/supabaseClient'

const AUTO_REFRESH_MS = 5 * 60 * 1000 // 5 minutos

// =====================================================
// Tipos
// =====================================================

interface PublicWidget {
  id: string
  widget_type: string
  metric_key: string
  title: string
  config: any
  position_x: number
  position_y: number
  width: number
  height: number
}

interface WidgetData {
  value: number
  format: string // 'number' | 'currency' | 'percentage'
  subtitle: string
}

interface PublicDashboardData {
  dashboard: { id: string; name: string; description?: string }
  widgets: PublicWidget[]
  period: { start: string; end: string }
  widgetData: Record<string, WidgetData>
}

// =====================================================
// Formatação (client-side)
// =====================================================

function formatWidgetValue(value: number, format: string): string {
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
    case 'percentage':
      return `${(value * 100).toFixed(1)}%`
    case 'number':
    default:
      return value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
  }
}

// =====================================================
// Componente principal
// =====================================================

export default function PublicDashboardPage() {
  const { token } = useParams<{ token: string }>()
  const [data, setData] = useState<PublicDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchData = useCallback(async () => {
    if (!token) return
    try {
      // Chama a função RPC do Postgres (sem CORS, sem Edge Function)
      const { data: result, error: rpcError } = await supabase.rpc(
        'get_public_dashboard_data',
        { p_token: token }
      )

      if (rpcError) {
        console.error('Erro RPC:', rpcError)
        setError('Erro ao carregar dashboard.')
        setData(null)
        return
      }

      // A função retorna jsonb - se tiver campo 'error', é um erro de negócio
      if (result?.error) {
        setError(result.error)
        setData(null)
        return
      }

      setData(result as PublicDashboardData)
      setLastUpdate(new Date())
      setError(null)
    } catch {
      setError('Erro ao carregar dashboard.')
    } finally {
      setLoading(false)
    }
  }, [token])

  // Carregar inicial
  useEffect(() => { fetchData() }, [fetchData])

  // Auto-refresh a cada 5 minutos
  useEffect(() => {
    intervalRef.current = setInterval(fetchData, AUTO_REFRESH_MS)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [fetchData])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">Carregando dashboard...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <TvIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-700 mb-2">Link indisponível</h1>
          <p className="text-gray-500">{error || 'Este link de dashboard não está mais ativo.'}</p>
        </div>
      </div>
    )
  }

  const formatDate = (dateStr: string) =>
    new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between max-w-[1920px] mx-auto">
          <div className="flex items-center gap-3">
            <TvIcon className="w-6 h-6 text-orange-500" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">{data.dashboard.name}</h1>
              {data.dashboard.description && (
                <p className="text-sm text-gray-500">{data.dashboard.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-500">
              {formatDate(data.period.start)} — {formatDate(data.period.end)}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <ArrowPathIcon className="w-3.5 h-3.5" />
              <span>Atualizado {lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-green-500 font-medium">AO VIVO</span>
            </div>
          </div>
        </div>
      </header>

      {/* Grid de widgets */}
      <main className="p-6 max-w-[1920px] mx-auto">
        {data.widgets.length === 0 ? (
          <div className="flex items-center justify-center h-[60vh]">
            <p className="text-gray-500 text-lg">Nenhum widget configurado neste dashboard.</p>
          </div>
        ) : (
          <PublicWidgetGrid widgets={data.widgets} widgetData={data.widgetData} />
        )}
      </main>
    </div>
  )
}

// =====================================================
// Grid público
// =====================================================

function PublicWidgetGrid({ widgets, widgetData }: { widgets: PublicWidget[]; widgetData: Record<string, WidgetData> }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [colWidth, setColWidth] = useState(0)

  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        setColWidth((containerRef.current.offsetWidth - 16 * 11) / 12)
      }
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const ROW_HEIGHT = 120
  const GAP = 16

  const maxBottom = widgets.reduce((max, w) => {
    const bottom = (w.position_y + w.height) * ROW_HEIGHT + (w.position_y + w.height - 1) * GAP
    return Math.max(max, bottom)
  }, 0)

  return (
    <div ref={containerRef} className="relative" style={{ height: maxBottom || 'auto', minHeight: 200 }}>
      {colWidth > 0 && widgets.map(widget => {
        const left = widget.position_x * (colWidth + GAP)
        const top = widget.position_y * (ROW_HEIGHT + GAP)
        const width = widget.width * colWidth + (widget.width - 1) * GAP
        const height = widget.height * ROW_HEIGHT + (widget.height - 1) * GAP
        const wData = widgetData[widget.id]

        return (
          <div key={widget.id} className="absolute" style={{ left, top, width, height }}>
            <PublicWidgetCard widget={widget} data={wData} />
          </div>
        )
      })}
    </div>
  )
}

// =====================================================
// Card de widget público
// =====================================================

function PublicWidgetCard({ widget, data }: { widget: PublicWidget; data?: WidgetData }) {
  const kpiColor = widget.config?.kpiColor as string | undefined
  const hasBorderColor = !!kpiColor

  // Formatar valor no client-side usando Intl.NumberFormat
  const formattedValue = data ? formatWidgetValue(data.value, data.format) : null

  return (
    <div
      className="h-full rounded-xl overflow-hidden shadow-md"
      style={{
        border: `2px solid ${kpiColor || '#E5E7EB'}`,
        backgroundColor: '#FFFFFF'
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-2.5"
        style={{ backgroundColor: kpiColor || '#F9FAFB' }}
      >
        <h3 className={`text-sm font-semibold truncate ${hasBorderColor ? 'text-white' : 'text-gray-700'}`}>
          {widget.title}
        </h3>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-4 bg-white">
        {!data ? (
          <span className="text-gray-400 text-sm">Sem dados</span>
        ) : (
          <>
            <span className="text-3xl font-bold text-gray-900">{formattedValue}</span>
            <span className="text-xs text-gray-500 mt-1">{data.subtitle}</span>
          </>
        )}
      </div>
    </div>
  )
}
