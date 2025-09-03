import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../utils/designSystem'

const cardVariants = cva('flex flex-col items-stretch text-card-foreground rounded-xl', {
  variants: {
    variant: {
      default: 'bg-card border border-border shadow-xs black/5',
      accent: 'bg-muted shadow-xs p-1',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
})

const cardHeaderVariants = cva('flex items-center justify-between flex-wrap px-5 min-h-14 gap-2.5', {
  variants: {
    variant: {
      default: 'border-b border-border',
      accent: '',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
})

const cardContentVariants = cva('grow p-5', {
  variants: {
    variant: {
      default: '',
      accent: 'bg-card rounded-t-xl [&:last-child]:rounded-b-xl',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
})

const cardFooterVariants = cva('flex items-center px-5 min-h-14', {
  variants: {
    variant: {
      default: 'border-t border-border',
      accent: 'bg-card rounded-b-xl mt-[2px]',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
})

// Card Component
function Card({
  className,
  variant = 'default',
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof cardVariants>) {
  return (
    <div className={cn(cardVariants({ variant }), className)} {...props} />
  )
}

// CardHeader Component
function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(cardHeaderVariants({ variant: 'default' }), className)} {...props} />
}

// CardContent Component
function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(cardContentVariants({ variant: 'default' }), className)} {...props} />
}

// CardFooter Component
function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(cardFooterVariants({ variant: 'default' }), className)} {...props} />
}

// CardTitle Component
function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('text-base font-semibold leading-none tracking-tight', className)}
      {...props}
    />
  )
}

// Exports
export { Card, CardContent, CardFooter, CardHeader, CardTitle } 