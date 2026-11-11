"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, FlaskConical, UserRound } from "lucide-react"

import { createProductionUsage } from "@/actions/production.action"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/native-select"
import { toast } from "@/components/ui/toast"
import type {
  ProductionPipelineWithRelations,
  ProductionStageWithRelations,
} from "@/lib/data/operations"

export function UsageForm({
  pipelines,
  stages,
  defaultPipelineId,
  defaultDate,
}: {
  pipelines: ProductionPipelineWithRelations[]
  stages: ProductionStageWithRelations[]
  defaultPipelineId?: string
  defaultDate: string
}) {
  const router = useRouter()
  const [saving, setSaving] = React.useState(false)
  const [pipelineId, setPipelineId] = React.useState(defaultPipelineId ?? "")
  const [stageId, setStageId] = React.useState("")
  const [skuId, setSkuId] = React.useState("")
  const [quantity, setQuantity] = React.useState("")
  const [uom, setUom] = React.useState("")
  const [usageDate, setUsageDate] = React.useState(defaultDate)
  const [notes, setNotes] = React.useState("")

  const pipelineStages = React.useMemo(
    () => stages.filter((stage) => stage.pipeline_id === pipelineId),
    [stages, pipelineId]
  )
  const selectedStage =
    pipelineStages.find((stage) => stage.id === stageId) ?? null
  const stageSkus = selectedStage?.skus ?? []
  const selectedSku = stageSkus.find((sku) => sku.id === skuId) ?? null

  function choosePipeline(value: string) {
    setPipelineId(value)
    setStageId("")
    setSkuId("")
    setUom("")
  }

  function chooseStage(value: string) {
    const stage = pipelineStages.find((item) => item.id === value) ?? null
    setStageId(value)
    setSkuId("")
    setUom(stage?.output_uom ?? "")
  }

  function chooseSku(value: string) {
    const sku = stageSkus.find((item) => item.id === value) ?? null
    setSkuId(value)
    setUom(sku?.uom ?? selectedStage?.output_uom ?? "")
  }

  async function save() {
    if (!pipelineId) {
      toast.add({ type: "error", title: "Select a pipeline" })
      return
    }
    if (!stageId) {
      toast.add({ type: "error", title: "Select a stage" })
      return
    }
    if (!skuId) {
      toast.add({ type: "error", title: "Select a SKU assigned to the stage" })
      return
    }
    const parsedQuantity = Number(quantity)
    if (!Number.isFinite(parsedQuantity) || parsedQuantity < 0) {
      toast.add({ type: "error", title: "Enter a valid usage quantity" })
      return
    }

    setSaving(true)
    const result = await createProductionUsage({
      pipelineId,
      stageId,
      skuId,
      quantity: parsedQuantity,
      uom,
      usageDate,
      notes,
    })
    setSaving(false)

    if (!result.success) {
      toast.add({
        type: "error",
        title: "Could not record usage",
        description: result.error,
      })
      return
    }

    toast.add({
      type: "success",
      title: "Production usage recorded",
      description: `${parsedQuantity} ${uom || "unit(s)"} of ${
        selectedSku?.name ?? "SKU"
      } at ${selectedStage?.name ?? "stage"}.`,
    })
    router.push("/production/usage")
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <Button
        variant="outline"
        size="sm"
        onClick={() => router.push("/production/usage")}
      >
        <ArrowLeft />
        Back to usage
      </Button>

      <div className="rounded-lg border bg-card p-4 sm:p-6">
        <div className="mb-4 flex items-start gap-2 rounded-md border bg-muted/30 p-3 text-[0.625rem] text-muted-foreground">
          <UserRound className="mt-0.5 size-3.5" />
          <p>
            This usage entry is recorded against your signed-in account. The
            pipeline controls the stages, and each stage only accepts SKUs
            assigned to it.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="usage-pipeline">Pipeline</Label>
            <NativeSelect
              id="usage-pipeline"
              value={pipelineId}
              onChange={(event) => choosePipeline(event.target.value)}
              className="w-full"
            >
              <option value="">Select pipeline</option>
              {pipelines.map((pipeline) => (
                <option key={pipeline.id} value={pipeline.id}>
                  {pipeline.name} · {pipeline.code}
                </option>
              ))}
            </NativeSelect>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="usage-stage">Stage</Label>
            <NativeSelect
              id="usage-stage"
              value={stageId}
              onChange={(event) => chooseStage(event.target.value)}
              className="w-full"
              disabled={!pipelineId || pipelineStages.length === 0}
            >
              <option value="">
                {!pipelineId
                  ? "Select a pipeline first"
                  : pipelineStages.length === 0
                    ? "This pipeline has no stages"
                    : "Select stage"}
              </option>
              {pipelineStages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.sequence}. {stage.name}
                </option>
              ))}
            </NativeSelect>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="usage-sku">SKU assigned to the stage</Label>
            <NativeSelect
              id="usage-sku"
              value={skuId}
              onChange={(event) => chooseSku(event.target.value)}
              className="w-full"
              disabled={!selectedStage || stageSkus.length === 0}
            >
              <option value="">
                {!selectedStage
                  ? "Select a stage first"
                  : stageSkus.length === 0
                    ? "No SKUs assigned to this stage"
                    : "Select SKU"}
              </option>
              {stageSkus.map((sku) => (
                <option key={sku.id} value={sku.id}>
                  {sku.sku_code} · {sku.name} ({sku.uom})
                </option>
              ))}
            </NativeSelect>
            {selectedStage && stageSkus.length === 0 ? (
              <p className="text-[0.625rem] text-muted-foreground">
                Assign SKUs to this stage from the production stages page before
                recording usage.
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="usage-quantity">Usage quantity</Label>
            <Input
              id="usage-quantity"
              type="number"
              min={0}
              step="0.01"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              disabled={!selectedSku}
              placeholder="0"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="usage-uom">UOM</Label>
            <Input
              id="usage-uom"
              value={uom}
              onChange={(event) => setUom(event.target.value)}
              placeholder="kg, L, pcs"
              disabled={!selectedSku}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="usage-date">Usage date</Label>
            <Input
              id="usage-date"
              type="date"
              value={usageDate}
              onChange={(event) => setUsageDate(event.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="usage-notes">Notes</Label>
            <Input
              id="usage-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Optional"
            />
          </div>
        </div>

        {selectedSku ? (
          <div className="mt-4 rounded-md border bg-muted/30 p-3 text-[0.625rem] text-muted-foreground">
            Recording usage for{" "}
            <span className="font-medium text-foreground">
              {selectedSku.sku_code} · {selectedSku.name}
            </span>{" "}
            at{" "}
            <span className="font-medium text-foreground">
              {selectedStage?.sequence}. {selectedStage?.name}
            </span>
            .
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t pt-4">
          <Button
            variant="outline"
            onClick={() => router.push("/production/usage")}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={save}
            disabled={saving || !selectedSku || !usageDate}
          >
            <FlaskConical />
            {saving ? "Recording…" : "Record usage"}
          </Button>
        </div>
      </div>
    </div>
  )
}
