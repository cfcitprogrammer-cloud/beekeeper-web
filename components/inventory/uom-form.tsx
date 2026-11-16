"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus, Save } from "lucide-react"

import {
  createInventoryUom,
  updateInventoryUom,
} from "@/actions/inventory-uom.action"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/native-select"
import { toast } from "@/components/ui/toast"
import type { InventoryUom } from "@/types/database"

export function InventoryUomForm({
  uom,
}: {
  uom?: InventoryUom | null
}) {
  const router = useRouter()
  const editingId = uom?.id ?? null
  const [saving, setSaving] = React.useState(false)
  const [draft, setDraft] = React.useState({
    code: uom?.code ?? "",
    name: uom?.name ?? "",
    description: uom?.description ?? "",
    is_active: uom ? (uom.is_active ? "true" : "false") : "true",
  })

  async function saveHandler() {
    if (!editingId && !draft.code.trim()) {
      toast.add({
        type: "error",
        title: "Missing details",
        description: "Unit code is required.",
      })
      return
    }
    if (!draft.name.trim()) {
      toast.add({
        type: "error",
        title: "Missing details",
        description: "Unit name is required.",
      })
      return
    }

    setSaving(true)
    const common = {
      name: draft.name,
      description: draft.description,
      isActive: draft.is_active === "true",
    }
    const result = editingId
      ? await updateInventoryUom({ ...common, id: editingId })
      : await createInventoryUom({ ...common, code: draft.code })
    setSaving(false)

    if (!result.success) {
      toast.add({
        type: "error",
        title: editingId ? "Could not update unit" : "Could not create unit",
        description: result.error,
      })
      return
    }

    toast.add({
      type: "success",
      title: editingId ? "Unit updated" : "Unit created",
      description: `${draft.name.trim()} saved.`,
    })
    router.push("/inventory/uoms")
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <Button
        variant="outline"
        size="sm"
        onClick={() => router.push("/inventory/uoms")}
      >
        <ArrowLeft />
        Back to units
      </Button>

      <div className="rounded-lg border bg-card p-4 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="uom-code">Code</Label>
            <Input
              id="uom-code"
              value={draft.code}
              disabled={Boolean(editingId)}
              onChange={(event) =>
                setDraft({ ...draft, code: event.target.value.toUpperCase() })
              }
              placeholder="PACK"
              maxLength={16}
            />
            <p className="text-[0.625rem] text-muted-foreground">
              {editingId
                ? "Codes cannot be changed after creation so existing SKUs and usage history stay consistent."
                : "Short code stored on SKUs and production usage, for example PACK or ML."}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="uom-name">Name</Label>
            <Input
              id="uom-name"
              value={draft.name}
              onChange={(event) =>
                setDraft({ ...draft, name: event.target.value })
              }
              placeholder="Pack"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="uom-description">Description</Label>
            <Input
              id="uom-description"
              value={draft.description}
              onChange={(event) =>
                setDraft({ ...draft, description: event.target.value })
              }
              placeholder="Optional notes about this unit"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="uom-status">Status</Label>
            <NativeSelect
              id="uom-status"
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
              Inactive units stay on existing SKUs but are not offered for new
              ones.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t pt-4">
          <Button
            variant="outline"
            onClick={() => router.push("/inventory/uoms")}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={saveHandler} disabled={saving}>
            {editingId ? <Save /> : <Plus />}
            {saving ? "Saving…" : editingId ? "Save changes" : "Create unit"}
          </Button>
        </div>
      </div>
    </div>
  )
}
