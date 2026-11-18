"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { MapPin, Pencil, Plus, Trash2, Warehouse } from "lucide-react"

import { deleteInventoryWarehouse } from "@/actions/inventory-warehouse.action"
import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import { InventoryWarehouse } from "@/types/database"
import { WarehouseImportExport } from "@/components/inventory/warehouse-import-export"

export function InventoryWarehousesManager({
  warehouses,
  canImport = false,
}: {
  warehouses: InventoryWarehouse[]
  canImport?: boolean
}) {
  const router = useRouter()

  async function deleteHandler(id: string, name: string) {
    if (!window.confirm(`Delete warehouse "${name}"? This cannot be undone.`)) {
      return
    }
    const result = await deleteInventoryWarehouse(id)
    if (!result.success) {
      toast.add({
        type: "error",
        title: "Could not delete warehouse",
        description: result.error,
      })
      return
    }
    toast.add({
      type: "success",
      title: "Warehouse deleted",
      description: `${name} was removed.`,
    })
    router.refresh()
  }

  const columns: DataTableColumn<InventoryWarehouse>[] = [
    {
      id: "warehouse",
      header: "Warehouse",
      sortValue: (row) => row.name,
      cell: (row) => (
        <div>
          <p className="text-xs font-medium">{row.name}</p>
          <p className="font-mono text-[0.625rem] text-muted-foreground">
            {row.code}
          </p>
        </div>
      ),
    },
    {
      id: "address",
      header: "Location",
      hideBelow: "lg",
      sortValue: (row) => row.address ?? "",
      cell: (row) => (
        <span className="flex items-start gap-1 text-[0.625rem] text-muted-foreground">
          {row.address ? (
            <>
              <MapPin className="mt-0.5 size-3 shrink-0" />
              <span className="line-clamp-2 max-w-64">{row.address}</span>
            </>
          ) : (
            "—"
          )}
        </span>
      ),
    },
    {
      id: "contact",
      header: "Contact",
      hideBelow: "md",
      sortValue: (row) => row.contact_person ?? "",
      cell: (row) => (
        <div className="text-[0.625rem]">
          <p className="text-foreground">{row.contact_person || "—"}</p>
          <p className="text-muted-foreground">{row.phone || row.email || ""}</p>
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      sortValue: (row) => (row.is_active ? 1 : 0),
      cell: (row) => (
        <StatusBadge
          status={row.is_active ? "ACTIVE" : "INACTIVE"}
          label={row.is_active ? "Active" : "Inactive"}
        />
      ),
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
            aria-label="Edit warehouse"
            render={<Link href={`/inventory/warehouses/${row.id}/edit`} />}
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(event) => {
              event.stopPropagation()
              void deleteHandler(row.id, row.name)
            }}
            aria-label="Delete warehouse"
          >
            <Trash2 className="size-3.5 text-destructive" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <DataTable
      data={warehouses}
      columns={columns}
      getRowId={(row) => row.id}
      searchable={(row) =>
        [
          row.code,
          row.name,
          row.address,
          row.contact_person,
          row.phone,
          row.email,
          row.notes,
        ]
          .filter(Boolean)
          .join(" ")
      }
      searchPlaceholder="Search warehouses…"
      initialSort={{ id: "warehouse", desc: false }}
      pageSize={10}
      emptyTitle="No warehouses yet"
      emptyDescription="Add the warehouses used to label where inventory items belong."
      emptyIcon={Warehouse}
      onRowClick={(row) => router.push(`/inventory/warehouses/${row.id}`)}
      toolbar={
        <>
          <WarehouseImportExport canImport={canImport} warehouses={warehouses} />
          <Button size="sm" render={<Link href="/inventory/warehouses/new" />}>
            <Plus />
            New warehouse
          </Button>
        </>
      }
    />
  )
}
