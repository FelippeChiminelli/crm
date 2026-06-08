import { sectionThemes, type SectionThemeName } from './sectionThemes'

export interface SectionNavItem {
  id: string
  label: string
  icon: React.ElementType
  theme: SectionThemeName
}

interface SectionNavProps {
  items: SectionNavItem[]
  activeId: string
  onSelect: (id: string) => void
  orientation: 'vertical' | 'horizontal'
}

/**
 * Navegação por "balões" das áreas do lead.
 * - vertical (desktop): balões redondos flutuantes fora do modal, mostrando
 *   apenas o ícone; ao passar o mouse, o balão se abre revelando o rótulo.
 * - horizontal (mobile): abas roláveis no topo do conteúdo, com ícone + rótulo.
 */
export function SectionNav({ items, activeId, onSelect, orientation }: SectionNavProps) {
  const isVertical = orientation === 'vertical'

  return (
    <div className={isVertical ? 'flex flex-col gap-3 items-end' : 'flex gap-2 overflow-x-auto pb-1 -mx-1 px-1'}>
      {items.map((item) => {
        const t = sectionThemes[item.theme]
        const isActive = item.id === activeId
        const Icon = item.icon

        if (isVertical) {
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              title={item.label}
              className={`group flex items-center rounded-full shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl ${
                isActive ? `${t.strip} ${t.stripText}` : 'bg-white'
              }`}
            >
              <span className="flex items-center justify-center w-14 h-14 lg:w-16 lg:h-16 flex-shrink-0">
                <Icon className={`w-6 h-6 lg:w-7 lg:h-7 ${isActive ? t.stripText : t.accentText}`} />
              </span>
              <span
                className={`max-w-0 group-hover:max-w-[220px] overflow-hidden whitespace-nowrap transition-[max-width] duration-300 text-sm font-semibold ${
                  isActive ? t.stripText : 'text-gray-700'
                }`}
              >
                <span className="pr-5">{item.label}</span>
              </span>
            </button>
          )
        }

        return (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            title={item.label}
            className={`inline-flex items-center gap-2 rounded-full pl-2 pr-3 py-2 shadow-sm transition-all whitespace-nowrap flex-shrink-0 ${
              isActive ? `${t.strip} ${t.stripText}` : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span className={`flex items-center justify-center w-6 h-6 rounded-full flex-shrink-0 ${isActive ? 'bg-white/25' : t.strip}`}>
              <Icon className={`w-3.5 h-3.5 ${t.stripText}`} />
            </span>
            <span className="text-xs font-semibold">{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}
