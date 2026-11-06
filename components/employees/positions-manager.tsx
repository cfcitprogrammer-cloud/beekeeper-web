"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { BriefcaseBusiness, Pencil, Plus, Trash2 } from "lucide-react"

import {
  createPosition,
  deletePosition,
  updatePosition,
} from "@/actions/position.action"
import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { Modal } from "@/components/shared/modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import type { Position } from "@/types/database"

const emptyDraft = { title: "", description: "", min_salary: "", max_salary: "" }

export function PositionsManager({ positions }: { positions: Position[] }) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [draft, setDraft] = React.useState(emptyDraft)
  const [saving, setSaving] = React.useState(false)

  async function saveHandler() {
    if (!draft.title.trim()) {
      toast.add({ type: "error", title: "Missing details", description: "Title is required." })
      return
    }
    setSaving(true)
    const payload = {
      title: draft.title,
      description: draft.description,
      minSalary: draft.min_salary ? Number(draft.min_salary) : undefined,
      maxSalary: draft.max_salary ? Number(draft.max_salary) : undefined,
    }
    const result = editingId
      ? await updatePosition({ ...payload, id: editingId })
      : await createPosition(payload)
    setSaving(false)
    if (!result.success) {
      toast.add({ type: "error", title: editingId ? "Could not update position" : "Could not create position", description: result.error })
      return
    }
    toast.add({ type: "success", title: editingId ? "Position updated" : "Position created", description: `${draft.title.trim()} saved.` })
    setDraft(emptyDraft)
    setEditingId(null)
    setOpen(false)
    router.refresh()
  }

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

  function openCreate() {
    setEditingId(null)
    setDraft(emptyDraft)
    setOpen(true)
  }

  function openEdit(p: Position) {
    setEditingId(p.id)
    setDraft({
      title: p.title,
      description: p.description ?? "",
      min_salary: p.min_salary != null ? String(p.min_salary) : "",
      max_salary: p.max_salary != null ? String(p.max_salary) : "",
    })
    setOpen(true)
  }

  const columns: DataTableColumn<Position>[] = [
    {
      id: "title",
      header: "Title",
      sortValue: (row) => row.title,
      cell: (row) => <span className="text-xs font-medium">{row.title}</span>,
    },
    {
      id: "description",
      header: "Description",
      hideBelow: "md",
      sortValue: (row) => row.description ?? "",
      cell: (row) => <span className="text-xs text-muted-foreground">{row.description ?? "—"}</span>,
    },
    {
      id: "range",
      header: "Salary range",
      align: "right",
      sortValue: (row) => row.min_salary ?? 0,
      cell: (row) => (
        <span className="text-xs tabular-nums">
          {row.min_salary != null || row.max_salary != null
            ? `${row.min_salary ?? "—"} – ${row.max_salary ?? "—"}`
            : "—"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      align: "right",
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon-sm" onClick={() => openEdit(row)} aria-label="Edit position">
            <Pencil className="size-3.5" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => deleteHandler(row.id, row.title)} aria-label="Delete position">
            <Trash2 className="size-3.5 text-destructive" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <>
      <DataTable
        data={positions}
        columns={columns}
        getRowId={(row) => row.id}
        searchable={(row) => row.title}
        searchPlaceholder="Search positions…"
        initialSort={{ id: "title", desc: false }}
        pageSize={10}
        emptyTitle="No positions found"
        emptyDescription="Create a position to get started."
        emptyIcon={BriefcaseBusiness}
        toolbar={
          <Button size="sm" onClick={openCreate}>
            <Plus />
            New position
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
        title={editingId ? "Edit position" : "New position"}
        description="Define a job position for the company."
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
            <Label htmlFor="pos-title">Title</Label>
            <Input id="pos-title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pos-desc">Description</Label>
            <Textarea id="pos-desc" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="pos-min">Min salary</Label>
              <Input id="pos-min" type="number" min={0} value={draft.min_salary} onChange={(e) => setDraft({ ...draft, min_salary: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pos-max">Max salary</Label>
              <Input id="pos-max" type="number" min={0} value={draft.max_salary} onChange={(e) => setDraft({ ...draft, max_salary: e.target.value })} />
            </div>
          </div>
        </div>
      </Modal>
    </>
  )
}