"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Pencil, Plus, Ruler, Trash2 } from "lucide-react"

import { deleteInventoryUom } from "@/actions/inventory-uom.action"
import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import type { InventoryUom } from "@/types/database"

export function InventoryUomsManager({ uoms }: { uoms: InventoryUom[] }) {
  const router = useRouter()

  async function deleteHandler(id: string, name: string) {
    if (!window.confirm(`Delete unit "${name}"? This cannot be undone.`)) return
    const result = await deleteInventoryUom(id)
    if (!result.success) {
      toast.add({
        type: "error",
        title: "Could not delete unit",
        description: result.error,
      })
      return
    }
    toast.add({
      type: "success",
      title: "Unit deleted",
      description: `${name} was removed.`,
    })
    router.refresh()
  }

  const columns: DataTableColumn<InventoryUom>[] = [
    {
      id: "unit",
      header: "Unit",
      sortValue: (row) => row.code,
      cell: (row) => (
        <div>
          <p className="text-xs font-medium">{row.name}</p>
          <p className="font-mono text-[0.625rem] text-muted-foreground">
            {row.code}
          </p>
        </div>
      ),
    },
    {
      id: "description",
      header: "Description",
      hideBelow: "md",
      sortValue: (row) => row.description ?? "",
      cell: (row) => (
        <span className="line-clamp-2 max-w-72 text-[0.625rem] text-muted-foreground">
          {row.description || "—"}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      sortValue: (row) => (row.is_active ? 1 : 0),
      cell: (row) => (
        <StatusBadge
          status={row.is_active ? "ACTIVE" : "INACTIVE"}
          label={row.is_active ? "Active" : "Inactive"}
        />
      ),
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
            aria-label="Edit unit"
            render={<Link href={`/inventory/uoms/${row.id}/edit`} />}
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(event) => {
              event.stopPropagation()
              void deleteHandler(row.id, row.name)
            }}
            aria-label="Delete unit"
          >
            <Trash2 className="size-3.5 text-destructive" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <DataTable
      data={uoms}
      columns={columns}
      getRowId={(row) => row.id}
      searchable={(row) =>
        [row.code, row.name, row.description].filter(Boolean).join(" ")
      }
      searchPlaceholder="Search units…"
      initialSort={{ id: "unit", desc: false }}
      pageSize={10}
      emptyTitle="No units of measure yet"
      emptyDescription="Add the units your SKUs are counted in, such as pack, bottle or kilogram."
      emptyIcon={Ruler}
      onRowClick={(row) => router.push(`/inventory/uoms/${row.id}/edit`)}
      toolbar={
        <Button size="sm" render={<Link href="/inventory/uoms/new" />}>
          <Plus />
          New unit
        </Button>
      }
    />
  )
}
