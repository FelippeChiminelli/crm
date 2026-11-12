import type { RuleSentence } from '../formatters/ruleSentence'

interface RuleSentenceViewProps {
  sentence: RuleSentence
  /** Versão de uma linha por parte, usada nos cards da lista. */
  compact?: boolean
}

function Keyword({ children }: { children: string }) {
  return (
    <span className="inline-flex w-14 flex-shrink-0 justify-center rounded-md bg-primary-50 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary-700">
      {children}
    </span>
  )
}

/** Regra escrita como frase: "Quando ... / Se ... / Então ...". */
export function RuleSentenceView({ sentence, compact = false }: RuleSentenceViewProps) {
  const textClass = compact ? 'truncate' : ''
  const actions = sentence.actions.length > 0 ? sentence.actions : ['nenhuma ação configurada']

  return (
    <div className="space-y-1.5 text-sm text-gray-700">
      <div className="flex items-start gap-2">
        <Keyword>Quando</Keyword>
        <span className={`min-w-0 ${textClass}`}>{sentence.when}</span>
      </div>
      <div className="flex items-start gap-2">
        <Keyword>Se</Keyword>
        <span className={`min-w-0 ${textClass} ${sentence.hasConditions ? '' : 'text-gray-500'}`}>{sentence.conditions}</span>
      </div>
      <div className="flex items-start gap-2">
        <Keyword>Então</Keyword>
        {compact || actions.length === 1 ? (
          <span className={`min-w-0 ${textClass}`}>{actions.join(' • ')}</span>
        ) : (
          <ol className="min-w-0 list-decimal space-y-0.5 pl-4">
            {actions.map((text, i) => <li key={i}>{text}</li>)}
          </ol>
        )}
      </div>
    </div>
  )
}
