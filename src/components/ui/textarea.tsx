import * as React from "react"
import { cn } from "cn"

function Textarea({ className, rows, style, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      rows={rows}
      // field-sizing-content ignores `rows` in Chromium/Safari, so keep it as the starting height.
      style={rows ? { minHeight: `calc(${rows}lh + 1rem + 2px)`, ...style } : style}
      className={cn(
        "flex field-sizing-content min-h-16 max-h-[70svh] w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
