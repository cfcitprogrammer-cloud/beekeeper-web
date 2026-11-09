"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, Package, Pencil, Plus, Trash2 } from "lucide-react"

import { deleteSkuCategory } from "@/actions/sku-category.action"
import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import type { SkuCategory } from "@/types/database"

export function SkuCategoriesManager({
  categories,
}: {
  categories: SkuCategory[]
}) {
  const router = useRouter()
  const byId = React.useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])

  async function deleteHandler(id: string, name: string) {
    if (!window.confirm(`Delete category "${name}"? This cannot be undone.`)) return
    const result = await deleteSkuCategory(id)
    if (!result.success) {
      toast.add({ type: "error", title: "Could not delete category", description: result.error })
      return
    }
    toast.add({ type: "success", title: "Category deleted", description: `${name} was removed.` })
    router.refresh()
  }

  const columns: DataTableColumn<SkuCategory>[] = [
    {
      id: "name",
      header: "Category",
      sortValue: (row) => row.name,
      cell: (row) => <span className="text-xs font-medium">{row.name}</span>,
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
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="View category"
            render={<Link href={`/inventory/categories/${row.id}`} />}
          >
            <Eye className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Edit category"
            render={<Link href={`/inventory/categories/${row.id}/edit`} />}
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
            aria-label="Delete category"
          >
            <Trash2 className="size-3.5 text-destructive" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <DataTable
      data={categories}
      columns={columns}
      getRowId={(row) => row.id}
      searchable={(row) => row.name}
      searchPlaceholder="Search categories…"
      initialSort={{ id: "name", desc: false }}
      pageSize={10}
      emptyTitle="No categories found"
      emptyDescription="Create a category to organize SKUs."
      emptyIcon={Package}
      onRowClick={(row) => router.push(`/inventory/categories/${row.id}`)}
      toolbar={
        <Button size="sm" render={<Link href="/inventory/categories/new" />}>
          <Plus />
          New category
        </Button>
      }
    />
  )
}
