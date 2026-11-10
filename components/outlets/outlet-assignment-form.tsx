"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, MapPinned, Search, Store, Users, X } from "lucide-react"

import { assignOutlets, searchAssignmentEmployees } from "@/actions/outlet-assignment.action"
import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/native-select"
import { toast } from "@/components/ui/toast"
import { humanize } from "@/lib/format"
import {
  OUTLET_STATUSES,
  type EmployeeWithRelations,
  type OutletWithRelations,
} from "@/types/database"

const FIRST_EMPLOYEE_COUNT = 5

export function OutletAssignmentForm({
  initialEmployees,
  outlets,
}: {
  initialEmployees: EmployeeWithRelations[]
  outlets: OutletWithRelations[]
}) {
  const router = useRouter()
  const [selectedEmployee, setSelectedEmployee] =
    React.useState<EmployeeWithRelations | null>(null)
  const [employeeQuery, setEmployeeQuery] = React.useState("")
  const [employeeOptions, setEmployeeOptions] =
    React.useState<EmployeeWithRelations[]>([])
  const [searching, setSearching] = React.useState(false)
  const [outletIds, setOutletIds] = React.useState<string[]>([])
  const [notes, setNotes] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [distributorFilter, setDistributorFilter] = React.useState("all")
  const [saving, setSaving] = React.useState(false)

  // Only the first few employees are sent to the browser. Everything beyond
  // that is fetched on demand so large directories stay fast.
  React.useEffect(() => {
    const term = employeeQuery.trim()
    if (!term) return

    let cancelled = false
    const timer = window.setTimeout(async () => {
      const result = await searchAssignmentEmployees(term)
      if (cancelled) return
      setSearching(false)
      if (!result.success) {
        toast.add({
          type: "error",
          title: "Could not search employees",
          description: result.error,
        })
        return
      }
      setEmployeeOptions(result.data)
    }, 250)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [employeeQuery])

  const employeeQueryTerm = employeeQuery.trim()
  const visibleEmployees = employeeQueryTerm ? employeeOptions : initialEmployees
  const showSearching = Boolean(employeeQueryTerm) && searching

  const filteredOutlets = React.useMemo(() => {
    return outlets.filter((outlet) => {
      if (statusFilter !== "all" && outlet.status !== statusFilter) return false
      if (distributorFilter === "distributor" && !outlet.is_distributor) return false
      if (distributorFilter === "direct" && outlet.is_distributor) return false
      return true
    })
  }, [outlets, statusFilter, distributorFilter])

  function toggleOutlet(id: string) {
    setOutletIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
    )
  }

  async function save() {
    if (!selectedEmployee) {
      toast.add({ type: "error", title: "Select an employee" })
      return
    }
    if (outletIds.length === 0) {
      toast.add({ type: "error", title: "Select at least one outlet" })
      return
    }

    setSaving(true)
    const result = await assignOutlets({
      employeeId: selectedEmployee.id,
      outletIds,
      notes,
    })
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

  const columns: DataTableColumn<OutletWithRelations>[] = [
    {
      id: "select",
      header: (
        <input
          type="checkbox"
          className="size-3.5 accent-primary"
          aria-label="Select all visible outlets"
          checked={
            filteredOutlets.length > 0 &&
            filteredOutlets.every((outlet) => outletIds.includes(outlet.id))
          }
          onChange={(event) => {
            const ids = filteredOutlets.map((outlet) => outlet.id)
            setOutletIds((current) =>
              event.target.checked
                ? Array.from(new Set([...current, ...ids]))
                : current.filter((id) => !ids.includes(id))
            )
          }}
        />
      ),
      width: "2.5rem",
      cell: (row) => (
        <input
          type="checkbox"
          className="size-3.5 accent-primary"
          aria-label={`Select ${row.name}`}
          checked={outletIds.includes(row.id)}
          onClick={(event) => event.stopPropagation()}
          onChange={() => toggleOutlet(row.id)}
        />
      ),
    },
    {
      id: "outlet",
      header: "Outlet",
      sortValue: (row) => row.name,
      cell: (row) => (
        <div>
          <p className="flex items-center gap-1.5 text-xs font-medium">
            <Store className="size-3 text-muted-foreground" />
            {row.name}
          </p>
          <p className="text-[0.625rem] text-muted-foreground">{row.code}</p>
        </div>
      ),
    },
    {
      id: "address",
      header: "Address",
      hideBelow: "md",
      sortValue: (row) => row.address ?? "",
      cell: (row) => (
        <span className="line-clamp-2 max-w-64 text-xs text-muted-foreground">
          {row.address ?? "—"}
        </span>
      ),
    },
    {
      id: "area",
      header: "Area",
      hideBelow: "lg",
      sortValue: (row) => `${row.city ?? ""} ${row.province ?? ""}`,
      cell: (row) => (
        <span className="text-xs text-muted-foreground">
          {[row.city, row.province].filter(Boolean).join(", ") || "—"}
        </span>
      ),
    },
    {
      id: "type",
      header: "Type",
      hideBelow: "lg",
      cell: (row) => (
        <span className="text-xs text-muted-foreground">
          {row.is_distributor ? "Distributor" : "Direct"}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
    },
  ]

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
            <Label htmlFor="assignment-employee-search">Employee</Label>

            {selectedEmployee ? (
              <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium">
                    {selectedEmployee.first_name} {selectedEmployee.last_name}
                  </p>
                  <p className="text-[0.625rem] text-muted-foreground">
                    {selectedEmployee.employee_no} · {selectedEmployee.email ?? "No email"}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Clear selected employee"
                  onClick={() => {
                    setSelectedEmployee(null)
                    setEmployeeQuery("")
                  }}
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="assignment-employee-search"
                    value={employeeQuery}
                    onChange={(event) => {
                      const value = event.target.value
                      setEmployeeQuery(value)
                      setSearching(value.trim().length > 0)
                    }}
                    placeholder="Search employees by name, number or email…"
                    className="pl-8"
                    autoComplete="off"
                  />
                </div>
                <div className="max-h-56 overflow-y-auto rounded-md border">
                  {showSearching ? (
                    <p className="p-3 text-xs text-muted-foreground">Searching…</p>
                  ) : visibleEmployees.length === 0 ? (
                    <p className="p-3 text-xs text-muted-foreground">
                      No employees match your search.
                    </p>
                  ) : (
                    visibleEmployees.map((employee) => (
                      <button
                        key={employee.id}
                        type="button"
                        className="flex w-full items-start gap-2 border-b px-3 py-2 text-left last:border-b-0 hover:bg-muted"
                        onClick={() => {
                          setSelectedEmployee(employee)
                          setEmployeeQuery("")
                        }}
                      >
                        <Users className="mt-0.5 size-3.5 text-muted-foreground" />
                        <span className="min-w-0">
                          <span className="block text-xs font-medium">
                            {employee.first_name} {employee.last_name}
                          </span>
                          <span className="block text-[0.625rem] text-muted-foreground">
                            {employee.employee_no} · {employee.email ?? "No email"}
                          </span>
                        </span>
                      </button>
                    ))
                  )}
                </div>
                <p className="text-[0.625rem] text-muted-foreground">
                  {employeeQueryTerm
                    ? `${visibleEmployees.length} matching employee(s).`
                    : `Showing the first ${FIRST_EMPLOYEE_COUNT} employees. Search to find more.`}
                </p>
              </>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label>Outlets</Label>
              <span className="text-[0.625rem] text-muted-foreground">
                {outletIds.length} selected
              </span>
            </div>

            <DataTable
              data={filteredOutlets}
              columns={columns}
              getRowId={(row) => row.id}
              searchable={(row) =>
                [
                  row.name,
                  row.code,
                  row.address,
                  row.city,
                  row.province,
                  row.contact_person,
                ]
                  .filter(Boolean)
                  .join(" ")
              }
              searchPlaceholder="Search outlets…"
              initialSort={{ id: "outlet", desc: false }}
              pageSize={8}
              emptyTitle="No outlets match your filters"
              emptyDescription="Clear the filters or adjust your search."
              emptyIcon={MapPinned}
              onRowClick={(row) => toggleOutlet(row.id)}
              filters={
                <>
                  <NativeSelect
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    aria-label="Filter outlets by status"
                    className="w-auto"
                  >
                    <option value="all">All statuses</option>
                    {OUTLET_STATUSES.map((value) => (
                      <option key={value} value={value}>
                        {humanize(value)}
                      </option>
                    ))}
                  </NativeSelect>
                  <NativeSelect
                    value={distributorFilter}
                    onChange={(event) => setDistributorFilter(event.target.value)}
                    aria-label="Filter outlets by type"
                    className="w-auto"
                  >
                    <option value="all">All types</option>
                    <option value="direct">Direct</option>
                    <option value="distributor">Distributors</option>
                  </NativeSelect>
                </>
              }
              toolbar={
                outletIds.length > 0 ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setOutletIds([])}
                  >
                    <X />
                    Clear selection
                  </Button>
                ) : null
              }
            />
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
            Only active employees can be assigned. Choose outlets with the
            checkboxes in the table.
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
