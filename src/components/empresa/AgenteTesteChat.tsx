import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowPathIcon, PaperAirplaneIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { ds } from '../../utils/designSystem'
import { AgenteTestePainel } from './AgenteTestePainel'
import {
  enviarMensagemTeste,
  novaSessaoTeste,
  reiniciarSessaoTeste,
  type RespostaTurnoTeste,
} from '../../services/agenteTesteService'

type Mensagem = { id: number; autor: 'cliente' | 'agente' | 'erro'; texto: string }

type Props = {
  agentId: string
  nome: string
  onClose: () => void
}

export function AgenteTesteChat({ agentId, nome, onClose }: Props) {
  const [sessaoId, setSessaoId] = useState(novaSessaoTeste)
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [ultima, setUltima] = useState<RespostaTurnoTeste | null>(null)
  const fimRef = useRef<HTMLDivElement>(null)
  const proximoId = useRef(0)

  useEscapeKey(true, onClose)

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens, enviando])

  const adicionar = (autor: Mensagem['autor'], conteudo: string) => {
    proximoId.current += 1
    const id = proximoId.current
    setMensagens((atuais) => [...atuais, { id, autor, texto: conteudo }])
  }

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault()
    const conteudo = texto.trim()
    if (!conteudo || enviando || ultima?.finalizado) return
    setTexto('')
    adicionar('cliente', conteudo)
    setEnviando(true)
    try {
      const resposta = await enviarMensagemTeste(agentId, sessaoId, conteudo)
      resposta.mensagens.forEach((item) => adicionar('agente', item))
      setUltima(resposta)
    } catch (erro: unknown) {
      adicionar('erro', erro instanceof Error ? erro.message : 'Não foi possível falar com o agente')
    } finally {
      setEnviando(false)
    }
  }

  const reiniciar = () => {
    reiniciarSessaoTeste(sessaoId).catch(() => undefined)
    setSessaoId(novaSessaoTeste())
    setMensagens([])
    setUltima(null)
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />
        <div className="relative bg-white rounded-lg shadow-xl max-w-5xl w-full h-[85vh] flex flex-col overflow-hidden">
          <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 truncate">Testar {nome}</h3>
              <p className="text-xs text-gray-500">
                {ultima
                  ? `Versão ${ultima.versao} · ${ultima.status === 'published' ? 'publicada' : 'rascunho'} · `
                  : ''}
                Nada é enviado para o WhatsApp nem para o webhook.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={reiniciar}
                disabled={enviando}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                <ArrowPathIcon className="w-4 h-4" />
                Reiniciar conversa
              </button>
              <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 flex flex-col md:flex-row">
            <div className="flex-1 min-h-0 flex flex-col bg-gray-50">
              <div className="custom-scrollbar flex-1 overflow-y-auto p-4 space-y-2">
                {mensagens.length === 0 && (
                  <p className="text-sm text-gray-500 text-center mt-8">
                    Escreva como se fosse o cliente chegando pelo WhatsApp.
                  </p>
                )}
                {mensagens.map((item) => (
                  <Bolha key={item.id} mensagem={item} />
                ))}
                {enviando && <p className="text-xs text-gray-400">{nome} está digitando...</p>}
                {ultima?.finalizado && (
                  <div className="text-center text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded py-2">
                    Atendimento finalizado. Reinicie a conversa para testar de novo.
                  </div>
                )}
                <div ref={fimRef} />
              </div>
              <form onSubmit={enviar} className="border-t border-gray-200 bg-white p-3 flex gap-2">
                <input
                  className={ds.input()}
                  value={texto}
                  placeholder={ultima?.finalizado ? 'Atendimento finalizado' : 'Mensagem do cliente'}
                  disabled={enviando || ultima?.finalizado}
                  onChange={(evento) => setTexto(evento.target.value)}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={enviando || !texto.trim() || ultima?.finalizado}
                  className="px-3 rounded-lg bg-primary-600 hover:bg-primary-500 text-white disabled:opacity-50"
                  title="Enviar"
                >
                  <PaperAirplaneIcon className="w-5 h-5" />
                </button>
              </form>
            </div>
            <aside className="custom-scrollbar md:w-80 border-t md:border-t-0 md:border-l border-gray-200 p-4 overflow-y-auto max-h-60 md:max-h-none">
              <AgenteTestePainel ultima={ultima} />
            </aside>
          </div>
        </div>
      </div>
    </div>
  )
}

function Bolha({ mensagem }: { mensagem: Mensagem }) {
  if (mensagem.autor === 'erro') {
    return <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">{mensagem.texto}</div>
  }
  const doCliente = mensagem.autor === 'cliente'
  return (
    <div className={`flex ${doCliente ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[75%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap shadow-sm ${
          doCliente ? 'bg-primary-600 text-white' : 'bg-white text-gray-900 border border-gray-200'
        }`}
      >
        {mensagem.texto}
      </div>
    </div>
  )
}
