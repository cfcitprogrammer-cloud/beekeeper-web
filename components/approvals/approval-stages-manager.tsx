"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Download, Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react"

import {
  createApprovalStage,
  deleteApprovalStage,
  toggleApprovalStage,
  updateApprovalStage,
} from "@/actions/approval-stage.action"
import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { Modal } from "@/components/shared/modal"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import type { ApprovalStage } from "@/types/database"

const emptyDraft = { name: "", description: "", required_approvals: "1" }

export function ApprovalStagesManager({ stages }: { stages: ApprovalStage[] }) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [draft, setDraft] = React.useState(emptyDraft)
  const [saving, setSaving] = React.useState(false)

  async function saveHandler() {
    if (!draft.name.trim()) {
      toast.add({ type: "error", title: "Missing details", description: "Name is required." })
      return
    }
    setSaving(true)
    const payload = {
      name: draft.name,
      description: draft.description,
      requiredApprovals: Number(draft.required_approvals) || 1,
    }
    const result = editingId
      ? await updateApprovalStage({ ...payload, id: editingId })
      : await createApprovalStage(payload)
    setSaving(false)
    if (!result.success) {
      toast.add({ type: "error", title: editingId ? "Could not update stage" : "Could not create stage", description: result.error })
      return
    }
    toast.add({ type: "success", title: editingId ? "Stage updated" : "Stage created", description: `${draft.name.trim()} saved.` })
    setDraft(emptyDraft)
    setEditingId(null)
    setOpen(false)
    router.refresh()
  }

  async function deleteHandler(id: string, name: string) {
    if (!window.confirm(`Delete stage "${name}"? This cannot be undone.`)) return
    const result = await deleteApprovalStage(id)
    if (!result.success) {
      toast.add({ type: "error", title: "Could not delete stage", description: result.error })
      return
    }
    toast.add({ type: "success", title: "Stage deleted", description: `${name} was removed.` })
    router.refresh()
  }

  async function toggleHandler(id: string, isActive: boolean) {
    const result = await toggleApprovalStage(id, isActive)
    if (!result.success) {
      toast.add({ type: "error", title: "Could not update stage", description: result.error })
      return
    }
    router.refresh()
  }

  function openCreate() {
    setEditingId(null)
    setDraft(emptyDraft)
    setOpen(true)
  }

  function openEdit(s: ApprovalStage) {
    setEditingId(s.id)
    setDraft({
      name: s.name,
      description: s.description ?? "",
      required_approvals: String(s.required_approvals),
    })
    setOpen(true)
  }

  const columns: DataTableColumn<ApprovalStage>[] = [
    {
      id: "name",
      header: "Stage",
      sortValue: (row) => row.name,
      cell: (row) => (
        <div>
          <p className="text-xs font-medium">{row.name}</p>
          <p className="text-[0.625rem] text-muted-foreground">{row.description ?? "—"}</p>
        </div>
      ),
    },
    {
      id: "approvals",
      header: "Required approvals",
      align: "right",
      sortValue: (row) => row.required_approvals,
      cell: (row) => <span className="text-xs tabular-nums">{row.required_approvals}</span>,
    },
    {
      id: "status",
      header: "Status",
      sortValue: (row) => (row.is_active ? 1 : 0),
      cell: (row) => (
        <StatusBadge status={row.is_active ? "ACTIVE" : "INACTIVE"} label={row.is_active ? "Active" : "Inactive"} />
      ),
    },
    {
      id: "actions",
      header: "Actions",
      align: "right",
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon-sm" onClick={() => openEdit(row)} aria-label="Edit stage">
            <Pencil className="size-3.5" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => deleteHandler(row.id, row.name)} aria-label="Delete stage">
            <Trash2 className="size-3.5 text-destructive" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <>
      <DataTable
        data={stages}
        columns={columns}
        getRowId={(row) => row.id}
        searchable={(row) => row.name}
        searchPlaceholder="Search stages…"
        initialSort={{ id: "name", desc: false }}
        pageSize={10}
        emptyTitle="No stages found"
        emptyDescription="Create an approval stage to get started."
        emptyIcon={ShieldCheck}
        toolbar={
          <Button size="sm" onClick={openCreate}>
            <Plus />
            New stage
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
        title={editingId ? "Edit stage" : "New stage"}
        description="Define an approval stage reusable across templates."
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
            <Label htmlFor="stg-name">Name</Label>
            <Input id="stg-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="stg-desc">Description</Label>
            <Textarea id="stg-desc" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="stg-req">Required approvals</Label>
            <Input id="stg-req" type="number" min={1} value={draft.required_approvals} onChange={(e) => setDraft({ ...draft, required_approvals: e.target.value })} />
          </div>
        </div>
      </Modal>
    </>
  )
}