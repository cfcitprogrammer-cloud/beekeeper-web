"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, FlaskConical, Plus, Trash2, UserRound } from "lucide-react"

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

type UsageLine = {
  key: string
  skuId: string
  quantity: string
}

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
  const lineCounter = React.useRef(0)
  const [saving, setSaving] = React.useState(false)
  const [pipelineId, setPipelineId] = React.useState(defaultPipelineId ?? "")
  const [stageId, setStageId] = React.useState("")
  const [lines, setLines] = React.useState<UsageLine[]>([
    { key: "usage-line-initial", skuId: "", quantity: "" },
  ])
  const [usageDate, setUsageDate] = React.useState(defaultDate)
  const [notes, setNotes] = React.useState("")

  function nextLine(): UsageLine {
    lineCounter.current += 1
    return { key: `usage-line-${lineCounter.current}`, skuId: "", quantity: "" }
  }

  const pipelineStages = React.useMemo(
    () => stages.filter((stage) => stage.pipeline_id === pipelineId),
    [stages, pipelineId]
  )
  const selectedStage =
    pipelineStages.find((stage) => stage.id === stageId) ?? null
  const stageSkus = selectedStage?.skus ?? []

  function choosePipeline(value: string) {
    setPipelineId(value)
    setStageId("")
    setLines([nextLine()])
  }

  function chooseStage(value: string) {
    setStageId(value)
    setLines([nextLine()])
  }

  function chooseSku(key: string, skuId: string) {
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, skuId } : line))
    )
  }

  function setQuantity(key: string, quantity: string) {
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, quantity } : line))
    )
  }

  function addLine() {
    setLines((current) => [...current, nextLine()])
  }

  function removeLine(key: string) {
    setLines((current) =>
      current.length === 1
        ? current
        : current.filter((line) => line.key !== key)
    )
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

    const selectedLines = lines.filter((line) => line.skuId)
    const items = selectedLines.map((line) => ({
      skuId: line.skuId,
      quantity: Number(line.quantity),
    }))

    if (items.length === 0) {
      toast.add({ type: "error", title: "Select at least one SKU" })
      return
    }
    if (
      selectedLines.some(
        (line) =>
          line.quantity.trim() === "" ||
          !Number.isFinite(Number(line.quantity)) ||
          Number(line.quantity) < 0
      )
    ) {
      toast.add({
        type: "error",
        title: "Enter a valid quantity for every selected SKU",
      })
      return
    }

    setSaving(true)
    const result = await createProductionUsage({
      pipelineId,
      stageId,
      items,
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
      description: `${result.data.created} SKU line(s) recorded at ${
        selectedStage?.name ?? "the stage"
      }.`,
    })
    router.push("/production/usage/my")
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
            This usage entry is recorded against your signed-in account. Pick a
            pipeline and stage, then add one or more SKUs assigned to that
            stage. Each SKU uses its own unit of measure.
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
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label>SKUs and quantities</Label>
            <span className="text-[0.625rem] text-muted-foreground">
              {lines.filter((line) => line.skuId).length} SKU(s) selected
            </span>
          </div>

          {lines.map((line, index) => {
            const selectedSku =
              stageSkus.find((sku) => sku.id === line.skuId) ?? null

            return (
              <div
                key={line.key}
                className="grid gap-2 rounded-md border p-2 sm:grid-cols-[minmax(0,1fr)_9rem_auto]"
              >
                <NativeSelect
                  value={line.skuId}
                  onChange={(event) =>
                    chooseSku(line.key, event.target.value)
                  }
                  className="w-full"
                  disabled={!selectedStage || stageSkus.length === 0}
                  aria-label={`SKU line ${index + 1}`}
                >
                  <option value="">
                    {!selectedStage
                      ? "Select a stage first"
                      : stageSkus.length === 0
                        ? "No SKUs assigned to this stage"
                        : "Select SKU"}
                  </option>
                  {stageSkus.map((sku) => (
                    <option
                      key={sku.id}
                      value={sku.id}
                      disabled={lines.some(
                        (other) =>
                          other.key !== line.key && other.skuId === sku.id
                      )}
                    >
                      {sku.sku_code} · {sku.name} ({sku.uom})
                    </option>
                  ))}
                </NativeSelect>

                <div className="relative">
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={line.quantity}
                    onChange={(event) =>
                      setQuantity(line.key, event.target.value)
                    }
                    disabled={!selectedSku}
                    placeholder="Quantity"
                    aria-label={`Quantity for SKU line ${index + 1}`}
                    className="pr-10"
                  />
                  <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-[0.625rem] text-muted-foreground">
                    {selectedSku?.uom ?? "—"}
                  </span>
                </div>

                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeLine(line.key)}
                  disabled={lines.length === 1}
                  aria-label={`Remove SKU line ${index + 1}`}
                >
                  <Trash2 className="size-3.5 text-destructive" />
                </Button>
              </div>
            )
          })}

          {selectedStage && stageSkus.length === 0 ? (
            <p className="text-[0.625rem] text-muted-foreground">
              Assign SKUs to this stage from the production stages page before
              recording usage.
            </p>
          ) : null}

          <Button
            variant="outline"
            size="sm"
            onClick={addLine}
            disabled={!selectedStage || stageSkus.length === 0}
          >
            <Plus />
            Add another SKU
          </Button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
            disabled={saving || !selectedStage || !usageDate}
          >
            <FlaskConical />
            {saving ? "Recording…" : "Record usage"}
          </Button>
        </div>
      </div>
    </div>
  )
}
