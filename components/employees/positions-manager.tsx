"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { BriefcaseBusiness, Eye, Pencil, Plus, Trash2 } from "lucide-react"

import { deletePosition } from "@/actions/position.action"
import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import type { Position } from "@/types/database"

export function PositionsManager({ positions }: { positions: Position[] }) {
  const router = useRouter()

  async function deleteHandler(id: string, name: string) {
    if (!window.confirm(`Delete position "${name}"? This cannot be undone.`)) return
    const result = await deletePosition(id)
    if (!result.success) {
      toast.add({ type: "error", title: "Could not delete position", description: result.error })
      return
    }
    toast.add({ type: "success", title: "Position deleted", description: `${name} was removed.` })
    router.refresh()
  }

  const columns: DataTableColumn<Position>[] = [
    { id: "title", header: "Title", sortValue: (row) => row.title, cell: (row) => <span className="text-xs font-medium">{row.title}</span> },
    { id: "description", header: "Description", hideBelow: "md", sortValue: (row) => row.description ?? "", cell: (row) => <span className="text-xs text-muted-foreground">{row.description ?? "—"}</span> },
    { id: "range", header: "Salary range", align: "right", sortValue: (row) => row.min_salary ?? 0, cell: (row) => <span className="text-xs tabular-nums">{row.min_salary != null || row.max_salary != null ? `${row.min_salary ?? "—"} – ${row.max_salary ?? "—"}` : "—"}</span> },
    {
      id: "actions", header: "Actions", align: "right", cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon-sm" aria-label="View position" render={<Link href={`/employees/positions/${row.id}`} />}><Eye className="size-3.5" /></Button>
          <Button variant="ghost" size="icon-sm" aria-label="Edit position" render={<Link href={`/employees/positions/${row.id}/edit`} />}><Pencil className="size-3.5" /></Button>
          <Button variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); void deleteHandler(row.id, row.title) }} aria-label="Delete position"><Trash2 className="size-3.5 text-destructive" /></Button>
        </div>
      ),
    },
  ]

  return (
    <DataTable data={positions} columns={columns} getRowId={(row) => row.id} searchable={(row) => row.title} searchPlaceholder="Search positions…" initialSort={{ id: "title", desc: false }} pageSize={10} emptyTitle="No positions found" emptyDescription="Create a position to get started." emptyIcon={BriefcaseBusiness} onRowClick={(row) => router.push(`/employees/positions/${row.id}`)} toolbar={<Button size="sm" render={<Link href="/employees/positions/new" />}><Plus />New position</Button>} />
  )
}
