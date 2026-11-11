"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus } from "lucide-react"

import { addProductionStage } from "@/actions/production.action"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/native-select"
import { toast } from "@/components/ui/toast"
import type { ProductionPipelineWithRelations } from "@/lib/data/operations"

export function StageForm({
  pipeline,
  pipelines = [],
  defaultPipelineId,
}: {
  pipeline?: ProductionPipelineWithRelations | null
  pipelines?: ProductionPipelineWithRelations[]
  defaultPipelineId?: string
}) {
  const router = useRouter()
  const [saving, setSaving] = React.useState(false)
  const [pipelineId, setPipelineId] = React.useState(
    pipeline?.id ?? defaultPipelineId ?? pipelines[0]?.id ?? ""
  )
  const [draft, setDraft] = React.useState({
    name: "",
    stageType: "processing",
    inputUom: "",
    outputUom: "",
    description: "",
  })

  const selectedPipeline =
    pipeline ?? pipelines.find((item) => item.id === pipelineId) ?? null
  const nextSequence = (selectedPipeline?.stages.length ?? 0) + 1

  function goBack() {
    if (pipeline) {
      router.push(`/production/pipelines/${pipeline.id}`)
      return
    }
    router.push("/production/stages")
  }

  async function save() {
    if (!pipelineId) {
      toast.add({ type: "error", title: "Select a pipeline" })
      return
    }
    if (!draft.name.trim()) {
      toast.add({ type: "error", title: "Stage name is required" })
      return
    }
    setSaving(true)
    const result = await addProductionStage({
      pipelineId,
      name: draft.name,
      stageType: draft.stageType,
      inputUom: draft.inputUom,
      outputUom: draft.outputUom,
      description: draft.description,
    })
    setSaving(false)
    if (!result.success) {
      toast.add({
        type: "error",
        title: "Could not add stage",
        description: result.error,
      })
      return
    }
    toast.add({ type: "success", title: "Stage added" })
    if (pipeline) {
      router.push(`/production/pipelines/${pipeline.id}`)
    } else {
      router.push(`/production/stages?pipelineId=${pipelineId}`)
    }
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" size="sm" onClick={goBack}>
        <ArrowLeft />
        {pipeline ? "Back to pipeline" : "Back to stages"}
      </Button>
      <div className="rounded-lg border bg-card p-4 sm:p-6">
        {pipeline ? (
          <p className="mb-4 text-sm text-muted-foreground">
            Pipeline: {pipeline.name} ({pipeline.code}) · next sequence{" "}
            {nextSequence}
          </p>
        ) : (
          <div className="mb-4 space-y-1.5">
            <Label htmlFor="st-pipeline">Pipeline</Label>
            <NativeSelect
              id="st-pipeline"
              value={pipelineId}
              onChange={(event) => setPipelineId(event.target.value)}
              className="w-full"
            >
              <option value="">Select pipeline</option>
              {pipelines.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {item.code}
                </option>
              ))}
            </NativeSelect>
            {selectedPipeline ? (
              <p className="text-[0.625rem] text-muted-foreground">
                Next sequence {nextSequence}
              </p>
            ) : null}
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="st-name">Stage name</Label>
            <Input
              id="st-name"
              value={draft.name}
              onChange={(event) =>
                setDraft({ ...draft, name: event.target.value })
              }
              placeholder="Extraction"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="st-type">Stage type</Label>
            <Input
              id="st-type"
              value={draft.stageType}
              onChange={(event) =>
                setDraft({ ...draft, stageType: event.target.value })
              }
              placeholder="processing"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="st-desc">Description</Label>
            <Input
              id="st-desc"
              value={draft.description}
              onChange={(event) =>
                setDraft({ ...draft, description: event.target.value })
              }
              placeholder="Optional"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="st-in">Input UOM</Label>
            <Input
              id="st-in"
              value={draft.inputUom}
              onChange={(event) =>
                setDraft({ ...draft, inputUom: event.target.value })
              }
              placeholder="kg"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="st-out">Output UOM</Label>
            <Input
              id="st-out"
              value={draft.outputUom}
              onChange={(event) =>
                setDraft({ ...draft, outputUom: event.target.value })
              }
              placeholder="L"
            />
          </div>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={goBack} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            <Plus />
            {saving ? "Adding…" : "Add stage"}
          </Button>
        </div>
      </div>
    </div>
  )
}
