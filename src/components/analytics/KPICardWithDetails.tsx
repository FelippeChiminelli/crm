import { useState, useRef, useEffect } from 'react'
import { ArrowUpIcon, ArrowDownIcon, XMarkIcon, ClockIcon } from '@heroicons/react/24/solid'
import { InformationCircleIcon } from '@heroicons/react/24/outline'

interface ConversationDetail {
  id: string
  conversation_id?: string
  created_at?: string
  timestamp?: string
  phone?: string
  contact_name?: string
  response_time_minutes?: number
  response_time_formatted?: string
  first_contact_time_minutes?: number
  first_contact_time_formatted?: string
  lead_name?: string
  instance_name?: string
}

interface KPICardWithDetailsProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: React.ReactNode
  trend?: 'up' | 'down' | 'stable'
  trendValue?: string
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'indigo' | 'amber' | 'teal'
  loading?: boolean
  details?: ConversationDetail[]
  detailsLabel?: string
}

const colorClasses = {
  blue: 'bg-blue-50 text-blue-600 border-blue-200',
  green: 'bg-green-50 text-green-600 border-green-200',
  red: 'bg-red-50 text-red-600 border-red-200',
  yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
  purple: 'bg-purple-50 text-purple-600 border-purple-200',
  indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200',
  amber: 'bg-amber-50 text-amber-600 border-amber-200',
  teal: 'bg-teal-50 text-teal-600 border-teal-200'
}

export function KPICardWithDetails({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendValue,
  color = 'blue',
  loading = false,
  details,
  detailsLabel = 'Detalhes'
}: KPICardWithDetailsProps) {
  const [showDetails, setShowDetails] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  // Fechar popover ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setShowDetails(false)
      }
    }

    if (showDetails) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showDetails])

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-1/3"></div>
      </div>
    )
  }

  const hasDetails = details && details.length > 0

  return (
    <div className="relative" ref={popoverRef}>
      <div 
        className={`bg-white rounded-lg border border-gray-200 p-6 transition-all ${
          hasDetails ? 'hover:shadow-lg cursor-pointer hover:border-blue-300' : 'hover:shadow-md'
        }`}
        onClick={() => hasDetails && setShowDetails(!showDetails)}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-gray-600">{title}</h3>
            {hasDetails && (
              <InformationCircleIcon className="w-4 h-4 text-blue-500" />
            )}
          </div>
          {icon && (
            <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
              {icon}
            </div>
          )}
        </div>

        {/* Valor Principal */}
        <div className="mb-2">
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>

        {/* Subtítulo e Tendência */}
        {(subtitle || trend) && (
          <div className="flex items-center justify-between">
            {subtitle && (
              <p className="text-sm text-gray-500">{subtitle}</p>
            )}
            
            {trend && trendValue && (
              <div className="flex items-center gap-1">
                {trend === 'up' && (
                  <>
                    <ArrowUpIcon className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium text-green-500">{trendValue}</span>
                  </>
                )}
                {trend === 'down' && (
                  <>
                    <ArrowDownIcon className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-medium text-red-500">{trendValue}</span>
                  </>
                )}
                {trend === 'stable' && (
                  <span className="text-sm font-medium text-gray-500">{trendValue}</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Indicador de clique */}
        {hasDetails && (
          <div className="mt-2 text-xs text-blue-600 font-medium flex items-center gap-1">
            👆 Clique para ver detalhes
          </div>
        )}
      </div>

      {/* Popover com Detalhes */}
      {showDetails && hasDetails && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg border-2 border-blue-300 shadow-2xl z-50 max-h-[500px] overflow-hidden flex flex-col min-w-[600px]">
          {/* Header do Popover */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-4 border-b-2 border-blue-200 flex items-center justify-between sticky top-0 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="bg-blue-500 rounded-lg p-2">
                <ClockIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-base">{detailsLabel}</h4>
                <p className="text-xs text-gray-600">
                  {details.length} {details.length === 1 ? 'registro encontrado' : 'registros encontrados'}
                </p>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowDetails(false)
              }}
              className="p-2 hover:bg-blue-200 rounded-lg transition-colors group"
              aria-label="Fechar"
            >
              <XMarkIcon className="w-5 h-5 text-gray-700 group-hover:text-gray-900" />
            </button>
          </div>

          {/* Lista de Detalhes */}
          <div className="overflow-y-auto flex-1 p-4">
            <div className="space-y-3">
              {details
                .sort((a, b) => {
                  // Ordenar por tempo (maior para menor)
                  const timeA = a.response_time_minutes || a.first_contact_time_minutes || 0
                  const timeB = b.response_time_minutes || b.first_contact_time_minutes || 0
                  return timeB - timeA // Ordem decrescente
                })
                .map((detail, index) => (
                <div
                  key={detail.id || index}
                  className="bg-white rounded-lg p-4 hover:shadow-md transition-all border border-gray-200"
                >
                  {/* Cabeçalho do Card */}
                  <div className="flex items-start justify-between gap-4 mb-3 pb-3 border-b border-gray-100">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-xs font-bold text-white bg-blue-500 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">
                        {index + 1}
                      </span>
                      {(detail.lead_name || detail.contact_name) && (
                        <span className="text-base font-semibold text-gray-900 truncate">
                          {detail.lead_name || detail.contact_name}
                        </span>
                      )}
                    </div>
                    {detail.instance_name && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-md font-medium whitespace-nowrap">
                        {detail.instance_name}
                      </span>
                    )}
                  </div>

                  {/* Grid de Informações */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Coluna Esquerda - Dados do Contato */}
                    <div className="space-y-2">
                      {/* Número de Telefone */}
                      {detail.phone && (
                        <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
                          <span className="text-base">📞</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-gray-500 mb-0.5">Telefone</div>
                            <div className="font-mono font-semibold text-sm text-gray-900 whitespace-nowrap overflow-hidden text-ellipsis">
                              {formatPhone(detail.phone)}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Data e Hora */}
                      {(detail.created_at || detail.timestamp) && (
                        <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
                          <span className="text-base">📅</span>
                          <div className="flex-1">
                            <div className="text-xs text-gray-500 mb-0.5">Data/Hora</div>
                            <div className="text-sm font-medium text-gray-900">
                              {new Date(detail.created_at || detail.timestamp!).toLocaleString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Coluna Direita - Tempo */}
                    <div className="flex items-center justify-center">
                      {detail.response_time_formatted && (
                        <div className="bg-gradient-to-br from-amber-50 to-amber-100 border-2 border-amber-300 rounded-xl p-4 w-full text-center">
                          <div className="text-xs font-medium text-amber-700 mb-1 uppercase tracking-wide">
                            ⏱️ Tempo Resposta
                          </div>
                          <div className="text-xl font-bold text-amber-900">
                            {detail.response_time_formatted}
                          </div>
                        </div>
                      )}
                      {detail.first_contact_time_formatted && (
                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-300 rounded-xl p-4 w-full text-center">
                          <div className="text-xs font-medium text-purple-700 mb-1 uppercase tracking-wide">
                            ⏱️ Tempo Contato
                          </div>
                          <div className="text-xl font-bold text-purple-900">
                            {detail.first_contact_time_formatted}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer com Estatísticas */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-3 border-t-2 border-gray-200">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Total:</span>
                <span className="font-bold text-gray-900 text-base">{details.length}</span>
                <span className="text-gray-500">
                  {details.length === 1 ? 'registro' : 'registros'}
                </span>
              </div>
              {details.length > 0 && details[0].response_time_minutes !== undefined && (
                <div className="flex items-center gap-2 bg-amber-100 px-3 py-1 rounded-lg">
                  <span className="text-amber-700">⏱️ Tempo médio:</span>
                  <span className="font-bold text-amber-900">
                    {formatMinutes(
                      details.reduce((sum, d) => sum + (d.response_time_minutes || 0), 0) / details.length
                    )}
                  </span>
                </div>
              )}
              {details.length > 0 && details[0].first_contact_time_minutes !== undefined && (
                <div className="flex items-center gap-2 bg-purple-100 px-3 py-1 rounded-lg">
                  <span className="text-purple-700">⏱️ Tempo médio:</span>
                  <span className="font-bold text-purple-900">
                    {formatMinutes(
                      details.reduce((sum, d) => sum + (d.first_contact_time_minutes || 0), 0) / details.length
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Helper para formatar minutos
function formatMinutes(minutes: number): string {
  const totalSeconds = Math.round(minutes * 60)
  const hours = Math.floor(totalSeconds / 3600)
  const mins = Math.floor((totalSeconds % 3600) / 60)
  const secs = totalSeconds % 60

  if (hours > 0) {
    return `${hours}h ${mins}min ${secs}seg`
  }
  if (mins > 0) {
    return `${mins}min ${secs}seg`
  }
  return `${secs}seg`
}

// Helper para formatar telefone
function formatPhone(phone: string): string {
  if (!phone) return 'Não informado'
  
  // Remove caracteres não numéricos
  const cleaned = phone.replace(/\D/g, '')
  
  // Formata conforme o tamanho
  if (cleaned.length === 13) {
    // +55 (11) 98765-4321
    return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`
  }
  if (cleaned.length === 12) {
    // (11) 98765-4321
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`
  }
  if (cleaned.length === 11) {
    // (11) 98765-4321
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`
  }
  if (cleaned.length === 10) {
    // (11) 8765-4321
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`
  }
  
  // Retorna o telefone formatado com espaços para facilitar leitura
  if (cleaned.length > 0) {
    return cleaned.replace(/(\d{2})(\d{4,5})(\d{4})/, '($1) $2-$3')
  }
  
  return phone
}

