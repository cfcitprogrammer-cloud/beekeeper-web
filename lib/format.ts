const currencyFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const compactCurrencyFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  notation: "compact",
  maximumFractionDigits: 1,
})

const numberFormatter = new Intl.NumberFormat("en-PH")

export function formatCurrency(value: number, compact = false) {
  if (!Number.isFinite(value)) return "—"
  return compact
    ? compactCurrencyFormatter.format(value)
    : currencyFormatter.format(value)
}

export function formatNumber(value: number) {
  if (!Number.isFinite(value)) return "—"
  return numberFormatter.format(value)
}

export function formatDate(
  value: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  }
) {
  if (!value) return "—"
  const date = typeof value === "string" ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return "—"
  return new Intl.DateTimeFormat("en-PH", options).format(date)
}

export function formatTime(value: string | Date | null | undefined) {
  if (!value) return "—"
  const date = typeof value === "string" ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return "—"
  return new Intl.DateTimeFormat("en-PH", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date)
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "—"
  const date = typeof value === "string" ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return "—"
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date)
}

export function formatTimeRange(
  start: string | null | undefined,
  end: string | null | undefined
) {
  if (!start || !end) return "—"
  return `${to12Hour(start)} – ${to12Hour(end)}`
}

export function to12Hour(value: string) {
  const [hoursRaw, minutes = "00"] = value.split(":")
  const hours = Number(hoursRaw)
  if (Number.isNaN(hours)) return value
  const suffix = hours >= 12 ? "PM" : "AM"
  const normalized = hours % 12 === 0 ? 12 : hours % 12
  return `${normalized}:${minutes} ${suffix}`
}

export function humanize(value: string | null | undefined) {
  if (!value) return "—"
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

export function initials(firstName: string, lastName?: string) {
  const first = firstName?.trim()?.charAt(0) ?? ""
  const last = lastName?.trim()?.charAt(0) ?? ""
  return `${first}${last}`.toUpperCase() || "?"
}

export function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase()
}

export function percent(value: number, total: number) {
  if (!total) return 0
  return Math.round((value / total) * 100)
}

export function formatDuration(hours: number) {
  if (!Number.isFinite(hours)) return "—"
  const whole = Math.floor(hours)
  const minutes = Math.round((hours - whole) * 60)
  if (whole === 0) return `${minutes}m`
  return minutes === 0 ? `${whole}h` : `${whole}h ${minutes}m`
}

export function formatRelative(value: string | null | undefined) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  const diffMs = Date.now() - date.getTime()
  const diffMinutes = Math.round(diffMs / 60_000)
  if (Math.abs(diffMinutes) < 1) return "just now"
  if (Math.abs(diffMinutes) < 60) return `${diffMinutes}m ago`
  const diffHours = Math.round(diffMinutes / 60)
  if (Math.abs(diffHours) < 24) return `${diffHours}h ago`
  const diffDays = Math.round(diffHours / 24)
  if (Math.abs(diffDays) < 7) return `${diffDays}d ago`
  return formatDate(date)
}

export function getDaysInRange(start: string, end: string) {
  const startDate = new Date(start)
  const endDate = new Date(end)
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return 0
  }
  return (
    Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1
  )
}
