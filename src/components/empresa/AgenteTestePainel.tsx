import type { RespostaTurnoTeste, TokensTeste } from '../../services/agenteTesteService'

type Props = {
  ultima: RespostaTurnoTeste | null
}

function valorDoCampo(valor: unknown): string {
  if (valor === null || valor === undefined || valor === '') return '—'
  if (typeof valor === 'boolean') return valor ? 'sim' : 'não'
  return String(valor)
}

function LinhaTokens({ titulo, tokens }: { titulo: string; tokens: TokensTeste }) {
  return (
    <div className="flex items-center justify-between text-xs text-gray-600">
      <span>{titulo}</span>
      <span className="font-mono">
        {tokens.entrada.toLocaleString('pt-BR')} + {tokens.saida.toLocaleString('pt-BR')} ={' '}
        <strong className="text-gray-900">{tokens.total.toLocaleString('pt-BR')}</strong>
      </span>
    </div>
  )
}

export function AgenteTestePainel({ ultima }: Props) {
  if (!ultima) {
    return <p className="text-sm text-gray-500">Mande a primeira mensagem para ver os campos e os tokens.</p>
  }
  const coletados = Object.entries(ultima.lead).filter(([, valor]) => valor !== null && valor !== '')

  return (
    <div className="space-y-5">
      <section>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Coletados</h4>
        {coletados.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum ainda.</p>
        ) : (
          <dl className="space-y-1">
            {coletados.map(([campo, valor]) => (
              <div key={campo} className="flex justify-between gap-3 text-sm">
                <dt className="text-gray-500">{campo}</dt>
                <dd className="text-gray-900 font-medium text-right break-words">{valorDoCampo(valor)}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <section>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Pendentes</h4>
        {ultima.pendentes.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {ultima.pendentes.map((campo) => (
              <span key={campo} className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 text-xs">
                {campo}
              </span>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-1">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
          Tokens (entrada + saída)
        </h4>
        <LinhaTokens titulo="Última mensagem" tokens={ultima.tokens_turno} />
        <LinhaTokens titulo="Conversa toda" tokens={ultima.tokens_sessao} />
      </section>

      {ultima.relatorio && (
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
            Relatório que iria para o webhook
          </h4>
          <pre className="text-xs whitespace-pre-wrap bg-gray-50 border border-gray-200 rounded p-3 text-gray-800">
            {ultima.relatorio}
          </pre>
        </section>
      )}
    </div>
  )
}
