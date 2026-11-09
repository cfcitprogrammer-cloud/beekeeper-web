"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CalendarDays, Eye, Pencil, Plus, Trash2 } from "lucide-react"

import { deleteHoliday } from "@/actions/holiday.action"
import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import type { Holiday } from "@/types/database"
import { formatDate, humanize } from "@/lib/format"

export function HolidaysManager({ holidays, workspaces }: { holidays: Holiday[]; workspaces: { id: string; name: string }[] }) {
  const router = useRouter()
  const wsById = React.useMemo(() => new Map(workspaces.map((w) => [w.id, w.name])), [workspaces])

  async function deleteHandler(id: string, name: string) {
    if (!window.confirm(`Delete holiday "${name}"? This cannot be undone.`)) return
    const result = await deleteHoliday(id)
    if (!result.success) { toast.add({ type: "error", title: "Could not delete holiday", description: result.error }); return }
    toast.add({ type: "success", title: "Holiday deleted", description: `${name} was removed.` })
    router.refresh()
  }

  const columns: DataTableColumn<Holiday>[] = [
    { id: "date", header: "Date", sortValue: (row) => row.holiday_date, cell: (row) => <span className="text-xs tabular-nums">{formatDate(row.holiday_date)}</span> },
    { id: "name", header: "Holiday", sortValue: (row) => row.name, cell: (row) => <span className="text-xs font-medium">{row.name}</span> },
    { id: "type", header: "Type", sortValue: (row) => row.type, cell: (row) => <StatusBadge status={row.type === "REGULAR" ? "ACTIVE" : "PENDING"} label={humanize(row.type)} /> },
    { id: "workspace", header: "Workspace", hideBelow: "md", sortValue: (row) => row.workspace_id ?? "", cell: (row) => <span className="text-xs text-muted-foreground">{row.workspace_id ? wsById.get(row.workspace_id) ?? "Specific" : "Company-wide"}</span> },
    { id: "actions", header: "Actions", align: "right", cell: (row) => (
      <div className="flex items-center justify-end gap-1">
        <Button variant="ghost" size="icon-sm" aria-label="View holiday" render={<Link href={`/attendance/holidays/${row.id}`} />}><Eye className="size-3.5" /></Button>
        <Button variant="ghost" size="icon-sm" aria-label="Edit holiday" render={<Link href={`/attendance/holidays/${row.id}/edit`} />}><Pencil className="size-3.5" /></Button>
        <Button variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); void deleteHandler(row.id, row.name) }} aria-label="Delete holiday"><Trash2 className="size-3.5 text-destructive" /></Button>
      </div>
    )},
  ]

  return <DataTable data={holidays} columns={columns} getRowId={(row) => row.id} searchable={(row) => row.name} searchPlaceholder="Search holidays…" initialSort={{ id: "date", desc: false }} pageSize={10} emptyTitle="No holidays found" emptyDescription="Create a holiday to get started." emptyIcon={CalendarDays} onRowClick={(row) => router.push(`/attendance/holidays/${row.id}`)} toolbar={<Button size="sm" render={<Link href="/attendance/holidays/new" />}><Plus />New holiday</Button>} />
}
