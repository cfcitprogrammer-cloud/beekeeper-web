"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Building2,
  Download,
  Eye,
  MapPin,
  Pencil,
  Plus,
  Store,
  Trash2,
} from "lucide-react"

import { deleteOutlet } from "@/actions/outlet.action"
import { exportOutlets } from "@/actions/import-export.action"
import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { NativeSelect } from "@/components/ui/native-select"
import { toast } from "@/components/ui/toast"
import { humanize } from "@/lib/format"
import { OUTLET_STATUSES, type OutletWithRelations } from "@/types/database"

export function OutletsDirectory({
  outlets,
}: {
  outlets: OutletWithRelations[]
}) {
  const router = useRouter()
  const [status, setStatus] = React.useState("all")

  const filtered = React.useMemo(
    () =>
      outlets.filter((outlet) => {
        if (status !== "all" && outlet.status !== status) return false
        return true
      }),
    [outlets, status]
  )

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
      cell: (row) => <span className="text-xs tabular-nums">{row.geofence_radius_m}m</span>,
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
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="View outlet"
            render={<Link href={`/outlets/${row.id}`} />}
          >
            <Eye className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Edit outlet"
            render={<Link href={`/outlets/${row.id}/edit`} />}
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(e) => {
              e.stopPropagation()
              void deleteOutletHandler(row.id, row.name)
            }}
            aria-label="Delete outlet"
          >
            <Trash2 className="size-3.5 text-destructive" />
          </Button>
        </div>
      ),
    },
  ]

  return (
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
      onRowClick={(row) => router.push(`/outlets/${row.id}`)}
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
          <Button size="sm" render={<Link href="/outlets/new" />}>
            <Plus />
            Add outlet
          </Button>
        </>
      }
    />
  )
}
