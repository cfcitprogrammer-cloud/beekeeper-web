"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus, Save } from "lucide-react"

import { createOutlet, updateOutlet } from "@/actions/outlet.action"
import { MapLocationPicker } from "@/components/outlets/map-location-picker"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/native-select"
import { Slider } from "@/components/ui/slider"
import { toast } from "@/components/ui/toast"
// @ts-ignore
import * as psgcModule from "psgc"
import type { OutletWithRelations } from "@/types/database"

const psgc = psgcModule as any

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

function draftFromOutlet(outlet: OutletWithRelations) {
  return {
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
  }
}

export function OutletForm({
  outlet,
  outlets,
}: {
  outlet?: OutletWithRelations | null
  outlets: OutletWithRelations[]
}) {
  const router = useRouter()
  const editingId = outlet?.id ?? null
  const [draft, setDraft] = React.useState(() =>
    outlet ? draftFromOutlet(outlet) : emptyDraft
  )
  const [saving, setSaving] = React.useState(false)

  const locationRegions = React.useMemo(
    () => (Array.isArray(psgc?.regions?.all?.()) ? psgc.regions.all() : []),
    []
  )
  const locationProvinces = React.useMemo(() => {
    const selectedRegion = locationRegions.find(
      (region: any) => region.name === draft.region
    )
    if (!selectedRegion) return []
    return (psgc?.provinces?.all?.() ?? []).filter(
      (province: any) => province.region === selectedRegion.designation
    )
  }, [draft.region, locationRegions])
  const locationCities = React.useMemo(
    () =>
      draft.province
        ? (psgc?.municipalities?.all?.() ?? []).filter(
            (municipality: any) => municipality.province === draft.province
          )
        : [],
    [draft.province]
  )
  const locationBarangays = React.useMemo(() => {
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
  }, [draft.city])

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
      distributorId: draft.is_distributor ? null : draft.distributor_id || null,
    }

    const result = editingId
      ? await updateOutlet({ ...payload, id: editingId })
      : await createOutlet(payload)
    setSaving(false)

    if (!result.success) {
      toast.add({
        type: "error",
        title: editingId
          ? "Could not update outlet"
          : "Could not create outlet",
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
    router.push("/outlets")
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/outlets")}
        >
          <ArrowLeft />
          Back to outlets
        </Button>
      </div>

      <div className="rounded-lg border bg-card p-4 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="outlet-name">Outlet name</Label>
            <Input
              id="outlet-name"
              value={draft.name}
              onChange={(event) =>
                setDraft({ ...draft, name: event.target.value })
              }
              placeholder="Harbor Point Market"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="outlet-code">Outlet code</Label>
            <Input
              id="outlet-code"
              value={draft.code}
              onChange={(event) =>
                setDraft({ ...draft, code: event.target.value })
              }
              placeholder="OUT-1015"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="outlet-address">Street address</Label>
            <Input
              id="outlet-address"
              value={draft.address}
              onChange={(event) =>
                setDraft({ ...draft, address: event.target.value })
              }
              placeholder="Unit, street, barangay, city"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="outlet-description">Description</Label>
            <Input
              id="outlet-description"
              value={draft.description}
              onChange={(event) =>
                setDraft({ ...draft, description: event.target.value })
              }
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
                <option
                  key={barangay.code ?? barangay.name}
                  value={barangay.name}
                >
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
              onChange={(event) =>
                setDraft({ ...draft, zip_code: event.target.value })
              }
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
                    distributor_id: event.target.checked
                      ? ""
                      : draft.distributor_id,
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
                  .filter((o) => o.is_distributor && o.id !== editingId)
                  .map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name} · {o.code}
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
              onChange={(event) =>
                setDraft({ ...draft, contact_person: event.target.value })
              }
              placeholder="Store manager"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="outlet-phone">Contact phone</Label>
            <Input
              id="outlet-phone"
              value={draft.phone}
              onChange={(event) =>
                setDraft({ ...draft, phone: event.target.value })
              }
              placeholder="+63 917 000 0000"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="outlet-email">Contact email</Label>
            <Input
              id="outlet-email"
              type="email"
              value={draft.email}
              onChange={(event) =>
                setDraft({ ...draft, email: event.target.value })
              }
              placeholder="manager@outlet.ph"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="outlet-radius">Geofence radius (m)</Label>
            <div className="space-y-2">
              <Slider
                aria-label="Geofence radius"
                min={25}
                max={2000}
                step={5}
                value={[Number(draft.geofence_radius_m) || 150]}
                onValueChange={(value) => {
                  const next = Array.isArray(value) ? value[0] : value
                  setDraft({ ...draft, geofence_radius_m: String(next ?? 150) })
                }}
              />
              <Input
                id="outlet-radius"
                type="number"
                min={25}
                max={2000}
                value={draft.geofence_radius_m}
                onChange={(event) =>
                  setDraft({ ...draft, geofence_radius_m: event.target.value })
                }
              />
            </div>
            <p className="text-[0.625rem] text-muted-foreground">
              Adjust the circular geofence around the outlet pin (25–2000 m).
            </p>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Map location</Label>
            <MapLocationPicker
              key={editingId ?? "new"}
              latitude={draft.latitude}
              longitude={draft.longitude}
              radiusM={Number(draft.geofence_radius_m) || 150}
              onChange={(latitude, longitude) =>
                setDraft({ ...draft, latitude, longitude })
              }
            />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t pt-4">
          <Button
            variant="outline"
            onClick={() => router.push("/outlets")}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={saveOutletHandler} disabled={saving}>
            {editingId ? <Save /> : <Plus />}
            {saving
              ? "Saving…"
              : editingId
                ? "Save changes"
                : "Submit for approval"}
          </Button>
        </div>
      </div>
    </div>
  )
}
