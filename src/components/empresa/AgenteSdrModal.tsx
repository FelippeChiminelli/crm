import { useEffect, useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useToastContext } from '../../contexts/ToastContext'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { ds } from '../../utils/designSystem'
import { Campo } from './secaoFormulario'
import { AgenteSdrFormulario } from './AgenteSdrFormulario'
import {
  configDeFormulario,
  erroDoFormulario,
  formularioDeConfig,
  formularioVazio,
  identificadorAgenteValido,
  obterAgenteSdr,
  salvarAgenteSdr,
  type ConfigAgenteSdr,
  type FormAgenteSdr,
} from '../../services/sdrAgentService'

type Status = 'draft' | 'published'

type Props = {
  agentId: string | null
  identificadoresUsados: string[]
  onClose: () => void
  onSaved: () => void
}

export function AgenteSdrModal({ agentId, identificadoresUsados, onClose, onSaved }: Props) {
  const { showSuccess, showError } = useToastContext()
  const editando = agentId !== null
  const [identificador, setIdentificador] = useState(agentId || '')
  const [form, setForm] = useState<FormAgenteSdr>(formularioVazio)
  const [base, setBase] = useState<ConfigAgenteSdr | null>(null)
  const [loading, setLoading] = useState(editando)
  const [saving, setSaving] = useState<Status | null>(null)

  useEscapeKey(true, () => {
    if (saving === null) onClose()
  })

  useEffect(() => {
    if (!agentId) return
    let ativo = true
    obterAgenteSdr(agentId)
      .then((salvo) => {
        if (!ativo || !salvo) return
        setBase(salvo.config)
        setForm(formularioDeConfig(salvo.config))
      })
      .catch((erro: Error) => {
        if (ativo) showError(erro.message || 'Não foi possível carregar o agente')
      })
      .finally(() => {
        if (ativo) setLoading(false)
      })
    return () => {
      ativo = false
    }
  }, [agentId, showError])

  const erroDoIdentificador = (id: string): string | null => {
    if (editando) return null
    if (!identificadorAgenteValido(id)) {
      return 'Identificador: use letras minúsculas, números e _, começando com letra.'
    }
    if (identificadoresUsados.includes(id)) return 'Já existe um agente com esse identificador.'
    return null
  }

  const salvar = async (proximo: Status) => {
    const id = identificador.trim()
    const invalido =
      erroDoIdentificador(id) ||
      (!form.nome.trim() || !form.empresa.trim() ? 'Preencha o nome do agente e a empresa.' : null) ||
      (proximo === 'published' && !form.webhook.trim()
        ? 'Informe o webhook de finalização antes de publicar.'
        : null) ||
      erroDoFormulario(form)
    if (invalido) {
      showError(invalido)
      return
    }
    setSaving(proximo)
    try {
      await salvarAgenteSdr(configDeFormulario(form, base), proximo, id)
      showSuccess(proximo === 'published' ? 'Agente publicado' : 'Rascunho salvo')
      onSaved()
    } catch (erro: unknown) {
      showError(erro instanceof Error ? erro.message : 'Não foi possível salvar')
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={() => saving === null && onClose()}
        />
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
            <h3 className="text-lg font-semibold text-gray-900">
              {editando ? 'Editar agente' : 'Criar agente'}
            </h3>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {loading ? (
              <p className="text-sm text-gray-500">Carregando agente...</p>
            ) : (
              <>
                <Campo
                  label="Identificador"
                  hint={
                    editando
                      ? 'Não pode ser alterado depois de criado.'
                      : 'Letras minúsculas, números e _, como pos_venda.'
                  }
                >
                  <input
                    className={ds.input()}
                    value={identificador}
                    disabled={editando}
                    placeholder="pos_venda"
                    onChange={(evento) => setIdentificador(evento.target.value)}
                  />
                </Campo>
                <AgenteSdrFormulario form={form} setForm={setForm} />
              </>
            )}
          </div>

          <div className="sticky bottom-0 bg-white flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={saving !== null}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => salvar('draft')}
              disabled={saving !== null || loading}
              className="px-4 py-2 text-sm font-medium text-primary-700 bg-primary-50 border border-primary-200 rounded-lg hover:bg-primary-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving === 'draft' ? 'Salvando...' : 'Salvar rascunho'}
            </button>
            <button
              type="button"
              onClick={() => salvar('published')}
              disabled={saving !== null || loading}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-500 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving === 'published' ? 'Publicando...' : 'Publicar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
