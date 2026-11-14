import type { LucideIcon } from "lucide-react"
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type TrendDirection = "up" | "down" | "flat"

const accentClasses = {
  primary: "bg-primary/10 text-primary",
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  sky: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
} as const

export type MetricAccent = keyof typeof accentClasses

export function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = "primary",
  trend,
  trendLabel,
  className,
}: {
  label: string
  value: string | number
  hint?: string
  icon: LucideIcon
  accent?: MetricAccent
  trend?: TrendDirection
  trendLabel?: string
  className?: string
}) {
  const TrendIcon =
    trend === "up" ? ArrowUpRight : trend === "down" ? ArrowDownRight : Minus

  return (
    <Card
      className={cn(
        "relative gap-0 rounded-none border border-border bg-card py-0 ring-0",
        className
      )}
    >
      <CardContent className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0 space-y-2">
          <p className="micro-label">{label}</p>
          <p className="font-heading text-3xl leading-none tracking-tight tabular-nums">
            {value}
          </p>
          {(hint || trendLabel) && (
            <div className="flex items-center gap-1.5 text-[0.625rem] text-muted-foreground">
              {trend && (
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 font-medium",
                    trend === "up" && "text-emerald-600 dark:text-emerald-400",
                    trend === "down" && "text-rose-600 dark:text-rose-400"
                  )}
                >
                  <TrendIcon className="size-3" />
                  {trendLabel}
                </span>
              )}
              {!trend && trendLabel && <span>{trendLabel}</span>}
              {hint && <span className="truncate">{hint}</span>}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <span
            className="font-mono text-[0.5rem] leading-none text-muted-foreground/40"
            aria-hidden
          >
            +
          </span>
          <span
            className={cn(
              "flex size-8 shrink-0 items-center justify-center border border-border",
              accentClasses[accent]
            )}
          >
            <Icon className="size-4" aria-hidden />
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
