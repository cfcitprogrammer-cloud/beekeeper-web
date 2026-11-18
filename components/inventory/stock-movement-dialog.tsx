"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import {
  adjustWarehouseStock,
  issueWarehouseStock,
  receiveWarehouseStock,
  transferWarehouseStock,
  type StockMovementResult,
} from "@/actions/warehouse-stock.action"
import { SkuCombobox } from "@/components/production/sku-combobox"
import { Modal } from "@/components/shared/modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/native-select"
import { toast } from "@/components/ui/toast"
import type { ProductionSkuSummary } from "@/lib/data/operations"
import type { InventoryWarehouse } from "@/types/database"

export type StockMovementType =
  | "receipt"
  | "issue"
  | "adjustment"
  | "transfer"

const movementOptions: Array<{
  value: StockMovementType
  label: string
  description: string
}> = [
  {
    value: "receipt",
    label: "Receipt",
    description: "Add stock received into a warehouse.",
  },
  {
    value: "issue",
    label: "Issue",
    description: "Remove stock that was used, sold or delivered.",
  },
  {
    value: "adjustment",
    label: "Adjustment",
    description: "Correct the on-hand balance after a count.",
  },
  {
    value: "transfer",
    label: "Transfer",
    description: "Move stock from one warehouse to another.",
  },
]

export function StockMovementDialog({
  open,
  onOpenChange,
  warehouses,
  skus,
  defaultWarehouseId,
  defaultSkuId,
  defaultType = "receipt",
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  warehouses: InventoryWarehouse[]
  skus: ProductionSkuSummary[]
  defaultWarehouseId?: string
  defaultSkuId?: string
  defaultType?: StockMovementType
}) {
  const router = useRouter()
  const [type, setType] = React.useState<StockMovementType>(defaultType)
  const [warehouseId, setWarehouseId] = React.useState(
    defaultWarehouseId ?? ""
  )
  const [destinationId, setDestinationId] = React.useState("")
  const [skuId, setSkuId] = React.useState(defaultSkuId ?? "")
  const [quantity, setQuantity] = React.useState("1")
  const [direction, setDirection] = React.useState<"increase" | "decrease">(
    "increase"
  )
  const [reference, setReference] = React.useState("")
  const [notes, setNotes] = React.useState("")
  const [saving, setSaving] = React.useState(false)

  const activeWarehouses = React.useMemo(() => {
    const list = warehouses.filter((warehouse) => warehouse.is_active)
    const selected = warehouses.find(
      (warehouse) => warehouse.id === defaultWarehouseId
    )
    if (selected && !selected.is_active) return [...list, selected]
    return list
  }, [warehouses, defaultWarehouseId])

  const activeSkus = React.useMemo(
    () => skus.filter((sku) => sku.is_active),
    [skus]
  )

  const selectedMovement = movementOptions.find((option) => option.value === type)

  async function submitHandler() {
    const parsed = Number(quantity)
    if (!warehouseId) {
      toast.add({
        type: "error",
        title: "Missing warehouse",
        description: "Choose the warehouse for this movement.",
      })
      return
    }
    if (!skuId) {
      toast.add({
        type: "error",
        title: "Missing SKU",
        description: "Choose the item being moved.",
      })
      return
    }
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast.add({
        type: "error",
        title: "Invalid quantity",
        description: "Quantity must be greater than zero.",
      })
      return
    }
    if (type === "transfer" && !destinationId) {
      toast.add({
        type: "error",
        title: "Missing destination",
        description: "Choose the warehouse receiving the stock.",
      })
      return
    }
    if (type === "transfer" && destinationId === warehouseId) {
      toast.add({
        type: "error",
        title: "Same warehouse",
        description: "Choose a different destination warehouse.",
      })
      return
    }

    setSaving(true)
    let result: Awaited<ReturnType<typeof receiveWarehouseStock>>
    if (type === "receipt") {
      result = await receiveWarehouseStock({
        warehouseId,
        skuId,
        quantity: parsed,
        reference,
        notes,
      })
    } else if (type === "issue") {
      result = await issueWarehouseStock({
        warehouseId,
        skuId,
        quantity: parsed,
        reference,
        notes,
      })
    } else if (type === "adjustment") {
      result = await adjustWarehouseStock({
        warehouseId,
        skuId,
        quantity: parsed,
        direction,
        reference,
        notes,
      })
    } else {
      result = await transferWarehouseStock({
        fromWarehouseId: warehouseId,
        toWarehouseId: destinationId,
        skuId,
        quantity: parsed,
        notes,
      })
    }
    setSaving(false)

    if (!result.success) {
      toast.add({
        type: "error",
        title: "Could not record movement",
        description: result.error,
      })
      return
    }

    const data = result.data as StockMovementResult
    toast.add({
      type: "success",
      title: "Stock movement recorded",
      description: `${selectedMovement?.label ?? "Movement"} · ${Math.abs(
        data.quantity
      )} unit${Math.abs(data.quantity) === 1 ? "" : "s"}.`,
    })
    onOpenChange(false)
    router.refresh()
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Record stock movement"
      description={selectedMovement?.description}
      size="md"
      footer={
        <>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={submitHandler} disabled={saving}>
            {saving ? "Recording…" : "Record movement"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="movement-type">Movement type</Label>
          <NativeSelect
            id="movement-type"
            value={type}
            onChange={(event) =>
              setType(event.target.value as StockMovementType)
            }
            className="w-full"
          >
            {movementOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </NativeSelect>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="movement-warehouse">
              {type === "transfer" ? "From warehouse" : "Warehouse"}
            </Label>
            <NativeSelect
              id="movement-warehouse"
              value={warehouseId}
              onChange={(event) => setWarehouseId(event.target.value)}
              className="w-full"
            >
              <option value="">Select warehouse</option>
              {activeWarehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name} ({warehouse.code})
                </option>
              ))}
            </NativeSelect>
          </div>

          {type === "transfer" ? (
            <div className="space-y-1.5">
              <Label htmlFor="movement-destination">To warehouse</Label>
              <NativeSelect
                id="movement-destination"
                value={destinationId}
                onChange={(event) => setDestinationId(event.target.value)}
                className="w-full"
              >
                <option value="">Select destination</option>
                {activeWarehouses
                  .filter((warehouse) => warehouse.id !== warehouseId)
                  .map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name} ({warehouse.code})
                    </option>
                  ))}
              </NativeSelect>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="movement-quantity">Quantity</Label>
              <Input
                id="movement-quantity"
                type="number"
                inputMode="decimal"
                min="0.001"
                step="0.001"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
              />
            </div>
          )}
        </div>

        {type === "transfer" ? (
          <div className="space-y-1.5">
            <Label htmlFor="transfer-quantity">Quantity</Label>
            <Input
              id="transfer-quantity"
              type="number"
              inputMode="decimal"
              min="0.001"
              step="0.001"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
            />
          </div>
        ) : null}

        <div className="space-y-1.5">
          <Label>Item</Label>
          <SkuCombobox
            skus={activeSkus}
            value={skuId}
            onChange={setSkuId}
            ariaLabel="Stock item"
          />
        </div>

        {type === "adjustment" ? (
          <div className="space-y-1.5">
            <Label htmlFor="adjustment-direction">Correction</Label>
            <NativeSelect
              id="adjustment-direction"
              value={direction}
              onChange={(event) =>
                setDirection(event.target.value as "increase" | "decrease")
              }
              className="w-full"
            >
              <option value="increase">Increase on-hand balance</option>
              <option value="decrease">Decrease on-hand balance</option>
            </NativeSelect>
          </div>
        ) : null}

        {type !== "transfer" ? (
          <div className="space-y-1.5">
            <Label htmlFor="movement-reference">Reference</Label>
            <Input
              id="movement-reference"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="Delivery receipt, production batch, DR number…"
            />
          </div>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor="movement-notes">Notes</Label>
          <Input
            id="movement-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Optional remarks"
          />
        </div>
      </div>
    </Modal>
  )
}
