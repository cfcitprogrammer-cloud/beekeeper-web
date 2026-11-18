"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus, Save } from "lucide-react"

import {
  createInventoryWarehouse,
  updateInventoryWarehouse,
} from "@/actions/inventory-warehouse.action"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import type { InventoryWarehouse } from "@/types/database"

export function InventoryWarehouseForm({
  warehouse,
}: {
  warehouse?: InventoryWarehouse | null
}) {
  const router = useRouter()
  const editingId = warehouse?.id ?? null
  const [saving, setSaving] = React.useState(false)
  const [draft, setDraft] = React.useState({
    code: warehouse?.code ?? "",
    name: warehouse?.name ?? "",
    address: warehouse?.address ?? "",
    contact_person: warehouse?.contact_person ?? "",
    phone: warehouse?.phone ?? "",
    email: warehouse?.email ?? "",
    notes: warehouse?.notes ?? "",
    is_active: warehouse ? (warehouse.is_active ? "true" : "false") : "true",
  })

  async function saveHandler() {
    if (!editingId && !draft.code.trim()) {
      toast.add({
        type: "error",
        title: "Missing details",
        description: "Warehouse code is required.",
      })
      return
    }
    if (!draft.name.trim()) {
      toast.add({
        type: "error",
        title: "Missing details",
        description: "Warehouse name is required.",
      })
      return
    }

    setSaving(true)
    const common = {
      name: draft.name,
      address: draft.address,
      contactPerson: draft.contact_person,
      phone: draft.phone,
      email: draft.email,
      notes: draft.notes,
      isActive: draft.is_active === "true",
    }
    const result = editingId
      ? await updateInventoryWarehouse({ ...common, id: editingId })
      : await createInventoryWarehouse({ ...common, code: draft.code })
    setSaving(false)

    if (!result.success) {
      toast.add({
        type: "error",
        title: editingId
          ? "Could not update warehouse"
          : "Could not create warehouse",
        description: result.error,
      })
      return
    }

    toast.add({
      type: "success",
      title: editingId ? "Warehouse updated" : "Warehouse created",
      description: `${draft.name.trim()} saved.`,
    })
    router.push("/inventory/warehouses")
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <Button
        variant="outline"
        size="sm"
        onClick={() => router.push("/inventory/warehouses")}
      >
        <ArrowLeft />
        Back to warehouses
      </Button>

      <div className="rounded-lg border bg-card p-4 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="warehouse-code">Code</Label>
            <Input
              id="warehouse-code"
              value={draft.code}
              disabled={Boolean(editingId)}
              onChange={(event) =>
                setDraft({ ...draft, code: event.target.value.toUpperCase() })
              }
              placeholder="WH-CENTRAL"
              maxLength={24}
            />
            <p className="text-[0.625rem] text-muted-foreground">
              {editingId
                ? "Codes cannot be changed after creation so SKU labels and exports stay stable."
                : "Short code used to label SKUs and in catalog imports."}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="warehouse-name">Name</Label>
            <Input
              id="warehouse-name"
              value={draft.name}
              onChange={(event) =>
                setDraft({ ...draft, name: event.target.value })
              }
              placeholder="Central warehouse"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="warehouse-address">Address</Label>
            <Input
              id="warehouse-address"
              value={draft.address}
              onChange={(event) =>
                setDraft({ ...draft, address: event.target.value })
              }
              placeholder="12 Mabini St, Quezon City"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="warehouse-contact">Contact person</Label>
            <Input
              id="warehouse-contact"
              value={draft.contact_person}
              onChange={(event) =>
                setDraft({ ...draft, contact_person: event.target.value })
              }
              placeholder="Ana Reyes"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="warehouse-phone">Phone</Label>
            <Input
              id="warehouse-phone"
              value={draft.phone}
              onChange={(event) =>
                setDraft({ ...draft, phone: event.target.value })
              }
              placeholder="+63 917 000 0000"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="warehouse-email">Email</Label>
            <Input
              id="warehouse-email"
              type="email"
              value={draft.email}
              onChange={(event) =>
                setDraft({ ...draft, email: event.target.value })
              }
              placeholder="warehouse@example.com"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="warehouse-status">Status</Label>
            <NativeSelect
              id="warehouse-status"
              value={draft.is_active}
              onChange={(event) =>
                setDraft({ ...draft, is_active: event.target.value })
              }
              className="w-full"
            >
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </NativeSelect>
            <p className="text-[0.625rem] text-muted-foreground">
              Inactive warehouses stay on existing SKU labels but are not offered
              for new ones.
            </p>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="warehouse-notes">Notes</Label>
            <Textarea
              id="warehouse-notes"
              value={draft.notes}
              onChange={(event) =>
                setDraft({ ...draft, notes: event.target.value })
              }
              placeholder="Optional operating hours, access instructions or internal notes"
            />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t pt-4">
          <Button
            variant="outline"
            onClick={() => router.push("/inventory/warehouses")}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={saveHandler} disabled={saving}>
            {editingId ? <Save /> : <Plus />}
            {saving
              ? "Saving…"
              : editingId
                ? "Save changes"
                : "Create warehouse"}
          </Button>
        </div>
      </div>
    </div>
  )
}
