"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CalendarDays, Eye, Pencil, Plus, Trash2 } from "lucide-react"

import { deleteLeaveType } from "@/actions/leave-type.action"
import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import type { LeaveType } from "@/types/database"

export function LeaveTypesManager({ leaveTypes }: { leaveTypes: LeaveType[] }) {
  const router = useRouter()

  async function deleteHandler(id: string, name: string) {
    if (!window.confirm(`Delete leave type "${name}"? This cannot be undone.`)) return
    const result = await deleteLeaveType(id)
    if (!result.success) {
      toast.add({ type: "error", title: "Could not delete leave type", description: result.error })
      return
    }
    toast.add({ type: "success", title: "Leave type deleted", description: `${name} was removed.` })
    router.refresh()
  }

  const columns: DataTableColumn<LeaveType>[] = [
    {
      id: "name",
      header: "Leave type",
      sortValue: (row) => row.name,
      cell: (row) => (
        <div>
          <p className="text-xs font-medium">{row.name}</p>
          <p className="text-[0.625rem] text-muted-foreground">{row.code}</p>
        </div>
      ),
    },
    {
      id: "paid",
      header: "Paid",
      align: "center",
      sortValue: (row) => (row.is_paid ? 1 : 0),
      cell: (row) => (
        <StatusBadge
          status={row.is_paid ? "ACTIVE" : "INACTIVE"}
          label={row.is_paid ? "Paid" : "Unpaid"}
        />
      ),
    },
    {
      id: "days",
      header: "Default days",
      align: "right",
      sortValue: (row) => row.default_days_per_year,
      cell: (row) => <span className="text-xs tabular-nums">{row.default_days_per_year}</span>,
    },
    {
      id: "carry",
      header: "Carry over",
      align: "right",
      hideBelow: "md",
      sortValue: (row) => row.carry_over_days,
      cell: (row) => <span className="text-xs tabular-nums">{row.carry_over_days}</span>,
    },
    {
      id: "approval",
      header: "Requires approval",
      hideBelow: "lg",
      sortValue: (row) => (row.requires_approval ? 1 : 0),
      cell: (row) => <span className="text-xs">{row.requires_approval ? "Yes" : "No"}</span>,
    },
    {
      id: "actions",
      header: "Actions",
      align: "right",
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="View leave type"
            render={<Link href={`/leave/types/${row.id}`} />}
          >
            <Eye className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Edit leave type"
            render={<Link href={`/leave/types/${row.id}/edit`} />}
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(e) => {
              e.stopPropagation()
              void deleteHandler(row.id, row.name)
            }}
            aria-label="Delete leave type"
          >
            <Trash2 className="size-3.5 text-destructive" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <DataTable
      data={leaveTypes}
      columns={columns}
      getRowId={(row) => row.id}
      searchable={(row) => [row.name, row.code].join(" ")}
      searchPlaceholder="Search leave types…"
      initialSort={{ id: "name", desc: false }}
      pageSize={10}
      emptyTitle="No leave types found"
      emptyDescription="Create a leave type to get started."
      emptyIcon={CalendarDays}
      onRowClick={(row) => router.push(`/leave/types/${row.id}`)}
      toolbar={
        <Button size="sm" render={<Link href="/leave/types/new" />}>
          <Plus />
          New leave type
        </Button>
      }
    />
  )
}
