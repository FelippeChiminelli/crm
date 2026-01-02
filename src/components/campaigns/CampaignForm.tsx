import React, { useState, useCallback, useEffect, useRef } from 'react'
import type { WhatsAppCampaign, CreateWhatsAppCampaignData, UpdateWhatsAppCampaignData, Pipeline, Stage, WhatsAppInstance } from '../../types'
import { 
  PhotoIcon, 
  VideoCameraIcon, 
  MusicalNoteIcon, 
  DocumentTextIcon,
  XMarkIcon,
  ChatBubbleLeftRightIcon,
  UsersIcon
} from '@heroicons/react/24/outline'
import { getStagesByPipeline } from '../../services/stageService'
import { getWhatsAppInstances } from '../../services/chatService'
import { supabase } from '../../services/supabaseClient'
import { getUserEmpresaId } from '../../services/authService'

interface Props {
  campaign?: WhatsAppCampaign | null
  pipelines: Pipeline[]
  onSubmit: (data: CreateWhatsAppCampaignData | UpdateWhatsAppCampaignData) => void
  onCancel: () => void
}

type MessageType = 'text' | 'image' | 'video' | 'audio'

export const CampaignForm: React.FC<Props> = ({ 
  campaign, 
  pipelines,
  onSubmit, 
  onCancel 
}) => {
  const isEditing = Boolean(campaign)

  // Estados do formulário
  const [name, setName] = useState(campaign?.name || '')
  const [description, setDescription] = useState(campaign?.description || '')
  const [selectedInstanceId, setSelectedInstanceId] = useState(campaign?.instance_id || '')
  const [messageType, setMessageType] = useState<MessageType>(campaign?.message_type || 'text')
  const [messageText, setMessageText] = useState(campaign?.message_text || '')
  const [mediaPreview, setMediaPreview] = useState<string | null>(campaign?.media_url || null)
  const [mediaUrl, setMediaUrl] = useState<string | null>(campaign?.media_url || null)
  const [mediaFilename, setMediaFilename] = useState<string | null>(campaign?.media_filename || null)
  const [mediaSizeBytes, setMediaSizeBytes] = useState<number | null>(campaign?.media_size_bytes || null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  
  const [selectedPipelineId, setSelectedPipelineId] = useState(campaign?.pipeline_id || '')
  const [selectedFromStageId, setSelectedFromStageId] = useState(campaign?.from_stage_id || '')
  const [selectedToStageId, setSelectedToStageId] = useState(campaign?.to_stage_id || '')
  
  // Estados para instâncias WhatsApp
  const [instances, setInstances] = useState<WhatsAppInstance[]>([])
  const [loadingInstances, setLoadingInstances] = useState(true)
  
  const [messagesPerBatch, setMessagesPerBatch] = useState(campaign?.messages_per_batch || 50)
  const [intervalMinMinutes, setIntervalMinMinutes] = useState(campaign?.interval_min_minutes || 1)
  const [intervalMaxMinutes, setIntervalMaxMinutes] = useState(campaign?.interval_max_minutes || 3)

  // Estados para stages
  const [stages, setStages] = useState<Stage[]>([])
  
  // Estados para contagem de leads
  const [leadsCount, setLeadsCount] = useState<number | null>(null)
  const [loadingLeadsCount, setLoadingLeadsCount] = useState(false)
  
  // Ref para o textarea de mensagem
  const messageTextAreaRef = useRef<HTMLTextAreaElement>(null)

  /**
   * Carrega instâncias WhatsApp disponíveis
   */
  useEffect(() => {
    const loadInstances = async () => {
      try {
        setLoadingInstances(true)
        const data = await getWhatsAppInstances()
        setInstances(data)
        
        // Se está editando e tem instance_id, verificar se ainda existe
        if (campaign?.instance_id && !data.find(i => i.id === campaign.instance_id)) {
          console.warn('Instância da campanha não encontrada')
        }
      } catch (error) {
        console.error('Erro ao carregar instâncias:', error)
        setInstances([])
      } finally {
        setLoadingInstances(false)
      }
    }

    loadInstances()
  }, [campaign?.instance_id])

  /**
   * Carrega stages quando pipeline é selecionado
   */
  useEffect(() => {
    if (!selectedPipelineId) {
      setStages([])
      return
    }

    const loadStages = async () => {
      try {
        const { data, error } = await getStagesByPipeline(selectedPipelineId)
        if (error) throw error
        setStages(data || [])
      } catch (error) {
        console.error('Erro ao carregar stages:', error)
        setStages([])
      }
    }

    loadStages()
  }, [selectedPipelineId])

  /**
   * Busca a quantidade de leads no stage de origem
   */
  useEffect(() => {
    const fetchLeadsCount = async () => {
      if (!selectedFromStageId) {
        setLeadsCount(null)
        return
      }

      try {
        setLoadingLeadsCount(true)
        const empresaId = await getUserEmpresaId()
        
        const { count, error } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('stage_id', selectedFromStageId)
          .eq('empresa_id', empresaId)
          .is('loss_reason_category', null) // Excluir leads perdidos
          .is('sold_at', null) // Excluir leads vendidos

        if (error) {
          console.error('Erro ao buscar contagem de leads:', error)
          setLeadsCount(null)
        } else {
          setLeadsCount(count || 0)
        }
      } catch (error) {
        console.error('Erro ao buscar contagem de leads:', error)
        setLeadsCount(null)
      } finally {
        setLoadingLeadsCount(false)
      }
    }

    fetchLeadsCount()
  }, [selectedFromStageId])

  /**
   * Handler de upload de arquivo
   */
  /**
   * Upload de arquivo via webhook n8n (mesmo modelo das mensagens de saudação)
   */
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    
    if (!file) {
      setMediaPreview(null)
      setMediaUrl(null)
      setMediaFilename(null)
      setMediaSizeBytes(null)
      return
    }

    // Validar tipo
    const validTypes: Record<MessageType, string[]> = {
      text: [],
      image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      video: ['video/mp4', 'video/quicktime', 'video/webm'],
      audio: ['audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm', 'audio/mp3']
    }

    if (messageType !== 'text' && !validTypes[messageType].includes(file.type)) {
      alert(`Tipo de arquivo inválido. Tipos aceitos: ${validTypes[messageType].join(', ')}`)
      return
    }

    // Validar tamanho (16MB max)
    if (file.size > 16 * 1024 * 1024) {
      alert('Arquivo muito grande. Tamanho máximo: 16MB')
      return
    }

    setUploadError(null)

    // Preview temporário para imagens (enquanto faz upload)
    if (messageType === 'image') {
      const reader = new FileReader()
      reader.onload = (e) => {
        setMediaPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }

    // Fazer upload real via webhook n8n
    try {
      setUploading(true)

      // Buscar dados do usuário
      const { supabase } = await import('../../services/supabaseClient')
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('Usuário não autenticado')
      }

      // Buscar empresa_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('empresa_id')
        .eq('uuid', user.id)
        .single()

      if (!profile?.empresa_id) {
        throw new Error('Empresa não encontrada')
      }

      // URL do webhook n8n (mesmo usado em greeting messages)
      const WEBHOOK_URL = import.meta.env.VITE_GREETING_UPLOAD_WEBHOOK_URL 
        || 'https://n8n.advcrm.com.br/webhook/greeting-upload'

      // Gerar chave aleatória
      const randomKey = Math.floor(100000 + Math.random() * 900000).toString()

      // Criar FormData
      const formData = new FormData()
      formData.append('file', file)
      formData.append('filename', file.name)
      formData.append('content_type', file.type || 'application/octet-stream')
      formData.append('size', file.size.toString())
      formData.append('user_id', user.id)
      formData.append('empresa_id', profile.empresa_id)
      formData.append('random_key', randomKey)

      console.log('📤 Fazendo upload de arquivo para campanha:', {
        filename: file.name,
        size: file.size,
        type: file.type
      })

      // Enviar para webhook
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Erro desconhecido')
        throw new Error(`Erro no upload: ${response.status} - ${errorText}`)
      }

      const result = await response.json()

      if (!result.url) {
        throw new Error('Webhook não retornou URL válida')
      }

      // Salvar URL real retornada pelo n8n
      setMediaUrl(result.url)
      setMediaFilename(file.name)
      setMediaSizeBytes(file.size)
      setMediaPreview(result.url) // Usar URL real como preview

      console.log('✅ Upload concluído com sucesso:', result.url)

    } catch (error: any) {
      console.error('❌ Erro no upload:', error)
      setUploadError(error.message || 'Erro ao fazer upload do arquivo')
      setMediaUrl(null)
      setMediaFilename(null)
      setMediaSizeBytes(null)
      alert(`Erro ao fazer upload: ${error.message}`)
    } finally {
      setUploading(false)
    }
  }, [messageType])

  /**
   * Handler de mudança de tipo de mensagem
   */
  const handleMessageTypeChange = useCallback((type: MessageType) => {
    setMessageType(type)
    setMediaPreview(null)
    setMediaUrl(null)
    setMediaFilename(null)
    setMediaSizeBytes(null)
  }, [])

  /**
   * Handler de submit
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validações
    if (!name.trim()) {
      alert('Nome da campanha é obrigatório')
      return
    }

    if (!selectedInstanceId) {
      alert('Selecione uma instância de WhatsApp')
      return
    }

    if (!selectedPipelineId) {
      alert('Selecione um pipeline')
      return
    }

    if (!selectedFromStageId) {
      alert('Selecione o stage de origem dos leads')
      return
    }

    if (!selectedToStageId) {
      alert('Selecione o stage de destino após envio')
      return
    }

    if (selectedFromStageId === selectedToStageId) {
      alert('O stage de destino deve ser diferente do stage de origem')
      return
    }

    if (!messageText.trim() && messageType === 'text') {
      alert('Mensagem de texto é obrigatória')
      return
    }

    if (messageType !== 'text' && !mediaUrl && !campaign?.media_url) {
      alert('É necessário fazer upload de um arquivo para esse tipo de mensagem')
      return
    }

    // Validar se upload ainda está em andamento
    if (uploading) {
      alert('Aguarde o upload do arquivo terminar')
      return
    }

    const data: CreateWhatsAppCampaignData | UpdateWhatsAppCampaignData = {
      name: name.trim(),
      description: description.trim() || undefined,
      instance_id: selectedInstanceId,
      message_type: messageType,
      message_text: messageText.trim() || undefined,
      media_url: mediaUrl || undefined,
      media_filename: mediaFilename || undefined,
      media_size_bytes: mediaSizeBytes || undefined,
      pipeline_id: selectedPipelineId,
      from_stage_id: selectedFromStageId,
      to_stage_id: selectedToStageId,
      messages_per_batch: messagesPerBatch,
      interval_min_minutes: intervalMinMinutes,
      interval_max_minutes: intervalMaxMinutes
    }

    onSubmit(data)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-[90%] max-w-4xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <ChatBubbleLeftRightIcon className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {isEditing ? 'Editar Campanha' : 'Nova Campanha'}
              </h3>
              <p className="text-sm text-gray-600">
                {isEditing ? 'Atualize as informações da campanha' : 'Crie uma nova campanha de WhatsApp'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Form Content */}
        <form id="campaign-form" onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[calc(80vh-120px)] overflow-y-auto">
          {/* Informações Básicas */}
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Informações Básicas
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome da Campanha *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Promoção Black Friday"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descrição
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o objetivo desta campanha..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Segmentação */}
      <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Segmentação de Leads
        </h3>

        <div className="space-y-4">
          {/* Instância WhatsApp */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Instância WhatsApp *
            </label>
            <select
              value={selectedInstanceId}
              onChange={(e) => setSelectedInstanceId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              required
              disabled={loadingInstances}
            >
              <option value="">
                {loadingInstances ? 'Carregando instâncias...' : 'Selecione uma instância'}
              </option>
              {instances
                .filter(i => i.status === 'connected' || i.status === 'open')
                .map((instance) => (
                  <option key={instance.id} value={instance.id}>
                    {instance.display_name || instance.name} - {instance.phone_number}
                  </option>
                ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Apenas instâncias conectadas são exibidas
            </p>
          </div>

          {/* Pipeline */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pipeline *
            </label>
            <select
              value={selectedPipelineId}
              onChange={(e) => {
                setSelectedPipelineId(e.target.value)
                setSelectedFromStageId('')
                setSelectedToStageId('')
                setLeadsCount(null)
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              required
            >
              <option value="">Selecione um pipeline</option>
              {pipelines.map((pipeline) => (
                <option key={pipeline.id} value={pipeline.id}>
                  {pipeline.name}
                </option>
              ))}
            </select>
          </div>

          {selectedPipelineId && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stage de Origem (onde estão os leads) *
                </label>
                <select
                  value={selectedFromStageId}
                  onChange={(e) => {
                    const newFromStageId = e.target.value
                    setSelectedFromStageId(newFromStageId)
                    // Limpa contagem se stage for desmarcado
                    if (!newFromStageId) {
                      setLeadsCount(null)
                    }
                    // Se o stage de destino for igual ao novo stage de origem, limpa o destino
                    if (newFromStageId && selectedToStageId === newFromStageId) {
                      setSelectedToStageId('')
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  required
                >
                  <option value="">Selecione o stage de origem</option>
                  {stages.map((stage: Stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Leads neste stage receberão a mensagem
                </p>
                {selectedFromStageId && (
                  <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <UsersIcon className="w-4 h-4 text-orange-600" />
                      {loadingLeadsCount ? (
                        <span className="text-sm text-orange-700">
                          Carregando quantidade de leads...
                        </span>
                      ) : leadsCount !== null ? (
                        <span className="text-sm font-medium text-orange-900">
                          {leadsCount === 0 
                            ? 'Nenhum lead encontrado neste stage' 
                            : leadsCount === 1
                            ? '1 lead será disparado'
                            : `${leadsCount} leads serão disparados`}
                        </span>
                      ) : (
                        <span className="text-sm text-orange-700">
                          Não foi possível carregar a quantidade de leads
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stage de Destino (após envio) *
                </label>
                <select
                  value={selectedToStageId}
                  onChange={(e) => setSelectedToStageId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  required
                  disabled={!selectedFromStageId}
                >
                  <option value="">
                    {selectedFromStageId ? 'Selecione o stage de destino' : 'Selecione primeiro o stage de origem'}
                  </option>
                  {stages
                    .filter((stage: Stage) => stage.id !== selectedFromStageId)
                    .map((stage: Stage) => (
                      <option 
                        key={stage.id} 
                        value={stage.id}
                      >
                        {stage.name}
                      </option>
                    ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {selectedFromStageId 
                    ? 'Leads serão movidos para este stage após o envio bem-sucedido' 
                    : 'Selecione o stage de origem primeiro'}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mensagem */}
      <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Configuração da Mensagem
        </h3>

        <div className="space-y-4">
          {/* Tipo de Mensagem */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Mensagem *
            </label>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleMessageTypeChange('text')}
                className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-colors ${
                  messageType === 'text'
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <DocumentTextIcon className="w-6 h-6 mb-1" />
                <span className="text-xs font-medium">Texto</span>
              </button>

              <button
                type="button"
                onClick={() => handleMessageTypeChange('image')}
                className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-colors ${
                  messageType === 'image'
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <PhotoIcon className="w-6 h-6 mb-1" />
                <span className="text-xs font-medium">Imagem</span>
              </button>

              <button
                type="button"
                onClick={() => handleMessageTypeChange('video')}
                className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-colors ${
                  messageType === 'video'
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <VideoCameraIcon className="w-6 h-6 mb-1" />
                <span className="text-xs font-medium">Vídeo</span>
              </button>

              <button
                type="button"
                onClick={() => handleMessageTypeChange('audio')}
                className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-colors ${
                  messageType === 'audio'
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <MusicalNoteIcon className="w-6 h-6 mb-1" />
                <span className="text-xs font-medium">Áudio</span>
              </button>
            </div>
          </div>

          {/* Upload de Mídia */}
          {messageType !== 'text' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Arquivo de Mídia *
              </label>
              <input
                type="file"
                onChange={handleFileChange}
                disabled={uploading}
                accept={
                  messageType === 'image' ? 'image/*' :
                  messageType === 'video' ? 'video/*' :
                  'audio/*'
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              />
              
              {/* Status do Upload */}
              {uploading && (
                <div className="mt-2 flex items-center gap-2 text-sm text-orange-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600"></div>
                  <span>Fazendo upload...</span>
                </div>
              )}
              
              {uploadError && (
                <div className="mt-2 text-sm text-red-600">
                  ❌ {uploadError}
                </div>
              )}
              
              {mediaUrl && !uploading && (
                <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                  <span>✅ Arquivo enviado: {mediaFilename}</span>
                </div>
              )}

              <p className="text-xs text-gray-500 mt-1">
                Tamanho máximo: 16MB
              </p>

              {/* Preview de Imagem */}
              {messageType === 'image' && mediaPreview && !uploading && (
                <div className="mt-3">
                  <img 
                    src={mediaPreview} 
                    alt="Preview" 
                    className="max-w-xs rounded-lg border border-gray-200"
                  />
                </div>
              )}
            </div>
          )}

          {/* Texto/Legenda */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {messageType === 'text' ? 'Mensagem *' : 'Legenda (opcional)'}
            </label>
            <textarea
              ref={messageTextAreaRef}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Digite sua mensagem aqui..."
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-sm transition-colors hover:border-orange-400"
              required={messageType === 'text'}
            />
          </div>
        </div>
      </div>

      {/* Configurações de Envio */}
      <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Configurações de Envio
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Limite de Menssagens por Disparo
            </label>
            <input
              type="number"
              value={messagesPerBatch}
              onChange={(e) => setMessagesPerBatch(Number(e.target.value))}
              min={1}
              max={100}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Quantas mensagens enviar por disparo
            </p>
            <span className="text-xs text-gray-500">
              Recomendação: 40 mensagens por disparo
            </span>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Intervalo entre Lotes (minutos)
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Mínimo</label>
                <input
                  type="number"
                  value={intervalMinMinutes}
                  onChange={(e) => {
                    const val = Number(e.target.value)
                    setIntervalMinMinutes(val)
                    // Garantir que max seja sempre >= min
                    if (val > intervalMaxMinutes) {
                      setIntervalMaxMinutes(val)
                    }
                  }}
                  min={1}
                  max={60}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Máximo</label>
                <input
                  type="number"
                  value={intervalMaxMinutes}
                  onChange={(e) => {
                    const val = Number(e.target.value)
                    // Garantir que max seja sempre >= min
                    if (val >= intervalMinMinutes) {
                      setIntervalMaxMinutes(val)
                    }
                  }}
                  min={intervalMinMinutes}
                  max={60}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {intervalMinMinutes === intervalMaxMinutes 
                ? `Tempo fixo de ${intervalMinMinutes} minuto(s) entre lotes`
                : `Tempo aleatório entre ${intervalMinMinutes} e ${intervalMaxMinutes} minutos entre disparos`}
            </p>
            <span className="text-xs text-gray-500">
              Recomendação: Entre 5 e 10 minutos entre disparos
            </span>
          </div>
        </div>
      </div>

        </form>

        {/* Footer com Botões de Ação */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="campaign-form"
            className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
          >
            {isEditing ? 'Atualizar Campanha' : 'Criar Campanha'}
          </button>
        </div>
      </div>
    </div>
  )
}
