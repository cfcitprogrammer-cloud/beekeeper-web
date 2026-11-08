"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Building2, Download, MapPin, Pencil, Plus, Store, Trash2 } from "lucide-react"

import { createOutlet, deleteOutlet, updateOutlet } from "@/actions/outlet.action"
import { exportOutlets } from "@/actions/import-export.action"
import { MapLocationPicker } from "@/components/outlets/map-location-picker"
import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { Modal } from "@/components/shared/modal"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/native-select"
import { toast } from "@/components/ui/toast"
import { humanize } from "@/lib/format"
import { OUTLET_STATUSES, type OutletWithRelations } from "@/types/database"

const emptyDraft = {
  name: "",
  code: "",
  address: "",
  contact_person: "",
  phone: "",
  email: "",
  geofence_radius_m: "150",
  latitude: 14.5995,
  longitude: 120.9842,
}

export function OutletsDirectory({
  outlets,
}: {
  outlets: OutletWithRelations[]
}) {
  const router = useRouter()
  const [status, setStatus] = React.useState("all")
  const [open, setOpen] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [draft, setDraft] = React.useState(emptyDraft)
  const [saving, setSaving] = React.useState(false)

  const filtered = React.useMemo(
    () =>
      outlets.filter((outlet) => {
        if (status !== "all" && outlet.status !== status) return false
        return true
      }),
    [outlets, status]
  )

  async function saveOutletHandler() {
    if (!draft.name.trim() || !draft.code.trim()) {
      toast.add({
        type: "error",
        title: "Missing details",
        description: "Outlet name and code are required.",
      })
      return
    }

    setSaving(true)
    const payload = {
      name: draft.name,
      code: draft.code,
      address: draft.address,
      contactPerson: draft.contact_person,
      phone: draft.phone,
      email: draft.email,
      geofenceRadiusM: Number(draft.geofence_radius_m) || 150,
      latitude: draft.latitude,
      longitude: draft.longitude,
    }

    const result = editingId
      ? await updateOutlet({ ...payload, id: editingId })
      : await createOutlet(payload)
    setSaving(false)

    if (!result.success) {
      toast.add({
        type: "error",
        title: editingId ? "Could not update outlet" : "Could not create outlet",
        description: result.error,
      })
      return
    }

    toast.add({
      type: "success",
      title: editingId ? "Outlet updated" : "Outlet submitted",
      description: editingId
        ? `${draft.name.trim()} was updated.`
        : `${draft.name.trim()} was created and routed for onboarding approval.`,
    })
    setDraft(emptyDraft)
    setEditingId(null)
    setOpen(false)
    router.refresh()
  }

  async function deleteOutletHandler(id: string, name: string) {
    if (!window.confirm(`Delete outlet "${name}"? This cannot be undone.`)) return
    const result = await deleteOutlet(id)
    if (!result.success) {
      toast.add({ type: "error", title: "Could not delete outlet", description: result.error })
      return
    }
    toast.add({ type: "success", title: "Outlet deleted", description: `${name} was removed.` })
    router.refresh()
  }

  async function exportOutletsHandler() {
    const result = await exportOutlets()
    if (!result.success) {
      toast.add({ type: "error", title: "Could not export outlets", description: result.error })
      return
    }
    const blob = new Blob([result.data.csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = result.data.filename
    link.click()
    URL.revokeObjectURL(url)
    toast.add({
      type: "success",
      title: "Export ready",
      description: `${result.data.rowCount} outlet(s) exported.`,
    })
  }

  function openCreate() {
    setEditingId(null)
    setDraft(emptyDraft)
    setOpen(true)
  }

  function openEdit(outlet: OutletWithRelations) {
    setEditingId(outlet.id)
    setDraft({
      name: outlet.name,
      code: outlet.code,
      address: outlet.address ?? "",
      contact_person: outlet.contact_person ?? "",
      phone: outlet.phone ?? "",
      email: outlet.email ?? "",
      geofence_radius_m: String(outlet.geofence_radius_m ?? 150),
      latitude: outlet.latitude ?? 14.5995,
      longitude: outlet.longitude ?? 120.9842,
    })
    setOpen(true)
  }

  const columns: DataTableColumn<OutletWithRelations>[] = [
    {
      id: "outlet",
      header: "Outlet",
      sortValue: (row) => row.name,
      cell: (row) => (
        <div className="flex items-center gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Store className="size-3.5" />
          </span>
          <div>
            <p className="text-xs font-medium">{row.name}</p>
            <p className="text-[0.625rem] text-muted-foreground">{row.code}</p>
          </div>
        </div>
      ),
    },
    {
      id: "location",
      header: "Location",
      sortValue: (row) => row.address ?? "",
      cell: (row) => (
        <div className="flex items-start gap-1">
          <MapPin className="mt-0.5 size-2.5 shrink-0 text-muted-foreground" />
          <span className="line-clamp-2 max-w-64 text-xs">{row.address ?? "—"}</span>
        </div>
      ),
    },
    {
      id: "contact",
      header: "Contact",
      hideBelow: "lg",
      sortValue: (row) => row.contact_person ?? "",
      cell: (row) => (
        <div>
          <p className="text-xs">{row.contact_person ?? "—"}</p>
          <p className="text-[0.625rem] text-muted-foreground">
            {row.phone ?? row.email ?? "No contact details"}
          </p>
        </div>
      ),
    },
    {
      id: "geofence",
      header: "Geofence",
      align: "right",
      hideBelow: "lg",
      sortValue: (row) => row.geofence_radius_m,
      cell: (row) => (
        <span className="text-xs tabular-nums">{row.geofence_radius_m}m</span>
      ),
    },
    {
      id: "approval",
      header: "Approval",
      sortValue: (row) => row.approval_status ?? "",
      cell: (row) =>
        row.approval_status ? (
          <StatusBadge status={row.approval_status} />
        ) : (
          <span className="text-[0.625rem] text-muted-foreground">Not required</span>
        ),
    },
    {
      id: "status",
      header: "Status",
      sortValue: (row) => row.status,
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      id: "actions",
      header: "Actions",
      align: "right",
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon-sm" onClick={() => openEdit(row)} aria-label="Edit outlet">
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => deleteOutletHandler(row.id, row.name)}
            aria-label="Delete outlet"
          >
            <Trash2 className="size-3.5 text-destructive" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <>
      <DataTable
        data={filtered}
        columns={columns}
        getRowId={(row) => row.id}
        searchable={(row) =>
          [row.name, row.code, row.address, row.contact_person, row.phone, row.email]
            .filter(Boolean)
            .join(" ")
        }
        searchPlaceholder="Search outlet, address or contact…"
        initialSort={{ id: "outlet", desc: false }}
        pageSize={10}
        emptyTitle="No outlets match your filters"
        emptyDescription="Clear the filters or add a new outlet to get started."
        emptyIcon={Building2}
        filters={
          <NativeSelect
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            aria-label="Filter by status"
          >
            <option value="all">All statuses</option>
            {OUTLET_STATUSES.map((value) => (
              <option key={value} value={value}>
                {humanize(value)}
              </option>
            ))}
          </NativeSelect>
        }
        toolbar={
          <>
            <Button variant="outline" size="sm" onClick={exportOutletsHandler}>
              <Download />
              Export
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus />
              Add outlet
            </Button>
          </>
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
        title={editingId ? "Edit outlet" : "Add an outlet"}
        description={
          editingId
            ? "Update outlet details."
            : "New outlets are routed through the onboarding approval template."
        }
        size="xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveOutletHandler} disabled={saving}>
              <Plus />
              {saving
                ? "Saving…"
                : editingId
                  ? "Save changes"
                  : "Submit for approval"}
            </Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="outlet-name">Outlet name</Label>
            <Input
              id="outlet-name"
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              placeholder="Harbor Point Market"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="outlet-code">Outlet code</Label>
            <Input
              id="outlet-code"
              value={draft.code}
              onChange={(event) => setDraft({ ...draft, code: event.target.value })}
              placeholder="OUT-1015"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="outlet-address">Street address</Label>
            <Input
              id="outlet-address"
              value={draft.address}
              onChange={(event) => setDraft({ ...draft, address: event.target.value })}
              placeholder="Unit, street, barangay, city"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="outlet-contact">Contact person</Label>
            <Input
              id="outlet-contact"
              value={draft.contact_person}
              onChange={(event) => setDraft({ ...draft, contact_person: event.target.value })}
              placeholder="Store manager"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="outlet-phone">Contact phone</Label>
            <Input
              id="outlet-phone"
              value={draft.phone}
              onChange={(event) => setDraft({ ...draft, phone: event.target.value })}
              placeholder="+63 917 000 0000"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="outlet-email">Contact email</Label>
            <Input
              id="outlet-email"
              type="email"
              value={draft.email}
              onChange={(event) => setDraft({ ...draft, email: event.target.value })}
              placeholder="manager@outlet.ph"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="outlet-radius">Geofence radius (m)</Label>
            <Input
              id="outlet-radius"
              type="number"
              min={25}
              value={draft.geofence_radius_m}
              onChange={(event) =>
                setDraft({ ...draft, geofence_radius_m: event.target.value })
              }
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Map location</Label>
            <MapLocationPicker
              key={`${editingId ?? "new"}-${open ? "open" : "closed"}`}
              latitude={draft.latitude}
              longitude={draft.longitude}
              onChange={(latitude, longitude) =>
                setDraft({ ...draft, latitude, longitude })
              }
            />
          </div>
        </div>
      </Modal>
    </>
  )
}