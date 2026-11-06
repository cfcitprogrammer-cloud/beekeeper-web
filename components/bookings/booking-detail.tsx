"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Check,
  Circle,
  ClipboardCheck,
  MapPin,
  Printer,
  ReceiptText,
  Send,
  Store,
  UserRound,
  X,
} from "lucide-react"

import { updateBookingStatus } from "@/actions/booking.action"
import { StatusBadge } from "@/components/shared/status-badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "@/components/ui/toast"
import { cn } from "@/lib/utils"
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  getInitials,
  humanize,
} from "@/lib/format"
import type { BookingDetail, BookingStatus } from "@/types/database"

type TimelineStep = {
  label: string
  description: string
  state: "done" | "active" | "pending" | "rejected"
}

function buildTimeline(status: BookingStatus): TimelineStep[] {
  const base: TimelineStep[] = [
    {
      label: "Draft captured",
      description: "Booking created in the field",
      state: "done",
    },
    {
      label: "Submitted for approval",
      description: "Routed to the configured approval template",
      state: "pending",
    },
    {
      label: "Approved",
      description: "All approval stages completed",
      state: "pending",
    },
  ]

  if (status === "DRAFT") {
    return base.map((step, index) =>
      index === 0 ? { ...step, state: "active" } : step
    )
  }
  if (status === "PENDING_APPROVAL") {
    return base.map((step, index) =>
      index === 0 ? { ...step, state: "done" } : index === 1 ? { ...step, state: "active" } : step
    )
  }
  if (status === "REJECTED") {
    return base.map((step, index) => {
      if (index === 0) return { ...step, state: "done" }
      if (index === 1) return { ...step, state: "rejected" }
      return step
    })
  }
  if (status === "CANCELLED") {
    return base.map((step) => ({ ...step, state: "pending" }))
  }
  return base.map((step) => ({ ...step, state: "done" }))
}

const stepStyles = {
  done: "border-emerald-500 bg-emerald-500 text-white",
  active: "border-primary bg-primary text-primary-foreground",
  pending: "border-border bg-background text-muted-foreground",
  rejected: "border-rose-500 bg-rose-500 text-white",
} as const

export function BookingDetailView({ booking }: { booking: BookingDetail }) {
  const router = useRouter()
  const [status, setStatus] = React.useState<BookingStatus>(booking.status)
  const [saving, setSaving] = React.useState(false)
  const timeline = buildTimeline(status)
  const canSubmit = status === "DRAFT"
  const canDecide = status === "PENDING_APPROVAL"

  async function updateStatus(next: BookingStatus) {
    setSaving(true)
    const result = await updateBookingStatus({ id: booking.id, status: next })
    setSaving(false)

    if (!result.success) {
      toast.add({
        type: "error",
        title: "Could not update booking",
        description: result.error,
      })
      return
    }

    setStatus(next)
    toast.add({
      type: next === "REJECTED" ? "error" : "success",
      title:
        next === "APPROVED"
          ? "Booking approved"
          : next === "REJECTED"
            ? "Booking rejected"
            : next === "PENDING_APPROVAL"
              ? "Booking submitted"
              : `Booking ${humanize(next).toLowerCase()}`,
      description: `${booking.booking_no} was updated to ${humanize(next).toLowerCase()}.`,
    })
    router.refresh()
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" size="sm" render={<Link href="/bookings" />}>
          <ArrowLeft />
          Bookings register
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm">
            <Printer />
            Print
          </Button>
          {canSubmit && (
            <Button size="sm" onClick={() => updateStatus("PENDING_APPROVAL")} disabled={saving}>
              <Send />
              Submit for approval
            </Button>
          )}
          {canDecide && (
            <>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => updateStatus("REJECTED")}
                disabled={saving}
              >
                <X />
                Reject
              </Button>
              <Button size="sm" onClick={() => updateStatus("APPROVED")} disabled={saving}>
                <Check />
                Approve
              </Button>
            </>
          )}
          {["DRAFT", "PENDING_APPROVAL", "APPROVED"].includes(status) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => updateStatus("CANCELLED")}
              disabled={saving}
            >
              Cancel booking
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ReceiptText className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading text-lg font-semibold tracking-tight">
                {booking.booking_no}
              </h1>
              <StatusBadge status={status} />
              {booking.approval_status && (
                <Badge variant="outline" className="text-[0.5625rem]">
                  Approval: {humanize(booking.approval_status)}
                </Badge>
              )}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {booking.outlet.name} ·{" "}
              {formatDate(booking.booking_date, {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
            <p className="mt-1 text-[0.6875rem] text-muted-foreground">
              Created {formatDateTime(booking.created_at)} by{" "}
              {booking.employee.first_name} {booking.employee.last_name}
            </p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-[0.625rem] tracking-wide text-muted-foreground uppercase">
              Order total
            </p>
            <p className="font-heading text-xl font-semibold tabular-nums">
              {formatCurrency(booking.total)}
            </p>
            <p className="text-[0.625rem] text-muted-foreground">
              {booking.lines.length} line{booking.lines.length === 1 ? "" : "s"}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card>
            <CardHeader className="border-b pb-3">
              <CardTitle>Order lines</CardTitle>
              <CardDescription>
                Products, quantities and computed tax for this booking.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit price</TableHead>
                    <TableHead className="text-right">Discount</TableHead>
                    <TableHead className="text-right">Tax</TableHead>
                    <TableHead className="text-right">Line total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {booking.lines.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-xs text-muted-foreground">
                        No line items captured yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    booking.lines.map((line) => (
                      <TableRow key={line.id}>
                        <TableCell>
                          <p className="text-xs font-medium">{line.sku.name}</p>
                          <p className="font-mono text-[0.625rem] text-muted-foreground">
                            {line.sku.sku_code} · {line.sku.uom}
                          </p>
                        </TableCell>
                        <TableCell className="text-right text-xs tabular-nums">
                          {line.quantity}
                        </TableCell>
                        <TableCell className="text-right text-xs tabular-nums">
                          {formatCurrency(line.unit_price)}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground tabular-nums">
                          {line.discount_pct > 0 ? `${line.discount_pct}%` : "—"}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground tabular-nums">
                          {line.tax_rate}%
                        </TableCell>
                        <TableCell className="text-right text-xs font-medium tabular-nums">
                          {formatCurrency(line.line_total)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={5} className="text-right text-xs text-muted-foreground">
                      Subtotal
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums">
                      {formatCurrency(booking.subtotal)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={5} className="text-right text-xs text-muted-foreground">
                      Discounts
                    </TableCell>
                    <TableCell className="text-right text-xs text-rose-600 tabular-nums dark:text-rose-400">
                      -{formatCurrency(booking.discount_total)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={5} className="text-right text-xs text-muted-foreground">
                      Tax
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums">
                      {formatCurrency(booking.tax_total)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={5} className="text-right text-xs font-semibold">
                      Total
                    </TableCell>
                    <TableCell className="text-right font-heading text-sm font-semibold tabular-nums">
                      {formatCurrency(booking.total)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b pb-3">
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xs/relaxed text-muted-foreground">
                {booking.notes ?? "No notes were captured for this booking."}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="border-b pb-3">
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="size-3.5 text-muted-foreground" />
                Approval progress
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ol className="space-y-0">
                {timeline.map((step, index) => (
                  <li key={step.label} className="relative flex gap-3 pb-4 last:pb-0">
                    {index < timeline.length - 1 && (
                      <span className="absolute top-6 left-3 h-full w-px bg-border" />
                    )}
                    <span
                      className={cn(
                        "relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border",
                        stepStyles[step.state]
                      )}
                    >
                      {step.state === "done" ? (
                        <Check className="size-3" />
                      ) : step.state === "rejected" ? (
                        <X className="size-3" />
                      ) : (
                        <Circle className="size-2 fill-current" />
                      )}
                    </span>
                    <div className="min-w-0 pt-0.5">
                      <p
                        className={cn(
                          "text-xs font-medium",
                          step.state === "pending" && "text-muted-foreground"
                        )}
                      >
                        {step.label}
                      </p>
                      <p className="text-[0.625rem] text-muted-foreground">
                        {step.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b pb-3">
              <CardTitle className="flex items-center gap-2">
                <Store className="size-3.5 text-muted-foreground" />
                Outlet
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              <div>
                <p className="text-xs font-medium">{booking.outlet.name}</p>
                <p className="text-[0.625rem] text-muted-foreground">
                  {booking.outlet.code}
                </p>
              </div>
              <p className="flex items-start gap-1 text-[0.6875rem] text-muted-foreground">
                <MapPin className="mt-0.5 size-3 shrink-0" />
                {booking.outlet.address ?? "No address on file"}
              </p>
              <Separator />
              <div className="flex items-center justify-between text-[0.625rem]">
                <span className="text-muted-foreground">Geofence</span>
                <span className="font-medium">{booking.outlet.geofence_radius_m}m</span>
              </div>
              <div className="flex items-center justify-between text-[0.625rem]">
                <span className="text-muted-foreground">Contact</span>
                <span className="font-medium">{booking.outlet.contact_person ?? "—"}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b pb-3">
              <CardTitle className="flex items-center gap-2">
                <UserRound className="size-3.5 text-muted-foreground" />
                Field representative
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center gap-2">
                <Avatar className="size-8">
                  <AvatarFallback className="bg-primary/10 text-[0.625rem] font-semibold text-primary">
                    {getInitials(
                      `${booking.employee.first_name} ${booking.employee.last_name}`
                    )}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-xs font-medium">
                    {booking.employee.first_name} {booking.employee.last_name}
                  </p>
                  <p className="text-[0.625rem] text-muted-foreground">
                    {booking.employee.employee_no} · {booking.employee.email ?? "No email"}
                  </p>
                </div>
              </div>
              <Separator className="my-2" />
              <div className="flex items-center justify-between text-[0.625rem]">
                <span className="text-muted-foreground">GPS accuracy</span>
                <span className="font-medium">
                  {booking.accuracy_m !== null ? `${booking.accuracy_m}m` : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between text-[0.625rem]">
                <span className="text-muted-foreground">Coordinates</span>
                <span className="font-mono">
                  {booking.latitude !== null && booking.longitude !== null
                    ? `${booking.latitude.toFixed(4)}, ${booking.longitude.toFixed(4)}`
                    : "—"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
