"use client"

import * as React from "react"
import { Checkbox as CheckboxPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer size-5 shrink-0 rounded-none border-2 border-foreground transition-shadow outline-none focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-foreground disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-foreground data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="square" strokeLinejoin="miter" className="size-3.5">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
