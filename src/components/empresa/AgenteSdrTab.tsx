import { useCallback, useEffect, useState } from 'react'
import { ExclamationTriangleIcon, PlusIcon } from '@heroicons/react/24/outline'
import { useToastContext } from '../../contexts/ToastContext'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { AgenteSdrModal } from './AgenteSdrModal'
import { AgenteTesteChat } from './AgenteTesteChat'
import {
  arquivarAgenteSdr,
  listarAgentesSdr,
  type AgenteResumo,
} from '../../services/sdrAgentService'

type ModalAberto = { agentId: string | null } | null

export function AgenteSdrTab() {
  const { showSuccess, showError } = useToastContext()
  const [agentes, setAgentes] = useState<AgenteResumo[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [modal, setModal] = useState<ModalAberto>(null)
  const [excluindo, setExcluindo] = useState<AgenteResumo | null>(null)
  const [testando, setTestando] = useState<AgenteResumo | null>(null)
  const [deleting, setDeleting] = useState(false)

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      setAgentes(await listarAgentesSdr())
      setErro(null)
    } catch (falha: unknown) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível carregar os agentes')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  const cancelarExclusao = useCallback(() => {
    if (!deleting) setExcluindo(null)
  }, [deleting])
  useEscapeKey(excluindo !== null, cancelarExclusao)

  const confirmarExclusao = async () => {
    if (!excluindo) return
    setDeleting(true)
    try {
      await arquivarAgenteSdr(excluindo.agent_id)
      showSuccess('Agente excluído')
      setExcluindo(null)
      await carregar()
    } catch (falha: unknown) {
      showError(falha instanceof Error ? falha.message : 'Não foi possível excluir')
    } finally {
      setDeleting(false)
    }
  }

  const aoSalvar = () => {
    setModal(null)
    carregar()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <p className="text-sm text-gray-600">
          Cada agente é um prompt separado. O atendimento usa o identificador para escolher qual responde.
        </p>
        <button
          type="button"
          onClick={() => setModal({ agentId: null })}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          Criar agente
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-gray-600">Carregando...</div>
      ) : erro ? (
        <div className="text-sm text-red-600">{erro}</div>
      ) : agentes.length === 0 ? (
        <div className="text-sm text-gray-500">Nenhum agente criado ainda.</div>
      ) : (
        <div className="space-y-3">
          {agentes.map((item) => (
            <div key={item.agent_id} className="border rounded p-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="font-medium text-gray-900 truncate">{item.nome || item.agent_id}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {item.agent_id} · versão {item.version}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span
                  className={`px-3 py-1 rounded text-sm ${item.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}
                >
                  {item.status === 'published' ? 'Publicado' : 'Rascunho'}
                </span>
                <button
                  type="button"
                  onClick={() => setTestando(item)}
                  className="px-3 py-1 rounded text-sm bg-primary-50 text-primary-700 hover:bg-primary-100"
                >
                  Testar
                </button>
                <button
                  type="button"
                  onClick={() => setModal({ agentId: item.agent_id })}
                  className="px-3 py-1 rounded text-sm bg-blue-100 text-blue-800 hover:bg-blue-200"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => setExcluindo(item)}
                  className="px-3 py-1 rounded text-sm bg-red-100 text-red-800 hover:bg-red-200"
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <AgenteSdrModal
          agentId={modal.agentId}
          identificadoresUsados={agentes.map((item) => item.agent_id)}
          onClose={() => setModal(null)}
          onSaved={aoSalvar}
        />
      )}

      {testando && (
        <AgenteTesteChat
          agentId={testando.agent_id}
          nome={testando.nome || testando.agent_id}
          onClose={() => setTestando(null)}
        />
      )}

      {excluindo && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={cancelarExclusao} />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                    <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Excluir agente</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      O agente "{excluindo.nome || excluindo.agent_id}" para de responder novos atendimentos.
                      Os que já estão em andamento terminam normalmente.
                    </p>
                  </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={cancelarExclusao}
                    disabled={deleting}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={confirmarExclusao}
                    disabled={deleting}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-500 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deleting ? 'Excluindo...' : 'Excluir'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
