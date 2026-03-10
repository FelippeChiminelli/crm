import AuctaLogo from '../../assets/logo-aucta.svg'

type BrandLoaderVariant = 'fullscreen' | 'overlay' | 'inline'
type BrandLoaderSize = 'sm' | 'md' | 'lg'

interface BrandLoaderProps {
  variant?: BrandLoaderVariant
  text?: string
  showProgressBar?: boolean
  size?: BrandLoaderSize
}

const sizeClasses: Record<BrandLoaderSize, string> = {
  sm: 'h-12 w-12',
  md: 'h-20 w-20',
  lg: 'h-28 w-28',
}

const defaultSizeByVariant: Record<BrandLoaderVariant, BrandLoaderSize> = {
  fullscreen: 'lg',
  overlay: 'md',
  inline: 'sm',
}

const containerClasses: Record<BrandLoaderVariant, string> = {
  fullscreen: 'fixed inset-0 z-[9999] flex items-center justify-center bg-gray-50 brand-fadein',
  overlay: 'absolute inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-lg brand-fadein',
  inline: 'flex items-center justify-center py-6 brand-fadein',
}

export function BrandLoader({
  variant = 'fullscreen',
  text,
  showProgressBar,
  size,
}: BrandLoaderProps) {
  const resolvedSize = size ?? defaultSizeByVariant[variant]
  const resolvedShowBar = showProgressBar ?? (variant === 'fullscreen' || variant === 'overlay')

  return (
    <div className={containerClasses[variant]}>
      <div className="flex flex-col items-center gap-5">
        <div className="brand-pulse">
          <img
            src={AuctaLogo}
            alt="Aucta"
            className={`${sizeClasses[resolvedSize]} object-contain brand-glow`}
          />
        </div>

        {resolvedShowBar && (
          <div className="w-44 h-1.5 rounded-full bg-gray-200 overflow-hidden">
            <div className="h-full rounded-full brand-progress" />
          </div>
        )}

        {text && (
          <p className="text-sm text-gray-500 font-medium brand-text-fadein">
            {text}
          </p>
        )}
      </div>
    </div>
  )
}

export default BrandLoader
