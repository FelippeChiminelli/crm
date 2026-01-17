import { useState, useEffect } from 'react'

/**
 * Hook para detectar breakpoints de media queries
 * Útil para renderização condicional baseada em tamanho de tela
 * 
 * @param query - Media query string (ex: '(max-width: 640px)')
 * @returns boolean indicando se a media query corresponde
 * 
 * @example
 * const isMobile = useMediaQuery('(max-width: 640px)')
 * const isTablet = useMediaQuery('(min-width: 641px) and (max-width: 1024px)')
 * const isDesktop = useMediaQuery('(min-width: 1025px)')
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    // Evita erro de SSR verificando se window existe
    if (typeof window === 'undefined') return false
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    // Verificação de SSR
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia(query)
    
    // Handler para mudanças na media query
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    // Define estado inicial
    setMatches(mediaQuery.matches)

    // Adiciona listener (usa addEventListener para navegadores modernos)
    mediaQuery.addEventListener('change', handleChange)

    // Cleanup
    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [query])

  return matches
}

/**
 * Breakpoints pré-definidos seguindo padrão Tailwind
 */
export const breakpoints = {
  mobile: '(max-width: 639px)',       // < 640px
  tablet: '(min-width: 640px) and (max-width: 1023px)', // 640-1023px
  desktop: '(min-width: 1024px)',     // >= 1024px
  sm: '(min-width: 640px)',           // >= 640px
  md: '(min-width: 768px)',           // >= 768px
  lg: '(min-width: 1024px)',          // >= 1024px
  xl: '(min-width: 1280px)',          // >= 1280px
  '2xl': '(min-width: 1536px)',       // >= 1536px
} as const

/**
 * Hooks de conveniência para breakpoints comuns
 */
export function useIsMobile() {
  return useMediaQuery(breakpoints.mobile)
}

export function useIsTablet() {
  return useMediaQuery(breakpoints.tablet)
}

export function useIsDesktop() {
  return useMediaQuery(breakpoints.desktop)
}
