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
        "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between",
        className
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        {Icon && (
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-4.5" aria-hidden />
          </span>
        )}
        <div className="min-w-0 space-y-1">
          {eyebrow && (
            <p className="text-[0.6875rem] font-semibold tracking-wider text-muted-foreground uppercase">
              {eyebrow}
            </p>
          )}
          <h1 className="font-heading text-xl font-semibold tracking-tight text-balance">
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
