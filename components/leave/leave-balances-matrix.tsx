"use client"

import * as React from "react"
import { Download, Search, Users } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getInitials } from "@/lib/format"
import type {
  Department,
  LeaveBalanceWithRelations,
} from "@/types/database"

type EmployeeRow = {
  employee: LeaveBalanceWithRelations["employee"]
  departmentName: string
  balances: Map<string, LeaveBalanceWithRelations>
  totalAvailable: number
}

export function LeaveBalancesMatrix({
  balances,
  departments,
}: {
  balances: LeaveBalanceWithRelations[]
  departments: Department[]
}) {
  const [search, setSearch] = React.useState("")
  const [departmentId, setDepartmentId] = React.useState("all")

  const leaveTypes = React.useMemo(
    () =>
      Array.from(
        new Map(
          balances.map((balance) => [balance.leave_type.id, balance.leave_type])
        ).values()
      ),
    [balances]
  )

  const departmentById = React.useMemo(
    () => new Map(departments.map((department) => [department.id, department.name])),
    [departments]
  )

  const rows = React.useMemo(() => {
    const byEmployee = new Map<string, EmployeeRow>()
    for (const balance of balances) {
      let row = byEmployee.get(balance.employee.id)
      if (!row) {
        row = {
          employee: balance.employee,
          departmentName:
            departmentById.get(balance.employee.department_id ?? "") ?? "Unassigned",
          balances: new Map(),
          totalAvailable: 0,
        }
        byEmployee.set(balance.employee.id, row)
      }
      row.balances.set(balance.leave_type.id, balance)
      row.totalAvailable +=
        balance.entitlement_days +
        balance.carried_over_days -
        balance.used_days -
        balance.pending_days
    }
    const term = search.trim().toLowerCase()
    return Array.from(byEmployee.values())
      .filter((row) => {
        if (departmentId !== "all" && row.employee.department_id !== departmentId) {
          return false
        }
        if (!term) return true
        return `${row.employee.first_name} ${row.employee.last_name} ${row.employee.employee_no}`
          .toLowerCase()
          .includes(term)
      })
      .sort((a, b) => a.employee.last_name.localeCompare(b.employee.last_name))
  }, [balances, departmentById, search, departmentId])

  const totals = leaveTypes.map((type) => {
    const typeBalances = balances.filter(
      (balance) => balance.leave_type_id === type.id
    )
    return {
      entitlement: typeBalances.reduce(
        (sum, balance) => sum + balance.entitlement_days + balance.carried_over_days,
        0
      ),
      used: typeBalances.reduce((sum, balance) => sum + balance.used_days, 0),
      pending: typeBalances.reduce((sum, balance) => sum + balance.pending_days, 0),
    }
  })

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search employee…"
              className="h-8 pl-8"
              aria-label="Search employee"
            />
          </div>
          <NativeSelect
            value={departmentId}
            onChange={(event) => setDepartmentId(event.target.value)}
            aria-label="Filter by department"
          >
            <option value="all">All departments</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <Button variant="outline" size="sm">
          <Download />
          Export balances
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow className="hover:bg-transparent">
              <TableHead className="sticky left-0 z-10 min-w-52 bg-muted/40 text-[0.6875rem] font-semibold tracking-wide uppercase">
                Employee
              </TableHead>
              <TableHead className="text-[0.6875rem] font-semibold tracking-wide uppercase">
                Department
              </TableHead>
              {leaveTypes.map((type) => (
                <TableHead
                  key={type.id}
                  className="text-center text-[0.6875rem] font-semibold tracking-wide uppercase"
                >
                  <span className="inline-flex items-center gap-1">
                    <span
                      className="size-1.5 rounded-full"
                      style={{ backgroundColor: type.color }}
                    />
                    {type.code}
                  </span>
                </TableHead>
              ))}
              <TableHead className="text-right text-[0.6875rem] font-semibold tracking-wide uppercase">
                Available
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={leaveTypes.length + 3}
                  className="py-10 text-center"
                >
                  <Users className="mx-auto mb-2 size-5 text-muted-foreground" />
                  <p className="text-xs font-medium">No employees found</p>
                  <p className="text-[0.625rem] text-muted-foreground">
                    Try a different search or department filter.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.employee.id}>
                  <TableCell className="sticky left-0 z-10 bg-card">
                    <div className="flex items-center gap-2">
                      <Avatar className="size-6">
                        <AvatarFallback className="bg-primary/10 text-[0.5rem] font-semibold text-primary">
                          {getInitials(
                            `${row.employee.first_name} ${row.employee.last_name}`
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-xs font-medium">
                          {row.employee.first_name} {row.employee.last_name}
                        </p>
                        <p className="text-[0.625rem] text-muted-foreground">
                          {row.employee.employee_no}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {row.departmentName}
                  </TableCell>
                  {leaveTypes.map((type) => {
                    const balance = row.balances.get(type.id)
                    if (!balance) {
                      return (
                        <TableCell key={type.id} className="text-center text-xs text-muted-foreground">
                          —
                        </TableCell>
                      )
                    }
                    const available =
                      balance.entitlement_days +
                      balance.carried_over_days -
                      balance.used_days -
                      balance.pending_days
                    return (
                      <TableCell key={type.id} className="text-center">
                        <span className="text-xs font-medium tabular-nums">
                          {available.toFixed(1)}
                        </span>
                        <p className="text-[0.5625rem] text-muted-foreground tabular-nums">
                          {balance.used_days.toFixed(1)} used
                        </p>
                      </TableCell>
                    )
                  })}
                  <TableCell className="text-right">
                    <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-xs font-semibold text-primary tabular-nums">
                      {row.totalAvailable.toFixed(1)}d
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell className="text-xs font-semibold">Workspace totals</TableCell>
              <TableCell className="text-[0.625rem] text-muted-foreground">
                {rows.length} employees
              </TableCell>
              {totals.map((total, index) => (
                <TableCell key={leaveTypes[index].id} className="text-center">
                  <span className="text-xs font-semibold tabular-nums">
                    {(total.entitlement - total.used - total.pending).toFixed(0)}
                  </span>
                  <p className="text-[0.5625rem] text-muted-foreground">
                    {total.pending.toFixed(0)} pending
                  </p>
                </TableCell>
              ))}
              <TableCell />
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </div>
  )
}
