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
// @ts-ignore
import * as psgcModule from "psgc"

const psgc = psgcModule as any
import { OUTLET_STATUSES, type OutletWithRelations } from "@/types/database"

const emptyDraft = {
  name: "",
  code: "",
  description: "",
  address: "",
  region: "",
  province: "",
  city: "",
  barangay: "",
  zip_code: "",
  contact_person: "",
  phone: "",
  email: "",
  geofence_radius_m: "150",
  latitude: 14.5995,
  longitude: 120.9842,
  is_active: false,
  is_distributor: false,
  distributor_id: "",
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

  const locationRegions = React.useMemo(
    () => (Array.isArray(psgc?.regions?.all?.()) ? psgc.regions.all() : []),
    []
  )
  const locationProvinces = React.useMemo(
    () => {
      const selectedRegion = locationRegions.find(
        (region: any) => region.name === draft.region
      )
      if (!selectedRegion) return []
      return (psgc?.provinces?.all?.() ?? []).filter(
        (province: any) => province.region === selectedRegion.designation
      )
    },
    [draft.region, locationRegions]
  )
  const locationCities = React.useMemo(
    () =>
      draft.province
        ? (psgc?.municipalities?.all?.() ?? []).filter(
            (municipality: any) => municipality.province === draft.province
          )
        : [],
    [draft.province]
  )
  const locationBarangays = React.useMemo(
    () => {
      if (!draft.city) return []
      const normalize = (value: string) =>
        String(value ?? "")
          .toLowerCase()
          .replace(/^city of /, "")
          .replace(/ city$/, "")
          .replace(/\s+/g, "")
      const selected = normalize(draft.city)
      return (psgc?.barangays?.all?.() ?? []).filter(
        (barangay: any) => normalize(barangay.citymun) === selected
      )
    },
    [draft.city]
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
      description: draft.description,
      address: draft.address,
      region: draft.region,
      province: draft.province,
      city: draft.city,
      barangay: draft.barangay,
      zipCode: draft.zip_code,
      contactPerson: draft.contact_person,
      phone: draft.phone,
      email: draft.email,
      geofenceRadiusM: Number(draft.geofence_radius_m) || 150,
      latitude: draft.latitude,
      longitude: draft.longitude,
      isActive: draft.is_active,
      isDistributor: draft.is_distributor,
      distributorId: draft.is_distributor ? null : (draft.distributor_id || null),
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
      description: outlet.description ?? "",
      address: outlet.address ?? "",
      region: outlet.region ?? "",
      province: outlet.province ?? "",
      city: outlet.city ?? "",
      barangay: outlet.barangay ?? "",
      zip_code: outlet.zip_code ?? "",
      contact_person: outlet.contact_person ?? "",
      phone: outlet.phone ?? "",
      email: outlet.email ?? "",
      geofence_radius_m: String(outlet.geofence_radius_m ?? 150),
      latitude: outlet.latitude ?? 14.5995,
      longitude: outlet.longitude ?? 120.9842,
      is_active: outlet.is_active ?? false,
      is_distributor: outlet.is_distributor ?? false,
      distributor_id: outlet.distributor_id ?? "",
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
      id: "region",
      header: "Region",
      hideBelow: "lg",
      sortValue: (row) => row.region ?? "",
      cell: (row) => <span className="text-xs">{row.region ?? "—"}</span>,
    },
    {
      id: "province",
      header: "Province",
      hideBelow: "lg",
      sortValue: (row) => row.province ?? "",
      cell: (row) => <span className="text-xs">{row.province ?? "—"}</span>,
    },
    {
      id: "city",
      header: "City",
      hideBelow: "md",
      sortValue: (row) => row.city ?? "",
      cell: (row) => <span className="text-xs">{row.city ?? "—"}</span>,
    },
    {
      id: "distributor",
      header: "Distributor",
      hideBelow: "lg",
      sortValue: (row) =>
        row.is_distributor
          ? "Distributor"
          : (outlets.find((outlet) => outlet.id === row.distributor_id)?.name ?? ""),
      cell: (row) => {
        if (row.is_distributor) {
          return (
            <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[0.625rem] font-medium text-emerald-700 dark:text-emerald-300">
              Distributor
            </span>
          )
        }
        const distributor = outlets.find((outlet) => outlet.id === row.distributor_id)
        return (
          <span className="text-xs">
            {distributor ? `${distributor.name} · ${distributor.code}` : "—"}
          </span>
        )
      },
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
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="outlet-description">Description</Label>
            <Input
              id="outlet-description"
              value={draft.description}
              onChange={(event) => setDraft({ ...draft, description: event.target.value })}
              placeholder="Outlet notes or description"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="outlet-region">Region</Label>
            <NativeSelect
              id="outlet-region"
              value={draft.region}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  region: event.target.value,
                  province: "",
                  city: "",
                  barangay: "",
                })
              }
              className="w-full"
            >
              <option value="">Select region</option>
              {locationRegions.map((region: any) => (
                <option key={region.name} value={region.name}>
                  {region.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="outlet-province">Province</Label>
            <NativeSelect
              id="outlet-province"
              value={draft.province}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  province: event.target.value,
                  city: "",
                  barangay: "",
                })
              }
              className="w-full"
              disabled={!draft.region}
            >
              <option value="">Select province</option>
              {locationProvinces.map((province: any) => (
                <option key={province.prov_code} value={province.name}>
                  {province.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="outlet-city">City / Municipality</Label>
            <NativeSelect
              id="outlet-city"
              value={draft.city}
              onChange={(event) =>
                setDraft({ ...draft, city: event.target.value, barangay: "" })
              }
              className="w-full"
              disabled={!draft.province}
            >
              <option value="">Select city / municipality</option>
              {locationCities.map((city: any) => (
                <option key={city.mun_code ?? city.name} value={city.name}>
                  {city.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="outlet-barangay">Barangay</Label>
            <NativeSelect
              id="outlet-barangay"
              value={draft.barangay}
              onChange={(event) =>
                setDraft({ ...draft, barangay: event.target.value })
              }
              className="w-full"
              disabled={!draft.city}
            >
              <option value="">Select barangay</option>
              {locationBarangays.map((barangay: any) => (
                <option key={barangay.code ?? barangay.name} value={barangay.name}>
                  {barangay.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="outlet-zip">ZIP code</Label>
            <Input
              id="outlet-zip"
              value={draft.zip_code}
              onChange={(event) => setDraft({ ...draft, zip_code: event.target.value })}
              placeholder="e.g. 1000"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="outlet-active">Active</Label>
            <label className="flex items-center gap-2 text-xs">
              <input
                id="outlet-active"
                type="checkbox"
                checked={draft.is_active}
                onChange={(event) =>
                  setDraft({ ...draft, is_active: event.target.checked })
                }
                className="size-3.5 accent-primary"
              />
              Outlet is active
            </label>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="outlet-distributor-flag">Distributor</Label>
            <label className="flex items-center gap-2 text-xs">
              <input
                id="outlet-distributor-flag"
                type="checkbox"
                checked={draft.is_distributor}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    is_distributor: event.target.checked,
                    distributor_id: event.target.checked ? "" : draft.distributor_id,
                  })
                }
                className="size-3.5 accent-primary"
              />
              This outlet is a distributor
            </label>
          </div>
          {!draft.is_distributor && (
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="outlet-distributor">Assigned distributor</Label>
              <NativeSelect
                id="outlet-distributor"
                value={draft.distributor_id}
                onChange={(event) =>
                  setDraft({ ...draft, distributor_id: event.target.value })
                }
                className="w-full"
              >
                <option value="">Select a distributor outlet</option>
                {outlets
                  .filter((outlet) => outlet.is_distributor && outlet.id !== editingId)
                  .map((outlet) => (
                    <option key={outlet.id} value={outlet.id}>
                      {outlet.name} · {outlet.code}
                    </option>
                  ))}
              </NativeSelect>
            </div>
          )}
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