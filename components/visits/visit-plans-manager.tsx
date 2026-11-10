"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CalendarClock, Eye, Pencil, Plus, Trash2 } from "lucide-react"

import { deleteVisitPlan } from "@/actions/visit.action"
import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import { formatDate } from "@/lib/format"
import type { VisitPlanWithRelations } from "@/lib/data/operations"

export function VisitPlansManager({ plans }: { plans: VisitPlanWithRelations[] }) {
  const router = useRouter()

  async function removePlan(plan: VisitPlanWithRelations) {
    if (!window.confirm(`Delete visit plan "${plan.name}"?`)) return
    const result = await deleteVisitPlan(plan.id)
    if (!result.success) {
      toast.add({
        type: "error",
        title: "Could not delete plan",
        description: result.error,
      })
      return
    }
    toast.add({ type: "success", title: "Visit plan deleted" })
    router.refresh()
  }

  const columns: DataTableColumn<VisitPlanWithRelations>[] = [
    {
      id: "plan",
      header: "Visit plan",
      sortValue: (row) => row.name,
      cell: (row) => (
        <div>
          <p className="text-xs font-medium">{row.name}</p>
          <p className="text-[0.625rem] text-muted-foreground">
            {row.employee
              ? `${row.employee.first_name} ${row.employee.last_name} · ${row.employee.employee_no}`
              : "Unknown employee"}
          </p>
        </div>
      ),
    },
    {
      id: "range",
      header: "Date range",
      hideBelow: "md",
      sortValue: (row) => row.start_date,
      cell: (row) => (
        <span className="text-xs">
          {formatDate(row.start_date)} → {formatDate(row.end_date)}
        </span>
      ),
    },
    {
      id: "notes",
      header: "Notes",
      hideBelow: "lg",
      cell: (row) => (
        <span className="line-clamp-2 max-w-64 text-xs text-muted-foreground">
          {row.notes ?? "—"}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      id: "actions",
      header: "",
      align: "right",
      cell: (row) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="View plan"
            render={<Link href={`/visits/plans/${row.id}`} />}
          >
            <Eye className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Edit visit plan"
            render={<Link href={`/visits/plans/${row.id}/edit`} />}
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => removePlan(row)}
            aria-label="Delete visit plan"
          >
            <Trash2 className="size-3.5 text-destructive" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <DataTable
      data={plans}
      columns={columns}
      getRowId={(row) => row.id}
      searchable={(row) =>
        [
          row.name,
          row.notes,
          row.employee?.first_name,
          row.employee?.last_name,
          row.employee?.employee_no,
        ]
          .filter(Boolean)
          .join(" ")
      }
      searchPlaceholder="Search visit plans…"
      pageSize={10}
      emptyTitle="No visit plans yet"
      emptyDescription="Create a plan to reserve a date range for an employee. No target outlets are required."
      emptyIcon={CalendarClock}
      onRowClick={(row) => router.push(`/visits/plans/${row.id}`)}
      toolbar={
        <Button size="sm" render={<Link href="/visits/plans/new" />}>
          <Plus />
          New visit plan
        </Button>
      }
    />
  )
}
