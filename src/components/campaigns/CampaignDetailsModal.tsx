import React, { useState } from 'react'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import type { 
  WhatsAppCampaign, 
  WhatsAppCampaignLog 
} from '../../types'
import { 
  XMarkIcon,
  PhotoIcon,
  VideoCameraIcon,
  MusicalNoteIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'

interface Props {
  campaign: WhatsAppCampaign
  logs: WhatsAppCampaignLog[]
  onClose: () => void
}

type Tab = 'info' | 'logs'

export const CampaignDetailsModal: React.FC<Props> = ({ 
  campaign, 
  logs, 
  onClose 
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('info')
  
  useEscapeKey(true, onClose)

  /**
   * Formata status do destinatário
   */
  /**
   * Ícone do tipo de mensagem
   */
  const getMessageTypeIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <PhotoIcon className="w-5 h-5" />
      case 'video':
        return <VideoCameraIcon className="w-5 h-5" />
      case 'audio':
        return <MusicalNoteIcon className="w-5 h-5" />
      default:
        return <DocumentTextIcon className="w-5 h-5" />
    }
  }

  /**
   * Formata tipo de evento do log
   */
  const formatLogEventType = (eventType: string) => {
    const eventMap: Record<string, string> = {
      started: 'Campanha Iniciada',
      paused: 'Campanha Pausada',
      resumed: 'Campanha Retomada',
      completed: 'Campanha Concluída',
      failed: 'Campanha Falhou',
      recipient_sent: 'Mensagem Enviada',
      recipient_failed: 'Falha no Envio',
      n8n_triggered: 'Webhook n8n Acionado',
      n8n_trigger_failed: 'Falha ao Acionar n8n'
    }

    return eventMap[eventType] || eventType
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-2 lg:px-4 pt-2 pb-10 lg:pt-4 lg:pb-20 text-center sm:block sm:p-0">
        {/* Overlay */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" 
          onClick={onClose}
        />

        {/* Modal */}
        <div className="inline-block w-full max-w-5xl my-2 lg:my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          {/* Header */}
          <div className="flex items-center justify-between px-3 lg:px-6 py-3 lg:py-4 border-b border-gray-200">
            <div className="min-w-0 flex-1 pr-2">
              <h3 className="text-base lg:text-xl font-semibold text-gray-900 truncate">
                {campaign.name}
              </h3>
              <p className="text-xs lg:text-sm text-gray-500 mt-0.5 lg:mt-1">
                {new Date(campaign.created_at).toLocaleDateString('pt-BR')}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 transition-colors p-1 flex-shrink-0"
            >
              <XMarkIcon className="w-5 h-5 lg:w-6 lg:h-6" />
            </button>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('info')}
                className={`flex-1 lg:flex-none px-4 lg:px-6 py-2.5 lg:py-3 text-xs lg:text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'info'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Informações
              </button>
              <button
                onClick={() => setActiveTab('logs')}
                className={`flex-1 lg:flex-none px-4 lg:px-6 py-2.5 lg:py-3 text-xs lg:text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'logs'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Histórico ({logs.length})
              </button>
            </nav>
          </div>

          {/* Content */}
          <div className="px-3 lg:px-6 py-3 lg:py-4 max-h-[60vh] lg:max-h-[600px] overflow-y-auto">
            {/* Tab: Informações */}
            {activeTab === 'info' && (
              <div className="space-y-4 lg:space-y-6">
                {/* Descrição */}
                {campaign.description && (
                  <div>
                    <h4 className="text-xs lg:text-sm font-semibold text-gray-700 mb-1.5 lg:mb-2">
                      Descrição
                    </h4>
                    <p className="text-xs lg:text-sm text-gray-600">{campaign.description}</p>
                  </div>
                )}

                {/* Informações Gerais */}
                <div>
                  <h4 className="text-xs lg:text-sm font-semibold text-gray-700 mb-1.5 lg:mb-2">
                    Informações Gerais
                  </h4>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-2.5 lg:p-4 space-y-1.5 lg:space-y-2">
                    {campaign.responsible_user?.full_name && (
                      <div className="flex items-center justify-between text-xs lg:text-sm">
                        <span className="text-gray-700">Responsável:</span>
                        <span className="font-medium text-gray-900 truncate ml-2 max-w-[150px]">
                          {campaign.responsible_user.full_name}
                        </span>
                      </div>
                    )}
                    {campaign.created_user?.full_name && (
                      <div className="flex items-center justify-between text-xs lg:text-sm">
                        <span className="text-gray-700">Criado por:</span>
                        <span className="font-medium text-gray-900 truncate ml-2 max-w-[150px]">
                          {campaign.created_user.full_name}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-xs lg:text-sm">
                      <span className="text-gray-700">Criado em:</span>
                      <span className="font-medium text-gray-900">
                        {new Date(campaign.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tipo de Mensagem */}
                <div>
                  <h4 className="text-xs lg:text-sm font-semibold text-gray-700 mb-1.5 lg:mb-2">
                    Tipo de Mensagem
                  </h4>
                  <div className="flex items-center gap-2 flex-wrap">
                    {getMessageTypeIcon(campaign.message_type)}
                    <span className="text-xs lg:text-sm text-gray-900 capitalize">
                      {campaign.message_type}
                    </span>
                    {campaign.media_url && (
                      <a 
                        href={campaign.media_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs lg:text-sm text-orange-600 hover:underline"
                      >
                        Ver arquivo
                      </a>
                    )}
                  </div>
                </div>

                {/* Mensagem/Legenda */}
                {campaign.message_text && (
                  <div>
                    <h4 className="text-xs lg:text-sm font-semibold text-gray-700 mb-1.5 lg:mb-2">
                      {campaign.message_type === 'text' ? 'Mensagem' : 'Legenda'}
                    </h4>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-2.5 lg:p-4">
                      <p className="text-xs lg:text-sm text-gray-900 whitespace-pre-wrap font-mono">
                        {campaign.message_text}
                      </p>
                    </div>
                  </div>
                )}

                {/* Segmentação */}
                <div>
                  <h4 className="text-xs lg:text-sm font-semibold text-gray-700 mb-1.5 lg:mb-2">
                    Segmentação
                  </h4>
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-2.5 lg:p-4 space-y-1.5 lg:space-y-2">
                    <div className="flex items-center justify-between text-xs lg:text-sm">
                      <span className="text-gray-700">Pipeline:</span>
                      <span className="font-medium text-gray-900 truncate ml-2 max-w-[150px]">
                        {campaign.pipeline?.name || 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs lg:text-sm">
                      <span className="text-gray-700">Origem:</span>
                      <span className="font-medium text-gray-900 truncate ml-2 max-w-[150px]">
                        {campaign.from_stage?.name || 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs lg:text-sm">
                      <span className="text-gray-700">Destino:</span>
                      <span className="font-medium text-gray-900 truncate ml-2 max-w-[150px]">
                        {campaign.to_stage?.name || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Configurações de Envio */}
                <div>
                  <h4 className="text-xs lg:text-sm font-semibold text-gray-700 mb-1.5 lg:mb-2">
                    Config. de Envio
                  </h4>
                  <div className="grid grid-cols-2 gap-2 lg:gap-4">
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 lg:p-3">
                      <span className="text-[10px] lg:text-xs text-gray-500">Msgs/Lote</span>
                      <p className="text-base lg:text-lg font-semibold text-gray-900 mt-0.5">
                        {campaign.messages_per_batch}
                      </p>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 lg:p-3">
                      <span className="text-[10px] lg:text-xs text-gray-500">Intervalo (min)</span>
                      <p className="text-base lg:text-lg font-semibold text-gray-900 mt-0.5">
                        {campaign.interval_min_minutes === campaign.interval_max_minutes
                          ? campaign.interval_min_minutes
                          : `${campaign.interval_min_minutes}-${campaign.interval_max_minutes}`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Estatísticas */}
                <div>
                  <h4 className="text-xs lg:text-sm font-semibold text-gray-700 mb-1.5 lg:mb-2">
                    Estatísticas
                  </h4>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-3">
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 lg:p-3 text-center">
                      <p className="text-[10px] lg:text-xs text-gray-500">Total</p>
                      <p className="text-lg lg:text-2xl font-bold text-gray-900 mt-0.5">
                        {campaign.total_recipients || 0}
                      </p>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-2 lg:p-3 text-center">
                      <p className="text-[10px] lg:text-xs text-green-700">Enviados</p>
                      <p className="text-lg lg:text-2xl font-bold text-green-900 mt-0.5">
                        {campaign.messages_sent || 0}
                      </p>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-2 lg:p-3 text-center">
                      <p className="text-[10px] lg:text-xs text-red-700">Falhas</p>
                      <p className="text-lg lg:text-2xl font-bold text-red-900 mt-0.5">
                        {campaign.messages_failed || 0}
                      </p>
                    </div>
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 lg:p-3 text-center">
                      <p className="text-[10px] lg:text-xs text-orange-700">Sucesso</p>
                      <p className="text-lg lg:text-2xl font-bold text-orange-900 mt-0.5">
                        {campaign.total_recipients > 0
                          ? Math.round(((campaign.messages_sent || 0) / campaign.total_recipients) * 100)
                          : 0}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Logs */}
            {activeTab === 'logs' && (
              <div className="space-y-2">
                {logs.length === 0 ? (
                  <p className="text-center text-gray-500 py-6 lg:py-8 text-sm">
                    Nenhum evento registrado ainda.
                  </p>
                ) : (
                  <div className="space-y-1.5 lg:space-y-2">
                    {logs.map((log) => (
                      <div 
                        key={log.id} 
                        className="flex items-start gap-2 lg:gap-3 p-2 lg:p-3 bg-gray-50 border border-gray-200 rounded-lg"
                      >
                        <div className="flex-shrink-0 mt-1">
                          <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 bg-orange-500 rounded-full" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 lg:gap-2 flex-wrap">
                            <p className="text-xs lg:text-sm font-medium text-gray-900">
                              {formatLogEventType(log.event_type)}
                            </p>
                            {log.lead && (
                              <span className="text-[10px] lg:text-xs px-1.5 lg:px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full font-medium truncate max-w-[100px]">
                                {log.lead.name}
                              </span>
                            )}
                          </div>
                          {log.message && (
                            <p className="text-xs lg:text-sm text-gray-600 mt-0.5 lg:mt-1 line-clamp-2">
                              {log.message}
                            </p>
                          )}
                          <p className="text-[10px] lg:text-xs text-gray-400 mt-0.5 lg:mt-1">
                            {new Date(log.created_at).toLocaleString('pt-BR')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-3 lg:px-6 py-3 lg:py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
