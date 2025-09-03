interface PageContainerProps {
  children: React.ReactNode
  maxWidth?: 'full' | '7xl' | '6xl' | '5xl'
  padding?: boolean
  className?: string
}

export function PageContainer({ 
  children, 
  maxWidth = '7xl',
  padding = true,
  className = ''
}: PageContainerProps) {
  const maxWidthClass = {
    'full': 'max-w-none',
    '7xl': 'max-w-7xl',
    '6xl': 'max-w-6xl', 
    '5xl': 'max-w-5xl'
  }[maxWidth]

  const paddingClass = padding ? 'p-3 lg:p-4' : ''

  return (
    <div className={`h-full flex flex-col ${className}`}>
      <div className={`${maxWidthClass} mx-auto flex-1 min-h-0 ${paddingClass}`}>
        {children}
      </div>
    </div>
  )
} 