import { useState, useEffect } from 'react'
import { FiX, FiSend, FiSearch } from 'react-icons/fi'
import { FaWhatsapp } from 'react-icons/fa'
import type { WhatsAppInstance } from '../../types'
import { getWhatsAppInstances } from '../../services/chatService'
import { supabase } from '../../services/supabaseClient'
import { useAuthContext } from '../../contexts/AuthContext'
import SecureLogger from '../../utils/logger'

// Interface simplificada para os leads do seletor
interface LeadOption {
  id: string
  name: string
  company?: string
  phone?: string
  email?: string
}

interface SendPhotosModalProps {
  vehicleId: string
  vehicleTitle: string
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function SendPhotosModal({
  vehicleId,
  vehicleTitle,
  isOpen,
  onClose,
  onSuccess
}: SendPhotosModalProps) {
  const { profile } = useAuthContext()
  const empresaId = profile?.empresa_id

  // Estados
  const [instances, setInstances] = useState<WhatsAppInstance[]>([])
  const [leads, setLeads] = useState<LeadOption[]>([])
  const [selectedInstanceId, setSelectedInstanceId] = useState<string>('')
  const [selectedLeadId, setSelectedLeadId] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingInstances, setLoadingInstances] = useState(false)
  const [loadingLeads, setLoadingLeads] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Carregar instâncias e leads quando o modal abrir
  useEffect(() => {
    if (isOpen && empresaId) {
      loadInstances()
      loadLeads()
    }
  }, [isOpen, empresaId])

  // Carregar instâncias de WhatsApp
  const loadInstances = async () => {
    try {
      setLoadingInstances(true)
      const data = await getWhatsAppInstances()
      // Filtrar apenas instâncias conectadas
      const connectedInstances = data.filter(
        inst => inst.status === 'connected' || inst.status === 'open'
      )
      setInstances(connectedInstances)
      
      // Selecionar a primeira instância por padrão se houver
      if (connectedInstances.length > 0 && !selectedInstanceId) {
        setSelectedInstanceId(connectedInstances[0].id)
      }
    } catch (err) {
      SecureLogger.error('Erro ao carregar instâncias:', err)
      setError('Erro ao carregar números de WhatsApp')
    } finally {
      setLoadingInstances(false)
    }
  }

  // Carregar leads da empresa
  const loadLeads = async () => {
    if (!empresaId) return

    try {
      setLoadingLeads(true)
      const { data, error: leadsError } = await supabase
        .from('leads')
        .select('id, name, company, phone, email')
        .eq('empresa_id', empresaId)
        .order('name', { ascending: true })
        .limit(500)

      if (leadsError) throw leadsError
      setLeads(data || [])
    } catch (err) {
      SecureLogger.error('Erro ao carregar leads:', err)
      setError('Erro ao carregar leads')
    } finally {
      setLoadingLeads(false)
    }
  }

  // Filtrar leads pelo termo de busca
  const filteredLeads = leads.filter(lead => {
    const term = searchTerm.toLowerCase()
    return (
      lead.name?.toLowerCase().includes(term) ||
      lead.company?.toLowerCase().includes(term) ||
      lead.phone?.includes(term) ||
      lead.email?.toLowerCase().includes(term)
    )
  })

  // Enviar para o webhook
  const handleSubmit = async () => {
    if (!selectedInstanceId || !selectedLeadId || !empresaId) {
      setError('Selecione o número de WhatsApp e o lead')
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Gerar número aleatório de 6 dígitos
      const aletNum = Math.floor(100000 + Math.random() * 900000)

      const payload = {
        instancia_id: selectedInstanceId,
        lead_id: selectedLeadId,
        empresa_id: empresaId,
        veiculo_id: vehicleId,
        alet_num: aletNum
      }

      SecureLogger.info('📤 Enviando fotos do veículo para webhook:', payload)

      const response = await fetch('https://n8n.advcrm.com.br/webhook/fotoscarrosestoque', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        throw new Error(`Erro ao enviar: ${response.status} ${response.statusText}`)
      }

      SecureLogger.info('✅ Fotos enviadas com sucesso')
      
      // Callback de sucesso
      onSuccess?.()
      
      // Fechar modal
      onClose()
      
      // Resetar estados
      setSelectedLeadId('')
      setSearchTerm('')
    } catch (err) {
      SecureLogger.error('❌ Erro ao enviar fotos:', err)
      setError(err instanceof Error ? err.message : 'Erro ao enviar fotos')
    } finally {
      setLoading(false)
    }
  }

  // Obter nome do lead selecionado
  const getSelectedLeadName = () => {
    const lead = leads.find(l => l.id === selectedLeadId)
    return lead?.name || 'Selecione um lead'
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Overlay */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="inline-block w-full max-w-lg my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-green-500">
            <div className="flex items-center gap-3">
              <FaWhatsapp className="text-white" size={24} />
              <div>
                <h2 className="text-lg font-semibold text-white">Enviar Fotos</h2>
                <p className="text-sm text-green-100 truncate max-w-[280px]">{vehicleTitle}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-white hover:bg-green-600 rounded-lg transition-colors"
            >
              <FiX size={20} />
            </button>
          </div>

          {/* Conteúdo */}
          <div className="px-6 py-4 space-y-4">
            {/* Erro */}
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200">
                {error}
              </div>
            )}

            {/* Seletor de Instância (Número de WhatsApp) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enviar de qual número?
              </label>
              {loadingInstances ? (
                <div className="flex items-center justify-center py-3 bg-gray-50 rounded-lg">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-500" />
                  <span className="ml-2 text-sm text-gray-500">Carregando números...</span>
                </div>
              ) : instances.length === 0 ? (
                <div className="p-3 text-sm text-amber-600 bg-amber-50 rounded-lg border border-amber-200">
                  Nenhum número de WhatsApp conectado. Conecte um número nas configurações.
                </div>
              ) : (
                <select
                  value={selectedInstanceId}
                  onChange={(e) => setSelectedInstanceId(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                >
                  <option value="">Selecione o número</option>
                  {instances.map((instance) => (
                    <option key={instance.id} value={instance.id}>
                      {instance.display_name || instance.name} - {instance.phone_number}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Seletor de Lead */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enviar para qual lead?
              </label>
              
              {/* Campo de busca */}
              <div className="relative mb-2">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Buscar lead por nome, telefone, empresa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors text-sm"
                />
              </div>

              {loadingLeads ? (
                <div className="flex items-center justify-center py-3 bg-gray-50 rounded-lg">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-500" />
                  <span className="ml-2 text-sm text-gray-500">Carregando leads...</span>
                </div>
              ) : (
                <div className="border border-gray-300 rounded-lg max-h-48 overflow-y-auto">
                  {filteredLeads.length === 0 ? (
                    <div className="p-3 text-sm text-gray-500 text-center">
                      {searchTerm ? 'Nenhum lead encontrado' : 'Nenhum lead cadastrado'}
                    </div>
                  ) : (
                    filteredLeads.map((lead) => (
                      <button
                        key={lead.id}
                        type="button"
                        onClick={() => setSelectedLeadId(lead.id)}
                        className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                          selectedLeadId === lead.id ? 'bg-green-50 border-l-4 border-l-green-500' : ''
                        }`}
                      >
                        <div className="font-medium text-gray-900 text-sm">{lead.name}</div>
                        <div className="text-xs text-gray-500 flex gap-2 mt-0.5">
                          {lead.phone && <span>{lead.phone}</span>}
                          {lead.company && <span>• {lead.company}</span>}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* Indicador do lead selecionado */}
              {selectedLeadId && (
                <div className="mt-2 text-sm text-green-600 flex items-center gap-1">
                  <span>✓ Selecionado:</span>
                  <span className="font-medium">{getSelectedLeadName()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !selectedInstanceId || !selectedLeadId}
              className="flex items-center gap-2 px-4 py-2 text-white bg-green-500 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Enviando...
                </>
              ) : (
                <>
                  <FiSend size={16} />
                  Enviar Fotos
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
