"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, CalendarClock, Pencil, Plus, Target, Trash2 } from "lucide-react"

import { addVisitPlanOutlet, removeVisitPlanOutlet } from "@/actions/visit.action"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/native-select"
import { toast } from "@/components/ui/toast"
import type { OutletWithRelations } from "@/types/database"
import type { VisitPlanWithRelations } from "@/lib/data/operations"

export function VisitPlanDetail({ plan, outlets }: { plan: VisitPlanWithRelations; outlets: OutletWithRelations[] }) {
  const router = useRouter()
  const [targetOutletId, setTargetOutletId] = React.useState("")
  const [saving, setSaving] = React.useState(false)
  const activeOutlets = outlets.filter((outlet) => outlet.status === "ACTIVE")

  async function addTarget() {
    if (!targetOutletId) { toast.add({ type: "error", title: "Select an outlet" }); return }
    setSaving(true)
    const result = await addVisitPlanOutlet({ planId: plan.id, outletId: targetOutletId })
    setSaving(false)
    if (!result.success) { toast.add({ type: "error", title: "Could not add target", description: result.error }); return }
    toast.add({ type: "success", title: "Target outlet added" })
    setTargetOutletId("")
    router.refresh()
  }

  async function removeTarget(id: string) {
    const result = await removeVisitPlanOutlet(id)
    if (!result.success) { toast.add({ type: "error", title: "Could not remove target", description: result.error }); return }
    toast.add({ type: "success", title: "Target removed" })
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" render={<Link href="/visits" />}><ArrowLeft />Back to visits</Button>
        <Button size="sm" render={<Link href={`/visits/plans/${plan.id}/edit`} />}><Pencil />Edit plan</Button>
      </div>
      <div className="rounded-lg border bg-card p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><CalendarClock className="size-5" /></span>
          <div><h2 className="text-lg font-semibold">{plan.name}</h2><p className="text-sm text-muted-foreground">{plan.employee ? `${plan.employee.first_name} ${plan.employee.last_name}` : "—"} · {plan.start_date} → {plan.end_date}</p><div className="mt-2"><StatusBadge status={plan.status} /></div></div>
        </div>
        {plan.notes ? <p className="mt-4 text-sm">{plan.notes}</p> : null}
      </div>
      <div className="rounded-lg border bg-card p-4 sm:p-6">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium"><Target className="size-4" />Target outlets</div>
        <p className="mb-3 text-xs text-muted-foreground">Check-ins at these outlets within the plan dates are classified as planned.</p>
        <div className="flex gap-2">
          <div className="flex-1 space-y-1.5"><Label htmlFor="target-outlet" className="sr-only">Target outlet</Label><NativeSelect id="target-outlet" value={targetOutletId} onChange={(event) => setTargetOutletId(event.target.value)} className="w-full"><option value="">Select an outlet</option>{activeOutlets.filter((outlet) => !plan.targets.some((target) => target.outlet_id === outlet.id)).map((outlet) => (<option key={outlet.id} value={outlet.id}>{outlet.name} · {outlet.code}</option>))}</NativeSelect></div>
          <Button onClick={addTarget} disabled={saving}><Plus />Add</Button>
        </div>
        <div className="mt-4 space-y-1">
          {plan.targets.length === 0 ? (<p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">No target outlets yet.</p>) : plan.targets.map((target) => (
            <div key={target.id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
              <div><p className="text-xs font-medium">{target.outlet?.name ?? "Outlet"}</p><p className="text-[0.625rem] text-muted-foreground">{target.outlet?.code ?? "—"} · {target.outlet?.address ?? "No address"}</p></div>
              <Button variant="ghost" size="icon-sm" onClick={() => removeTarget(target.id)} aria-label="Remove target outlet"><Trash2 className="size-3.5 text-destructive" /></Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
