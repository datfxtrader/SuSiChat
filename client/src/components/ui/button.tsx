import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { THEME } from '@/lib/theme'

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const buttonVariants = cva(
  `inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed ${THEME.text.secondary}`,
  {
    variants: {
      variant: {
        default: `bg-gradient-to-r ${THEME.accent.primary} hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl`,
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: `${THEME.border.secondary} ${THEME.bg.interactive} hover:${THEME.bg.hover} ${THEME.text.tertiary} hover:${THEME.text.secondary} hover:${THEME.border.hover} border`,
        secondary: `${THEME.bg.interactive} hover:${THEME.bg.hover} ${THEME.text.secondary} ${THEME.border.secondary} border`,
        ghost: `hover:${THEME.bg.hover} ${THEME.text.tertiary} hover:${THEME.text.secondary}`,
        link: "text-primary underline-offset-4 hover:underline"
      },
      size: {
        default: 'px-4 py-2 rounded-lg text-sm',
        sm: 'px-2 py-1 rounded-md text-xs',
        lg: 'px-6 py-3 rounded-lg text-base',
        icon: "h-10 w-10"
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }