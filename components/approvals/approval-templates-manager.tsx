"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Copy, GitBranch, Layers, Plus, Search, ShieldCheck, Trash2 } from "lucide-react"

import { deleteApprovalTemplate, duplicateApprovalTemplate, toggleApprovalTemplate } from "@/actions/approval.action"
import { StatusBadge } from "@/components/shared/status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/toast"
import { formatDate, humanize } from "@/lib/format"
import type { ApprovalTemplateWithConfig } from "@/types/database"

const documentColors = { BOOKING: "bg-sky-500/10 text-sky-600 dark:text-sky-400", OUTLET: "bg-violet-500/10 text-violet-600 dark:text-violet-400" } as const

export function ApprovalTemplatesManager({ templates }: { templates: ApprovalTemplateWithConfig[] }) {
  const router = useRouter()
  const [search, setSearch] = React.useState("")

  const filtered = React.useMemo(() => templates.filter((template) => !search.trim() || [template.name, template.document_type, template.description].filter(Boolean).join(" ").toLowerCase().includes(search.toLowerCase())), [templates, search])

  async function toggleTemplate(id: string, isActive: boolean) {
    const result = await toggleApprovalTemplate({ id, isActive })
    if (!result.success) { toast.add({ type: "error", title: "Could not update template", description: result.error }); return }
    toast.add({ type: "success", title: isActive ? "Template activated" : "Template deactivated", description: isActive ? "New matching documents will be routed through it." : "New documents will no longer use this template." })
    router.refresh()
  }

  async function duplicateTemplate(template: ApprovalTemplateWithConfig) {
    const result = await duplicateApprovalTemplate({ id: template.id })
    if (!result.success) { toast.add({ type: "error", title: "Could not duplicate template", description: result.error }); return }
    toast.add({ type: "success", title: "Template duplicated", description: "A copy was created in draft mode." })
    router.refresh()
  }

  async function removeTemplate(id: string) {
    if (!window.confirm("Delete this template? Active documents using it are not affected, but new requests will no longer route through it.")) return
    const result = await deleteApprovalTemplate(id)
    if (!result.success) { toast.add({ type: "error", title: "Could not delete template", description: result.error }); return }
    toast.add({ type: "success", title: "Template deleted" })
    router.refresh()
  }

  return (
    <>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search templates…" className="pl-8" aria-label="Search templates" />
        </div>
        <Button size="sm" onClick={() => router.push("/approvals/templates/new")}><Plus />New template</Button>
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center gap-2 py-14 text-center"><GitBranch className="size-7 text-muted-foreground" /><p className="text-sm font-medium">No templates found</p><p className="max-w-sm text-xs text-muted-foreground">Create an approval template to route bookings or outlet onboarding through staged decisions.</p></CardContent></Card>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {filtered.map((template) => (
            <Card key={template.id}>
              <CardHeader className="border-b pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle>{template.name}</CardTitle>
                      <StatusBadge status={template.is_active ? "APPROVED" : "REJECTED"} />
                    </div>
                    <CardDescription>{template.description ?? "No description provided."}</CardDescription>
                  </div>
                  <span className={`inline-flex shrink-0 rounded-md px-2 py-1 text-[0.625rem] font-semibold tracking-wide ${documentColors[template.document_type]}`}>{humanize(template.document_type)}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-3">
                <div className="space-y-1.5">
                  <p className="flex items-center gap-1.5 text-[0.625rem] font-semibold tracking-wider text-muted-foreground uppercase"><Layers className="size-3" />Approval chain · {template.stages.length} {template.stages.length === 1 ? "stage" : "stages"}</p>
                  <div className="flex flex-wrap items-center gap-1">
                    {template.stages.length === 0 ? <span className="text-[0.625rem] text-muted-foreground">No stages configured.</span> : template.stages.map((stage, index) => (
                      <React.Fragment key={stage.id}>
                        <span className="inline-flex items-center gap-1 rounded-md border bg-muted/40 px-2 py-1 text-[0.625rem]"><ShieldCheck className="size-2.5 text-primary" /><span className="font-medium">{stage.stage.name}</span><span className="text-muted-foreground">{stage.approvers.length} approver{stage.approvers.length === 1 ? "" : "s"}</span></span>
                        {index < template.stages.length - 1 && <ArrowRight className="size-3 text-muted-foreground" />}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[0.625rem] font-semibold tracking-wider text-muted-foreground uppercase">Conditions</p>
                  <div className="flex flex-wrap gap-1">
                    {template.conditions.length === 0 ? <span className="text-[0.625rem] text-muted-foreground">Applies to all matching documents.</span> : template.conditions.map((condition) => (<Badge key={condition.id} variant="outline" className="font-mono text-[0.5625rem] font-normal">{condition.field} {condition.operator} {condition.value}</Badge>))}
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                  <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-muted-foreground"><Switch checked={template.is_active} onCheckedChange={(checked) => toggleTemplate(template.id, checked)} aria-label={`Toggle ${template.name}`} />{template.is_active ? "Active" : "Inactive"}</label>
                  <div className="flex items-center gap-1.5">
                    <Button variant="outline" size="sm" onClick={() => router.push(`/approvals/templates/${template.id}`)}>Configure</Button>
                    <Button variant="ghost" size="sm" onClick={() => duplicateTemplate(template)}><Copy className="size-3.5" />Duplicate</Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => removeTemplate(template.id)} aria-label={`Delete ${template.name}`}><Trash2 className="size-3.5 text-destructive" /></Button>
                  </div>
                </div>
                <p className="text-[0.625rem] text-muted-foreground">Updated {formatDate(template.updated_at)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  )
}
