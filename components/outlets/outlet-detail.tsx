import Link from "next/link"
import {
  ArrowLeft,
  Building2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Store,
  User,
} from "lucide-react"

import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import type { OutletWithRelations } from "@/types/database"

function Field({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  if (value === null || value === undefined || value === "") return null
  return (
    <div className="space-y-0.5">
      <p className="text-[0.625rem] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-sm">{value}</p>
    </div>
  )
}

export function OutletDetail({
  outlet,
  distributorName,
}: {
  outlet: OutletWithRelations
  distributorName?: string | null
}) {
  const locationParts = [
    outlet.barangay,
    outlet.city,
    outlet.province,
    outlet.region,
    outlet.zip_code,
  ].filter(Boolean)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" render={<Link href="/outlets" />}>
          <ArrowLeft />
          Back to outlets
        </Button>
        <Button size="sm" render={<Link href={`/outlets/${outlet.id}/edit`} />}>
          <Pencil />
          Edit outlet
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 rounded-lg border bg-card p-4 sm:p-6 lg:col-span-2">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Store className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold leading-tight">{outlet.name}</h2>
              <p className="text-sm text-muted-foreground">{outlet.code}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <StatusBadge status={outlet.status} />
                {outlet.approval_status ? (
                  <StatusBadge status={outlet.approval_status} />
                ) : null}
                {outlet.is_distributor ? (
                  <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[0.625rem] font-medium text-emerald-700 dark:text-emerald-300">
                    Distributor
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {outlet.description ? (
            <div>
              <p className="text-[0.625rem] font-medium uppercase tracking-wide text-muted-foreground">
                Description
              </p>
              <p className="mt-1 text-sm">{outlet.description}</p>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Street address"
              value={
                outlet.address ? (
                  <span className="flex items-start gap-1.5">
                    <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                    <span>{outlet.address}</span>
                  </span>
                ) : null
              }
            />
            <Field label="Location" value={locationParts.join(", ") || null} />
            <Field label="Contact person" value={outlet.contact_person} />
            <Field
              label="Phone"
              value={
                outlet.phone ? (
                  <span className="flex items-center gap-1.5">
                    <Phone className="size-3.5 text-muted-foreground" />
                    {outlet.phone}
                  </span>
                ) : null
              }
            />
            <Field
              label="Email"
              value={
                outlet.email ? (
                  <span className="flex items-center gap-1.5">
                    <Mail className="size-3.5 text-muted-foreground" />
                    {outlet.email}
                  </span>
                ) : null
              }
            />
            <Field
              label="Assigned distributor"
              value={
                outlet.is_distributor ? "This outlet is a distributor" : distributorName ?? null
              }
            />
          </div>
        </div>

        <div className="space-y-4 rounded-lg border bg-card p-4 sm:p-6">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Building2 className="size-4 text-muted-foreground" />
            Operations
          </div>
          <div className="grid gap-4">
            <Field label="Active" value={outlet.is_active ? "Yes" : "No"} />
            <Field label="Geofence radius" value={`${outlet.geofence_radius_m}m`} />
            <Field
              label="Coordinates"
              value={
                outlet.latitude != null && outlet.longitude != null
                  ? `${outlet.latitude}, ${outlet.longitude}`
                  : null
              }
            />
            <Field
              label="Created"
              value={
                outlet.created_at
                  ? new Date(outlet.created_at).toLocaleString()
                  : null
              }
            />
            <Field
              label="Updated"
              value={
                outlet.updated_at
                  ? new Date(outlet.updated_at).toLocaleString()
                  : null
              }
            />
          </div>
          {outlet.contact_person ? (
            <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-2 text-xs text-muted-foreground">
              <User className="size-3.5" />
              Primary contact: {outlet.contact_person}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
