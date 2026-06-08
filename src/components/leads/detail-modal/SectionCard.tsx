import type { ReactNode } from 'react'
import { sectionThemes, type SectionThemeName } from './sectionThemes'

interface SectionCardProps {
  title: string
  theme: SectionThemeName
  icon: React.ElementType
  children: ReactNode
  // Destaque (ex.: modo edição) intensifica borda e fundo do card
  active?: boolean
  // Conteúdo opcional no topo (ex.: botões de ação da seção)
  headerRight?: ReactNode
}

/**
 * Card de uma seção do modal de detalhes do lead. A identificação da área
 * (cor/ícone) é reforçada pelos balões de navegação externos (SectionNav);
 * aqui mantemos um cabeçalho horizontal com ícone colorido + título.
 */
export function SectionCard({
  title,
  theme,
  icon: Icon,
  children,
  active = false,
  headerRight,
}: SectionCardProps) {
  const t = sectionThemes[theme]

  return (
    <div
      className={`rounded-xl border bg-white shadow-sm overflow-hidden transition-colors ${
        active ? `${t.activeBorder} ${t.activeBg}` : t.border
      }`}
    >
      <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2.5 border-b border-gray-100">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`p-1.5 rounded-lg flex-shrink-0 ${t.strip}`}>
            <Icon className={`w-4 h-4 ${t.stripText}`} />
          </span>
          <h3 className="text-sm font-semibold text-gray-900 truncate">{title}</h3>
        </div>
        {headerRight && <div className="flex-shrink-0">{headerRight}</div>}
      </div>

      <div className="p-3 sm:p-4">{children}</div>
    </div>
  )
}
