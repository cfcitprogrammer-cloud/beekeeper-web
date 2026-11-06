"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { GitBranch, Pencil, Plus, Trash2 } from "lucide-react"

import {
  createDepartment,
  deleteDepartment,
  updateDepartment,
} from "@/actions/department.action"
import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { Modal } from "@/components/shared/modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/native-select"
import { toast } from "@/components/ui/toast"
import type { Department } from "@/types/database"

const emptyDraft = { name: "", code: "", parent_id: "" }

export function DepartmentsManager({ departments }: { departments: Department[] }) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [draft, setDraft] = React.useState(emptyDraft)
  const [saving, setSaving] = React.useState(false)

  const byId = React.useMemo(() => new Map(departments.map((d) => [d.id, d])), [departments])

  async function saveHandler() {
    if (!draft.name.trim()) {
      toast.add({ type: "error", title: "Missing details", description: "Name is required." })
      return
    }
    setSaving(true)
    const payload = { name: draft.name, code: draft.code, parentId: draft.parent_id || undefined }
    const result = editingId
      ? await updateDepartment({ ...payload, id: editingId })
      : await createDepartment(payload)
    setSaving(false)
    if (!result.success) {
      toast.add({ type: "error", title: editingId ? "Could not update department" : "Could not create department", description: result.error })
      return
    }
    toast.add({ type: "success", title: editingId ? "Department updated" : "Department created", description: `${draft.name.trim()} saved.` })
    setDraft(emptyDraft)
    setEditingId(null)
    setOpen(false)
    router.refresh()
  }

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

  function openCreate() {
    setEditingId(null)
    setDraft(emptyDraft)
    setOpen(true)
  }

  function openEdit(d: Department) {
    setEditingId(d.id)
    setDraft({ name: d.name, code: d.code ?? "", parent_id: d.parent_id ?? "" })
    setOpen(true)
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
          <Button variant="ghost" size="icon-sm" onClick={() => openEdit(row)} aria-label="Edit department">
            <Pencil className="size-3.5" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => deleteHandler(row.id, row.name)} aria-label="Delete department">
            <Trash2 className="size-3.5 text-destructive" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <>
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
        toolbar={
          <Button size="sm" onClick={openCreate}>
            <Plus />
            New department
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
        title={editingId ? "Edit department" : "New department"}
        description="Define a department for the company."
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
            <Label htmlFor="dep-name">Name</Label>
            <Input id="dep-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dep-code">Code</Label>
            <Input id="dep-code" value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dep-parent">Parent department</Label>
            <NativeSelect id="dep-parent" value={draft.parent_id} onChange={(e) => setDraft({ ...draft, parent_id: e.target.value })}>
              <option value="">None</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>
      </Modal>
    </>
  )
}