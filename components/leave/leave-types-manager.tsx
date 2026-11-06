"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Download, Pencil, Plus, Trash2 } from "lucide-react"

import {
  createLeaveType,
  deleteLeaveType,
  updateLeaveType,
} from "@/actions/leave-type.action"
import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { Modal } from "@/components/shared/modal"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/native-select"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/toast"
import type { LeaveType } from "@/types/database"

const emptyDraft = {
  name: "",
  code: "",
  is_paid: true,
  default_days_per_year: "12",
  requires_approval: true,
  carry_over_days: "0",
}

export function LeaveTypesManager({ leaveTypes }: { leaveTypes: LeaveType[] }) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [draft, setDraft] = React.useState(emptyDraft)
  const [saving, setSaving] = React.useState(false)

  async function saveHandler() {
    if (!draft.name.trim() || !draft.code.trim()) {
      toast.add({ type: "error", title: "Missing details", description: "Name and code are required." })
      return
    }
    setSaving(true)
    const payload = {
      name: draft.name,
      code: draft.code,
      isPaid: draft.is_paid,
      defaultDaysPerYear: Number(draft.default_days_per_year) || 0,
      requiresApproval: draft.requires_approval,
      carryOverDays: Number(draft.carry_over_days) || 0,
    }
    const result = editingId
      ? await updateLeaveType({ ...payload, id: editingId })
      : await createLeaveType(payload)
    setSaving(false)
    if (!result.success) {
      toast.add({ type: "error", title: editingId ? "Could not update leave type" : "Could not create leave type", description: result.error })
      return
    }
    toast.add({ type: "success", title: editingId ? "Leave type updated" : "Leave type created", description: `${draft.name.trim()} saved.` })
    setDraft(emptyDraft)
    setEditingId(null)
    setOpen(false)
    router.refresh()
  }

  async function deleteHandler(id: string, name: string) {
    if (!window.confirm(`Delete leave type "${name}"? This cannot be undone.`)) return
    const result = await deleteLeaveType(id)
    if (!result.success) {
      toast.add({ type: "error", title: "Could not delete leave type", description: result.error })
      return
    }
    toast.add({ type: "success", title: "Leave type deleted", description: `${name} was removed.` })
    router.refresh()
  }

  function openCreate() {
    setEditingId(null)
    setDraft(emptyDraft)
    setOpen(true)
  }

  function openEdit(lt: LeaveType) {
    setEditingId(lt.id)
    setDraft({
      name: lt.name,
      code: lt.code,
      is_paid: lt.is_paid,
      default_days_per_year: String(lt.default_days_per_year),
      requires_approval: lt.requires_approval,
      carry_over_days: String(lt.carry_over_days),
    })
    setOpen(true)
  }

  const columns: DataTableColumn<LeaveType>[] = [
    {
      id: "name",
      header: "Leave type",
      sortValue: (row) => row.name,
      cell: (row) => (
        <div>
          <p className="text-xs font-medium">{row.name}</p>
          <p className="text-[0.625rem] text-muted-foreground">{row.code}</p>
        </div>
      ),
    },
    {
      id: "paid",
      header: "Paid",
      align: "center",
      sortValue: (row) => (row.is_paid ? 1 : 0),
      cell: (row) => <StatusBadge status={row.is_paid ? "ACTIVE" : "INACTIVE"} label={row.is_paid ? "Paid" : "Unpaid"} />,
    },
    {
      id: "days",
      header: "Default days",
      align: "right",
      sortValue: (row) => row.default_days_per_year,
      cell: (row) => <span className="text-xs tabular-nums">{row.default_days_per_year}</span>,
    },
    {
      id: "carry",
      header: "Carry over",
      align: "right",
      hideBelow: "md",
      sortValue: (row) => row.carry_over_days,
      cell: (row) => <span className="text-xs tabular-nums">{row.carry_over_days}</span>,
    },
    {
      id: "approval",
      header: "Requires approval",
      hideBelow: "lg",
      sortValue: (row) => (row.requires_approval ? 1 : 0),
      cell: (row) => <span className="text-xs">{row.requires_approval ? "Yes" : "No"}</span>,
    },
    {
      id: "actions",
      header: "Actions",
      align: "right",
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon-sm" onClick={() => openEdit(row)} aria-label="Edit leave type">
            <Pencil className="size-3.5" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => deleteHandler(row.id, row.name)} aria-label="Delete leave type">
            <Trash2 className="size-3.5 text-destructive" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <>
      <DataTable
        data={leaveTypes}
        columns={columns}
        getRowId={(row) => row.id}
        searchable={(row) => [row.name, row.code].join(" ")}
        searchPlaceholder="Search leave types…"
        initialSort={{ id: "name", desc: false }}
        pageSize={10}
        emptyTitle="No leave types found"
        emptyDescription="Create a leave type to get started."
        emptyIcon={Download}
        toolbar={
          <Button size="sm" onClick={openCreate}>
            <Plus />
            New leave type
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
        title={editingId ? "Edit leave type" : "New leave type"}
        description="Configure a leave type for the company."
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
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="lt-name">Name</Label>
            <Input id="lt-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lt-code">Code</Label>
            <Input id="lt-code" value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lt-days">Default days per year</Label>
            <Input id="lt-days" type="number" min={0} value={draft.default_days_per_year} onChange={(e) => setDraft({ ...draft, default_days_per_year: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lt-carry">Carry over days</Label>
            <Input id="lt-carry" type="number" min={0} value={draft.carry_over_days} onChange={(e) => setDraft({ ...draft, carry_over_days: e.target.value })} />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={draft.is_paid} onCheckedChange={(v) => setDraft({ ...draft, is_paid: v })} />
            <Label>Paid leave</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={draft.requires_approval} onCheckedChange={(v) => setDraft({ ...draft, requires_approval: v })} />
            <Label>Requires approval</Label>
          </div>
        </div>
      </Modal>
    </>
  )
}