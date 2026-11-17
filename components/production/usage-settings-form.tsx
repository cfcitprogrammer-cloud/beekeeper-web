"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Clock3, Save, ShieldAlert } from "lucide-react"

import { updateProductionUsageSettings } from "@/actions/production.action"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/toast"
import { formatDate } from "@/lib/format"
import {
  cutoffInstant,
  normalizeTime,
  type UsageSettings,
} from "@/lib/production/usage-status"

export function UsageSettingsForm({
  settings,
}: {
  settings: UsageSettings
}) {
  const router = useRouter()
  const [saving, setSaving] = React.useState(false)
  const [draft, setDraft] = React.useState(() => ({
    cutoffDays: String(settings.cutoffDays),
    cutoffTime: normalizeTime(settings.cutoffTime),
    allowSubmitterEdit: settings.allowSubmitterEdit,
    allowDuplicates: settings.allowDuplicates,
  }))

  const previewSettings: UsageSettings = {
    cutoffDays: Math.max(0, Math.trunc(Number(draft.cutoffDays) || 0)),
    cutoffTime: normalizeTime(draft.cutoffTime || "17:00"),
    allowSubmitterEdit: draft.allowSubmitterEdit,
    allowDuplicates: draft.allowDuplicates,
  }
  const cutoff = cutoffInstant(previewSettings)

  async function save() {
    const cutoffDays = Math.trunc(Number(draft.cutoffDays))
    if (!Number.isFinite(cutoffDays) || cutoffDays < 0 || cutoffDays > 365) {
      toast.add({
        type: "error",
        title: "Check the cutoff days",
        description: "Use a whole number between 0 and 365.",
      })
      return
    }

    setSaving(true)
    const result = await updateProductionUsageSettings({
      cutoffDays,
      cutoffTime: draft.cutoffTime,
      allowSubmitterEdit: draft.allowSubmitterEdit,
      allowDuplicates: draft.allowDuplicates,
    })
    setSaving(false)

    if (!result.success) {
      toast.add({
        type: "error",
        title: "Could not save the usage settings",
        description: result.error,
      })
      return
    }

    toast.add({
      type: "success",
      title: "Usage settings saved",
      description: "The cutoff window and submission rules are now active.",
    })
    router.refresh()
  }

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <Card className="xl:col-span-2">
        <CardHeader className="border-b">
          <CardTitle>Usage lifecycle</CardTitle>
          <CardDescription>
            Configure when submitted usage locks and what submitters are
            allowed to do.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="usage-cutoff-days">Cutoff days</Label>
              <Input
                id="usage-cutoff-days"
                type="number"
                min={0}
                max={365}
                step={1}
                value={draft.cutoffDays}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    cutoffDays: event.target.value,
                  }))
                }
              />
              <p className="text-[0.625rem] text-muted-foreground">
                Usage dated on or before “today − {previewSettings.cutoffDays}{" "}
                day{previewSettings.cutoffDays === 1 ? "" : "s"}” is completed
                once the cutoff time passes.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="usage-cutoff-time">Cutoff time</Label>
              <Input
                id="usage-cutoff-time"
                type="time"
                value={draft.cutoffTime}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    cutoffTime: event.target.value,
                  }))
                }
              />
              <p className="text-[0.625rem] text-muted-foreground">
                Local company time. Usage becomes read-only at this time.
              </p>
            </div>
          </div>

          <div className="space-y-3 rounded-md border bg-muted/20 p-3">
            <label className="flex items-start justify-between gap-4">
              <span className="space-y-0.5">
                <span className="block text-xs font-medium">
                  Allow submitter edits
                </span>
                <span className="block text-[0.625rem] text-muted-foreground">
                  Submitters may change quantities, dates, notes or mark their
                  own usage as a cancellation — but only before the cutoff.
                </span>
              </span>
              <Switch
                checked={draft.allowSubmitterEdit}
                onCheckedChange={(checked) =>
                  setDraft((current) => ({
                    ...current,
                    allowSubmitterEdit: checked,
                  }))
                }
                aria-label="Allow submitter edits"
              />
            </label>

            <label className="flex items-start justify-between gap-4">
              <span className="space-y-0.5">
                <span className="block text-xs font-medium">
                  Allow duplicate usage
                </span>
                <span className="block text-[0.625rem] text-muted-foreground">
                  By default the same SKU cannot be submitted twice for the same
                  stage and usage date.
                </span>
              </span>
              <Switch
                checked={draft.allowDuplicates}
                onCheckedChange={(checked) =>
                  setDraft((current) => ({
                    ...current,
                    allowDuplicates: checked,
                  }))
                }
                aria-label="Allow duplicate usage"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-4">
            <Button onClick={save} disabled={saving}>
              <Save />
              {saving ? "Saving…" : "Save settings"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <Clock3 className="size-3.5 text-primary" />
            Current cutoff
          </CardTitle>
          <CardDescription>
            Usage at or before this moment is locked for submitters.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          <div>
            <p className="text-[0.625rem] text-muted-foreground">Locks usage dated</p>
            <p className="font-medium">
              on or before {formatDate(cutoff)}
            </p>
          </div>
          <div>
            <p className="text-[0.625rem] text-muted-foreground">At</p>
            <p className="font-medium">{normalizeTime(draft.cutoffTime)}</p>
          </div>
          <div className="flex items-start gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-[0.625rem] text-amber-800 dark:text-amber-200">
            <ShieldAlert className="mt-0.5 size-3 shrink-0" />
            <p>
              Usage editor and administrators can still correct completed usage.
              Every change is written to the usage changelog.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
