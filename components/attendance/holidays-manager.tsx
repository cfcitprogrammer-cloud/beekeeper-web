"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { CalendarDays, Download, Pencil, Plus, Trash2 } from "lucide-react"

import {
  createHoliday,
  deleteHoliday,
  updateHoliday,
} from "@/actions/holiday.action"
import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { Modal } from "@/components/shared/modal"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/native-select"
import { toast } from "@/components/ui/toast"
import type { Holiday } from "@/types/database"
import { formatDate, humanize } from "@/lib/format"

const emptyDraft = {
  name: "",
  holiday_date: new Date().toISOString().slice(0, 10),
  type: "regular" as Holiday["type"],
  workspace_id: "",
}

export function HolidaysManager({
  holidays,
  workspaces,
}: {
  holidays: Holiday[]
  workspaces: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [draft, setDraft] = React.useState(emptyDraft)
  const [saving, setSaving] = React.useState(false)

  async function saveHandler() {
    if (!draft.name.trim() || !draft.holiday_date) {
      toast.add({ type: "error", title: "Missing details", description: "Name and date are required." })
      return
    }
    setSaving(true)
    const payload = {
      name: draft.name,
      holidayDate: draft.holiday_date,
      type: draft.type,
      workspaceId: draft.workspace_id || undefined,
    }
    const result = editingId
      ? await updateHoliday({ ...payload, id: editingId })
      : await createHoliday(payload)
    setSaving(false)
    if (!result.success) {
      toast.add({ type: "error", title: editingId ? "Could not update holiday" : "Could not create holiday", description: result.error })
      return
    }
    toast.add({ type: "success", title: editingId ? "Holiday updated" : "Holiday created", description: `${draft.name.trim()} saved.` })
    setDraft(emptyDraft)
    setEditingId(null)
    setOpen(false)
    router.refresh()
  }

  async function deleteHandler(id: string, name: string) {
    if (!window.confirm(`Delete holiday "${name}"? This cannot be undone.`)) return
    const result = await deleteHoliday(id)
    if (!result.success) {
      toast.add({ type: "error", title: "Could not delete holiday", description: result.error })
      return
    }
    toast.add({ type: "success", title: "Holiday deleted", description: `${name} was removed.` })
    router.refresh()
  }

  function openCreate() {
    setEditingId(null)
    setDraft(emptyDraft)
    setOpen(true)
  }

  function openEdit(h: Holiday) {
    setEditingId(h.id)
    setDraft({
      name: h.name,
      holiday_date: h.holiday_date,
      type: h.type,
      workspace_id: h.workspace_id ?? "",
    })
    setOpen(true)
  }

  const columns: DataTableColumn<Holiday>[] = [
    {
      id: "date",
      header: "Date",
      sortValue: (row) => row.holiday_date,
      cell: (row) => <span className="text-xs tabular-nums">{formatDate(row.holiday_date)}</span>,
    },
    {
      id: "name",
      header: "Holiday",
      sortValue: (row) => row.name,
      cell: (row) => <span className="text-xs font-medium">{row.name}</span>,
    },
    {
      id: "type",
      header: "Type",
      sortValue: (row) => row.type,
      cell: (row) => <StatusBadge status={row.type === "REGULAR" ? "ACTIVE" : "PENDING"} label={humanize(row.type)} />,
    },
    {
      id: "workspace",
      header: "Workspace",
      hideBelow: "md",
      sortValue: (row) => row.workspace_id ?? "",
      cell: (row) => <span className="text-xs text-muted-foreground">{row.workspace_id ? "Specific" : "Company-wide"}</span>,
    },
    {
      id: "actions",
      header: "Actions",
      align: "right",
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon-sm" onClick={() => openEdit(row)} aria-label="Edit holiday">
            <Pencil className="size-3.5" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => deleteHandler(row.id, row.name)} aria-label="Delete holiday">
            <Trash2 className="size-3.5 text-destructive" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <>
      <DataTable
        data={holidays}
        columns={columns}
        getRowId={(row) => row.id}
        searchable={(row) => row.name}
        searchPlaceholder="Search holidays…"
        initialSort={{ id: "date", desc: false }}
        pageSize={10}
        emptyTitle="No holidays found"
        emptyDescription="Create a holiday to get started."
        emptyIcon={CalendarDays}
        toolbar={
          <Button size="sm" onClick={openCreate}>
            <Plus />
            New holiday
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
        title={editingId ? "Edit holiday" : "New holiday"}
        description="Define a company or workspace holiday."
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
            <Label htmlFor="hol-name">Name</Label>
            <Input id="hol-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hol-date">Date</Label>
            <Input id="hol-date" type="date" value={draft.holiday_date} onChange={(e) => setDraft({ ...draft, holiday_date: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hol-type">Type</Label>
            <NativeSelect id="hol-type" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as Holiday["type"] })}>
              <option value="REGULAR">Regular</option>
              <option value="SPECIAL">Special</option>
              <option value="LOCAL">Company</option>
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hol-ws">Workspace (optional)</Label>
            <NativeSelect id="hol-ws" value={draft.workspace_id} onChange={(e) => setDraft({ ...draft, workspace_id: e.target.value })}>
              <option value="">Company-wide</option>
              {workspaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>
      </Modal>
    </>
  )
}