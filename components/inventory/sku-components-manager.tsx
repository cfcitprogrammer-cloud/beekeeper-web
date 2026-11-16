"use client"

import * as React from "react"
import { Plus, Trash2 } from "lucide-react"

import {
  addSkuComponent,
  removeSkuComponent,
  updateSkuComponentQuantity,
} from "@/actions/sku-component.action"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/toast"
import { SkuCombobox } from "@/components/production/sku-combobox"
import type { Sku } from "@/types/database"
import type { SkuComponentWithSku } from "@/types/database"

export function SkuComponentsManager({
  parentId,
  skus,
  initialComponents,
}: {
  parentId: string
  skus: Sku[]
  initialComponents: SkuComponentWithSku[]
}) {
  const [components, setComponents] = React.useState(initialComponents)
  const [adding, setAdding] = React.useState(false)
  const [newComponentId, setNewComponentId] = React.useState("")
  const [newQuantity, setNewQuantity] = React.useState("1")
  const [saving, setSaving] = React.useState(false)

  const usedIds = React.useMemo(
    () => new Set(components.map((c) => c.component_sku_id)),
    [components]
  )

  async function handleAdd() {
    if (!newComponentId) {
      toast.add({ type: "error", title: "Select a component SKU" })
      return
    }
    const qty = Number(newQuantity)
    if (!Number.isFinite(qty) || qty <= 0) {
      toast.add({ type: "error", title: "Enter a valid quantity" })
      return
    }

    setSaving(true)
    const result = await addSkuComponent({
      parentSkuId: parentId,
      componentSkuId: newComponentId,
      quantity: qty,
    })
    setSaving(false)

    if (!result.success) {
      toast.add({ type: "error", title: "Could not add component", description: result.error })
      return
    }

    const sku = skus.find((s) => s.id === newComponentId)
    setComponents((current) => [
      ...current,
      {
        id: result.data.id,
        company_id: "",
        parent_sku_id: parentId,
        component_sku_id: newComponentId,
        quantity: qty,
        created_at: "",
        updated_at: "",
        component: sku
          ? {
              id: sku.id,
              sku_code: sku.sku_code,
              name: sku.name,
              brand: sku.brand,
              uom: sku.uom,
              is_active: sku.is_active,
            }
          : null,
      },
    ])
    setNewComponentId("")
    setNewQuantity("1")
    setAdding(false)
    toast.add({ type: "success", title: "Component added" })
  }

  async function handleQuantityChange(id: string, quantity: number) {
    if (!Number.isFinite(quantity) || quantity <= 0) return
    const result = await updateSkuComponentQuantity(id, quantity)
    if (!result.success) {
      toast.add({ type: "error", title: "Could not update", description: result.error })
      return
    }
    setComponents((current) =>
      current.map((c) => (c.id === id ? { ...c, quantity } : c))
    )
  }

  async function handleRemove(id: string) {
    const result = await removeSkuComponent(id)
    if (!result.success) {
      toast.add({ type: "error", title: "Could not remove", description: result.error })
      return
    }
    setComponents((current) => current.filter((c) => c.id !== id))
  }

  return (
    <div className="rounded-lg border bg-card p-4 sm:p-6">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Bill of materials</h3>
          <p className="text-[0.625rem] text-muted-foreground">
            Component SKUs that make up this SKU. Used to auto-expand lines when
            recording production usage.
          </p>
        </div>
        {!adding && (
          <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
            <Plus />
            Add component
          </Button>
        )}
      </div>

      {components.length === 0 && !adding ? (
        <p className="text-[0.625rem] text-muted-foreground">
          No components defined. This SKU is treated as a single item.
        </p>
      ) : null}

      {components.length > 0 ? (
        <div className="space-y-2">
          {components.map((component) => (
            <div
              key={component.id}
              className="grid gap-2 rounded-md border p-2 sm:grid-cols-[minmax(0,1fr)_6rem_auto]"
            >
              <div className="min-w-0">
                <p className="truncate text-xs font-medium">
                  {component.component?.name ?? "SKU removed"}
                </p>
                <p className="truncate font-mono text-[0.5625rem] text-muted-foreground">
                  {component.component?.sku_code ?? "—"} ·{" "}
                  {component.component?.uom ?? ""}
                </p>
              </div>
              <Input
                type="number"
                min={0}
                step="0.01"
                defaultValue={component.quantity}
                onBlur={(event) => {
                  const value = Number(event.target.value)
                  if (value !== component.quantity) handleQuantityChange(component.id, value)
                }}
                aria-label={`Quantity of ${component.component?.name ?? "component"}`}
              />
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => handleRemove(component.id)}
                aria-label="Remove component"
              >
                <Trash2 className="size-3.5 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      {adding ? (
        <div className="mt-3 space-y-2 rounded-md border border-dashed p-3">
          <div className="space-y-1.5">
            <Label>Component SKU</Label>
            <SkuCombobox
              skus={skus.map((s) => ({
                id: s.id,
                sku_code: s.sku_code,
                name: s.name,
                brand: s.brand,
                uom: s.uom,
                is_active: s.is_active,
              }))}
              value={newComponentId}
              onChange={setNewComponentId}
              usedIds={usedIds}
              placeholder="Search component SKU…"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Quantity per 1 unit of parent</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={newQuantity}
              onChange={(event) => setNewQuantity(event.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setAdding(false)
                setNewComponentId("")
                setNewQuantity("1")
              }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleAdd} disabled={saving}>
              {saving ? "Adding…" : "Add"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}