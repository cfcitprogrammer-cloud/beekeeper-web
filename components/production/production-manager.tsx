"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  ArrowDown,
  ArrowUp,
  Factory,
  FlaskConical,
  Pencil,
  Play,
  Plus,
  Square,
  Trash2,
} from "lucide-react"

import {
  addProductionStage,
  createProductionPipeline,
  createProductionRun,
  deleteProductionPipeline,
  deleteProductionRun,
  deleteProductionStage,
  reorderProductionStages,
  recordProductionUsage,
  updateProductionPipeline,
  updateProductionRunStatus,
} from "@/actions/production.action"
import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { Modal } from "@/components/shared/modal"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/native-select"
import { toast } from "@/components/ui/toast"
import { formatDateTime, humanize } from "@/lib/format"
import type { ProductionPipelineWithRelations } from "@/lib/data/operations"
import type { ProductionRun, ProductionUsage } from "@/db/models/models"

const emptyPipeline = { name: "", code: "", description: "", isActive: true }
const emptyStage = {
  name: "",
  stageType: "processing",
  inputUom: "",
  outputUom: "",
  description: "",
}
const emptyRun = { notes: "", status: "IN_PROGRESS" }
const emptyUsage = {
  stageId: "",
  inputQuantity: "0",
  outputQuantity: "0",
  wasteQuantity: "0",
  uom: "",
  notes: "",
}

export function ProductionManager({
  pipelines,
  usage,
}: {
  pipelines: ProductionPipelineWithRelations[]
  usage: ProductionUsage[]
}) {
  const router = useRouter()
  const [selectedPipelineId, setSelectedPipelineId] = React.useState(
    pipelines[0]?.id ?? ""
  )
  const [selectedRunId, setSelectedRunId] = React.useState("")
  const [pipelineOpen, setPipelineOpen] = React.useState(false)
  const [editingPipelineId, setEditingPipelineId] = React.useState<string | null>(null)
  const [pipelineDraft, setPipelineDraft] = React.useState(emptyPipeline)
  const [stageOpen, setStageOpen] = React.useState(false)
  const [stageDraft, setStageDraft] = React.useState(emptyStage)
  const [runOpen, setRunOpen] = React.useState(false)
  const [runDraft, setRunDraft] = React.useState(emptyRun)
  const [usageOpen, setUsageOpen] = React.useState(false)
  const [usageDraft, setUsageDraft] = React.useState(emptyUsage)
  const [saving, setSaving] = React.useState(false)

  const resolvedPipelineId =
    selectedPipelineId && pipelines.some((pipeline) => pipeline.id === selectedPipelineId)
      ? selectedPipelineId
      : (pipelines[0]?.id ?? "")
  const selectedPipeline =
    pipelines.find((pipeline) => pipeline.id === resolvedPipelineId) ?? null
  const selectedRun =
    selectedPipeline?.runs.find((run) => run.id === selectedRunId) ?? null
  const runUsage = selectedRun ? usage.filter((entry) => entry.run_id === selectedRun.id) : []

  function openCreatePipeline() {
    setEditingPipelineId(null)
    setPipelineDraft(emptyPipeline)
    setPipelineOpen(true)
  }

  function openEditPipeline(pipeline: ProductionPipelineWithRelations) {
    setEditingPipelineId(pipeline.id)
    setPipelineDraft({
      name: pipeline.name,
      code: pipeline.code,
      description: pipeline.description ?? "",
      isActive: pipeline.is_active,
    })
    setPipelineOpen(true)
  }

  async function savePipeline() {
    if (!pipelineDraft.name.trim() || !pipelineDraft.code.trim()) {
      toast.add({ type: "error", title: "Pipeline name and code are required" })
      return
    }
    setSaving(true)
    const payload = {
      name: pipelineDraft.name,
      code: pipelineDraft.code,
      description: pipelineDraft.description,
      isActive: pipelineDraft.isActive,
    }
    const result = editingPipelineId
      ? await updateProductionPipeline({ ...payload, id: editingPipelineId })
      : await createProductionPipeline(payload)
    setSaving(false)

    if (!result.success) {
      toast.add({ type: "error", title: "Could not save pipeline", description: result.error })
      return
    }
    if (!editingPipelineId) setSelectedPipelineId(result.data.id)
    toast.add({ type: "success", title: editingPipelineId ? "Pipeline updated" : "Pipeline created" })
    setPipelineOpen(false)
    router.refresh()
  }

  async function removePipeline(pipeline: ProductionPipelineWithRelations) {
    if (!window.confirm(`Delete pipeline "${pipeline.name}", its stages and runs?`)) return
    const result = await deleteProductionPipeline(pipeline.id)
    if (!result.success) {
      toast.add({ type: "error", title: "Could not delete pipeline", description: result.error })
      return
    }
    toast.add({ type: "success", title: "Pipeline deleted" })
    router.refresh()
  }

  async function saveStage() {
    if (!selectedPipeline) return
    if (!stageDraft.name.trim()) {
      toast.add({ type: "error", title: "Stage name is required" })
      return
    }
    setSaving(true)
    const result = await addProductionStage({ ...stageDraft, pipelineId: selectedPipeline.id })
    setSaving(false)
    if (!result.success) {
      toast.add({ type: "error", title: "Could not add stage", description: result.error })
      return
    }
    toast.add({ type: "success", title: "Stage added" })
    setStageOpen(false)
    setStageDraft(emptyStage)
    router.refresh()
  }

  async function removeStage(id: string, name: string) {
    if (!window.confirm(`Delete stage "${name}"?`)) return
    const result = await deleteProductionStage(id)
    if (!result.success) {
      toast.add({ type: "error", title: "Could not delete stage", description: result.error })
      return
    }
    toast.add({ type: "success", title: "Stage deleted" })
    router.refresh()
  }

  async function moveStage(index: number, direction: -1 | 1) {
    if (!selectedPipeline) return
    const ids = selectedPipeline.stages.map((stage) => stage.id)
    const target = index + direction
    if (target < 0 || target >= ids.length) return
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    const result = await reorderProductionStages(selectedPipeline.id, ids)
    if (!result.success) {
      toast.add({ type: "error", title: "Could not reorder stages", description: result.error })
      return
    }
    router.refresh()
  }

  async function saveRun() {
    if (!selectedPipeline) return
    setSaving(true)
    const result = await createProductionRun({
      pipelineId: selectedPipeline.id,
      notes: runDraft.notes,
      status: runDraft.status,
    })
    setSaving(false)
    if (!result.success) {
      toast.add({ type: "error", title: "Could not create run", description: result.error })
      return
    }
    toast.add({ type: "success", title: `Run ${result.data.run_no} created` })
    setSelectedRunId(result.data.id)
    setRunOpen(false)
    setRunDraft(emptyRun)
    router.refresh()
  }

  async function setRunStatus(run: ProductionRun, status: string) {
    const result = await updateProductionRunStatus(run.id, status)
    if (!result.success) {
      toast.add({ type: "error", title: "Could not update run", description: result.error })
      return
    }
    toast.add({ type: "success", title: `Run marked ${humanize(status)}` })
    router.refresh()
  }

  async function removeRun(run: ProductionRun) {
    if (!window.confirm(`Delete production run ${run.run_no}?`)) return
    const result = await deleteProductionRun(run.id)
    if (!result.success) {
      toast.add({ type: "error", title: "Could not delete run", description: result.error })
      return
    }
    toast.add({ type: "success", title: "Production run deleted" })
    router.refresh()
  }

  function openUsage(stageId?: string) {
    if (!selectedRun) {
      toast.add({ type: "info", title: "Select a production run first" })
      return
    }
    setUsageDraft({ ...emptyUsage, stageId: stageId ?? selectedPipeline?.stages[0]?.id ?? "" })
    setUsageOpen(true)
  }

  async function saveUsage() {
    if (!selectedRun) return
    if (!usageDraft.stageId) {
      toast.add({ type: "error", title: "Select a stage" })
      return
    }
    setSaving(true)
    const result = await recordProductionUsage({
      runId: selectedRun.id,
      stageId: usageDraft.stageId,
      inputQuantity: Number(usageDraft.inputQuantity),
      outputQuantity: Number(usageDraft.outputQuantity),
      wasteQuantity: Number(usageDraft.wasteQuantity),
      uom: usageDraft.uom,
      notes: usageDraft.notes,
    })
    setSaving(false)
    if (!result.success) {
      toast.add({ type: "error", title: "Could not record usage", description: result.error })
      return
    }
    toast.add({
      type: "success",
      title: "Usage recorded",
      description: result.data.flowedToStageId
        ? "Output quantity flowed into the next connected stage."
        : "Stage usage saved.",
    })
    setUsageOpen(false)
    router.refresh()
  }

  const pipelineColumns: DataTableColumn<ProductionPipelineWithRelations>[] = [
    {
      id: "pipeline",
      header: "Pipeline",
      sortValue: (row) => row.name,
      cell: (row) => (
        <div>
          <p className="text-xs font-medium">{row.name}</p>
          <p className="text-[0.625rem] text-muted-foreground">
            {row.code} · {row.stages.length} stage(s)
          </p>
        </div>
      ),
    },
    {
      id: "flow",
      header: "Stage flow",
      hideBelow: "xl",
      cell: (row) => (
        <span className="line-clamp-1 max-w-72 text-[0.625rem] text-muted-foreground">
          {row.stages.length > 0
            ? row.stages.map((stage) => stage.name).join(" → ")
            : "No stages yet"}
        </span>
      ),
    },
    {
      id: "runs",
      header: "Runs",
      align: "right",
      sortValue: (row) => row.runs.length,
      cell: (row) => <span className="text-xs tabular-nums">{row.runs.length}</span>,
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.is_active ? "ACTIVE" : "INACTIVE"} />,
    },
    {
      id: "actions",
      header: "",
      align: "right",
      cell: (row) => (
        <div className="flex justify-end gap-1">
          <Button variant="outline" size="sm" onClick={() => setSelectedPipelineId(row.id)}>
            Open
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => openEditPipeline(row)}
            aria-label="Edit pipeline"
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => removePipeline(row)}
            aria-label="Delete pipeline"
          >
            <Trash2 className="size-3.5 text-destructive" />
          </Button>
        </div>
      ),
    },
  ]

  const runColumns: DataTableColumn<ProductionRun>[] = [
    {
      id: "run",
      header: "Run",
      sortValue: (row) => row.run_no,
      cell: (row) => (
        <div>
          <p className="text-xs font-medium">{row.run_no}</p>
          <p className="text-[0.625rem] text-muted-foreground">
            {formatDateTime(row.started_at ?? row.created_at)}
          </p>
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      id: "notes",
      header: "Notes",
      hideBelow: "lg",
      cell: (row) => (
        <span className="line-clamp-1 max-w-48 text-xs text-muted-foreground">
          {row.notes ?? "—"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      align: "right",
      cell: (row) => (
        <div className="flex justify-end gap-1">
          <Button variant="outline" size="sm" onClick={() => setSelectedRunId(row.id)}>
            Usage
          </Button>
          {row.status !== "completed" && row.status !== "cancelled" && (
            <>
              {row.status === "planned" && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setRunStatus(row, "in_progress")}
                  aria-label="Start run"
                >
                  <Play className="size-3.5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setRunStatus(row, "completed")}
                aria-label="Complete run"
              >
                <Square className="size-3.5 text-emerald-600" />
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => removeRun(row)}
            aria-label="Delete run"
          >
            <Trash2 className="size-3.5 text-destructive" />
          </Button>
        </div>
      ),
    },
  ]

  const usageColumns: DataTableColumn<ProductionUsage>[] = [
    {
      id: "stage",
      header: "Stage",
      sortValue: (row) =>
        selectedPipeline?.stages.find((stage) => stage.id === row.stage_id)?.sequence ?? 0,
      cell: (row) => {
        const stage = selectedPipeline?.stages.find((item) => item.id === row.stage_id)
        return (
          <div>
            <p className="text-xs font-medium">{stage?.name ?? "Unknown stage"}</p>
            <p className="text-[0.625rem] text-muted-foreground">
              {row.source_stage_id ? "Auto-flowed from previous stage" : "Recorded usage"}
            </p>
          </div>
        )
      },
    },
    {
      id: "input",
      header: "Input",
      align: "right",
      sortValue: (row) => row.input_quantity,
      cell: (row) => (
        <span className="text-xs tabular-nums">
          {row.input_quantity} {row.uom ?? ""}
        </span>
      ),
    },
    {
      id: "output",
      header: "Output",
      align: "right",
      sortValue: (row) => row.output_quantity,
      cell: (row) => (
        <span className="text-xs tabular-nums">
          {row.output_quantity} {row.uom ?? ""}
        </span>
      ),
    },
    {
      id: "waste",
      header: "Waste",
      align: "right",
      hideBelow: "md",
      sortValue: (row) => row.waste_quantity,
      cell: (row) => <span className="text-xs tabular-nums">{row.waste_quantity}</span>,
    },
    {
      id: "recorded",
      header: "Recorded",
      hideBelow: "lg",
      sortValue: (row) => row.recorded_at,
      cell: (row) => (
        <span className="text-[0.625rem] text-muted-foreground">
          {formatDateTime(row.recorded_at)}
        </span>
      ),
    },
  ]

  return (
    <>
      <DataTable
        data={pipelines}
        columns={pipelineColumns}
        getRowId={(row) => row.id}
        searchable={(row) => `${row.name} ${row.code} ${row.description ?? ""}`}
        searchPlaceholder="Search production pipelines…"
        pageSize={6}
        emptyTitle="No production pipelines yet"
        emptyDescription="Create a pipeline and add its ordered stages."
        emptyIcon={Factory}
        toolbar={
          <Button size="sm" onClick={openCreatePipeline}>
            <Plus />
            New pipeline
          </Button>
        }
      />

      {selectedPipeline && (
        <div className="mt-5 space-y-4">
          <div className="rounded-xl border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
              <div>
                <p className="text-[0.625rem] font-semibold tracking-wider text-muted-foreground uppercase">
                  Ordered stages
                </p>
                <p className="font-heading text-sm font-semibold">{selectedPipeline.name}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setStageOpen(true)}>
                <Plus />
                Add stage
              </Button>
            </div>
            <div className="space-y-2 p-3">
              {selectedPipeline.stages.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                  No stages yet. Add the first stage to start the flow.
                </div>
              ) : (
                selectedPipeline.stages.map((stage, index) => (
                  <div
                    key={stage.id}
                    className="flex flex-wrap items-center gap-2 rounded-lg border bg-background px-3 py-2"
                  >
                    <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-[0.625rem] font-semibold text-primary">
                      {stage.sequence}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium">
                        {stage.name}{" "}
                        <span className="font-normal text-muted-foreground">
                          · {humanize(stage.stage_type)}
                        </span>
                      </p>
                      <p className="text-[0.625rem] text-muted-foreground">
                        {stage.input_uom ? `in ${stage.input_uom}` : "input —"} →{" "}
                        {stage.output_uom ? `out ${stage.output_uom}` : "output —"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        disabled={index === 0}
                        onClick={() => moveStage(index, -1)}
                        aria-label="Move stage up"
                      >
                        <ArrowUp className="size-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        disabled={index === selectedPipeline.stages.length - 1}
                        onClick={() => moveStage(index, 1)}
                        aria-label="Move stage down"
                      >
                        <ArrowDown className="size-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openUsage(stage.id)}
                        aria-label="Record usage"
                      >
                        <FlaskConical className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeStage(stage.id, stage.name)}
                        aria-label="Delete stage"
                      >
                        <Trash2 className="size-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
              <div>
                <p className="text-[0.625rem] font-semibold tracking-wider text-muted-foreground uppercase">
                  Production runs
                </p>
                <p className="font-heading text-sm font-semibold">
                  {selectedPipeline.name} runs
                </p>
              </div>
              <Button size="sm" onClick={() => setRunOpen(true)}>
                <Plus />
                New run
              </Button>
            </div>
            <div className="p-3">
              <DataTable
                data={selectedPipeline.runs}
                columns={runColumns}
                getRowId={(row) => row.id}
                searchable={(row) => `${row.run_no} ${row.status} ${row.notes ?? ""}`}
                searchPlaceholder="Search runs…"
                pageSize={6}
                emptyTitle="No production runs"
                emptyDescription="Create a run to record stage usage and quantities."
                emptyIcon={FlaskConical}
              />
            </div>
          </div>

          {selectedRun && (
            <div className="rounded-xl border bg-card">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
                <div>
                  <p className="text-[0.625rem] font-semibold tracking-wider text-muted-foreground uppercase">
                    Usage & quantity flow
                  </p>
                  <p className="font-heading text-sm font-semibold">{selectedRun.run_no}</p>
                </div>
                <Button size="sm" onClick={() => openUsage()}>
                  <FlaskConical />
                  Record usage
                </Button>
              </div>
              <div className="p-3">
                <DataTable
                  data={runUsage}
                  columns={usageColumns}
                  getRowId={(row) => row.id}
                  pageSize={8}
                  emptyTitle="No usage recorded"
                  emptyDescription="Record quantities at a stage; output flows to the next stage."
                  emptyIcon={FlaskConical}
                />
              </div>
            </div>
          )}
        </div>
      )}

      <Modal
        open={pipelineOpen}
        onOpenChange={setPipelineOpen}
        title={editingPipelineId ? "Edit pipeline" : "New production pipeline"}
        description="Pipelines contain ordered stages. Output from one stage flows into the next."
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setPipelineOpen(false)}>
              Cancel
            </Button>
            <Button onClick={savePipeline} disabled={saving}>
              <Factory />
              {saving ? "Saving…" : "Save pipeline"}
            </Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="pipeline-name">Name</Label>
            <Input
              id="pipeline-name"
              value={pipelineDraft.name}
              onChange={(event) => setPipelineDraft({ ...pipelineDraft, name: event.target.value })}
              placeholder="Snacks production"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pipeline-code">Code</Label>
            <Input
              id="pipeline-code"
              value={pipelineDraft.code}
              onChange={(event) => setPipelineDraft({ ...pipelineDraft, code: event.target.value })}
              placeholder="SNACKS"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="pipeline-description">Description</Label>
            <Input
              id="pipeline-description"
              value={pipelineDraft.description}
              onChange={(event) =>
                setPipelineDraft({ ...pipelineDraft, description: event.target.value })
              }
              placeholder="Snacks → Blending → Mixing → Packing → Finished Goods"
            />
          </div>
          <label className="flex items-center gap-2 text-xs sm:col-span-2">
            <input
              type="checkbox"
              className="size-3.5 accent-primary"
              checked={pipelineDraft.isActive}
              onChange={(event) =>
                setPipelineDraft({ ...pipelineDraft, isActive: event.target.checked })
              }
            />
            Pipeline is active
          </label>
        </div>
      </Modal>

      <Modal
        open={stageOpen}
        onOpenChange={setStageOpen}
        title="Add production stage"
        description="Stages are appended in sequence. Use the arrows to reorder them."
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setStageOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveStage} disabled={saving}>
              <Plus />
              {saving ? "Saving…" : "Add stage"}
            </Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="stage-name">Stage name</Label>
            <Input
              id="stage-name"
              value={stageDraft.name}
              onChange={(event) => setStageDraft({ ...stageDraft, name: event.target.value })}
              placeholder="Blending"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="stage-type">Stage type</Label>
            <Input
              id="stage-type"
              value={stageDraft.stageType}
              onChange={(event) => setStageDraft({ ...stageDraft, stageType: event.target.value })}
              placeholder="processing"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="stage-output-uom">Output UOM</Label>
            <Input
              id="stage-output-uom"
              value={stageDraft.outputUom}
              onChange={(event) => setStageDraft({ ...stageDraft, outputUom: event.target.value })}
              placeholder="kg"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="stage-input-uom">Input UOM</Label>
            <Input
              id="stage-input-uom"
              value={stageDraft.inputUom}
              onChange={(event) => setStageDraft({ ...stageDraft, inputUom: event.target.value })}
              placeholder="kg"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="stage-description">Description</Label>
            <Input
              id="stage-description"
              value={stageDraft.description}
              onChange={(event) =>
                setStageDraft({ ...stageDraft, description: event.target.value })
              }
              placeholder="What happens at this stage"
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={runOpen}
        onOpenChange={setRunOpen}
        title="New production run"
        description="Runs track usage quantities across the pipeline stages."
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setRunOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveRun} disabled={saving}>
              <Play />
              {saving ? "Creating…" : "Create run"}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="run-status">Initial status</Label>
            <NativeSelect
              id="run-status"
              value={runDraft.status}
              onChange={(event) => setRunDraft({ ...runDraft, status: event.target.value })}
              className="w-full"
            >
              <option value="PLANNED">Planned</option>
              <option value="IN_PROGRESS">In progress</option>
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="run-notes">Notes</Label>
            <Input
              id="run-notes"
              value={runDraft.notes}
              onChange={(event) => setRunDraft({ ...runDraft, notes: event.target.value })}
              placeholder="Batch, shift or operator notes"
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={usageOpen}
        onOpenChange={setUsageOpen}
        title="Record stage usage"
        description={
          selectedRun
            ? `${selectedRun.run_no} · output quantity flows to the next connected stage`
            : undefined
        }
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setUsageOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveUsage} disabled={saving}>
              <FlaskConical />
              {saving ? "Saving…" : "Record usage"}
            </Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="usage-stage">Stage</Label>
            <NativeSelect
              id="usage-stage"
              value={usageDraft.stageId}
              onChange={(event) => setUsageDraft({ ...usageDraft, stageId: event.target.value })}
              className="w-full"
            >
              <option value="">Select a stage</option>
              {selectedPipeline?.stages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.sequence}. {stage.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="usage-input">Input quantity</Label>
            <Input
              id="usage-input"
              type="number"
              min={0}
              step="0.0001"
              value={usageDraft.inputQuantity}
              onChange={(event) =>
                setUsageDraft({ ...usageDraft, inputQuantity: event.target.value })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="usage-output">Output quantity</Label>
            <Input
              id="usage-output"
              type="number"
              min={0}
              step="0.0001"
              value={usageDraft.outputQuantity}
              onChange={(event) =>
                setUsageDraft({ ...usageDraft, outputQuantity: event.target.value })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="usage-waste">Waste quantity</Label>
            <Input
              id="usage-waste"
              type="number"
              min={0}
              step="0.0001"
              value={usageDraft.wasteQuantity}
              onChange={(event) =>
                setUsageDraft({ ...usageDraft, wasteQuantity: event.target.value })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="usage-uom">UOM</Label>
            <Input
              id="usage-uom"
              value={usageDraft.uom}
              onChange={(event) => setUsageDraft({ ...usageDraft, uom: event.target.value })}
              placeholder="kg"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="usage-notes">Notes</Label>
            <Input
              id="usage-notes"
              value={usageDraft.notes}
              onChange={(event) => setUsageDraft({ ...usageDraft, notes: event.target.value })}
              placeholder="Optional notes"
            />
          </div>
        </div>
      </Modal>
    </>
  )
}
