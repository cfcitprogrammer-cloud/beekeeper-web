"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Download, Mail, Plus, Trash2, Users } from "lucide-react"

import { deleteEmployee } from "@/actions/employee.action"

import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { StatusBadge } from "@/components/shared/status-badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import { NativeSelect } from "@/components/ui/native-select"
import {
  EMPLOYMENT_STATUSES,
  type Department,
  type EmployeeWithRelations,
} from "@/types/database"
import { formatDate, getInitials, humanize } from "@/lib/format"

export function EmployeesDirectory({
  employees,
  departments,
}: {
  employees: EmployeeWithRelations[]
  departments: Department[]
}) {
  const router = useRouter()
  const [departmentId, setDepartmentId] = React.useState("all")
  const [status, setStatus] = React.useState("all")
  const [employmentType, setEmploymentType] = React.useState("all")

  const filtered = React.useMemo(
    () =>
      employees.filter((employee) => {
        if (departmentId !== "all" && employee.department_id !== departmentId) {
          return false
        }
        if (status !== "all" && employee.status !== status) return false
        if (
          employmentType !== "all" &&
          employee.employment_type !== employmentType
        ) {
          return false
        }
        return true
      }),
    [employees, departmentId, status, employmentType]
  )

  async function deleteEmployeeHandler(id: string, name: string) {
    if (!window.confirm(`Delete employee "${name}"? This cannot be undone.`)) return
    const result = await deleteEmployee(id)
    if (!result.success) {
      toast.add({ type: "error", title: "Could not delete employee", description: result.error })
      return
    }
    toast.add({ type: "success", title: "Employee deleted", description: `${name} was removed.` })
    router.refresh()
  }

  const columns: DataTableColumn<EmployeeWithRelations>[] = [
    {
      id: "employee",
      header: "Employee",
      sortValue: (row) => `${row.last_name} ${row.first_name}`,
      cell: (row) => (
        <div className="flex items-center gap-2.5">
          <Avatar className="size-7">
            <AvatarFallback className="bg-primary/10 text-[0.5625rem] font-semibold text-primary">
              {getInitials(`${row.first_name} ${row.last_name}`)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium">
              {row.first_name} {row.last_name}
            </p>
            <p className="text-[0.625rem] text-muted-foreground">
              {row.employee_no} · {row.email}
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "department",
      header: "Department",
      sortValue: (row) => row.department?.name ?? "",
      cell: (row) => (
        <span className="text-xs">{row.department?.name ?? "Unassigned"}</span>
      ),
    },
    {
      id: "position",
      header: "Position",
      hideBelow: "md",
      sortValue: (row) => row.position?.title ?? "",
      cell: (row) => (
        <span className="text-xs">{row.position?.title ?? "—"}</span>
      ),
    },
    {
      id: "status",
      header: "Status",
      sortValue: (row) => row.status,
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      id: "type",
      header: "Type",
      hideBelow: "lg",
      sortValue: (row) => row.employment_type,
      cell: (row) => (
        <span className="text-xs text-muted-foreground">
          {humanize(row.employment_type)}
        </span>
      ),
    },
    {
      id: "hired",
      header: "Hired",
      hideBelow: "lg",
      sortValue: (row) => row.hire_date ?? "",
      cell: (row) => (
        <span className="text-xs text-muted-foreground">
          {formatDate(row.hire_date)}
        </span>
      ),
    },
    {
      id: "manager",
      header: "Manager",
      hideBelow: "xl",
      sortValue: (row) => row.manager?.last_name ?? "",
      cell: (row) =>
        row.manager ? (
          <span className="text-xs">
            {row.manager.first_name} {row.manager.last_name}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      id: "actions",
      header: "",
      align: "right",
      cell: (row) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Email ${row.first_name}`}
            render={<a href={`mailto:${row.email ?? ""}`} />}
          >
            <Mail />
          </Button>
          <Button
            variant="outline"
            size="sm"
            render={<Link href={`/employees/${row.id}`} />}
          >
            View
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => deleteEmployeeHandler(row.id, `${row.first_name} ${row.last_name}`)}
            aria-label="Delete employee"
          >
            <Trash2 className="size-3.5 text-destructive" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <DataTable
      data={filtered}
      columns={columns}
      getRowId={(row) => row.id}
      searchable={(row) =>
        [
          row.first_name,
          row.last_name,
          row.employee_no,
          row.email,
          row.department?.name,
          row.position?.title,
          row.address,
        ]
          .filter(Boolean)
          .join(" ")
      }
      searchPlaceholder="Search by name, ID, email or role…"
      initialSort={{ id: "employee", desc: false }}
      pageSize={10}
      emptyTitle="No employees match your filters"
      emptyDescription="Clear the filters or onboard a new employee to get started."
      emptyIcon={Users}
      onRowClick={(row) => router.push(`/employees/${row.id}`)}
      filters={
        <>
          <NativeSelect
            value={departmentId}
            onChange={(event) => setDepartmentId(event.target.value)}
            aria-label="Filter by department"
            className="w-auto"
          >
            <option value="all">All departments</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            aria-label="Filter by employment status"
            className="w-auto"
          >
            <option value="all">All statuses</option>
            {EMPLOYMENT_STATUSES.map((value) => (
              <option key={value} value={value}>
                {humanize(value)}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect
            value={employmentType}
            onChange={(event) => setEmploymentType(event.target.value)}
            aria-label="Filter by employment type"
            className="w-auto"
          >
            <option value="all">All types</option>
            {["FULL_TIME", "PART_TIME", "CONTRACTOR", "INTERN", "CONSULTANT"].map(
              (value) => (
                <option key={value} value={value}>
                  {humanize(value)}
                </option>
              )
            )}
          </NativeSelect>
        </>
      }
      toolbar={
        <>
          <Button variant="outline" size="sm">
            <Download />
            Export
          </Button>
          <Button size="sm" render={<Link href="/employees/new" />}>
            <Plus />
            Onboard employee
          </Button>
        </>
      }
    />
  )
}
