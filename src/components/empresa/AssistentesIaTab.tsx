import { useCallback, useEffect, useState } from 'react'
import {
  ClipboardDocumentIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline'
import { Switch } from '../ui/Switch'
import { useToastContext } from '../../contexts/ToastContext'
import {
  MCP_SERVER_URL,
  getMcpConfig,
  listMcpAcessos,
  saveMcpConfig,
  type McpAcesso,
  type McpConfig,
} from '../../services/mcpConfigService'
import { ds } from '../../utils/designSystem'

const PASSOS = [
  {
    titulo: 'ChatGPT',
    passos: [
      'Em Configurações > Conectores (ou Apps), escolha adicionar um conector personalizado.',
      'Cole o endereço do servidor abaixo e salve.',
      'Entre com seu usuário do Aucta CRM e clique em "Permitir acesso".',
    ],
  },
  {
    titulo: 'Claude',
    passos: [
      'Em Configurações > Conectores, clique em "Adicionar conector personalizado".',
      'Cole o endereço do servidor abaixo e conecte.',
      'Entre com seu usuário do Aucta CRM e clique em "Permitir acesso".',
    ],
  },
]

function formatarDataHora(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function AssistentesIaTab() {
  const { showSuccess, showError } = useToastContext()
  const [config, setConfig] = useState<McpConfig | null>(null)
  const [acessos, setAcessos] = useState<McpAcesso[]>([])
  const [loading, setLoading] = useState(true)
  const [erroCarregar, setErroCarregar] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const carregar = useCallback(async () => {
    setLoading(true)
    setErroCarregar(null)
    try {
      const [cfg, lista] = await Promise.all([getMcpConfig(), listMcpAcessos(30)])
      setConfig(cfg)
      setAcessos(lista)
    } catch (err: unknown) {
      setErroCarregar(err instanceof Error ? err.message : 'Erro ao carregar configuração')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  const salvar = async (changes: Pick<McpConfig, 'habilitado' | 'permite_conteudo_chat'>) => {
    setSaving(true)
    try {
      const atualizado = await saveMcpConfig(changes)
      setConfig(atualizado)
      showSuccess('Configuração salva')
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'Erro ao salvar configuração')
    } finally {
      setSaving(false)
    }
  }

  const copiarEndereco = async () => {
    try {
      await navigator.clipboard.writeText(MCP_SERVER_URL)
      showSuccess('Endereço copiado')
    } catch {
      showError('Não foi possível copiar. Selecione o endereço e copie manualmente.')
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-500">Carregando...</p>
  }

  if (erroCarregar || !config) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Não foi possível carregar a configuração dos assistentes de IA. {erroCarregar}
        <button type="button" onClick={carregar} className="ml-2 font-medium underline">
          Tentar novamente
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600">
        Conecte o ChatGPT, o Claude ou outro assistente de IA compatível com MCP para fazer
        perguntas sobre os dados da loja: funil, vendas, vendedores, estoque e qualidade do
        atendimento no WhatsApp. O acesso é <strong>somente leitura</strong> e restrito a
        administradores.
      </p>

      {/* Interruptores */}
      <div className="divide-y divide-gray-100 rounded-lg border border-gray-200">
        <div className="flex items-start justify-between gap-4 p-4">
          <div>
            <p className="text-sm font-medium text-gray-900">Permitir conexão com assistentes de IA</p>
            <p className="text-xs text-gray-500 mt-1">
              Ao desligar, todos os assistentes conectados perdem o acesso em até 1 minuto.
            </p>
          </div>
          <Switch
            label="Permitir conexão com assistentes de IA"
            checked={config.habilitado}
            disabled={saving}
            onChange={(habilitado) =>
              salvar({ habilitado, permite_conteudo_chat: habilitado && config.permite_conteudo_chat })
            }
          />
        </div>

        <div className={`flex items-start justify-between gap-4 p-4 ${config.habilitado ? '' : 'opacity-50'}`}>
          <div>
            <p className="text-sm font-medium text-gray-900">
              Permitir que a IA leia o conteúdo das conversas
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Sem isso, o assistente vê apenas métricas de atendimento (tempos, volumes, ligações),
              nunca o texto das mensagens.
            </p>
            {config.permite_conteudo_chat && (
              <div className="mt-2 flex items-start gap-2 rounded-md bg-yellow-50 border border-yellow-200 p-2 text-xs text-yellow-800">
                <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0" />
                <span>
                  O texto das conversas com clientes será enviado ao provedor do assistente usado
                  (OpenAI, Anthropic etc.). Telefones e documentos são ocultados, mas confirme que
                  isso está de acordo com a política de privacidade da loja (LGPD).
                </span>
              </div>
            )}
          </div>
          <Switch
            label="Permitir que a IA leia o conteúdo das conversas"
            checked={config.permite_conteudo_chat}
            disabled={saving || !config.habilitado}
            onChange={(permite_conteudo_chat) =>
              salvar({ habilitado: config.habilitado, permite_conteudo_chat })
            }
          />
        </div>
      </div>

      {/* Como conectar */}
      {config.habilitado && (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-900 mb-2">Endereço do servidor</p>
            <div className="flex gap-2">
              <input readOnly value={MCP_SERVER_URL} className={`${ds.input()} font-mono`} />
              <button type="button" onClick={copiarEndereco} className={ds.button('outline')}>
                <ClipboardDocumentIcon className="h-4 w-4" />
                Copiar
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {PASSOS.map(({ titulo, passos }) => (
              <div key={titulo} className="rounded-lg border border-gray-200 p-4">
                <p className="text-sm font-medium text-gray-900 mb-2">{titulo}</p>
                <ol className="list-decimal list-inside space-y-1 text-xs text-gray-600">
                  {passos.map((passo) => (
                    <li key={passo}>{passo}</li>
                  ))}
                </ol>
              </div>
            ))}
          </div>

          <p className="flex items-start gap-2 text-xs text-gray-500">
            <InformationCircleIcon className="h-4 w-4 flex-shrink-0" />
            Os nomes dos menus podem variar conforme o plano e a versão do assistente.
          </p>
        </div>
      )}

      {/* Últimos acessos */}
      <div>
        <p className="text-sm font-medium text-gray-900 mb-2">Últimos acessos</p>
        {acessos.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum acesso registrado ainda.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs text-gray-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Quando</th>
                  <th className="px-3 py-2 font-medium">Usuário</th>
                  <th className="px-3 py-2 font-medium">Consulta</th>
                  <th className="px-3 py-2 font-medium">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {acessos.map((acesso) => (
                  <tr key={`${acesso.created_at}-${acesso.ferramenta}`}>
                    <td className="px-3 py-2 whitespace-nowrap text-gray-600">
                      {formatarDataHora(acesso.created_at)}
                    </td>
                    <td className="px-3 py-2 text-gray-900">{acesso.usuario ?? '—'}</td>
                    <td className="px-3 py-2 font-mono text-xs text-gray-700">{acesso.ferramenta}</td>
                    <td className="px-3 py-2 text-xs">
                      {acesso.erro ? (
                        <span className="text-red-600" title={acesso.erro}>
                          Negado/erro
                        </span>
                      ) : (
                        <span className="text-green-700">OK</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
