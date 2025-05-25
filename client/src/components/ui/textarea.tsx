import * as React from "react"

import { cn } from "@/lib/utils"
import { THEME } from '@/lib/theme';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const textareaStyles = cn(
  `w-full ${THEME.bg.tertiary} ${THEME.border.secondary} border rounded-lg px-3 py-2`,
  `${THEME.text.secondary} placeholder:${THEME.text.muted}`,
  `focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:${THEME.border.hover} transition-all`
);

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }