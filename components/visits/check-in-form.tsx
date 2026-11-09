"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, LogIn, LogOut } from "lucide-react"

import { checkInVisit } from "@/actions/visit.action"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/native-select"
import { toast } from "@/components/ui/toast"
import type { EmployeeWithRelations, OutletWithRelations } from "@/types/database"

export function CheckInForm({ employees, outlets }: { employees: EmployeeWithRelations[]; outlets: OutletWithRelations[] }) {
  const router = useRouter()
  const [saving, setSaving] = React.useState(false)
  const activeEmployees = employees.filter((e) => ["ACTIVE", "PROBATION", "ON_LEAVE"].includes(e.status))
  const activeOutlets = outlets.filter((o) => o.status === "ACTIVE")
  const [draft, setDraft] = React.useState({ employeeId: "", outletId: "", latitude: "", longitude: "", notes: "" })

  async function saveCheckIn() {
    if (!draft.employeeId || !draft.outletId) { toast.add({ type: "error", title: "Select an employee and outlet" }); return }
    setSaving(true)
    const result = await checkInVisit({ employeeId: draft.employeeId, outletId: draft.outletId, latitude: draft.latitude ? Number(draft.latitude) : undefined, longitude: draft.longitude ? Number(draft.longitude) : undefined, notes: draft.notes })
    setSaving(false)
    if (!result.success) { toast.add({ type: "error", title: "Could not check in", description: result.error }); return }
    toast.add({ type: "success", title: result.data.is_planned ? "Planned visit checked in" : "Unplanned visit checked in", description: result.data.is_planned ? "The visit matched an active plan target." : "No matching plan target; the visit was classified as unplanned." })
    router.push("/visits")
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" size="sm" onClick={() => router.push("/visits")}><ArrowLeft />Back to visits</Button>
      <div className="rounded-lg border bg-card p-4 sm:p-6">
        <p className="mb-4 text-sm text-muted-foreground">The visit is automatically matched to an active plan target. If nothing matches, it is recorded as unplanned.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="checkin-employee">Employee</Label><NativeSelect id="checkin-employee" value={draft.employeeId} onChange={(event) => setDraft({ ...draft, employeeId: event.target.value })} className="w-full"><option value="">Select an employee</option>{activeEmployees.map((employee) => (<option key={employee.id} value={employee.id}>{employee.first_name} {employee.last_name} · {employee.employee_no}</option>))}</NativeSelect></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="checkin-outlet">Outlet</Label><NativeSelect id="checkin-outlet" value={draft.outletId} onChange={(event) => setDraft({ ...draft, outletId: event.target.value })} className="w-full"><option value="">Select an outlet</option>{activeOutlets.map((outlet) => (<option key={outlet.id} value={outlet.id}>{outlet.name} · {outlet.code}</option>))}</NativeSelect></div>
          <div className="space-y-1.5"><Label htmlFor="checkin-lat">Latitude</Label><Input id="checkin-lat" value={draft.latitude} onChange={(event) => setDraft({ ...draft, latitude: event.target.value })} inputMode="decimal" placeholder="Optional" /></div>
          <div className="space-y-1.5"><Label htmlFor="checkin-lng">Longitude</Label><Input id="checkin-lng" value={draft.longitude} onChange={(event) => setDraft({ ...draft, longitude: event.target.value })} inputMode="decimal" placeholder="Optional" /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="checkin-notes">Notes</Label><Input id="checkin-notes" value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} placeholder="Purpose of visit" /></div>
          <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-2 text-[0.625rem] text-muted-foreground sm:col-span-2"><LogOut className="size-3.5" />Check-out uses the visit log below.</div>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={() => router.push("/visits")} disabled={saving}>Cancel</Button>
          <Button onClick={saveCheckIn} disabled={saving}><LogIn />{saving ? "Checking in…" : "Check in"}</Button>
        </div>
      </div>
    </div>
  )
}
