import type { ReactNode } from 'react'

interface FilterBlockProps {
  title: string
  /** Qual parte da aba este filtro afeta — é o que evita confusão entre blocos */
  scope: string
  children: ReactNode
  footnote?: ReactNode
}

/**
 * Agrupa um filtro junto do escopo que ele afeta.
 * A aba Chat tem controles com efeitos diferentes (uns valem para os KPIs de
 * tempo, outros só para o Estágio do Atendimento), então cada bloco declara
 * explicitamente onde age.
 */
export function FilterBlock({ title, scope, children, footnote }: FilterBlockProps) {
  return (
    <section className="border border-gray-200 rounded-lg p-4">
      <div className="mb-3">
        <h4 className="text-sm font-medium text-gray-900">{title}</h4>
        <p className="text-xs text-gray-500 mt-0.5">{scope}</p>
      </div>

      {children}

      {footnote && (
        <p className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
          {footnote}
        </p>
      )}
    </section>
  )
}
