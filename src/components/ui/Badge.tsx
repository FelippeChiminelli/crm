import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../utils/designSystem'

const badgeVariants = cva(
  'inline-flex items-center justify-center border border-transparent font-medium focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 [&_svg]:-ms-px [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
        success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-400',
        warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-400',
        info: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-400',
        outline: 'bg-transparent border border-border text-secondary-foreground',
        destructive: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-400',
      },
      appearance: {
        default: '',
        light: '',
        outline: '',
        ghost: 'border-transparent bg-transparent',
      },
      size: {
        lg: 'rounded-md px-[0.5rem] h-7 min-w-7 gap-1.5 text-xs [&_svg]:size-3.5',
        md: 'rounded-md px-[0.45rem] h-6 min-w-6 gap-1.5 text-xs [&_svg]:size-3.5',
        sm: 'rounded-sm px-[0.325rem] h-5 min-w-5 gap-1 text-[0.6875rem] leading-[0.75rem] [&_svg]:size-3',
        xs: 'rounded-sm px-[0.25rem] h-4 min-w-4 gap-1 text-[0.625rem] leading-[0.5rem] [&_svg]:size-3',
      },
      shape: {
        default: '',
        circle: 'rounded-full',
      },
    },
    compoundVariants: [
      /* Light */
      {
        variant: 'primary',
        appearance: 'light',
        className: 'text-blue-700 bg-blue-50 dark:bg-blue-950 dark:text-blue-600',
      },
      {
        variant: 'secondary',
        appearance: 'light',
        className: 'bg-secondary dark:bg-secondary/50 text-secondary-foreground',
      },
      {
        variant: 'success',
        appearance: 'light',
        className: 'text-green-800 bg-green-100 dark:bg-green-950 dark:text-green-600',
      },
      {
        variant: 'warning',
        appearance: 'light',
        className: 'text-yellow-700 bg-yellow-100 dark:bg-yellow-950 dark:text-yellow-600',
      },
      {
        variant: 'info',
        appearance: 'light',
        className: 'text-blue-700 bg-blue-100 dark:bg-blue-950 dark:text-blue-400',
      },
      {
        variant: 'destructive',
        appearance: 'light',
        className: 'text-red-700 bg-red-50 dark:bg-red-950 dark:text-red-600',
      },
      /* Outline */
      {
        variant: 'primary',
        appearance: 'outline',
        className: 'text-blue-700 border-blue-100 bg-blue-50 dark:bg-blue-950 dark:border-blue-900 dark:text-blue-600',
      },
      {
        variant: 'success',
        appearance: 'outline',
        className: 'text-green-700 border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-900 dark:text-green-600',
      },
      {
        variant: 'warning',
        appearance: 'outline',
        className: 'text-yellow-700 border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-900 dark:text-yellow-600',
      },
      {
        variant: 'info',
        appearance: 'outline',
        className: 'text-blue-700 border-blue-100 bg-blue-50 dark:bg-blue-950 dark:border-blue-900 dark:text-blue-400',
      },
      {
        variant: 'destructive',
        appearance: 'outline',
        className: 'text-red-700 border-red-100 bg-red-50 dark:bg-red-950 dark:border-red-900 dark:text-red-600',
      },
      /* Ghost */
      {
        variant: 'primary',
        appearance: 'ghost',
        className: 'text-primary',
      },
      {
        variant: 'secondary',
        appearance: 'ghost',
        className: 'text-secondary-foreground',
      },
      {
        variant: 'success',
        appearance: 'ghost',
        className: 'text-green-500',
      },
      {
        variant: 'warning',
        appearance: 'ghost',
        className: 'text-yellow-500',
      },
      {
        variant: 'info',
        appearance: 'ghost',
        className: 'text-blue-500',
      },
      {
        variant: 'destructive',
        appearance: 'ghost',
        className: 'text-red-500',
      },

      { size: 'lg', appearance: 'ghost', className: 'px-0' },
      { size: 'md', appearance: 'ghost', className: 'px-0' },
      { size: 'sm', appearance: 'ghost', className: 'px-0' },
      { size: 'xs', appearance: 'ghost', className: 'px-0' },
    ],
    defaultVariants: {
      variant: 'primary',
      appearance: 'default',
      size: 'md',
    },
  },
)

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {
  asChild?: boolean
  dotClassName?: string
  disabled?: boolean
}

export function Badge({
  className,
  variant,
  size,
  appearance,
  shape,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(badgeVariants({ variant, size, appearance, shape }), className)}
      {...props}
    />
  )
} 