import Link from "next/link"
import { ArrowLeft, CalendarDays, Pencil } from "lucide-react"

import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import type { LeaveType } from "@/types/database"

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null
  return (
    <div className="space-y-0.5">
      <p className="text-[0.625rem] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-sm">{value}</p>
    </div>
  )
}

export function LeaveTypeDetail({ leaveType }: { leaveType: LeaveType }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" render={<Link href="/leave/types" />}>
          <ArrowLeft />
          Back to leave types
        </Button>
        <Button size="sm" render={<Link href={`/leave/types/${leaveType.id}/edit`} />}>
          <Pencil />
          Edit leave type
        </Button>
      </div>

      <div className="rounded-lg border bg-card p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <CalendarDays className="size-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold">{leaveType.name}</h2>
            <p className="text-sm text-muted-foreground">{leaveType.code}</p>
            <div className="mt-2">
              <StatusBadge
                status={leaveType.is_paid ? "ACTIVE" : "INACTIVE"}
                label={leaveType.is_paid ? "Paid" : "Unpaid"}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Default days per year" value={leaveType.default_days_per_year} />
          <Field label="Carry over days" value={leaveType.carry_over_days} />
          <Field
            label="Requires approval"
            value={leaveType.requires_approval ? "Yes" : "No"}
          />
          <Field
            label="Created"
            value={
              leaveType.created_at ? new Date(leaveType.created_at).toLocaleString() : null
            }
          />
          <Field
            label="Updated"
            value={
              leaveType.updated_at ? new Date(leaveType.updated_at).toLocaleString() : null
            }
          />
        </div>
      </div>
    </div>
  )
}
