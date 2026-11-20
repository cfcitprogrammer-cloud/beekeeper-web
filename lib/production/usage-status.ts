/**
 * Production usage lifecycle helpers.
 *
 * Usage is editable inside a forward-looking window: a usage line dated from
 * the company's current business day through `cutoffDays` days after it may be
 * submitted, edited or cancelled. Every other date is locked — past dates as
 * well as dates past the end of the window — for every user, including usage
 * editors and administrators.
 *
 * The business day rolls over at the configured `cutoffTime`. With a 2:00 AM
 * cutoff, work dated "yesterday" stays editable until 2:00 AM the next day. So
 * with cutoffDays = 2 at 2:00 AM on Nov 19, the allowed dates are Nov 19, 20
 * and 21; at 1:30 AM on Nov 19 they are Nov 18, 19 and 20.
 *
 * All calendar work happens in the company's timezone (the `timeZone` field on
 * `UsageSettings`). Without it the server's local timezone would be used, which
 * makes a date window off by up to a day on a UTC server in Manila.
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
  /** IANA timezone of the company, e.g. "Asia/Manila". */
  timeZone?: string | null
}

export const DEFAULT_USAGE_SETTINGS: UsageSettings = {
  cutoffDays: 3,
  cutoffTime: "17:00",
  allowSubmitterEdit: false,
  allowDuplicates: false,
  timeZone: null,
}

export function toUsageSettings(
  row: ProductionUsageSettings | null | undefined,
  timeZone?: string | null
): UsageSettings {
  const resolvedTimeZone = timeZone?.trim() || null
  if (!row) return { ...DEFAULT_USAGE_SETTINGS, timeZone: resolvedTimeZone }
  return {
    cutoffDays: Number(row.cutoff_days ?? DEFAULT_USAGE_SETTINGS.cutoffDays),
    cutoffTime: normalizeTime(row.cutoff_time ?? DEFAULT_USAGE_SETTINGS.cutoffTime),
    allowSubmitterEdit: Boolean(row.allow_submitter_edit),
    allowDuplicates: Boolean(row.allow_duplicates),
    timeZone: resolvedTimeZone,
  }
}

export function normalizeTime(value: string) {
  const [hours, minutes] = value.split(":")
  const h = Math.min(23, Math.max(0, Number(hours) || 0))
  const m = Math.min(59, Math.max(0, Number(minutes) || 0))
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

type CalendarDate = { year: number; month: number; day: number }

function safeTimeZone(value?: string | null) {
  const candidate = value?.trim()
  if (!candidate) return null
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: candidate })
    return candidate
  } catch {
    return null
  }
}

function runtimeTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
}

function resolvedTimeZone(settings: UsageSettings) {
  return safeTimeZone(settings.timeZone) || runtimeTimeZone()
}

/** Calendar date and wall-clock time for `date` in `timeZone`. */
function zonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: safeTimeZone(timeZone) || "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date)
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0)

  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hours: read("hour"),
    minutes: read("minute"),
  }
}

function parseUsageDate(value: string): CalendarDate {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number)
  return { year: year || 1970, month: month || 1, day: day || 1 }
}

function addDays(date: CalendarDate, days: number): CalendarDate {
  const shifted = new Date(Date.UTC(date.year, date.month - 1, date.day))
  shifted.setUTCDate(shifted.getUTCDate() + days)
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  }
}

function compareDates(a: CalendarDate, b: CalendarDate) {
  return a.year - b.year || a.month - b.month || a.day - b.day
}

function formatCalendarDate(date: CalendarDate) {
  return `${String(date.year).padStart(4, "0")}-${String(date.month).padStart(
    2,
    "0"
  )}-${String(date.day).padStart(2, "0")}`
}

/**
 * A `Date` that represents the calendar day at local noon, so formatting it
 * with `Intl.DateTimeFormat` never shifts it into the previous/next day.
 */
function calendarDateToDate(date: CalendarDate) {
  return new Date(date.year, date.month - 1, date.day, 12, 0, 0, 0)
}

/** Today's date (YYYY-MM-DD) in the company timezone. */
export function todayInTimeZone(
  timeZone?: string | null,
  now = new Date()
): string {
  const zone = safeTimeZone(timeZone) || runtimeTimeZone()
  const parts = zonedParts(now, zone)
  return formatCalendarDate(parts)
}

/**
 * The company's current business date. The calendar day does not roll over
 * until the configured cutoff time, so early-morning work still belongs to the
 * previous day.
 */
function businessDate(settings: UsageSettings, now: Date): CalendarDate {
  const zone = resolvedTimeZone(settings)
  const parts = zonedParts(now, zone)
  const today = { year: parts.year, month: parts.month, day: parts.day }
  const [hours, minutes] = normalizeTime(settings.cutoffTime)
    .split(":")
    .map(Number)
  const rolledOver =
    parts.hours > hours || (parts.hours === hours && parts.minutes >= minutes)
  return rolledOver ? today : addDays(today, -1)
}

export type UsageWindow = {
  /** First allowed usage date, YYYY-MM-DD in the company timezone. */
  start: string
  /** Last allowed usage date, YYYY-MM-DD in the company timezone. */
  end: string
  /** Calendar-day `Date`s for display formatting. */
  startDate: Date
  endDate: Date
}

/**
 * The calendar date (as a `Date`) of the last usage day that is already locked
 * for submitters: the day before the allowed window's first day. Displayed on
 * the usage settings form as "locks usage dated on or before …".
 */
export function cutoffInstant(
  settings: UsageSettings,
  now = new Date()
): Date {
  const start = businessDate(settings, now)
  return calendarDateToDate(addDays(start, -1))
}

/** The allowed usage-date window: business day through business day + cutoffDays. */
export function usageWindow(
  settings: UsageSettings,
  now = new Date()
): UsageWindow {
  const start = businessDate(settings, now)
  const end = addDays(start, Math.max(0, Math.trunc(settings.cutoffDays)))
  return {
    start: formatCalendarDate(start),
    end: formatCalendarDate(end),
    startDate: calendarDateToDate(start),
    endDate: calendarDateToDate(end),
  }
}

/**
 * True when a usage date is outside the allowed window. Both older dates and
 * dates beyond the forward window are locked.
 */
export function isOutsideUsageWindow(
  usageDate: string,
  settings: UsageSettings,
  now = new Date()
) {
  const usage = parseUsageDate(usageDate)
  const window = usageWindow(settings, now)
  return (
    compareDates(usage, parseUsageDate(window.start)) < 0 ||
    compareDates(usage, parseUsageDate(window.end)) > 0
  )
}

export type UsageDateIssue = "past" | "future" | null

/** Which side of the window a locked usage date falls on. */
export function usageDateIssue(
  usageDate: string,
  settings: UsageSettings,
  now = new Date()
): UsageDateIssue {
  const usage = parseUsageDate(usageDate)
  const window = usageWindow(settings, now)
  if (compareDates(usage, parseUsageDate(window.start)) < 0) return "past"
  if (compareDates(usage, parseUsageDate(window.end)) > 0) return "future"
  return null
}

export function resolveUsageStatus(
  usage: Pick<ProductionUsage, "status" | "usage_date">,
  settings: UsageSettings,
  now = new Date()
): ProductionUsageStatus {
  if (usage.status === "cancelled") return "cancelled"
  if (usage.status === "completed") return "completed"
  return isOutsideUsageWindow(usage.usage_date, settings, now)
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
 * and the line's date is inside the allowed window.
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
  return !isOutsideUsageWindow(usage.usage_date, settings, now)
}

/** Cancelled lines are read-only until they are restored. */
export function isUsageCellEditable(status: ProductionUsageStatus) {
  return status !== "cancelled"
}
