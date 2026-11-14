import * as React from "react"
import { cn } from "../shared/utils"
import { Switch as SwitchPrimitive } from "radix-ui"

function Switch({
  className,
  icon,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  icon?: React.ReactNode
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-6 w-10 shrink-0 items-center rounded-full border border-muted-foreground p-0.5 shadow-xs transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-secondary",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none flex size-4.5 items-center justify-center rounded-full bg-background text-foreground shadow-sm transition-transform duration-150 data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0",
        )}
      >{icon}</SwitchPrimitive.Thumb>
    </SwitchPrimitive.Root>
  )
}

export { Switch }
