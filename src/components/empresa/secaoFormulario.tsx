import type { ReactNode } from 'react'

export function Secao({
  titulo,
  descricao,
  children,
}: {
  titulo: string
  descricao?: string
  children: ReactNode
}) {
  return (
    <section className="space-y-3 rounded-lg border border-gray-200 p-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">{titulo}</h3>
        {descricao ? <p className="mt-1 text-xs text-gray-500">{descricao}</p> : null}
      </div>
      {children}
    </section>
  )
}

export function Campo({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-gray-800">{label}</span>
      {hint ? <span className="block text-xs text-gray-500">{hint}</span> : null}
      {children}
    </label>
  )
}
