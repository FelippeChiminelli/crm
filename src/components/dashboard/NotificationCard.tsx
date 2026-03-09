import { useState } from 'react'
import { Card, CardContent } from '../ui/Card'
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline'
import { useNavigate } from 'react-router-dom'
import type { DashboardNotificationItem } from '../../types/dashboard'

interface SeverityStyle {
  color: string
  bgColor: string
  leftBorder: string
  chip: string
}

interface NotificationCardProps {
  notification: DashboardNotificationItem
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  style: SeverityStyle
}

export function NotificationCard({ notification, Icon, style }: NotificationCardProps) {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)
  const hasDetails = notification.details && notification.details.length > 0
  const remaining = (notification.count || 0) - (notification.details?.length || 0)

  return (
    <Card className={`border border-gray-200 border-l-4 ${style.leftBorder}`}>
      <CardContent className="p-2 sm:p-4">
        <div className="flex items-start gap-2 sm:gap-3">
          <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center justify-between mb-0.5 sm:mb-1 gap-2">
              <h4 className={`font-medium text-[10px] sm:text-xs ${style.color} truncate`}>
                {notification.title}
              </h4>
              <span className={`text-[8px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full ${style.bgColor} ${style.color} flex-shrink-0`}>
                {style.chip}
              </span>
            </div>

            {/* Resumo */}
            <p className="text-[10px] sm:text-xs text-gray-700 mb-1.5 sm:mb-2">
              {notification.message}
            </p>

            {/* Detalhes expandíveis */}
            {hasDetails && (
              <>
                <button
                  className="flex items-center gap-1 text-[9px] sm:text-[10px] font-medium text-gray-600 hover:text-gray-900 transition-colors mb-1.5"
                  onClick={() => setExpanded(!expanded)}
                >
                  {expanded ? (
                    <>
                      <ChevronUpIcon className="w-3 h-3" />
                      Ocultar detalhes
                    </>
                  ) : (
                    <>
                      <ChevronDownIcon className="w-3 h-3" />
                      Ver detalhes ({notification.count})
                    </>
                  )}
                </button>

                {expanded && (
                  <div className="bg-gray-50 rounded-lg p-1.5 sm:p-2.5 mb-1.5 sm:mb-2 space-y-1 sm:space-y-1.5">
                    {notification.details!.map((detail) => (
                      <button
                        key={detail.id}
                        onClick={() => navigate(detail.href)}
                        className="w-full flex items-center justify-between gap-2 p-1.5 sm:p-2 rounded-md bg-white hover:bg-gray-100 transition-colors text-left group"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="block text-[10px] sm:text-xs font-medium text-gray-900 truncate">
                            {detail.label}
                          </span>
                          {detail.sublabel && (
                            <span className="block text-[9px] sm:text-[10px] text-gray-500 truncate">
                              {detail.sublabel}
                            </span>
                          )}
                        </div>
                        <ArrowTopRightOnSquareIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-400 group-hover:text-gray-600 flex-shrink-0" />
                      </button>
                    ))}
                    {remaining > 0 && (
                      <button
                        onClick={() => navigate(notification.href)}
                        className="w-full text-center text-[9px] sm:text-[10px] font-medium text-gray-600 hover:text-gray-900 transition-colors pt-1"
                      >
                        + {remaining} outro{remaining > 1 ? 's' : ''} — ver todos →
                      </button>
                    )}
                  </div>
                )}
              </>
            )}

            {/* CTA principal */}
            <button
              className={`text-[9px] sm:text-[10px] font-medium ${style.color} hover:opacity-80 transition-opacity`}
              onClick={() => navigate(notification.href)}
            >
              Ir para ação →
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
