"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, GitBranch, Pencil, Plus, Trash2 } from "lucide-react"

import { deleteDepartment } from "@/actions/department.action"
import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import type { Department } from "@/types/database"

export function DepartmentsManager({ departments }: { departments: Department[] }) {
  const router = useRouter()
  const byId = React.useMemo(() => new Map(departments.map((d) => [d.id, d])), [departments])

  async function deleteHandler(id: string, name: string) {
    if (!window.confirm(`Delete department "${name}"? This cannot be undone.`)) return
    const result = await deleteDepartment(id)
    if (!result.success) {
      toast.add({ type: "error", title: "Could not delete department", description: result.error })
      return
    }
    toast.add({ type: "success", title: "Department deleted", description: `${name} was removed.` })
    router.refresh()
  }

  const columns: DataTableColumn<Department>[] = [
    {
      id: "name",
      header: "Department",
      sortValue: (row) => row.name,
      cell: (row) => (
        <div className="flex items-center gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <GitBranch className="size-3.5" />
          </span>
          <div>
            <p className="text-xs font-medium">{row.name}</p>
            <p className="text-[0.625rem] text-muted-foreground">{row.code ?? "—"}</p>
          </div>
        </div>
      ),
    },
    {
      id: "parent",
      header: "Parent",
      sortValue: (row) => byId.get(row.parent_id ?? "")?.name ?? "",
      cell: (row) => (
        <span className="text-xs text-muted-foreground">
          {row.parent_id ? byId.get(row.parent_id)?.name ?? "—" : "—"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      align: "right",
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon-sm" aria-label="View department" render={<Link href={`/employees/departments/${row.id}`} />}><Eye className="size-3.5" /></Button>
          <Button variant="ghost" size="icon-sm" aria-label="Edit department" render={<Link href={`/employees/departments/${row.id}/edit`} />}><Pencil className="size-3.5" /></Button>
          <Button variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); void deleteHandler(row.id, row.name) }} aria-label="Delete department"><Trash2 className="size-3.5 text-destructive" /></Button>
        </div>
      ),
    },
  ]

  return (
    <DataTable
      data={departments}
      columns={columns}
      getRowId={(row) => row.id}
      searchable={(row) => [row.name, row.code].filter(Boolean).join(" ")}
      searchPlaceholder="Search departments…"
      initialSort={{ id: "name", desc: false }}
      pageSize={10}
      emptyTitle="No departments found"
      emptyDescription="Create a department to get started."
      emptyIcon={GitBranch}
      onRowClick={(row) => router.push(`/employees/departments/${row.id}`)}
      toolbar={<Button size="sm" render={<Link href="/employees/departments/new" />}><Plus />New department</Button>}
    />
  )
}
