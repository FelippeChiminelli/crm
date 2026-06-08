// Temas de cor para os "balões laterais" de cada seção do modal de detalhes do lead.
// Centraliza a paleta para manter consistência visual e hierarquia entre as seções.

export type SectionThemeName =
  | 'orange'
  | 'indigo'
  | 'purple'
  | 'red'
  | 'green'
  | 'amber'
  | 'emerald'
  | 'slate'

export interface SectionTheme {
  // Faixa/etiqueta vertical (o "balão" na lateral esquerda)
  strip: string
  stripText: string
  // Cor de destaque do ícone/texto quando o balão está inativo
  accentText: string
  // Borda e leve tom de fundo do card quando em destaque (modo edição)
  border: string
  activeBorder: string
  activeBg: string
}

export const sectionThemes: Record<SectionThemeName, SectionTheme> = {
  orange: {
    strip: 'bg-gradient-to-b from-orange-500 to-orange-600',
    stripText: 'text-white',
    accentText: 'text-orange-600',
    border: 'border-gray-200',
    activeBorder: 'border-orange-300',
    activeBg: 'bg-orange-50/40',
  },
  indigo: {
    strip: 'bg-gradient-to-b from-indigo-500 to-indigo-600',
    stripText: 'text-white',
    accentText: 'text-indigo-600',
    border: 'border-gray-200',
    activeBorder: 'border-indigo-300',
    activeBg: 'bg-indigo-50/40',
  },
  purple: {
    strip: 'bg-gradient-to-b from-purple-500 to-purple-600',
    stripText: 'text-white',
    accentText: 'text-purple-600',
    border: 'border-gray-200',
    activeBorder: 'border-purple-300',
    activeBg: 'bg-purple-50/40',
  },
  red: {
    strip: 'bg-gradient-to-b from-red-500 to-red-600',
    stripText: 'text-white',
    accentText: 'text-red-600',
    border: 'border-red-200',
    activeBorder: 'border-red-300',
    activeBg: 'bg-red-50/40',
  },
  green: {
    strip: 'bg-gradient-to-b from-green-500 to-green-600',
    stripText: 'text-white',
    accentText: 'text-green-600',
    border: 'border-green-200',
    activeBorder: 'border-green-300',
    activeBg: 'bg-green-50/40',
  },
  amber: {
    strip: 'bg-gradient-to-b from-amber-500 to-amber-600',
    stripText: 'text-white',
    accentText: 'text-amber-600',
    border: 'border-gray-200',
    activeBorder: 'border-amber-300',
    activeBg: 'bg-amber-50/40',
  },
  emerald: {
    strip: 'bg-gradient-to-b from-emerald-500 to-emerald-600',
    stripText: 'text-white',
    accentText: 'text-emerald-600',
    border: 'border-gray-200',
    activeBorder: 'border-emerald-300',
    activeBg: 'bg-emerald-50/40',
  },
  slate: {
    strip: 'bg-gradient-to-b from-slate-500 to-slate-600',
    stripText: 'text-white',
    accentText: 'text-slate-600',
    border: 'border-gray-200',
    activeBorder: 'border-slate-300',
    activeBg: 'bg-slate-50/60',
  },
}
