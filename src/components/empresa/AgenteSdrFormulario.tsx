import type { Dispatch, SetStateAction } from 'react'
import { ds } from '../../utils/designSystem'
import { Campo, Secao } from './secaoFormulario'
import { PerguntasAgenteEditor } from './PerguntasAgenteEditor'
import type { FormAgenteSdr } from '../../services/sdrAgentService'

type Texto = {
  [Chave in keyof FormAgenteSdr]: FormAgenteSdr[Chave] extends string ? Chave : never
}[keyof FormAgenteSdr]

type Props = {
  form: FormAgenteSdr
  setForm: Dispatch<SetStateAction<FormAgenteSdr>>
}

export function AgenteSdrFormulario({ form, setForm }: Props) {
  const input = ds.input()
  const area = `${input} min-h-[72px]`
  const set = (chave: Texto, valor: string) => {
    setForm((atual) => ({ ...atual, [chave]: valor }))
  }

  return (
    <div className="space-y-6">
      <Secao titulo="Persona" descricao="Quem fala com o cliente e o tom da conversa.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Campo label="Nome do agente">
            <input className={input} value={form.nome} onChange={(evento) => set('nome', evento.target.value)} />
          </Campo>
          <Campo label="Tom">
            <input className={input} value={form.tom} onChange={(evento) => set('tom', evento.target.value)} />
          </Campo>
        </div>
        <Campo label="Saudação" hint="Enviada exatamente na primeira mensagem. Use {nome_opcional}, {persona.nome} e {persona.empresa}.">
          <textarea className={area} value={form.saudacao} onChange={(evento) => set('saudacao', evento.target.value)} />
        </Campo>
        <Campo label="Objetivo" hint="O que o agente deve alcançar na conversa. Até 1000 caracteres.">
          <textarea className={area} maxLength={1000} value={form.objetivo} onChange={(evento) => set('objetivo', evento.target.value)} />
        </Campo>
        <Campo label="Informações adicionais" hint="Contexto extra sobre o agente ou o atendimento. Até 2000 caracteres.">
          <textarea
            className={area}
            maxLength={2000}
            value={form.informacoesAdicionais}
            onChange={(evento) => set('informacoesAdicionais', evento.target.value)}
          />
          <span className="block text-xs text-gray-400">{form.informacoesAdicionais.length}/2000</span>
        </Campo>
      </Secao>

      <Secao titulo="Empresa" descricao="Dados que entram na seção Sobre a empresa.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Campo label="Nome">
            <input className={input} value={form.empresa} onChange={(evento) => set('empresa', evento.target.value)} />
          </Campo>
          <Campo label="Cidade">
            <input className={input} value={form.cidadeLoja} onChange={(evento) => set('cidadeLoja', evento.target.value)} />
          </Campo>
        </div>
        <Campo label="Endereço">
          <input className={input} value={form.endereco} onChange={(evento) => set('endereco', evento.target.value)} />
        </Campo>
        <Campo label="O que faz" hint="Até 1000 caracteres.">
          <textarea className={area} maxLength={1000} value={form.oQueFaz} onChange={(evento) => set('oQueFaz', evento.target.value)} />
        </Campo>
        <Campo label="Serviços e produtos" hint="Até 1000 caracteres.">
          <textarea className={area} maxLength={1000} value={form.servicos} onChange={(evento) => set('servicos', evento.target.value)} />
        </Campo>
        <Campo label="Público-alvo" hint="Até 1000 caracteres.">
          <textarea className={area} maxLength={1000} value={form.publicoAlvo} onChange={(evento) => set('publicoAlvo', evento.target.value)} />
        </Campo>
      </Secao>

      <Secao titulo="Regras gerais" descricao="As regras fixas do agente prevalecem sobre este texto.">
        <Campo label="Texto" hint="Até 4000 caracteres. Se precisar citar alguém da equipe, escreva o nome aqui.">
          <textarea
            className={area}
            maxLength={4000}
            value={form.regrasGerais}
            onChange={(evento) => set('regrasGerais', evento.target.value)}
          />
          <span className="block text-xs text-gray-400">{form.regrasGerais.length}/4000</span>
        </Campo>
      </Secao>

      <Secao titulo="Restrições" descricao="O que o agente não deve fazer. Uma por linha.">
        <textarea className={area} value={form.proibido} onChange={(evento) => set('proibido', evento.target.value)} />
      </Secao>

      <Secao titulo="Funil de atendimento" descricao="Passo a passo da conversa.">
        <Campo label="Texto" hint="Até 4000 caracteres.">
          <textarea
            className={area}
            maxLength={4000}
            value={form.funil}
            onChange={(evento) => set('funil', evento.target.value)}
          />
          <span className="block text-xs text-gray-400">{form.funil.length}/4000</span>
        </Campo>
      </Secao>

      <Secao titulo="Perguntas" descricao="A ordem é só preferência. O serviço faz uma pergunta por vez.">
        <PerguntasAgenteEditor
          perguntas={form.perguntas}
          onChange={(perguntas) => setForm((atual) => ({ ...atual, perguntas }))}
          inputClass={input}
          areaClass={area}
        />
      </Secao>

      <Secao titulo="Quando o cliente muda de assunto">
        <Campo label="Acolhimento de dúvida" hint="Uma frase por linha.">
          <textarea className={area} value={form.acolhimentos} onChange={(evento) => set('acolhimentos', evento.target.value)} />
        </Campo>
        <Campo label="Encaminhar o atendimento">
          <textarea className={area} value={form.encaminhamentos} onChange={(evento) => set('encaminhamentos', evento.target.value)} />
        </Campo>
        <Campo label="Quando falam de preço">
          <input className={input} value={form.respostaValores} onChange={(evento) => set('respostaValores', evento.target.value)} />
        </Campo>
        <Campo label="Mensagem de encerramento">
          <textarea className={area} value={form.textoEncerramento} onChange={(evento) => set('textoEncerramento', evento.target.value)} />
        </Campo>
      </Secao>

      <Secao titulo="Entrega" descricao="Recebe o relatório quando o atendimento termina.">
        <Campo label="Webhook de finalização">
          <input className={input} value={form.webhook} onChange={(evento) => set('webhook', evento.target.value)} />
        </Campo>
      </Secao>
    </div>
  )
}
