/**
 * Production usage lifecycle helpers.
 *
 * A usage line is `submitted` while it is inside the editable cutoff window.
 * Once the cutoff date/time has passed it becomes `completed`, unless it was
 * explicitly `cancelled`. The cutoff window is configured per company and is
 * defined as "cutoff_days before today's date, at cutoff_time" — which is the
 * same as locking a usage line `cutoff_days` days after its usage date at the
 * configured time.
 */

import type {
  ProductionUsage,
  ProductionUsageSettings,
  ProductionUsageStatus,
} from "@/db/models/models"

export type UsageSettings = {
  cutoffDays: number
  cutoffTime: string
  allowSubmitterEdit: boolean
  allowDuplicates: boolean
}

export const DEFAULT_USAGE_SETTINGS: UsageSettings = {
  cutoffDays: 3,
  cutoffTime: "17:00",
  allowSubmitterEdit: false,
  allowDuplicates: false,
}

export function toUsageSettings(
  row: ProductionUsageSettings | null | undefined
): UsageSettings {
  if (!row) return { ...DEFAULT_USAGE_SETTINGS }
  return {
    cutoffDays: Number(row.cutoff_days ?? DEFAULT_USAGE_SETTINGS.cutoffDays),
    cutoffTime: normalizeTime(row.cutoff_time ?? DEFAULT_USAGE_SETTINGS.cutoffTime),
    allowSubmitterEdit: Boolean(row.allow_submitter_edit),
    allowDuplicates: Boolean(row.allow_duplicates),
  }
}

export function normalizeTime(value: string) {
  const [hours, minutes] = value.split(":")
  const h = Math.min(23, Math.max(0, Number(hours) || 0))
  const m = Math.min(59, Math.max(0, Number(minutes) || 0))
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

/** Midnight on the day `cutoffDays` before `now`. */
function cutoffDay(settings: UsageSettings, now: Date) {
  const day = new Date(now)
  day.setHours(0, 0, 0, 0)
  day.setDate(day.getDate() - Math.max(0, settings.cutoffDays))
  return day
}

/** The exact moment when usage lines dated at the cutoff day become locked. */
export function cutoffInstant(settings: UsageSettings, now = new Date()) {
  const day = cutoffDay(settings, now)
  const [hours, minutes] = normalizeTime(settings.cutoffTime)
    .split(":")
    .map(Number)
  day.setHours(hours, minutes, 0, 0)
  return day
}

function parseUsageDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number)
  const date = new Date(year || 1970, (month || 1) - 1, day || 1)
  date.setHours(0, 0, 0, 0)
  return date
}

export function isBeyondCutoff(
  usageDate: string,
  settings: UsageSettings,
  now = new Date()
) {
  const day = parseUsageDate(usageDate)
  const cutoff = cutoffDay(settings, now)
  if (day.getTime() < cutoff.getTime()) return true
  if (day.getTime() > cutoff.getTime()) return false
  return now.getTime() >= cutoffInstant(settings, now).getTime()
}

/**
 * The deadline for a specific usage date: `usage_date + cutoff_days` at the
 * configured cutoff time.
 */
export function usageCutoffDeadline(
  usageDate: string,
  settings: UsageSettings
) {
  const deadline = parseUsageDate(usageDate)
  deadline.setDate(deadline.getDate() + Math.max(0, settings.cutoffDays))
  const [hours, minutes] = normalizeTime(settings.cutoffTime)
    .split(":")
    .map(Number)
  deadline.setHours(hours, minutes, 0, 0)
  return deadline
}

export function resolveUsageStatus(
  usage: Pick<ProductionUsage, "status" | "usage_date">,
  settings: UsageSettings,
  now = new Date()
): ProductionUsageStatus {
  if (usage.status === "cancelled") return "cancelled"
  if (usage.status === "completed") return "completed"
  return isBeyondCutoff(usage.usage_date, settings, now)
    ? "completed"
    : "submitted"
}

export function usageStatusLabel(status: ProductionUsageStatus) {
  if (status === "cancelled") return "Cancellation"
  if (status === "completed") return "Completed"
  return "Submitted"
}

/**
 * Submitters may edit their own usage only while the configuration allows it
 * and the line is still inside the cutoff window.
 */
export function canSubmitterEditUsage(
  usage: Pick<
    ProductionUsage,
    "status" | "usage_date" | "submitted_by" | "recorded_by"
  >,
  settings: UsageSettings,
  userId: string | null | undefined,
  now = new Date()
) {
  if (!settings.allowSubmitterEdit || !userId) return false
  const owner = usage.submitted_by ?? usage.recorded_by
  if (owner !== userId) return false
  if (resolveUsageStatus(usage, settings, now) === "cancelled") return false
  return !isBeyondCutoff(usage.usage_date, settings, now)
}

/** Cancelled lines are read-only until they are restored. */
export function isUsageCellEditable(status: ProductionUsageStatus) {
  return status !== "cancelled"
}
