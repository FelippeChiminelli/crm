import { useEffect, useState } from 'react'
import type { WhatsAppInstance } from '../../types'
import { supabase } from '../../services/supabaseClient'

interface SelectInstanceModalProps {
  isOpen: boolean
  onClose: () => void
  allowedInstanceIds?: string[]
  onSelect: (instanceId: string) => void
}

export function SelectInstanceModal({ isOpen, onClose, allowedInstanceIds, onSelect }: SelectInstanceModalProps) {
  const [instances, setInstances] = useState<WhatsAppInstance[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      if (!isOpen) return
      try {
        setLoading(true)
        setError(null)

        // Buscar empresa do usuário
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Usuário não autenticado')
        const { data: profile } = await supabase
          .from('profiles')
          .select('empresa_id')
          .eq('uuid', user.id)
          .single()
        const empresaId = profile?.empresa_id
        if (!empresaId) throw new Error('Empresa não identificada')

        // Buscar instâncias da empresa
        let query = supabase
          .from('whatsapp_instances')
          .select('id, name, display_name, phone_number, status, empresa_id, created_at, updated_at')
          .eq('empresa_id', empresaId)
          .order('created_at', { ascending: false })

        const { data, error } = await query
        if (error) throw error

        let list = (data || []) as WhatsAppInstance[]
        if (Array.isArray(allowedInstanceIds) && allowedInstanceIds.length > 0) {
          list = list.filter(i => allowedInstanceIds.includes(i.id))
        }

        setInstances(list)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar instâncias')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [isOpen, allowedInstanceIds])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white w-full max-w-md rounded-lg shadow-lg">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Selecionar instância</h3>
        </div>
        <div className="p-4">
          {loading && <p className="text-sm text-gray-600">Carregando...</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {!loading && !error && instances.length === 0 && (
            <p className="text-sm text-gray-600">Nenhuma instância disponível.</p>
          )}
          <ul className="divide-y divide-gray-200">
            {instances.map((inst) => (
              <li key={inst.id} className="py-3">
                <button
                  onClick={() => onSelect(inst.id)}
                  className="w-full text-left px-3 py-2 rounded border border-gray-200 hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{inst.display_name || inst.name}</p>
                      <p className="text-sm text-gray-500">{inst.phone_number}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${inst.status === 'connected' ? 'bg-green-100 text-green-700' : inst.status === 'connecting' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}>
                      {inst.status}
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="p-4 border-t border-gray-200 text-right">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded border border-gray-300 bg-white hover:bg-gray-50">Cancelar</button>
        </div>
      </div>
    </div>
  )
}


