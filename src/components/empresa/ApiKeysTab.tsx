import { useState, useEffect } from 'react'
import {
  PlusIcon,
  TrashIcon,
  ClipboardDocumentIcon,
  EyeIcon,
  EyeSlashIcon,
  BookOpenIcon,
} from '@heroicons/react/24/outline'
import { useToastContext } from '../../contexts/ToastContext'
import { useConfirm } from '../../hooks/useConfirm'
import {
  listApiTokens,
  createApiToken,
  toggleApiToken,
  deleteApiToken,
  type ApiToken,
} from '../../services/apiTokenService'
import { ds } from '../../utils/designSystem'

export function ApiKeysTab() {
  const [tokens, setTokens] = useState<ApiToken[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newTokenName, setNewTokenName] = useState('')
  const [newlyCreatedToken, setNewlyCreatedToken] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [revealedTokens, setRevealedTokens] = useState<Set<string>>(new Set())
  const { showSuccess, showError } = useToastContext()
  const { confirm } = useConfirm()

  useEffect(() => {
    loadTokens()
  }, [])

  const loadTokens = async () => {
    setLoading(true)
    try {
      const data = await listApiTokens()
      setTokens(data)
    } catch (err: any) {
      showError(err.message || 'Erro ao carregar tokens')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!newTokenName.trim()) return
    setSaving(true)
    try {
      const token = await createApiToken(newTokenName.trim())
      setNewlyCreatedToken(token.token)
      setTokens((prev) => [token, ...prev])
      setNewTokenName('')
      showSuccess('Token criado com sucesso!')
    } catch (err: any) {
      showError(err.message || 'Erro ao criar token')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (token: ApiToken) => {
    try {
      await toggleApiToken(token.id, !token.is_active)
      setTokens((prev) =>
        prev.map((t) =>
          t.id === token.id ? { ...t, is_active: !t.is_active } : t
        )
      )
      showSuccess(token.is_active ? 'Token desativado' : 'Token ativado')
    } catch (err: any) {
      showError(err.message || 'Erro ao atualizar token')
    }
  }

  const handleDelete = async (token: ApiToken) => {
    const confirmed = await confirm({
      title: 'Excluir token',
      message: `Tem certeza que deseja excluir o token "${token.name}"? Esta ação é irreversível e todas as integrações que usam este token pararão de funcionar.`,
      confirmText: 'Excluir',
      type: 'danger',
    })
    if (!confirmed) return

    try {
      await deleteApiToken(token.id)
      setTokens((prev) => prev.filter((t) => t.id !== token.id))
      showSuccess('Token excluído')
    } catch (err: any) {
      showError(err.message || 'Erro ao excluir token')
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    showSuccess('Token copiado!')
  }

  const maskToken = (token: string) => {
    return `${token.slice(0, 12)}${'*'.repeat(20)}${token.slice(-4)}`
  }

  const toggleReveal = (tokenId: string) => {
    setRevealedTokens((prev) => {
      const next = new Set(prev)
      if (next.has(tokenId)) {
        next.delete(tokenId)
      } else {
        next.add(tokenId)
      }
      return next
    })
  }

  const formatDate = (date: string | null) => {
    if (!date) return 'Nunca'
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base lg:text-lg font-semibold text-gray-900">
            Tokens de API
          </h3>
          <p className="text-xs lg:text-sm text-gray-500 mt-1">
            Gere tokens para integrar sistemas externos com o CRM via API.
          </p>
        </div>
        <button
          onClick={() => {
            setShowCreateModal(true)
            setNewlyCreatedToken(null)
          }}
          className={ds.button('primary')}
        >
          <PlusIcon className="h-4 w-4 mr-1" />
          Novo Token
        </button>
      </div>

      {/* Links para documentação */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <BookOpenIcon className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-800">
              Documentação da API
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Consulte todos os endpoints disponíveis, schemas e exemplos de uso.
            </p>
            <div className="flex items-center gap-3 mt-2">
              <a
                href={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/docs`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:text-blue-900 underline"
              >
                Swagger UI
              </a>
              <span className="text-blue-300">|</span>
              <a
                href={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/redoc`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:text-blue-900 underline"
              >
                ReDoc
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Token recém-criado */}
      {newlyCreatedToken && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm font-medium text-green-800 mb-2">
            Token criado! Copie agora, ele não será exibido novamente por completo.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-white border rounded px-3 py-2 text-xs font-mono text-gray-900 break-all">
              {newlyCreatedToken}
            </code>
            <button
              onClick={() => copyToClipboard(newlyCreatedToken)}
              className="p-2 text-green-600 hover:text-green-800 hover:bg-green-100 rounded"
              title="Copiar token"
            >
              <ClipboardDocumentIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Lista de tokens */}
      {tokens.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-sm">Nenhum token de API criado.</p>
          <p className="text-xs mt-1">
            Crie um token para começar a integrar sistemas externos.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tokens.map((token) => (
            <div
              key={token.id}
              className={`border rounded-lg p-4 ${
                token.is_active
                  ? 'border-gray-200 bg-white'
                  : 'border-gray-100 bg-gray-50 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium text-gray-900">
                      {token.name}
                    </h4>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        token.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {token.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>

                  {/* Token mascarado */}
                  <div className="flex items-center gap-1 mt-2">
                    <code className="text-xs font-mono text-gray-500">
                      {revealedTokens.has(token.id)
                        ? token.token
                        : maskToken(token.token)}
                    </code>
                    <button
                      onClick={() => toggleReveal(token.id)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                      title={
                        revealedTokens.has(token.id)
                          ? 'Ocultar'
                          : 'Revelar'
                      }
                    >
                      {revealedTokens.has(token.id) ? (
                        <EyeSlashIcon className="h-4 w-4" />
                      ) : (
                        <EyeIcon className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => copyToClipboard(token.token)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                      title="Copiar"
                    >
                      <ClipboardDocumentIcon className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Metadados */}
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                    <span>Criado em {formatDate(token.created_at)}</span>
                    <span>Último uso: {formatDate(token.last_used_at)}</span>
                  </div>
                </div>

                {/* Ações */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggle(token)}
                    className={`px-3 py-1.5 text-xs font-medium rounded ${
                      token.is_active
                        ? 'text-yellow-700 bg-yellow-50 hover:bg-yellow-100'
                        : 'text-green-700 bg-green-50 hover:bg-green-100'
                    }`}
                  >
                    {token.is_active ? 'Desativar' : 'Ativar'}
                  </button>
                  <button
                    onClick={() => handleDelete(token)}
                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                    title="Excluir token"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de criação */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Criar Token de API
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome do token
              </label>
              <input
                type="text"
                value={newTokenName}
                onChange={(e) => setNewTokenName(e.target.value)}
                placeholder='Ex: "Integração Website", "n8n Webhook"'
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newTokenName.trim()) handleCreate()
                }}
              />
              <p className="text-xs text-gray-500 mt-1">
                Dê um nome descritivo para identificar onde este token é usado.
              </p>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setNewTokenName('')
                }}
                className={ds.button('secondary')}
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={!newTokenName.trim() || saving}
                className={ds.button('primary')}
              >
                {saving ? 'Criando...' : 'Criar Token'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
