"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus, Save } from "lucide-react"

import { createSku, updateSku } from "@/actions/sku.action"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/native-select"
import { toast } from "@/components/ui/toast"
import { humanize } from "@/lib/format"
import type { SkuCategory, SkuWithCategory } from "@/types/database"

const emptyDraft = {
  name: "",
  sku_code: "",
  category_id: "",
  brand: "",
  barcode: "",
  uom: "PACK",
  unit_price: "0",
  tax_rate: "12",
  is_active: "true",
}

export function SkuForm({
  sku,
  categories,
}: {
  sku?: SkuWithCategory | null
  categories: SkuCategory[]
}) {
  const router = useRouter()
  const editingId = sku?.id ?? null
  const [saving, setSaving] = React.useState(false)
  const [draft, setDraft] = React.useState(() =>
    sku
      ? {
          name: sku.name,
          sku_code: sku.sku_code,
          category_id: sku.category_id ?? "",
          brand: sku.brand ?? "",
          barcode: sku.barcode ?? "",
          uom: sku.uom,
          unit_price: String(sku.unit_price),
          tax_rate: String(sku.tax_rate),
          is_active: sku.is_active ? "true" : "false",
        }
      : { ...emptyDraft, category_id: categories[0]?.id ?? "" }
  )

  async function saveSkuHandler() {
    if (!draft.name.trim() || !draft.sku_code.trim()) {
      toast.add({
        type: "error",
        title: "Missing details",
        description: "Name and SKU code are required.",
      })
      return
    }

    setSaving(true)
    const payload = {
      name: draft.name,
      skuCode: draft.sku_code,
      categoryId: draft.category_id || undefined,
      brand: draft.brand,
      barcode: draft.barcode,
      uom: draft.uom,
      unitPrice: Number(draft.unit_price) || 0,
      taxRate: Number(draft.tax_rate) || 0,
      isActive: draft.is_active === "true",
    }

    const result = editingId
      ? await updateSku({ ...payload, id: editingId })
      : await createSku(payload)
    setSaving(false)

    if (!result.success) {
      toast.add({
        type: "error",
        title: editingId ? "Could not update SKU" : "Could not create SKU",
        description: result.error,
      })
      return
    }

    toast.add({
      type: "success",
      title: editingId ? "SKU updated" : "SKU created",
      description: editingId
        ? `${draft.name.trim()} was updated.`
        : `${draft.name.trim()} is now available in the catalog.`,
    })
    router.push("/inventory/skus")
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <Button
        variant="outline"
        size="sm"
        onClick={() => router.push("/inventory/skus")}
      >
        <ArrowLeft />
        Back to SKUs
      </Button>

      <div className="rounded-lg border bg-card p-4 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="sku-name">Product name</Label>
            <Input
              id="sku-name"
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              placeholder="Brewed Iced Tea 500ml"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sku-code">SKU code</Label>
            <Input
              id="sku-code"
              value={draft.sku_code}
              onChange={(event) => setDraft({ ...draft, sku_code: event.target.value })}
              placeholder="BEV-1006"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sku-category">Category</Label>
            <NativeSelect
              id="sku-category"
              value={draft.category_id}
              onChange={(event) => setDraft({ ...draft, category_id: event.target.value })}
              className="w-full"
            >
              <option value="">No category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sku-brand">Brand</Label>
            <Input
              id="sku-brand"
              value={draft.brand}
              onChange={(event) => setDraft({ ...draft, brand: event.target.value })}
              placeholder="House brand"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sku-barcode">Barcode</Label>
            <Input
              id="sku-barcode"
              value={draft.barcode}
              onChange={(event) => setDraft({ ...draft, barcode: event.target.value })}
              placeholder="4800000000000"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sku-uom">Unit of measure</Label>
            <NativeSelect
              id="sku-uom"
              value={draft.uom}
              onChange={(event) => setDraft({ ...draft, uom: event.target.value })}
              className="w-full"
            >
              {["PACK", "BOTTLE", "CAN", "BOX", "CARTON", "BAR", "TUBE", "JAR", "TUB"].map(
                (value) => (
                  <option key={value} value={value}>
                    {humanize(value)}
                  </option>
                )
              )}
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sku-price">Selling price (PHP)</Label>
            <Input
              id="sku-price"
              type="number"
              min={0}
              step="0.01"
              value={draft.unit_price}
              onChange={(event) => setDraft({ ...draft, unit_price: event.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sku-tax">Tax rate (%)</Label>
            <Input
              id="sku-tax"
              type="number"
              min={0}
              max={100}
              value={draft.tax_rate}
              onChange={(event) => setDraft({ ...draft, tax_rate: event.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sku-status">Status</Label>
            <NativeSelect
              id="sku-status"
              value={draft.is_active}
              onChange={(event) => setDraft({ ...draft, is_active: event.target.value })}
              className="w-full"
            >
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </NativeSelect>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={() => router.push("/inventory/skus")} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={saveSkuHandler} disabled={saving}>
            {editingId ? <Save /> : <Plus />}
            {saving ? "Saving…" : editingId ? "Save changes" : "Create SKU"}
          </Button>
        </div>
      </div>
    </div>
  )
}
