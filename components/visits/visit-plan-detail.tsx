"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeft, CalendarClock, CalendarPlus, Pencil, Route } from "lucide-react"

import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { formatDate, formatDateTime, formatTimeRange } from "@/lib/format"
import type { VisitPlanWithRelations } from "@/lib/data/operations"

export function VisitPlanDetail({ plan }: { plan: VisitPlanWithRelations }) {
  const visits = React.useMemo(
    () =>
      [...(plan.visits ?? [])].sort((a, b) =>
        `${a.start_date} ${a.start_time ?? ""}`.localeCompare(
          `${b.start_date} ${b.start_time ?? ""}`
        )
      ),
    [plan.visits]
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" render={<Link href="/visits/plans" />}>
          <ArrowLeft />
          Back to visit plans
        </Button>
        <Button size="sm" render={<Link href={`/visits/plans/${plan.id}/edit`} />}>
          <Pencil />
          Edit plan
        </Button>
        <Button size="sm" variant="outline" render={<Link href="/visits/log" />}>
          <Route />
          Visit log
        </Button>
      </div>

      <div className="rounded-lg border bg-card p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <CalendarClock className="size-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold">{plan.name}</h2>
            <p className="text-sm text-muted-foreground">
              {plan.employee
                ? `${plan.employee.first_name} ${plan.employee.last_name}`
                : "—"}{" "}
              · {formatDate(plan.start_date)} → {formatDate(plan.end_date)}
            </p>
            <div className="mt-2">
              <StatusBadge status={plan.status} />
            </div>
          </div>
        </div>
        {plan.notes ? <p className="mt-4 text-sm">{plan.notes}</p> : null}
      </div>

      <div className="rounded-lg border bg-card p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Route className="size-4" />
            Attached visits
            <span className="text-[0.625rem] font-normal text-muted-foreground">
              {visits.length} visit{visits.length === 1 ? "" : "s"}
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            render={<Link href="/visits/add" />}
          >
            <CalendarPlus />
            Add visit
          </Button>
        </div>

        {visits.length > 0 ? (
          <div className="mt-3 divide-y rounded-md border">
            {visits.map((visit) => (
              <div
                key={visit.id}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
              >
                <div>
                  <p className="text-xs font-medium">
                    {visit.outlet?.name ?? "Unknown outlet"}
                  </p>
                  <p className="text-[0.625rem] text-muted-foreground">
                    {formatDate(visit.start_date)} → {formatDate(visit.end_date)}
                    {visit.start_time || visit.end_time
                      ? ` · ${formatTimeRange(visit.start_time, visit.end_time)}`
                      : ""}
                    {visit.check_in_at
                      ? ` · checked in ${formatDateTime(visit.check_in_at)}`
                      : ""}
                  </p>
                </div>
                <StatusBadge status={visit.status} />
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">
            No visits are attached yet. A plan attaches existing visits inside its
            date range when the plan is saved. Visits added later stay independent
            until the plan is saved again.
          </p>
        )}

        <p className="mt-3 text-[0.625rem] text-muted-foreground">
          Check-in and check-out happen from the visit log. Both require a camera
          capture.
        </p>
      </div>
    </div>
  )
}
