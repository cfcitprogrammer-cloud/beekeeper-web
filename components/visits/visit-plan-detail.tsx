"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeft, CalendarClock, LogIn, Pencil, Route } from "lucide-react"

import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/format"
import type { VisitPlanWithRelations } from "@/lib/data/operations"

export function VisitPlanDetail({ plan }: { plan: VisitPlanWithRelations }) {
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
        <div className="flex items-center gap-2 text-sm font-medium">
          <Route className="size-4" />
          How this plan works
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          This plan reserves a date range for the employee. It does not target
          specific outlets — any outlet can be visited. A check-in by this employee
          during the date range is automatically classified as planned.
        </p>
        <Button
          className="mt-4"
          size="sm"
          variant="outline"
          render={<Link href="/visits/check-in" />}
        >
          <LogIn />
          Check in a visit
        </Button>
      </div>
    </div>
  )
}
