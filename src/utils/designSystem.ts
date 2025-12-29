import { clsx, type ClassValue } from 'clsx'

// Função utilitária para combinar classes CSS
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export const designSystem = {
  // Cores baseadas na identidade visual (laranja, cinza, preto)
  colors: {
    primary: {
      50: 'orange-50',
      100: 'orange-100', 
      500: 'orange-500',
      600: 'orange-600',
      700: 'orange-700',
    },
    secondary: {
      50: 'gray-50',
      100: 'gray-100',
      400: 'gray-400',
      500: 'gray-500',
      600: 'gray-600',
      700: 'gray-700',
      800: 'gray-800',
      900: 'gray-900',
    },
    accent: {
      black: 'black',
      white: 'white',
    },
    status: {
      success: 'green-500',
      warning: 'yellow-500', 
      error: 'red-500',
      info: 'blue-500',
    }
  },

  // Layout padrão consistente
  layout: {
    page: {
      container: 'h-full flex flex-col',
      content: 'flex-1 min-h-0 p-1.5 sm:p-1.5 lg:p-1.5',
      spacing: 'space-y-3'
    },
  card: {
    base: 'bg-white rounded-lg shadow border border-gray-100',
    padding: 'p-0',
    hover: 'hover:shadow-md transition-shadow duration-200'
  },
    header: {
      container: 'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 h-[52px]',
      title: 'text-xl sm:text-2xl font-bold text-gray-900',
      subtitle: 'text-sm sm:text-base text-gray-600',
      action: 'inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors duration-200 text-sm font-medium'
    }
  },

  // Componentes padrão
  components: {
    button: {
      primary: 'inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 focus:ring-2 focus:ring-orange-200 transition-all duration-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed',
      secondary: 'inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 focus:ring-2 focus:ring-gray-200 transition-all duration-200 text-sm font-medium',
      outline: 'inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-orange-200 transition-all duration-200 text-sm font-medium',
      ghost: 'inline-flex items-center gap-2 px-4 py-2 text-gray-700 rounded-lg hover:bg-gray-100 focus:ring-2 focus:ring-gray-200 transition-all duration-200 text-sm font-medium'
    },
    input: {
      base: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-500 transition-all duration-200 text-sm',
      error: 'border-red-300 focus:ring-red-200 focus:border-red-500'
    },
    modal: {
      overlay: 'fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center p-4',
      container: 'bg-white rounded-xl shadow-2xl overflow-hidden',
      header: 'flex items-center justify-between p-6 border-b border-gray-200',
      title: 'text-lg font-semibold text-gray-900',
      content: 'p-6 overflow-y-auto',
      footer: 'flex items-center gap-3 p-6 border-t border-gray-200 bg-gray-50'
    },
    stats: {
      container: 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4',
      card: 'bg-white rounded-lg shadow border border-gray-100 p-3 sm:p-4',
      icon: 'w-8 h-8 p-1.5 rounded-lg',
      value: 'text-xl sm:text-2xl font-bold text-gray-900 mt-1',
      label: 'text-sm text-gray-600'
    }
  },

  // Estados visuais
  states: {
    loading: 'animate-pulse bg-gray-200 rounded',
    disabled: 'opacity-50 cursor-not-allowed',
    error: 'border-red-300 bg-red-50 text-red-700',
    success: 'border-green-300 bg-green-50 text-green-700'
  },

  // Responsividade
  responsive: {
    padding: {
      mobile: 'p-3',
      tablet: 'sm:p-4', 
      desktop: 'lg:p-6'
    },
    text: {
      small: 'text-xs sm:text-sm',
      base: 'text-sm sm:text-base',
      large: 'text-base sm:text-lg',
      title: 'text-lg sm:text-xl lg:text-2xl'
    },
    gap: {
      small: 'gap-2 sm:gap-3',
      base: 'gap-3 sm:gap-4',
      large: 'gap-4 sm:gap-6'
    }
  }
}

// Utilitários para aplicar o design system
export const ds = {
  page: () => designSystem.layout.page.container,
  pageContent: () => `${designSystem.layout.page.content} ${designSystem.layout.page.spacing}`,
  card: (hover = false) => `${designSystem.layout.card.base} ${designSystem.layout.card.padding}${hover ? ` ${designSystem.layout.card.hover}` : ''}`,
  button: (variant: 'primary' | 'secondary' | 'outline' | 'ghost' = 'primary') => designSystem.components.button[variant],
  input: (hasError = false) => `${designSystem.components.input.base}${hasError ? ` ${designSystem.components.input.error}` : ''}`,
  header: () => designSystem.layout.header.container,
  headerTitle: () => designSystem.layout.header.title,
  headerSubtitle: () => designSystem.layout.header.subtitle,
  headerAction: () => designSystem.layout.header.action,
  modal: {
    overlay: () => designSystem.components.modal.overlay,
    container: () => designSystem.components.modal.container,
    header: () => designSystem.components.modal.header,
    title: () => designSystem.components.modal.title,
    content: () => designSystem.components.modal.content,
    footer: () => designSystem.components.modal.footer
  },
  stats: {
    container: () => designSystem.components.stats.container,
    card: () => designSystem.components.stats.card,
    icon: (color: string) => `${designSystem.components.stats.icon} ${color}`,
    value: () => designSystem.components.stats.value,
    label: () => designSystem.components.stats.label
  }
}

// Cores específicas para diferentes contextos
export const statusColors = {
  success: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', icon: 'text-green-500' },
  warning: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', icon: 'text-yellow-500' },
  error: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: 'text-red-500' },
  info: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: 'text-blue-500' },
  primary: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', icon: 'text-orange-500' },
  secondary: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', icon: 'text-gray-500' }
}

// Ícones para status de tarefas e leads (mantendo a consistência)
export const statusIcons = {
  task: {
    pendente: { emoji: '⏳', color: 'text-gray-500' },
    em_andamento: { emoji: '🔄', color: 'text-orange-500' },
    concluida: { emoji: '✅', color: 'text-green-500' },
    atrasada: { emoji: '⚠️', color: 'text-red-500' },
    cancelada: { emoji: '❌', color: 'text-gray-400' }
  },
  priority: {
    baixa: { emoji: '🔹', color: 'text-gray-500' },
    media: { emoji: '🔸', color: 'text-orange-500' },
    alta: { emoji: '🔴', color: 'text-red-500' },
    urgente: { emoji: '🚨', color: 'text-red-600' }
  },
  lead: {
    quente: { emoji: '🔥', color: 'text-red-500' },
    morno: { emoji: '🌡️', color: 'text-yellow-500' },
    frio: { emoji: '❄️', color: 'text-blue-500' }
  }
} 