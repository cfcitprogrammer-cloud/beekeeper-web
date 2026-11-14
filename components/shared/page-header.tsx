import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

export function PageHeader({
  title,
  description,
  icon: Icon,
  eyebrow,
  actions,
  className,
}: {
  title: string
  description?: string
  icon?: LucideIcon
  eyebrow?: string
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        {Icon && (
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center border border-border bg-card text-primary">
            <Icon className="size-4" aria-hidden />
          </span>
        )}
        <div className="min-w-0 space-y-1.5">
          {eyebrow && (
            <p className="flex items-center gap-2 font-mono text-[0.5625rem] font-medium tracking-[0.22em] text-muted-foreground uppercase">
              <span className="h-px w-4 shrink-0 bg-primary" aria-hidden />
              {eyebrow}
            </p>
          )}
          <h1 className="font-heading text-2xl font-normal tracking-tight text-balance sm:text-3xl">
            {title}
          </h1>
          {description && (
            <p className="max-w-2xl text-xs/relaxed text-muted-foreground text-pretty">
              {description}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  )
}
