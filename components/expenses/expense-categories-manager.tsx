"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Pencil, Plus, Tags, Trash2 } from "lucide-react"

import { deleteExpenseCategory } from "@/actions/expense-category.action"
import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import type { ExpenseCategory } from "@/types/database"

export function ExpenseCategoriesManager({
  categories = [],
}: {
  categories: ExpenseCategory[]
}) {
  const router = useRouter()

  async function removeCategory(category: ExpenseCategory) {
    if (
      !window.confirm(
        `Delete category "${category.name}"? Existing expenses keep their text category.`
      )
    ) {
      return
    }
    const result = await deleteExpenseCategory(category.id)
    if (!result.success) {
      toast.add({
        type: "error",
        title: "Could not delete category",
        description: result.error,
      })
      return
    }
    toast.add({ type: "success", title: "Category deleted" })
    router.refresh()
  }

  const columns: DataTableColumn<ExpenseCategory>[] = [
    {
      id: "name",
      header: "Category",
      sortValue: (row) => row.name,
      cell: (row) => (
        <div>
          <p className="text-xs font-medium">{row.name}</p>
          <p className="text-[0.625rem] text-muted-foreground">{row.code}</p>
        </div>
      ),
    },
    {
      id: "description",
      header: "Description",
      hideBelow: "md",
      cell: (row) => (
        <span className="line-clamp-2 max-w-72 text-xs text-muted-foreground">
          {row.description ?? "—"}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => (
        <span className="text-xs text-muted-foreground">
          {row.is_active ? "Active" : "Inactive"}
        </span>
      ),
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
            aria-label="Edit category"
            render={<Link href={`/expenses/categories/${row.id}/edit`} />}
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => removeCategory(row)}
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
      searchable={(row) => [row.name, row.code, row.description].filter(Boolean).join(" ")}
      searchPlaceholder="Search categories…"
      initialSort={{ id: "name", desc: false }}
      pageSize={10}
      emptyTitle="No expense categories yet"
      emptyDescription="Add a category so expense items can be classified."
      emptyIcon={Tags}
      toolbar={
        <Button size="sm" render={<Link href="/expenses/categories/new" />}>
          <Plus />
          New category
        </Button>
      }
    />
  )
}
