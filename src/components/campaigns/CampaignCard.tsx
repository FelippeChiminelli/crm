import React from 'react'
import type { WhatsAppCampaign } from '../../types'
import { 
  PlayIcon, 
  PencilIcon, 
  TrashIcon, 
  EyeIcon, 
  CalendarIcon, 
  UsersIcon,
  UserIcon,
  PauseIcon 
} from '@heroicons/react/24/outline'

interface CampaignCardProps {
  campaign: WhatsAppCampaign
  onStart: (id: string) => void
  onPause: (id: string) => void
  onResume: (id: string) => void
  onEdit: (campaign: WhatsAppCampaign) => void
  onDelete: (id: string) => void
  onViewDetails: (campaign: WhatsAppCampaign) => void
}

/**
 * Card de exibição de campanha individual
 */
export const CampaignCard: React.FC<CampaignCardProps> = ({
  campaign,
  onStart,
  onPause,
  onResume,
  onEdit,
  onDelete,
  onViewDetails
}) => {
  // Mapeamento de status para badges
  const statusConfig = {
    draft: { label: 'Rascunho', color: 'bg-gray-100 text-gray-800' },
    scheduled: { label: 'Agendada', color: 'bg-orange-100 text-orange-800' },
    running: { label: 'Em Execução', color: 'bg-green-100 text-green-800' },
    paused: { label: 'Pausada', color: 'bg-yellow-100 text-yellow-800' },
    completed: { label: 'Concluída', color: 'bg-purple-100 text-purple-800' },
    failed: { label: 'Falhou', color: 'bg-red-100 text-red-800' }
  }

  const status = statusConfig[campaign.status]
  const successRate = campaign.total_recipients > 0
    ? ((campaign.messages_sent / campaign.total_recipients) * 100).toFixed(1)
    : 0

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {campaign.name}
          </h3>
          {campaign.description && (
            <p className="text-sm text-gray-600 line-clamp-2">
              {campaign.description}
            </p>
          )}
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ml-4 ${status.color}`}>
          {status.label}
        </span>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">{campaign.total_recipients}</p>
          <p className="text-xs text-gray-600">Destinatários</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600">{campaign.messages_sent}</p>
          <p className="text-xs text-gray-600">Enviadas</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-red-600">{campaign.messages_failed}</p>
          <p className="text-xs text-gray-600">Falhas</p>
        </div>
      </div>

      {/* Barra de progresso */}
      {campaign.total_recipients > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
            <span>Progresso</span>
            <span>{successRate}% sucesso</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all"
              style={{ 
                width: `${(campaign.messages_sent / campaign.total_recipients) * 100}%` 
              }}
            />
          </div>
        </div>
      )}

      {/* Info adicional */}
      <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
        {campaign.scheduled_at && (
          <div className="flex items-center gap-1">
            <CalendarIcon className="w-3 h-3" />
            <span>
              {new Date(campaign.scheduled_at).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <UsersIcon className="w-3 h-3" />
          <span>Tipo: {campaign.message_type}</span>
        </div>
        {campaign.responsible_user?.full_name && (
          <div className="flex items-center gap-1">
            <UserIcon className="w-3 h-3" />
            <span>Responsável: {campaign.responsible_user.full_name}</span>
          </div>
        )}
      </div>

      {/* Ações */}
      <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
        {/* Botão Iniciar - apenas para draft/scheduled */}
        {(campaign.status === 'draft' || campaign.status === 'scheduled') && (
          <button
            onClick={() => onStart(campaign.id)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
          >
            <PlayIcon className="w-4 h-4" />
            Iniciar
          </button>
        )}

        {/* Botão Pausar - apenas para running */}
        {campaign.status === 'running' && (
          <button
            onClick={() => onPause(campaign.id)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium"
          >
            <PauseIcon className="w-4 h-4" />
            Pausar
          </button>
        )}

        {/* Botão Retomar - apenas para paused */}
        {campaign.status === 'paused' && (
          <button
            onClick={() => onResume(campaign.id)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
          >
            <PlayIcon className="w-4 h-4" />
            Retomar
          </button>
        )}

        {/* Botão Reativar - apenas para completed */}
        {campaign.status === 'completed' && (
          <button
            onClick={() => onStart(campaign.id)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
          >
            <PlayIcon className="w-4 h-4" />
            Reativar
          </button>
        )}

        {/* Botão Ver Detalhes - sempre visível */}
        <button
          onClick={() => onViewDetails(campaign)}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
        >
          <EyeIcon className="w-4 h-4" />
        </button>

        {/* Botão Editar - para draft/scheduled/completed */}
        {(campaign.status === 'draft' || campaign.status === 'scheduled' || campaign.status === 'completed') && (
          <button
            onClick={() => onEdit(campaign)}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            <PencilIcon className="w-4 h-4" />
          </button>
        )}

        {/* Botão Deletar - SEMPRE visível (pode excluir em qualquer status) */}
        <button
          onClick={() => onDelete(campaign.id)}
          className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium"
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

