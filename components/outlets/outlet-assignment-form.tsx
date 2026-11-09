"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, MapPinned, Store, Users } from "lucide-react"

import { assignOutlets } from "@/actions/outlet-assignment.action"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/native-select"
import { toast } from "@/components/ui/toast"
import type { EmployeeWithRelations, OutletWithRelations } from "@/types/database"

export function OutletAssignmentForm({
  employees,
  outlets,
}: {
  employees: EmployeeWithRelations[]
  outlets: OutletWithRelations[]
}) {
  const router = useRouter()
  const [employeeId, setEmployeeId] = React.useState("")
  const [outletIds, setOutletIds] = React.useState<string[]>([])
  const [notes, setNotes] = React.useState("")
  const [saving, setSaving] = React.useState(false)

  const activeEmployees = employees.filter((employee) =>
    ["ACTIVE", "PROBATION", "ON_LEAVE"].includes(employee.status)
  )
  const activeOutlets = outlets.filter((outlet) => outlet.status === "ACTIVE")

  function toggleOutlet(id: string) {
    setOutletIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
    )
  }

  async function save() {
    if (!employeeId) {
      toast.add({ type: "error", title: "Select an employee" })
      return
    }
    if (outletIds.length === 0) {
      toast.add({ type: "error", title: "Select at least one outlet" })
      return
    }

    setSaving(true)
    const result = await assignOutlets({ employeeId, outletIds, notes })
    setSaving(false)

    if (!result.success) {
      toast.add({
        type: "error",
        title: "Could not assign outlets",
        description: result.error,
      })
      return
    }

    toast.add({
      type: "success",
      title: "Outlets assigned",
      description: `${result.data.assigned} assigned, ${result.data.skipped} skipped.`,
    })
    router.push("/outlets/assignments")
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/outlets/assignments")}
        >
          <ArrowLeft />
          Back to assignments
        </Button>
      </div>

      <div className="rounded-lg border bg-card p-4 sm:p-6">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="assignment-employee">Employee</Label>
            <NativeSelect
              id="assignment-employee"
              value={employeeId}
              onChange={(event) => setEmployeeId(event.target.value)}
              className="w-full"
            >
              <option value="">Select an employee</option>
              {activeEmployees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.first_name} {employee.last_name} · {employee.employee_no}
                </option>
              ))}
            </NativeSelect>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Outlets</Label>
              <span className="text-[0.625rem] text-muted-foreground">
                {outletIds.length} selected
              </span>
            </div>
            {activeOutlets.length === 0 ? (
              <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                No active outlets. Approve an outlet first.
              </p>
            ) : (
              <div className="max-h-72 space-y-1 overflow-y-auto rounded-md border p-2">
                {activeOutlets.map((outlet) => (
                  <label
                    key={outlet.id}
                    className="flex cursor-pointer items-start gap-2 rounded px-2 py-1.5 text-xs hover:bg-muted"
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 size-3.5 accent-primary"
                      checked={outletIds.includes(outlet.id)}
                      onChange={() => toggleOutlet(outlet.id)}
                    />
                    <span className="min-w-0">
                      <span className="flex items-center gap-1 font-medium">
                        <Store className="size-3 text-muted-foreground" />
                        {outlet.name}
                      </span>
                      <span className="block text-[0.625rem] text-muted-foreground">
                        {outlet.code} · {outlet.address ?? "No address"}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="assignment-notes">Notes</Label>
            <Input
              id="assignment-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Territory or coverage notes"
            />
          </div>

          <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-2 text-[0.625rem] text-muted-foreground">
            <Users className="size-3.5" />
            Only active employees and approved outlets can be assigned.
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t pt-4">
          <Button
            variant="outline"
            onClick={() => router.push("/outlets/assignments")}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            <MapPinned />
            {saving ? "Assigning…" : "Assign outlets"}
          </Button>
        </div>
      </div>
    </div>
  )
}
