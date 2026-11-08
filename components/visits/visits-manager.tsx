"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  CalendarClock,
  CheckCircle2,
  LogIn,
  LogOut,
  MapPinned,
  Pencil,
  Plus,
  Target,
  Trash2,
  XCircle,
} from "lucide-react"

import {
  addVisitPlanOutlet,
  cancelVisit,
  checkInVisit,
  checkOutVisit,
  createVisitPlan,
  deleteVisitPlan,
  removeVisitPlanOutlet,
  updateVisitPlan,
} from "@/actions/visit.action"
import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { Modal } from "@/components/shared/modal"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/native-select"
import { toast } from "@/components/ui/toast"
import { formatDateTime, humanize } from "@/lib/format"
import type {
  VisitPlanWithRelations,
  VisitWithRelations,
} from "@/lib/data/operations"
import type { EmployeeWithRelations, OutletWithRelations } from "@/types/database"
import { VISIT_PLAN_STATUSES } from "@/types/database"

const today = () => new Date().toISOString().slice(0, 10)
const emptyPlan = {
  employeeId: "",
  name: "",
  startDate: today(),
  endDate: today(),
  status: "ACTIVE",
  notes: "",
}
const emptyCheckIn = {
  employeeId: "",
  outletId: "",
  latitude: "",
  longitude: "",
  notes: "",
}

export function VisitsManager({
  plans,
  visits,
  employees,
  outlets,
}: {
  plans: VisitPlanWithRelations[]
  visits: VisitWithRelations[]
  employees: EmployeeWithRelations[]
  outlets: OutletWithRelations[]
}) {
  const router = useRouter()
  const [planOpen, setPlanOpen] = React.useState(false)
  const [editingPlanId, setEditingPlanId] = React.useState<string | null>(null)
  const [planDraft, setPlanDraft] = React.useState(emptyPlan)
  const [selectedPlanId, setSelectedPlanId] = React.useState<string | null>(null)
  const [targetOpen, setTargetOpen] = React.useState(false)
  const [targetOutletId, setTargetOutletId] = React.useState("")
  const [checkInOpen, setCheckInOpen] = React.useState(false)
  const [checkInDraft, setCheckInDraft] = React.useState(emptyCheckIn)
  const [saving, setSaving] = React.useState(false)

  const activeEmployees = employees.filter((employee) =>
    ["ACTIVE", "PROBATION", "ON_LEAVE"].includes(employee.status)
  )
  const activeOutlets = outlets.filter((outlet) => outlet.status === "ACTIVE")
  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId) ?? null

  function openCreatePlan() {
    setEditingPlanId(null)
    setPlanDraft(emptyPlan)
    setPlanOpen(true)
  }

  function openEditPlan(plan: VisitPlanWithRelations) {
    setEditingPlanId(plan.id)
    setPlanDraft({
      employeeId: plan.employee_id,
      name: plan.name,
      startDate: plan.start_date,
      endDate: plan.end_date,
      status: plan.status,
      notes: plan.notes ?? "",
    })
    setPlanOpen(true)
  }

  async function savePlan() {
    if (!planDraft.employeeId || !planDraft.name.trim()) {
      toast.add({ type: "error", title: "Employee and plan name are required" })
      return
    }
    setSaving(true)
    const payload = {
      employeeId: planDraft.employeeId,
      name: planDraft.name,
      startDate: planDraft.startDate,
      endDate: planDraft.endDate,
      status: planDraft.status,
      notes: planDraft.notes,
    }
    const result = editingPlanId
      ? await updateVisitPlan({ ...payload, id: editingPlanId })
      : await createVisitPlan(payload)
    setSaving(false)

    if (!result.success) {
      toast.add({ type: "error", title: "Could not save visit plan", description: result.error })
      return
    }
    toast.add({ type: "success", title: editingPlanId ? "Visit plan updated" : "Visit plan created" })
    if (!editingPlanId) setSelectedPlanId(result.data.id)
    setPlanOpen(false)
    router.refresh()
  }

  async function removePlan(plan: VisitPlanWithRelations) {
    if (!window.confirm(`Delete visit plan "${plan.name}"?`)) return
    const result = await deleteVisitPlan(plan.id)
    if (!result.success) {
      toast.add({ type: "error", title: "Could not delete plan", description: result.error })
      return
    }
    toast.add({ type: "success", title: "Visit plan deleted" })
    router.refresh()
  }

  async function addTarget() {
    if (!selectedPlan) return
    if (!targetOutletId) {
      toast.add({ type: "error", title: "Select an outlet" })
      return
    }
    setSaving(true)
    const result = await addVisitPlanOutlet({
      planId: selectedPlan.id,
      outletId: targetOutletId,
    })
    setSaving(false)
    if (!result.success) {
      toast.add({ type: "error", title: "Could not add target", description: result.error })
      return
    }
    toast.add({ type: "success", title: "Target outlet added" })
    setTargetOutletId("")
    router.refresh()
  }

  async function removeTarget(id: string) {
    const result = await removeVisitPlanOutlet(id)
    if (!result.success) {
      toast.add({ type: "error", title: "Could not remove target", description: result.error })
      return
    }
    toast.add({ type: "success", title: "Target removed" })
    router.refresh()
  }

  async function saveCheckIn() {
    if (!checkInDraft.employeeId || !checkInDraft.outletId) {
      toast.add({ type: "error", title: "Select an employee and outlet" })
      return
    }
    setSaving(true)
    const result = await checkInVisit({
      employeeId: checkInDraft.employeeId,
      outletId: checkInDraft.outletId,
      latitude: checkInDraft.latitude ? Number(checkInDraft.latitude) : undefined,
      longitude: checkInDraft.longitude ? Number(checkInDraft.longitude) : undefined,
      notes: checkInDraft.notes,
    })
    setSaving(false)
    if (!result.success) {
      toast.add({ type: "error", title: "Could not check in", description: result.error })
      return
    }
    toast.add({
      type: "success",
      title: result.data.is_planned ? "Planned visit checked in" : "Unplanned visit checked in",
      description: result.data.is_planned
        ? "The visit matched an active plan target."
        : "No matching plan target; the visit was classified as unplanned.",
    })
    setCheckInOpen(false)
    setCheckInDraft(emptyCheckIn)
    router.refresh()
  }

  async function checkout(visit: VisitWithRelations) {
    const result = await checkOutVisit({ visitId: visit.id })
    if (!result.success) {
      toast.add({ type: "error", title: "Could not check out", description: result.error })
      return
    }
    toast.add({ type: "success", title: "Visit checked out" })
    router.refresh()
  }

  async function cancel(visit: VisitWithRelations) {
    if (!window.confirm("Cancel this visit?")) return
    const result = await cancelVisit(visit.id)
    if (!result.success) {
      toast.add({ type: "error", title: "Could not cancel visit", description: result.error })
      return
    }
    toast.add({ type: "success", title: "Visit cancelled" })
    router.refresh()
  }

  const planColumns: DataTableColumn<VisitPlanWithRelations>[] = [
    {
      id: "plan",
      header: "Visit plan",
      sortValue: (row) => row.name,
      cell: (row) => (
        <div>
          <p className="text-xs font-medium">{row.name}</p>
          <p className="text-[0.625rem] text-muted-foreground">
            {row.employee
              ? `${row.employee.first_name} ${row.employee.last_name} · ${row.employee.employee_no}`
              : "Unknown employee"}
          </p>
        </div>
      ),
    },
    {
      id: "range",
      header: "Date range",
      hideBelow: "md",
      sortValue: (row) => row.start_date,
      cell: (row) => (
        <span className="text-xs">
          {row.start_date} → {row.end_date}
        </span>
      ),
    },
    {
      id: "targets",
      header: "Targets",
      align: "right",
      sortValue: (row) => row.targets.length,
      cell: (row) => <span className="text-xs tabular-nums">{row.targets.length}</span>,
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      id: "actions",
      header: "",
      align: "right",
      cell: (row) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedPlanId(row.id)
              setTargetOpen(true)
            }}
          >
            <Target />
            Targets
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => openEditPlan(row)}
            aria-label="Edit visit plan"
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => removePlan(row)}
            aria-label="Delete visit plan"
          >
            <Trash2 className="size-3.5 text-destructive" />
          </Button>
        </div>
      ),
    },
  ]

  const visitColumns: DataTableColumn<VisitWithRelations>[] = [
    {
      id: "employee",
      header: "Employee",
      sortValue: (row) =>
        row.employee ? `${row.employee.last_name} ${row.employee.first_name}` : "",
      cell: (row) => (
        <div>
          <p className="text-xs font-medium">
            {row.employee
              ? `${row.employee.first_name} ${row.employee.last_name}`
              : "Unknown employee"}
          </p>
          <p className="text-[0.625rem] text-muted-foreground">
            {row.employee?.employee_no ?? "—"}
          </p>
        </div>
      ),
    },
    {
      id: "outlet",
      header: "Outlet",
      sortValue: (row) => row.outlet?.name ?? "",
      cell: (row) => (
        <div>
          <p className="text-xs">{row.outlet?.name ?? "Unknown outlet"}</p>
          <p className="text-[0.625rem] text-muted-foreground">{row.outlet?.code ?? "—"}</p>
        </div>
      ),
    },
    {
      id: "planned",
      header: "Classification",
      sortValue: (row) => (row.is_planned ? 1 : 0),
      cell: (row) => (
        <span
          className={
            row.is_planned
              ? "inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[0.625rem] font-medium text-emerald-700 dark:text-emerald-300"
              : "inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[0.625rem] font-medium text-amber-700 dark:text-amber-300"
          }
        >
          {row.is_planned ? <CheckCircle2 className="size-3" /> : <MapPinned className="size-3" />}
          {row.is_planned ? "Planned" : "Unplanned"}
        </span>
      ),
    },
    {
      id: "checkin",
      header: "Check-in",
      hideBelow: "md",
      sortValue: (row) => row.check_in_at,
      cell: (row) => (
        <span className="text-[0.625rem] text-muted-foreground">
          {formatDateTime(row.check_in_at)}
        </span>
      ),
    },
    {
      id: "checkout",
      header: "Check-out",
      hideBelow: "lg",
      sortValue: (row) => row.check_out_at ?? "",
      cell: (row) => (
        <span className="text-[0.625rem] text-muted-foreground">
          {row.check_out_at ? formatDateTime(row.check_out_at) : "Open"}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      id: "actions",
      header: "",
      align: "right",
      cell: (row) => (
        <div className="flex justify-end gap-1">
          {!row.check_out_at && row.status === "checked_in" && (
            <Button variant="outline" size="sm" onClick={() => checkout(row)}>
              <LogOut />
              Check out
            </Button>
          )}
          {row.status !== "cancelled" && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => cancel(row)}
              aria-label="Cancel visit"
            >
              <XCircle className="size-3.5 text-destructive" />
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <>
      <DataTable
        data={plans}
        columns={planColumns}
        getRowId={(row) => row.id}
        searchable={(row) =>
          [
            row.name,
            row.employee?.first_name,
            row.employee?.last_name,
            row.employee?.employee_no,
          ]
            .filter(Boolean)
            .join(" ")
        }
        searchPlaceholder="Search visit plans…"
        pageSize={8}
        emptyTitle="No visit plans yet"
        emptyDescription="Create a plan with target outlets; visits outside it are unplanned."
        emptyIcon={CalendarClock}
        toolbar={
          <>
            <Button variant="outline" size="sm" onClick={() => setCheckInOpen(true)}>
              <LogIn />
              Check in
            </Button>
            <Button size="sm" onClick={openCreatePlan}>
              <Plus />
              New visit plan
            </Button>
          </>
        }
      />

      <div className="mt-5 rounded-xl border bg-card">
        <div className="border-b px-4 py-3">
          <p className="text-[0.625rem] font-semibold tracking-wider text-muted-foreground uppercase">
            Visit log
          </p>
          <p className="font-heading text-sm font-semibold">
            {visits.length} visits · {visits.filter((visit) => !visit.is_planned).length} unplanned
          </p>
        </div>
        <div className="p-3">
          <DataTable
            data={visits}
            columns={visitColumns}
            getRowId={(row) => row.id}
            searchable={(row) =>
              [
                row.employee?.first_name,
                row.employee?.last_name,
                row.employee?.employee_no,
                row.outlet?.name,
                row.outlet?.code,
                row.is_planned ? "planned" : "unplanned",
              ]
                .filter(Boolean)
                .join(" ")
            }
            searchPlaceholder="Search visits…"
            pageSize={10}
            emptyTitle="No visits recorded"
            emptyDescription="Check in to an outlet to create the first visit."
            emptyIcon={LogIn}
          />
        </div>
      </div>

      <Modal
        open={planOpen}
        onOpenChange={setPlanOpen}
        title={editingPlanId ? "Edit visit plan" : "New visit plan"}
        description="A plan belongs to one employee and contains target outlets for a date range."
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setPlanOpen(false)}>
              Cancel
            </Button>
            <Button onClick={savePlan} disabled={saving}>
              <CalendarClock />
              {saving ? "Saving…" : "Save plan"}
            </Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="visit-plan-employee">Employee</Label>
            <NativeSelect
              id="visit-plan-employee"
              value={planDraft.employeeId}
              onChange={(event) => setPlanDraft({ ...planDraft, employeeId: event.target.value })}
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
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="visit-plan-name">Plan name</Label>
            <Input
              id="visit-plan-name"
              value={planDraft.name}
              onChange={(event) => setPlanDraft({ ...planDraft, name: event.target.value })}
              placeholder="North territory week 42"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="visit-plan-start">Start date</Label>
            <Input
              id="visit-plan-start"
              type="date"
              value={planDraft.startDate}
              onChange={(event) => setPlanDraft({ ...planDraft, startDate: event.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="visit-plan-end">End date</Label>
            <Input
              id="visit-plan-end"
              type="date"
              value={planDraft.endDate}
              onChange={(event) => setPlanDraft({ ...planDraft, endDate: event.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="visit-plan-status">Status</Label>
            <NativeSelect
              id="visit-plan-status"
              value={planDraft.status}
              onChange={(event) => setPlanDraft({ ...planDraft, status: event.target.value })}
              className="w-full"
            >
              {VISIT_PLAN_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {humanize(value)}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="visit-plan-notes">Notes</Label>
            <Input
              id="visit-plan-notes"
              value={planDraft.notes}
              onChange={(event) => setPlanDraft({ ...planDraft, notes: event.target.value })}
              placeholder="Route or coverage notes"
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={targetOpen}
        onOpenChange={setTargetOpen}
        title={selectedPlan ? `Targets · ${selectedPlan.name}` : "Target outlets"}
        description="Check-ins at these outlets within the plan dates are classified as planned."
        size="lg"
        footer={
          <Button variant="outline" onClick={() => setTargetOpen(false)}>
            Close
          </Button>
        }
      >
        {selectedPlan && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <NativeSelect
                value={targetOutletId}
                onChange={(event) => setTargetOutletId(event.target.value)}
                className="flex-1"
                aria-label="Target outlet"
              >
                <option value="">Select an outlet</option>
                {activeOutlets
                  .filter(
                    (outlet) =>
                      !selectedPlan.targets.some((target) => target.outlet_id === outlet.id)
                  )
                  .map((outlet) => (
                    <option key={outlet.id} value={outlet.id}>
                      {outlet.name} · {outlet.code}
                    </option>
                  ))}
              </NativeSelect>
              <Button onClick={addTarget} disabled={saving}>
                <Plus />
                Add
              </Button>
            </div>

            <div className="space-y-1">
              {selectedPlan.targets.length === 0 ? (
                <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                  No target outlets yet.
                </p>
              ) : (
                selectedPlan.targets.map((target) => (
                  <div
                    key={target.id}
                    className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
                  >
                    <div>
                      <p className="text-xs font-medium">{target.outlet?.name ?? "Outlet"}</p>
                      <p className="text-[0.625rem] text-muted-foreground">
                        {target.outlet?.code ?? "—"} · {target.outlet?.address ?? "No address"}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeTarget(target.id)}
                      aria-label="Remove target outlet"
                    >
                      <Trash2 className="size-3.5 text-destructive" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={checkInOpen}
        onOpenChange={setCheckInOpen}
        title="Check in to an outlet"
        description="The visit is automatically matched to an active plan target. If nothing matches, it is recorded as unplanned."
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setCheckInOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveCheckIn} disabled={saving}>
              <LogIn />
              {saving ? "Checking in…" : "Check in"}
            </Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="checkin-employee">Employee</Label>
            <NativeSelect
              id="checkin-employee"
              value={checkInDraft.employeeId}
              onChange={(event) =>
                setCheckInDraft({ ...checkInDraft, employeeId: event.target.value })
              }
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
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="checkin-outlet">Outlet</Label>
            <NativeSelect
              id="checkin-outlet"
              value={checkInDraft.outletId}
              onChange={(event) =>
                setCheckInDraft({ ...checkInDraft, outletId: event.target.value })
              }
              className="w-full"
            >
              <option value="">Select an outlet</option>
              {activeOutlets.map((outlet) => (
                <option key={outlet.id} value={outlet.id}>
                  {outlet.name} · {outlet.code}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="checkin-lat">Latitude</Label>
            <Input
              id="checkin-lat"
              value={checkInDraft.latitude}
              onChange={(event) =>
                setCheckInDraft({ ...checkInDraft, latitude: event.target.value })
              }
              inputMode="decimal"
              placeholder="Optional"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="checkin-lng">Longitude</Label>
            <Input
              id="checkin-lng"
              value={checkInDraft.longitude}
              onChange={(event) =>
                setCheckInDraft({ ...checkInDraft, longitude: event.target.value })
              }
              inputMode="decimal"
              placeholder="Optional"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="checkin-notes">Notes</Label>
            <Input
              id="checkin-notes"
              value={checkInDraft.notes}
              onChange={(event) => setCheckInDraft({ ...checkInDraft, notes: event.target.value })}
              placeholder="Purpose of visit"
            />
          </div>
          <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-2 text-[0.625rem] text-muted-foreground sm:col-span-2">
            <LogOut className="size-3.5" />
            Check-out uses the visit log below.
          </div>
        </div>
      </Modal>
    </>
  )
}
