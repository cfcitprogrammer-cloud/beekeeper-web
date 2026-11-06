"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Download, Pencil, Plus, Trash2 } from "lucide-react"

import {
  createSkuCategory,
  deleteSkuCategory,
  updateSkuCategory,
} from "@/actions/sku-category.action"
import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { Modal } from "@/components/shared/modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/native-select"
import { toast } from "@/components/ui/toast"
import type { SkuCategory } from "@/types/database"

const emptyDraft = { name: "", parent_id: "" }

export function SkuCategoriesManager({
  categories,
}: {
  categories: SkuCategory[]
}) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [draft, setDraft] = React.useState(emptyDraft)
  const [saving, setSaving] = React.useState(false)

  const byId = React.useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])

  async function saveHandler() {
    if (!draft.name.trim()) {
      toast.add({ type: "error", title: "Missing details", description: "Name is required." })
      return
    }
    setSaving(true)
    const payload = { name: draft.name, parentId: draft.parent_id || undefined }
    const result = editingId
      ? await updateSkuCategory({ ...payload, id: editingId })
      : await createSkuCategory(payload)
    setSaving(false)
    if (!result.success) {
      toast.add({ type: "error", title: editingId ? "Could not update category" : "Could not create category", description: result.error })
      return
    }
    toast.add({ type: "success", title: editingId ? "Category updated" : "Category created", description: `${draft.name.trim()} saved.` })
    setDraft(emptyDraft)
    setEditingId(null)
    setOpen(false)
    router.refresh()
  }

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

  function openCreate() {
    setEditingId(null)
    setDraft(emptyDraft)
    setOpen(true)
  }

  function openEdit(c: SkuCategory) {
    setEditingId(c.id)
    setDraft({ name: c.name, parent_id: c.parent_id ?? "" })
    setOpen(true)
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
          <Button variant="ghost" size="icon-sm" onClick={() => openEdit(row)} aria-label="Edit category">
            <Pencil className="size-3.5" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => deleteHandler(row.id, row.name)} aria-label="Delete category">
            <Trash2 className="size-3.5 text-destructive" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <>
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
        emptyIcon={Download}
        toolbar={
          <Button size="sm" onClick={openCreate}>
            <Plus />
            New category
          </Button>
        }
      />
      <Modal
        open={open}
        onOpenChange={(value) => {
          setOpen(value)
          if (!value) {
            setEditingId(null)
            setDraft(emptyDraft)
          }
        }}
        title={editingId ? "Edit category" : "New category"}
        description="Organize SKUs into categories."
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveHandler} disabled={saving}>
              {saving ? "Saving…" : editingId ? "Save changes" : "Create"}
            </Button>
          </>
        }
      >
        <div className="grid gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="cat-name">Name</Label>
            <Input id="cat-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cat-parent">Parent category</Label>
            <NativeSelect
              id="cat-parent"
              value={draft.parent_id}
              onChange={(e) => setDraft({ ...draft, parent_id: e.target.value })}
            >
              <option value="">None</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>
      </Modal>
    </>
  )
}