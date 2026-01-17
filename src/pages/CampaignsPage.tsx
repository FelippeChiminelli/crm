import { useState, useEffect } from 'react'
import { PlusIcon, FunnelIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/outline'
import { MainLayout } from '../components/layout/MainLayout'
import { useCampaigns } from '../hooks/useCampaigns'
import { CampaignCard } from '../components/campaigns/CampaignCard'
import { CampaignForm } from '../components/campaigns/CampaignForm'
import { CampaignDetailsModal } from '../components/campaigns/CampaignDetailsModal'
import type { WhatsAppCampaign, WhatsAppCampaignStatus, CreateWhatsAppCampaignData, UpdateWhatsAppCampaignData, Pipeline } from '../types'
import { useConfirm } from '../hooks/useConfirm'
import { getPipelines } from '../services/pipelineService'
import { ds } from '../utils/designSystem'

/**
 * Página principal de Campanhas de WhatsApp
 */
export default function CampaignsPage() {
  const {
    campaigns,
    loading,
    stats,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    startCampaign,
    pauseCampaign,
    resumeCampaign,
    getLogs
  } = useCampaigns()

  const { confirm } = useConfirm()
  
  const [showForm, setShowForm] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<WhatsAppCampaign | null>(null)
  const [selectedCampaign, setSelectedCampaign] = useState<WhatsAppCampaign | null>(null)
  const [filterStatus, setFilterStatus] = useState<WhatsAppCampaignStatus | 'all'>('all')
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [campaignLogs, setCampaignLogs] = useState<any[]>([])

  // Carregar pipelines
  useEffect(() => {
    const loadPipelines = async () => {
      try {
        const { data, error } = await getPipelines()
        if (error) throw error
        setPipelines(data || [])
      } catch (error) {
        console.error('Erro ao carregar pipelines:', error)
      }
    }

    loadPipelines()
  }, [])

  // Filtrar campanhas por status
  const filteredCampaigns = filterStatus === 'all'
    ? campaigns
    : campaigns.filter(c => c.status === filterStatus)

  // Handlers
  const handleCreate = () => {
    setEditingCampaign(null)
    setShowForm(true)
  }

  const handleEdit = (campaign: WhatsAppCampaign) => {
    setEditingCampaign(campaign)
    setShowForm(true)
  }

  const handleSubmit = async (data: CreateWhatsAppCampaignData | UpdateWhatsAppCampaignData) => {
    if (editingCampaign) {
      const result = await updateCampaign(editingCampaign.id, data as UpdateWhatsAppCampaignData)
      if (result) {
        setShowForm(false)
        setEditingCampaign(null)
      }
    } else {
      const result = await createCampaign(data as CreateWhatsAppCampaignData)
      if (result) {
        setShowForm(false)
      }
    }
  }

  const handleDelete = async (id: string) => {
    const campaign = campaigns.find(c => c.id === id)
    
    // Mensagem diferenciada para campanhas em execução
    const isRunning = campaign?.status === 'running' || campaign?.status === 'paused'
    
    const confirmed = await confirm({
      title: 'Excluir Campanha',
      message: isRunning
        ? `⚠️ ATENÇÃO: A campanha "${campaign?.name}" está ${campaign?.status === 'running' ? 'EM EXECUÇÃO' : 'PAUSADA'}!\n\nAo excluir, todos os envios serão INTERROMPIDOS imediatamente e os dados serão perdidos permanentemente.\n\nTem certeza que deseja continuar?`
        : `Tem certeza que deseja excluir a campanha "${campaign?.name}"? Esta ação não pode ser desfeita.`,
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      type: 'danger'
    })

    if (confirmed) {
      await deleteCampaign(id)
    }
  }

  const handleStart = async (id: string) => {
    const campaign = campaigns.find(c => c.id === id)
    const isReactivation = campaign?.status === 'completed'
    
    const confirmed = await confirm({
      title: isReactivation ? 'Reativar Campanha' : 'Iniciar Campanha',
      message: isReactivation
        ? `Deseja reativar a campanha "${campaign?.name}"? A campanha será reiniciada e as mensagens serão enviadas novamente para ${campaign?.total_recipients || 'os'} destinatários.`
        : `Deseja iniciar o envio da campanha "${campaign?.name}"? As mensagens serão enviadas para ${campaign?.total_recipients || 'os'} destinatários.`,
      confirmText: isReactivation ? 'Reativar' : 'Iniciar',
      cancelText: 'Cancelar',
      type: 'info'
    })

    if (confirmed) {
      await startCampaign(id)
    }
  }

  const handlePause = async (id: string) => {
    const campaign = campaigns.find(c => c.id === id)
    
    const confirmed = await confirm({
      title: 'Pausar Campanha',
      message: `Deseja pausar a campanha "${campaign?.name}"? Os envios serão interrompidos.`,
      confirmText: 'Pausar',
      cancelText: 'Cancelar',
      type: 'warning'
    })

    if (confirmed) {
      await pauseCampaign(id)
    }
  }

  const handleResume = async (id: string) => {
    const campaign = campaigns.find(c => c.id === id)
    
    const confirmed = await confirm({
      title: 'Retomar Campanha',
      message: `Deseja retomar a campanha "${campaign?.name}"? Os envios serão continuados.`,
      confirmText: 'Retomar',
      cancelText: 'Cancelar',
      type: 'info'
    })

    if (confirmed) {
      await resumeCampaign(id)
    }
  }

  const handleViewDetails = async (campaign: WhatsAppCampaign) => {
    setSelectedCampaign(campaign)
    
    // Carregar logs
    try {
      const logs = await getLogs(campaign.id)
      setCampaignLogs(logs || [])
    } catch (error) {
      console.error('Erro ao carregar detalhes da campanha:', error)
      setCampaignLogs([])
    }
  }

  return (
    <MainLayout>
      <div className="h-full flex flex-col p-2 lg:p-1.5 space-y-2 lg:space-y-3 overflow-hidden">
        {/* Cabeçalho */}
        <div className={ds.card()}>
          <div className="flex items-center justify-between px-3 sm:px-4 lg:px-6 py-3 lg:py-4 gap-2">
            <div className="min-w-0 flex-1">
              <h1 className="text-base lg:text-xl font-semibold text-gray-900 truncate">Campanhas WhatsApp</h1>
              <p className="text-xs lg:text-sm text-gray-600 hidden md:block">Gerencie suas campanhas de mensagens</p>
            </div>
            <button
              onClick={handleCreate}
              className="flex items-center gap-1 lg:gap-1.5 px-2.5 lg:px-4 py-1.5 lg:py-2 text-xs lg:text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors flex-shrink-0"
            >
              <PlusIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Nova Campanha</span>
              <span className="sm:hidden">Nova</span>
            </button>
          </div>
        </div>

        {/* Estatísticas */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 lg:gap-4">
            <div className={`${ds.stats.card()} p-3 lg:p-4`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs lg:text-sm text-gray-600">Total</p>
                  <p className="text-lg lg:text-2xl font-bold text-gray-900 mt-0.5">{stats.total_campaigns}</p>
                </div>
                <ArrowTrendingUpIcon className="w-6 h-6 lg:w-8 lg:h-8 text-gray-400 hidden sm:block" />
              </div>
            </div>
            <div className={`${ds.stats.card()} p-3 lg:p-4`}>
              <div>
                <p className="text-xs lg:text-sm text-gray-600">Em Execução</p>
                <p className="text-lg lg:text-2xl font-bold text-green-600 mt-0.5">{stats.active_campaigns}</p>
              </div>
            </div>
            <div className={`${ds.stats.card()} p-3 lg:p-4`}>
              <div>
                <p className="text-xs lg:text-sm text-gray-600">Concluídas</p>
                <p className="text-lg lg:text-2xl font-bold text-purple-600 mt-0.5">{stats.completed_campaigns}</p>
              </div>
            </div>
            <div className={`${ds.stats.card()} p-3 lg:p-4`}>
              <div>
                <p className="text-xs lg:text-sm text-gray-600">Mensagens</p>
                <p className="text-lg lg:text-2xl font-bold text-orange-600 mt-0.5">{stats.total_messages_sent}</p>
              </div>
            </div>
            <div className={`${ds.stats.card()} p-3 lg:p-4 col-span-2 sm:col-span-1`}>
              <div>
                <p className="text-xs lg:text-sm text-gray-600">Taxa de Sucesso</p>
                <p className="text-lg lg:text-2xl font-bold text-green-600 mt-0.5">
                  {stats.success_rate.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className={ds.card()}>
          <div className="px-3 sm:px-4 lg:px-6 py-2 lg:py-3 flex items-center gap-2">
            <FunnelIcon className="w-4 h-4 lg:w-5 lg:h-5 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as WhatsAppCampaignStatus | 'all')}
              className="flex-1 lg:flex-none lg:w-48 px-3 py-1.5 lg:py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="all">Todas</option>
              <option value="draft">Rascunho</option>
              <option value="scheduled">Agendadas</option>
              <option value="running">Em Execução</option>
              <option value="paused">Pausadas</option>
              <option value="completed">Concluídas</option>
              <option value="failed">Falhas</option>
            </select>
          </div>
        </div>

        {/* Lista de Campanhas */}
        <div className={`${ds.card()} flex-1 min-h-0 flex flex-col overflow-hidden`}>
          <div className="flex-1 overflow-y-auto p-2 sm:p-4 lg:p-6">
            {loading && campaigns.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-10 w-10 lg:h-12 lg:w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
                  <p className="text-gray-600 text-sm">Carregando campanhas...</p>
                </div>
              </div>
            ) : filteredCampaigns.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-sm p-4">
                  <div className="w-14 h-14 lg:w-16 lg:h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 lg:mb-4">
                    <PlusIcon className="w-7 h-7 lg:w-8 lg:h-8 text-gray-400" />
                  </div>
                  <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-2">
                    {filterStatus === 'all' ? 'Nenhuma campanha criada' : `Nenhuma campanha ${filterStatus}`}
                  </h3>
                  <p className="text-gray-600 mb-4 lg:mb-6 text-sm">
                    {filterStatus === 'all'
                      ? 'Crie sua primeira campanha de WhatsApp para começar.'
                      : 'Ajuste os filtros ou crie uma nova campanha.'}
                  </p>
                  {filterStatus === 'all' && (
                    <button
                      onClick={handleCreate}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-medium"
                    >
                      <PlusIcon className="w-4 h-4" />
                      Criar Campanha
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 lg:gap-4">
                {filteredCampaigns.map((campaign) => (
                  <CampaignCard
                    key={campaign.id}
                    campaign={campaign}
                    onStart={handleStart}
                    onPause={handlePause}
                    onResume={handleResume}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onViewDetails={handleViewDetails}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showForm && (
        <CampaignForm
          campaign={editingCampaign}
          pipelines={pipelines}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false)
            setEditingCampaign(null)
          }}
        />
      )}

      {selectedCampaign && (
        <CampaignDetailsModal
          campaign={selectedCampaign}
          logs={campaignLogs}
          onClose={() => {
            setSelectedCampaign(null)
            setCampaignLogs([])
          }}
        />
      )}
    </MainLayout>
  )
}

