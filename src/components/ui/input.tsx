import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-sm border-2 border-brutal-ink bg-background px-3 py-1 text-base font-bold shadow-[2px_2px_0_var(--brutal-ink)] transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground placeholder:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-brutal-ink focus-visible:shadow-[4px_4px_0_var(--brutal-ink)] focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-foreground",
        "aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
