"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, FlaskConical, Plus, Trash2, UserRound } from "lucide-react"

import { createProductionUsage } from "@/actions/production.action"
import { SkuCombobox } from "@/components/production/sku-combobox"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/native-select"
import { toast } from "@/components/ui/toast"
import { formatNumber } from "@/lib/format"
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
  const stageSkus = React.useMemo(
    () => selectedStage?.skus ?? [],
    [selectedStage]
  )
  // Only BOM SKUs (SKUs with components) may be added as top-level entries;
  // their component lines are auto-added. Component SKUs themselves are never
  // picked manually as a parent line.
  const bomStageSkus = React.useMemo(
    () => stageSkus.filter((sku) => (sku.components?.length ?? 0) > 0),
    [stageSkus]
  )
  const selectedSkuIds = React.useMemo(
    () => new Set(lines.map((line) => line.skuId).filter(Boolean)),
    [lines]
  )
  const allBomSkusSelected =
    bomStageSkus.length > 0 &&
    bomStageSkus.every((sku) => selectedSkuIds.has(sku.id))

  // Bill of materials relationships within this entry: which lines are parents
  // and which are auto-added components of a parent.
  const bomLinks = React.useMemo(() => {
    const parents = new Set<string>()
    const componentToParent = new Map<string, string>()
    for (const line of lines) {
      const sku = stageSkus.find((item) => item.id === line.skuId)
      if (!sku?.components?.length) continue
      parents.add(sku.id)
      for (const comp of sku.components) {
        if (!componentToParent.has(comp.componentSkuId)) {
          componentToParent.set(comp.componentSkuId, sku.id)
        }
      }
    }
    return { parents, componentToParent }
  }, [lines, stageSkus])

  // Group lines into trees: a parent SKU followed by its component lines.
  const bomGroups = React.useMemo(() => {
    const groups: { parent: UsageLine; children: UsageLine[] }[] = []
    const consumed = new Set<string>()
    for (const line of lines) {
      if (bomLinks.componentToParent.has(line.skuId)) continue
      const sku = stageSkus.find((item) => item.id === line.skuId)
      const compIds = new Set(
        (sku?.components ?? []).map((c) => c.componentSkuId)
      )
      const children = lines.filter(
        (l) => l.key !== line.key && compIds.has(l.skuId)
      )
      groups.push({ parent: line, children })
      consumed.add(line.key)
      children.forEach((c) => consumed.add(c.key))
    }
    for (const line of lines) {
      if (consumed.has(line.key)) continue
      groups.push({ parent: line, children: [] })
      consumed.add(line.key)
    }
    return groups
  }, [lines, bomLinks, stageSkus])

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
    setLines((current) => {
      const updated = current.map((line) =>
        line.key === key ? { ...line, skuId } : line
      )

      if (!skuId) return updated
      const sku = stageSkus.find((s) => s.id === skuId)
      if (!sku?.components?.length) return updated

      const existingIds = new Set(
        updated.map((line) => line.skuId).filter(Boolean)
      )
      const parentLine = updated.find((line) => line.key === key)
      const parentQty = Number(parentLine?.quantity) || 1

      const toAdd: UsageLine[] = []
      for (const comp of sku.components) {
        if (existingIds.has(comp.componentSkuId)) continue
        const compSku = stageSkus.find((s) => s.id === comp.componentSkuId)
        if (!compSku) continue
        existingIds.add(comp.componentSkuId)
        lineCounter.current += 1
        toAdd.push({
          key: `usage-line-${lineCounter.current}`,
          skuId: comp.componentSkuId,
          quantity: String(parentQty * comp.quantity),
        })
      }

      if (toAdd.length === 0) return updated
      return [...updated, ...toAdd]
    })
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
    setLines((current) => {
      if (current.length === 1) return current

      const target = current.find((line) => line.key === key)
      const targetSku = stageSkus.find((sku) => sku.id === target?.skuId)
      const removedCompIds = new Set(
        (targetSku?.components ?? []).map((comp) => comp.componentSkuId)
      )

      // Drop the selected line first.
      const remaining = current.filter((line) => line.key !== key)

      // If the removed line was a BOM parent, also drop its component lines,
      // unless another still-selected parent still needs that component.
      if (removedCompIds.size > 0) {
        const stillNeeded = new Set<string>()
        for (const line of remaining) {
          const sku = stageSkus.find((item) => item.id === line.skuId)
          for (const comp of sku?.components ?? []) {
            stillNeeded.add(comp.componentSkuId)
          }
        }
        const filtered = remaining.filter((line) => {
          if (!removedCompIds.has(line.skuId)) return true
          return stillNeeded.has(line.skuId)
        })
        return filtered.length > 0 ? filtered : [nextLine()]
      }

      return remaining.length > 0 ? remaining : [nextLine()]
    })
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

    // Bill of materials: a parent SKU cannot be submitted unless every one of
    // its component SKUs is also on the entry with a filled (zero allowed)
    // quantity.
    for (const line of selectedLines) {
      const sku = stageSkus.find((item) => item.id === line.skuId)
      if (!sku?.components?.length) continue
      const availableComponents = sku.components.filter((comp) =>
        stageSkus.some((s) => s.id === comp.componentSkuId)
      )
      for (const comp of availableComponents) {
        const compSku = stageSkus.find((s) => s.id === comp.componentSkuId)
        const compLine = selectedLines.find(
          (item) => item.skuId === comp.componentSkuId
        )
        if (!compLine) {
          toast.add({
            type: "error",
            title: "Missing component",
            description: `${sku.sku_code} requires ${compSku?.sku_code ?? "a component"} — add it before saving.`,
          })
          return
        }
        if (
          compLine.quantity.trim() === "" ||
          !Number.isFinite(Number(compLine.quantity)) ||
          Number(compLine.quantity) < 0
        ) {
          toast.add({
            type: "error",
            title: "Enter a quantity for the component",
            description: `${compSku?.sku_code ?? "Component"} quantity is required (zero is allowed).`,
          })
          return
        }
      }
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
              {selectedStage && stageSkus.length > 0
                ? `${formatNumber(stageSkus.length)} SKU${
                    stageSkus.length === 1 ? "" : "s"
                  } on this stage · `
                : ""}
              {lines.filter((line) => line.skuId).length} selected · type to
              search
            </span>
          </div>

          {bomGroups.map((group) => {
            const parentSku =
              stageSkus.find((sku) => sku.id === group.parent.skuId) ?? null
            const isParent = Boolean(
              parentSku && (parentSku.components?.length ?? 0) > 0
            )
            const renderLine = (
              line: (typeof lines)[number],
              opts: { component: boolean; parentSku: typeof parentSku }
            ) => {
              const selectedSku =
                stageSkus.find((sku) => sku.id === line.skuId) ?? null
              return (
                <div
                  key={line.key}
                  className={
                    opts.component
                      ? "grid items-end gap-2 rounded-md border border-l-2 border-primary/20 border-l-primary/40 bg-primary/[0.03] p-2 pl-4 sm:grid-cols-[minmax(0,1fr)_9rem_auto]"
                      : "grid items-end gap-2 rounded-md border p-2 sm:grid-cols-[minmax(0,1fr)_9rem_auto]"
                  }
                >
                  <div className="space-y-1">
                    {opts.component && opts.parentSku ? (
                      <span className="inline-flex items-center gap-1 text-[0.5625rem] font-medium text-muted-foreground">
                        <span className="text-primary">└</span>
                        Component of {opts.parentSku.sku_code}
                      </span>
                    ) : null}
                    {isParent && !opts.component ? (
                      <span className="inline-flex items-center gap-1 text-[0.5625rem] font-medium text-primary">
                        Bill of materials
                      </span>
                    ) : null}
                    <SkuCombobox
                      skus={
                        opts.component
                          ? stageSkus
                          : (() => {
                              const base =
                                bomStageSkus.length > 0
                                  ? bomStageSkus
                                  : stageSkus
                              if (
                                line.skuId &&
                                !base.some((sku) => sku.id === line.skuId)
                              ) {
                                const selected = stageSkus.find(
                                  (sku) => sku.id === line.skuId
                                )
                                if (selected) return [selected, ...base]
                              }
                              return base
                            })()
                      }
                      value={line.skuId}
                      onChange={(skuId) => chooseSku(line.key, skuId)}
                      usedIds={selectedSkuIds}
                      disabled={
                        opts.component ||
                        !selectedStage ||
                        stageSkus.length === 0
                      }
                      placeholder={
                        !selectedStage
                          ? "Select a stage first"
                          : stageSkus.length === 0
                            ? "No SKUs assigned to this stage"
                            : "Search SKU code, name or brand…"
                      }
                      ariaLabel={`SKU line`}
                    />
                  </div>

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
                      aria-label={`Quantity for SKU line`}
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
                    disabled={lines.length === 1 || opts.component}
                    aria-label={`Remove SKU line`}
                  >
                    <Trash2 className="size-3.5 text-destructive" />
                  </Button>
                </div>
              )
            }

            return (
              <div key={group.parent.key} className="space-y-1.5">
                {renderLine(group.parent, {
                  component: false,
                  parentSku: null,
                })}
                {group.children.length > 0 ? (
                  <div className="ml-3 overflow-hidden rounded-md border border-primary/20 bg-primary/[0.02]">
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr className="border-b bg-muted/40 text-[0.625rem] font-medium text-muted-foreground">
                          <th className="px-2 py-1.5 text-left">
                            Component SKU
                          </th>
                          <th className="px-2 py-1.5 text-right">Quantity</th>
                          <th className="px-2 py-1.5 text-left">Unit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.children.map((child) => {
                          const childSku =
                            stageSkus.find((sku) => sku.id === child.skuId) ??
                            null
                          return (
                            <tr
                              key={child.key}
                              className="border-b last:border-b-0"
                            >
                              <td className="px-2 py-1.5">
                                <SkuCombobox
                                  skus={stageSkus}
                                  value={child.skuId}
                                  onChange={(skuId) =>
                                    chooseSku(child.key, skuId)
                                  }
                                  usedIds={selectedSkuIds}
                                  disabled
                                  placeholder="Component SKU"
                                  ariaLabel="Component SKU line"
                                />
                              </td>
                              <td className="px-2 py-1.5">
                                <Input
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  value={child.quantity}
                                  onChange={(event) =>
                                    setQuantity(child.key, event.target.value)
                                  }
                                  disabled={!childSku}
                                  placeholder="Quantity"
                                  aria-label="Quantity for component SKU"
                                  className="h-8 text-right"
                                />
                              </td>
                              <td className="px-2 py-1.5 text-muted-foreground">
                                {childSku?.uom ?? "—"}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            )
          })}

          {selectedStage && stageSkus.length === 0 ? (
            <p className="text-[0.625rem] text-muted-foreground">
              No SKUs are assigned to this stage yet.{" "}
              <Link
                href={`/production/stages/${selectedStage.id}/assign`}
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                Assign SKUs to this stage
              </Link>{" "}
              before recording usage.
            </p>
          ) : null}

          {allBomSkusSelected && bomStageSkus.length > 1 ? (
            <p className="text-[0.625rem] text-muted-foreground">
              All {stageSkus.length} SKUs assigned to this stage are already on
              this entry.
            </p>
          ) : null}

          <Button
            variant="outline"
            size="sm"
            onClick={addLine}
            disabled={
              !selectedStage || bomStageSkus.length === 0 || allBomSkusSelected
            }
          >
            <Plus />
            Add another BOM SKU
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
