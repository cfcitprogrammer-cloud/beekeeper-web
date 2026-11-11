import type { LucideIcon } from "lucide-react"
import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  Clock3,
  XCircle,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { humanize } from "@/lib/format"

export type StatusTone =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral"
  | "violet"

const toneClasses: Record<StatusTone, string> = {
  success:
    "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  warning:
    "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  danger:
    "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-400",
  info: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-400",
  neutral:
    "border-zinc-500/20 bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
  violet:
    "border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-400",
}

const dotClasses: Record<StatusTone, string> = {
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-rose-500",
  info: "bg-sky-500",
  neutral: "bg-zinc-400",
  violet: "bg-violet-500",
}

const statusToneMap: Record<string, StatusTone> = {
  ACTIVE: "success",
  APPROVED: "success",
  PRESENT: "success",
  FULFILLED: "success",
  COMPLETED: "success",
  PAID: "success",
  REGULARIZED: "success",
  WITHIN_GEOFENCE: "success",
  PENDING: "warning",
  PENDING_APPROVAL: "warning",
  SUBMITTED: "warning",
  PROBATION: "warning",
  INVITED: "warning",
  LATE: "warning",
  HALF_DAY: "warning",
  SPECIAL: "warning",
  REJECTED: "danger",
  ABSENT: "danger",
  TERMINATED: "danger",
  SUSPENDED: "danger",
  CANCELLED: "danger",
  OVERDUE: "danger",
  OUTSIDE_GEOFENCE: "danger",
  MOCK_LOCATION: "danger",
  ON_LEAVE: "info",
  REMOTE: "violet",
  SCHEDULED: "info",
  CHECKED_IN: "success",
  CHECKED_OUT: "neutral",
  DRAFT: "neutral",
  INACTIVE: "neutral",
  RESIGNED: "neutral",
  SEQUENTIAL: "neutral",
  PARALLEL: "violet",
  REGULAR: "info",
  LOCAL: "neutral",
}

const statusIconMap: Record<string, LucideIcon> = {
  ACTIVE: CheckCircle2,
  APPROVED: CheckCircle2,
  FULFILLED: CheckCircle2,
  PRESENT: CheckCircle2,
  PENDING: Clock3,
  PENDING_APPROVAL: Clock3,
  SUBMITTED: Clock3,
  SCHEDULED: Clock3,
  CHECKED_IN: CheckCircle2,
  CHECKED_OUT: CheckCircle2,
  LATE: AlertTriangle,
  REJECTED: XCircle,
  ABSENT: XCircle,
  CANCELLED: XCircle,
  SUSPENDED: AlertTriangle,
  ON_LEAVE: CircleDashed,
}

export function StatusBadge({
  status,
  label,
  tone,
  className,
  showDot = true,
  showIcon = false,
}: {
  status: string | null | undefined
  label?: string
  tone?: StatusTone
  className?: string
  showDot?: boolean
  showIcon?: boolean
}) {
  const normalized = (status ?? "").toUpperCase()
  const resolvedTone = tone ?? statusToneMap[normalized] ?? "neutral"
  const Icon = statusIconMap[normalized]

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 border font-medium",
        toneClasses[resolvedTone],
        className
      )}
    >
      {showIcon && Icon ? (
        <Icon className="size-2.5!" aria-hidden />
      ) : showDot ? (
        <span
          className={cn("size-1.5 shrink-0 rounded-full", dotClasses[resolvedTone])}
          aria-hidden
        />
      ) : null}
      {label ?? humanize(status)}
    </Badge>
  )
}

export function GeofenceBadge({
  within,
  className,
}: {
  within: boolean
  className?: string
}) {
  return (
    <StatusBadge
      status={within ? "WITHIN_GEOFENCE" : "OUTSIDE_GEOFENCE"}
      label={within ? "Inside geofence" : "Outside geofence"}
      tone={within ? "success" : "danger"}
      className={className}
    />
  )
}
