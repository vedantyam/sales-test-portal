import { cn } from '../../lib/utils'

type BadgeVariant = 'gray' | 'blue' | 'green' | 'yellow' | 'red' | 'purple'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}

export default function Badge({ children, variant = 'gray', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        {
          'bg-gray-100 text-gray-800': variant === 'gray',
          'bg-blue-100 text-blue-800': variant === 'blue',
          'bg-green-100 text-green-800': variant === 'green',
          'bg-yellow-100 text-yellow-800': variant === 'yellow',
          'bg-red-100 text-red-800': variant === 'red',
          'bg-purple-100 text-purple-800': variant === 'purple',
        },
        className
      )}
    >
      {children}
    </span>
  )
}
