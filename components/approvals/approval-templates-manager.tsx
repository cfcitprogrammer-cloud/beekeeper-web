"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  Copy,
  GitBranch,
  Layers,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
} from "lucide-react"

import {
  createApprovalTemplate,
  deleteApprovalTemplate,
  duplicateApprovalTemplate,
  toggleApprovalTemplate,
} from "@/actions/approval.action"
import { Modal } from "@/components/shared/modal"
import { StatusBadge } from "@/components/shared/status-badge"
import { Badge } from "@/components/ui/badge"
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
import { NativeSelect } from "@/components/ui/native-select"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/toast"
import { formatDate, humanize } from "@/lib/format"
import type {
  ApprovalDocumentType,
  ApprovalTemplateWithConfig,
} from "@/types/database"

const documentLabels: Record<ApprovalDocumentType, string> = {
  BOOKING: "Booking",
  OUTLET: "Outlet onboarding",
}

const emptyDraft = {
  name: "",
  document_type: "BOOKING" as ApprovalDocumentType,
  description: "",
}

export function ApprovalTemplatesManager({
  templates,
}: {
  templates: ApprovalTemplateWithConfig[]
}) {
  const router = useRouter()
  const [search, setSearch] = React.useState("")
  const [type, setType] = React.useState("all")
  const [open, setOpen] = React.useState(false)
  const [draft, setDraft] = React.useState(emptyDraft)
  const [saving, setSaving] = React.useState(false)

  const filtered = React.useMemo(() => {
    const term = search.trim().toLowerCase()
    return templates.filter((template) => {
      if (type !== "all" && template.document_type !== type) return false
      if (!term) return true
      return `${template.name} ${template.description ?? ""}`.toLowerCase().includes(term)
    })
  }, [templates, search, type])

  async function toggleTemplate(id: string, isActive: boolean) {
    const result = await toggleApprovalTemplate({ id, isActive })
    if (!result.success) {
      toast.add({
        type: "error",
        title: "Could not update template",
        description: result.error,
      })
      return
    }
    toast.add({
      type: "success",
      title: isActive ? "Template activated" : "Template paused",
      description: "Approval routing uses only active templates.",
    })
    router.refresh()
  }

  async function duplicateTemplate(template: ApprovalTemplateWithConfig) {
    const result = await duplicateApprovalTemplate({ id: template.id })
    if (!result.success) {
      toast.add({
        type: "error",
        title: "Could not duplicate template",
        description: result.error,
      })
      return
    }
    toast.add({
      type: "success",
      title: "Template duplicated",
      description: `${template.name} (copy) was created as an inactive draft.`,
    })
    router.refresh()
  }

  async function deleteTemplate(id: string, name: string) {
    if (!window.confirm(`Delete template "${name}"? This cannot be undone.`)) return
    const result = await deleteApprovalTemplate(id)
    if (!result.success) {
      toast.add({ type: "error", title: "Could not delete template", description: result.error })
      return
    }
    toast.add({ type: "success", title: "Template deleted", description: `${name} was removed.` })
    router.refresh()
  }

  async function createTemplate() {
    if (!draft.name.trim()) {
      toast.add({
        type: "error",
        title: "Missing details",
        description: "Template name is required.",
      })
      return
    }

    setSaving(true)
    const result = await createApprovalTemplate({
      name: draft.name,
      description: draft.description,
      documentType: draft.document_type,
    })
    setSaving(false)

    if (!result.success) {
      toast.add({
        type: "error",
        title: "Could not create template",
        description: result.error,
      })
      return
    }

    toast.add({
      type: "success",
      title: "Template created",
      description: `${draft.name.trim()} is inactive until stages are configured.`,
    })
    setDraft(emptyDraft)
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search templates…"
              className="h-8 pl-8"
              aria-label="Search templates"
            />
          </div>
          <NativeSelect
            value={type}
            onChange={(event) => setType(event.target.value)}
            aria-label="Filter by document type"
          >
            <option value="all">All document types</option>
            {Object.entries(documentLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus />
          New template
        </Button>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {filtered.length === 0 ? (
          <Card className="lg:col-span-2">
            <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
              <ShieldCheck className="size-6 text-muted-foreground" />
              <p className="text-sm font-medium">No templates found</p>
              <p className="text-xs text-muted-foreground">
                Adjust the filters or create a new approval template.
              </p>
            </CardContent>
          </Card>
        ) : (
          filtered.map((template) => (
            <Card key={template.id}>
              <CardHeader className="border-b pb-3">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <GitBranch className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="flex flex-wrap items-center gap-1.5">
                      {template.name}
                    </CardTitle>
                    <CardDescription className="mt-0.5">
                      {documentLabels[template.document_type]}
                    </CardDescription>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => deleteTemplate(template.id, template.name)}
                      aria-label="Delete template"
                    >
                      <Trash2 className="size-3.5 text-destructive" />
                    </Button>
                    <StatusBadge
                      status={template.is_active ? "ACTIVE" : "INACTIVE"}
                      label={template.is_active ? "Active" : "Inactive"}
                    />
                    <Switch
                      checked={template.is_active}
                      onCheckedChange={(checked) => toggleTemplate(template.id, checked)}
                      aria-label={`Toggle ${template.name}`}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <p className="text-[0.6875rem] text-muted-foreground">
                  {template.description ?? "No description provided."}
                </p>

                <div>
                  <p className="mb-1.5 flex items-center gap-1 text-[0.625rem] font-semibold tracking-wide text-muted-foreground uppercase">
                    <Layers className="size-2.5" />
                    Approval stages
                  </p>
                  {template.stages.length === 0 ? (
                    <p className="rounded-md border border-dashed px-2.5 py-2 text-[0.625rem] text-muted-foreground">
                      No stages configured yet.
                    </p>
                  ) : (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {template.stages.map((templateStage, index) => (
                        <React.Fragment key={templateStage.id}>
                          <span className="inline-flex items-center gap-1 rounded-md border bg-muted/20 px-2 py-1">
                            <span className="flex size-4 items-center justify-center rounded-full bg-primary/10 text-[0.5rem] font-semibold text-primary">
                              {templateStage.sequence}
                            </span>
                            <span className="text-[0.625rem] font-medium">
                              {templateStage.stage.name}
                            </span>
                            <Badge
                              variant="secondary"
                              className="h-3.5 px-1 text-[0.5rem]"
                            >
                              {templateStage.approvers.length}
                            </Badge>
                          </span>
                          {index < template.stages.length - 1 && (
                            <ArrowRight className="size-3 text-muted-foreground/60" />
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <p className="mb-1.5 text-[0.625rem] font-semibold tracking-wide text-muted-foreground uppercase">
                    Routing conditions
                  </p>
                  {template.conditions.length === 0 ? (
                    <p className="rounded-md border border-dashed px-2.5 py-2 text-[0.625rem] text-muted-foreground">
                      Always applies — no conditions.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {template.conditions.map((condition) => (
                        <Badge
                          key={condition.id}
                          variant="outline"
                          className="font-mono text-[0.5625rem] font-normal"
                        >
                          {condition.field} {humanize(condition.operator).toLowerCase()}{" "}
                          {condition.value}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between border-t pt-2.5">
                  <span className="text-[0.625rem] text-muted-foreground">
                    Updated {formatDate(template.updated_at)}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      render={<a href={`/approvals/templates/${template.id}`} />}
                    >
                      Configure
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => duplicateTemplate(template)}
                    >
                      <Copy />
                      Duplicate
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Create approval template"
        description="Start with the document type and routing metadata, then add stages."
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createTemplate} disabled={saving}>
              <Plus />
              {saving ? "Creating…" : "Create template"}
            </Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="template-name">Template name</Label>
            <Input
              id="template-name"
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              placeholder="Seasonal promo booking approval"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="template-type">Document type</Label>
            <NativeSelect
              id="template-type"
              value={draft.document_type}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  document_type: event.target.value as ApprovalDocumentType,
                })
              }
              className="w-full"
            >
              {Object.entries(documentLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="template-description">Description</Label>
            <Input
              id="template-description"
              value={draft.description}
              onChange={(event) =>
                setDraft({ ...draft, description: event.target.value })
              }
              placeholder="What this approval path is used for…"
            />
          </div>
        </div>
      </Modal>
    </>
  )
}
