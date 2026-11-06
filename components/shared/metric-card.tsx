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
    <Card className={cn("gap-0 py-4", className)}>
      <CardContent className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
            {label}
          </p>
          <p className="font-heading text-xl font-semibold tracking-tight tabular-nums">
            {value}
          </p>
          {(hint || trendLabel) && (
            <div className="flex items-center gap-1.5 text-[0.6875rem] text-muted-foreground">
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
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg",
            accentClasses[accent]
          )}
        >
          <Icon className="size-4.5" aria-hidden />
        </span>
      </CardContent>
    </Card>
  )
}
