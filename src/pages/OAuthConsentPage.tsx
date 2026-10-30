import { useEffect, useState, type ReactNode } from 'react'
import { Navigate, useLocation, useSearchParams } from 'react-router-dom'
import {
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  EyeSlashIcon,
  LockClosedIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline'
import { useAuthContext } from '../contexts/AuthContext'
import { BrandLoader } from '../components/ui/BrandLoader'
import {
  decideAuthorization,
  getAuthorizationDetails,
  type OAuthAuthorizationDetails,
} from '../services/oauthConsentService'
import { getMcpConfig, type McpConfig } from '../services/mcpConfigService'
import { ds } from '../utils/designSystem'
import AuctaLogoPrincipal from '../assets/logo-principal-login.svg'

type Estado =
  | { tipo: 'carregando' }
  | { tipo: 'erro'; mensagem: string }
  | { tipo: 'consentimento'; detalhes: OAuthAuthorizationDetails; config: McpConfig }
  | { tipo: 'redirecionando' }

function Moldura({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className={`${ds.card()} w-full max-w-md p-6 sm:p-8`}>
        <img src={AuctaLogoPrincipal} alt="Aucta" className="h-8 mx-auto mb-6" />
        {children}
      </div>
    </div>
  )
}

/**
 * Tela de consentimento do OAuth (Supabase Auth OAuth 2.1 Server).
 * O Supabase redireciona para cá com `?authorization_id=...` quando um assistente de IA
 * (ChatGPT, Claude...) pede acesso ao servidor MCP em nome do usuário.
 */
export default function OAuthConsentPage() {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const authorizationId = searchParams.get('authorization_id')
  const { isAuthenticated, loading: authLoading, isAdmin, empresaNome, empresaAtiva } = useAuthContext()
  const [estado, setEstado] = useState<Estado>({ tipo: 'carregando' })
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    if (authLoading || !isAuthenticated || !authorizationId) return
    let cancelado = false

    async function carregar(id: string) {
      try {
        const resultado = await getAuthorizationDetails(id)
        if (resultado.type === 'redirect') {
          // Acesso já autorizado antes para este assistente
          setEstado({ tipo: 'redirecionando' })
          window.location.assign(resultado.redirectUrl)
          return
        }
        const config = await getMcpConfig().catch(() => ({
          habilitado: false,
          permite_conteudo_chat: false,
          updated_at: null,
        }))
        if (!cancelado) setEstado({ tipo: 'consentimento', detalhes: resultado.details, config })
      } catch (err) {
        if (!cancelado) {
          setEstado({
            tipo: 'erro',
            mensagem: err instanceof Error ? err.message : 'Não foi possível carregar a solicitação.',
          })
        }
      }
    }

    carregar(authorizationId)
    return () => {
      cancelado = true
    }
  }, [authLoading, isAuthenticated, authorizationId])

  if (authLoading) {
    return <BrandLoader text="Verificando autenticação..." />
  }

  if (!isAuthenticated) {
    // Volta para esta mesma tela (com o authorization_id) depois do login
    const next = `${location.pathname}${location.search}`
    return <Navigate to={`/auth?next=${encodeURIComponent(next)}`} replace />
  }

  if (!authorizationId) {
    return (
      <Moldura>
        <p className="text-center text-sm text-gray-600">
          Link de autorização inválido. Inicie a conexão novamente pelo seu assistente de IA.
        </p>
      </Moldura>
    )
  }

  async function decidir(acao: 'approve' | 'deny') {
    if (!authorizationId) return
    setEnviando(true)
    try {
      const redirectUrl = await decideAuthorization(authorizationId, acao)
      setEstado({ tipo: 'redirecionando' })
      window.location.assign(redirectUrl)
    } catch (err) {
      setEnviando(false)
      setEstado({
        tipo: 'erro',
        mensagem: err instanceof Error ? err.message : 'Não foi possível concluir a autorização.',
      })
    }
  }

  if (estado.tipo === 'carregando' || estado.tipo === 'redirecionando') {
    return (
      <BrandLoader
        text={estado.tipo === 'carregando' ? 'Carregando solicitação...' : 'Voltando para o assistente...'}
      />
    )
  }

  if (estado.tipo === 'erro') {
    return (
      <Moldura>
        <h1 className="text-lg font-semibold text-gray-900 text-center mb-2">Não foi possível continuar</h1>
        <p className="text-center text-sm text-gray-600">{estado.mensagem}</p>
      </Moldura>
    )
  }

  const { detalhes, config } = estado
  const nomeAssistente = detalhes.client.name || 'Assistente de IA'

  // Bloqueios: só admin, empresa ativa e integração habilitada pela loja
  let bloqueio: { titulo: string; texto: string } | null = null
  if (!isAdmin) {
    bloqueio = {
      titulo: 'Acesso restrito a administradores',
      texto: 'A conexão com assistentes de IA está disponível apenas para administradores da loja.',
    }
  } else if (!empresaAtiva) {
    bloqueio = { titulo: 'Loja inativa', texto: 'A loja está inativa no Aucta CRM.' }
  } else if (!config.habilitado) {
    bloqueio = {
      titulo: 'Integração desligada',
      texto:
        'Ative a conexão em Configurações > Integrações > Assistentes de IA e depois conecte o assistente novamente.',
    }
  }

  if (bloqueio) {
    return (
      <Moldura>
        <div className="flex justify-center mb-4">
          <LockClosedIcon className="h-10 w-10 text-gray-400" />
        </div>
        <h1 className="text-lg font-semibold text-gray-900 text-center mb-2">{bloqueio.titulo}</h1>
        <p className="text-center text-sm text-gray-600 mb-6">{bloqueio.texto}</p>
        {isAdmin && !config.habilitado && empresaAtiva && (
          <a href="/admin?tab=assistentesIa" className={`${ds.button('primary')} w-full justify-center mb-3`}>
            Abrir configurações
          </a>
        )}
        <button
          type="button"
          onClick={() => decidir('deny')}
          disabled={enviando}
          className={`${ds.button('outline')} w-full justify-center`}
        >
          Voltar para {nomeAssistente}
        </button>
      </Moldura>
    )
  }

  const itens: Array<{ icone: typeof ChartBarIcon; texto: string }> = [
    { icone: ChartBarIcon, texto: 'Leads, funil, vendas, vendedores, tarefas e estoque' },
    { icone: ChatBubbleLeftRightIcon, texto: 'Métricas de atendimento no WhatsApp (tempos, ligações, follow-up)' },
  ]
  if (config.permite_conteudo_chat) {
    itens.push({
      icone: ChatBubbleLeftRightIcon,
      texto: 'Conteúdo das conversas de WhatsApp (liberado pela loja)',
    })
  }

  return (
    <Moldura>
      <div className="flex items-center justify-center gap-3 mb-4">
        {detalhes.client.logo_uri ? (
          <img src={detalhes.client.logo_uri} alt="" className="h-10 w-10 rounded-lg object-contain" />
        ) : (
          <ShieldCheckIcon className="h-10 w-10 text-orange-500" />
        )}
      </div>
      <h1 className="text-lg font-semibold text-gray-900 text-center">
        {nomeAssistente} quer acessar o Aucta CRM
      </h1>
      <p className="text-center text-sm text-gray-600 mt-1 mb-6">
        Loja <span className="font-medium text-gray-900">{empresaNome ?? '—'}</span> ·{' '}
        {detalhes.user.email}
      </p>

      <p className="text-sm font-medium text-gray-900 mb-2">O assistente poderá consultar:</p>
      <ul className="space-y-2 mb-4">
        {itens.map(({ icone: Icone, texto }) => (
          <li key={texto} className="flex items-start gap-2 text-sm text-gray-700">
            <Icone className="h-5 w-5 flex-shrink-0 text-orange-500" />
            <span>{texto}</span>
          </li>
        ))}
      </ul>

      <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 mb-6 space-y-1.5 text-xs text-gray-600">
        <p className="flex items-start gap-2">
          <EyeSlashIcon className="h-4 w-4 flex-shrink-0" />
          Somente leitura: o assistente não altera nenhum dado. Telefones e documentos são ocultados.
        </p>
        <p>
          Os dados consultados são enviados ao provedor do assistente ({nomeAssistente}). Você pode
          revogar o acesso a qualquer momento desligando a integração no CRM.
        </p>
        {detalhes.redirect_uri && (
          <p className="break-all text-gray-500">Retorno para: {detalhes.redirect_uri}</p>
        )}
      </div>

      <div className="flex flex-col-reverse sm:flex-row gap-3">
        <button
          type="button"
          onClick={() => decidir('deny')}
          disabled={enviando}
          className={`${ds.button('outline')} flex-1 justify-center`}
        >
          Negar
        </button>
        <button
          type="button"
          onClick={() => decidir('approve')}
          disabled={enviando}
          className={`${ds.button('primary')} flex-1 justify-center`}
        >
          Permitir acesso
        </button>
      </div>
    </Moldura>
  )
}
