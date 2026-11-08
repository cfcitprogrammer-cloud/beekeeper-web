"use client"

import * as React from "react"
import {
  AlertTriangle,
  Download,
  FileSpreadsheet,
  Store,
  Upload,
  Users,
} from "lucide-react"

import {
  exportEmployees,
  exportOutlets,
  importEmployees,
  importOutlets,
  type CsvImportResult,
} from "@/actions/import-export.action"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/toast"

const EMPLOYEE_TEMPLATE = [
  "employee_no,first_name,middle_name,last_name,email,phone,sss_no,philhealth_no,tin_no,pagibig_no,employment_type,status,hire_date,department_id,position_id",
  "EMP-0001,Juan,Santos,Dela Cruz,juan@example.com,+63 917 000 0000,34-0000000-0,12-000000000-0,000-000-000-000,0000-0000-0000,full_time,active,2026-01-15,,",
].join("\r\n")

const OUTLET_TEMPLATE = [
  "code,name,address,contact_person,phone,email,latitude,longitude,geofence_radius_m,status",
  "OUT-0001,North Hub,12 Mabini St,Ana Reyes,+63 917 111 1111,ana@example.com,14.5995,120.9842,150,approved",
].join("\r\n")

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function ResultSummary({ result }: { result: CsvImportResult }) {
  return (
    <div className="space-y-2 rounded-md border bg-muted/20 p-3">
      <p className="text-xs font-medium">
        {result.imported} imported · {result.skipped} skipped ·{" "}
        {result.errors.length} error{result.errors.length === 1 ? "" : "s"}
      </p>
      {result.errors.length > 0 && (
        <div className="max-h-40 space-y-1 overflow-y-auto">
          {result.errors.map((error) => (
            <div
              key={`${error.row}-${error.message}`}
              className="flex items-start gap-1.5 text-[0.625rem] text-destructive"
            >
              <AlertTriangle className="mt-0.5 size-3 shrink-0" />
              <span>
                Row {error.row}: {error.message}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function ImportExportPanel({
  canExecute,
  employeeCount,
  outletCount,
}: {
  canExecute: boolean
  employeeCount: number
  outletCount: number
}) {
  const [employeeCsv, setEmployeeCsv] = React.useState("")
  const [employeeFile, setEmployeeFile] = React.useState("")
  const [outletCsv, setOutletCsv] = React.useState("")
  const [outletFile, setOutletFile] = React.useState("")
  const [createAccounts, setCreateAccounts] = React.useState(false)
  const [employeeResult, setEmployeeResult] =
    React.useState<CsvImportResult | null>(null)
  const [outletResult, setOutletResult] =
    React.useState<CsvImportResult | null>(null)
  const [busy, setBusy] = React.useState<string | null>(null)

  async function handleExport(kind: "employees" | "outlets") {
    setBusy(`export-${kind}`)
    const result = kind === "employees" ? await exportEmployees() : await exportOutlets()
    setBusy(null)

    if (!result.success) {
      toast.add({ type: "error", title: "Export failed", description: result.error })
      return
    }

    downloadCsv(result.data.filename, result.data.csv)
    toast.add({
      type: "success",
      title: `${kind === "employees" ? "Employee" : "Outlet"} export ready`,
      description: `${result.data.rowCount} row(s) downloaded as CSV.`,
    })
  }

  async function readFile(
    file: File | undefined,
    setCsv: (value: string) => void,
    setFileName: (value: string) => void
  ) {
    if (!file) {
      setCsv("")
      setFileName("")
      return
    }
    setCsv(await file.text())
    setFileName(file.name)
  }

  async function handleImport(kind: "employees" | "outlets") {
    const csv = kind === "employees" ? employeeCsv : outletCsv
    if (!csv.trim()) {
      toast.add({ type: "error", title: "Choose a CSV file to import" })
      return
    }

    setBusy(`import-${kind}`)
    const result =
      kind === "employees"
        ? await importEmployees({ csv, createAccounts })
        : await importOutlets({ csv })
    setBusy(null)

    if (!result.success) {
      toast.add({ type: "error", title: "Import failed", description: result.error })
      return
    }

    if (kind === "employees") setEmployeeResult(result.data)
    else setOutletResult(result.data)

    toast.add({
      type: "success",
      title: "Import finished",
      description: `${result.data.imported} row(s) imported, ${result.data.skipped} skipped.`,
    })
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="size-4 text-primary" />
            Employees
          </CardTitle>
          <CardDescription>
            Export the full directory or import employees from CSV. Statutory IDs
            are included; login accounts require an email and password column.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!canExecute || busy !== null}
              onClick={() => handleExport("employees")}
            >
              <Download />
              {busy === "export-employees"
                ? "Exporting…"
                : `Export ${employeeCount} employee(s)`}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => downloadCsv("employees-template.csv", EMPLOYEE_TEMPLATE)}
            >
              <FileSpreadsheet />
              Template
            </Button>
          </div>

          <div className="space-y-2 rounded-md border border-dashed p-3">
            <Input
              type="file"
              accept=".csv,text/csv"
              disabled={!canExecute || busy !== null}
              onChange={(event) =>
                readFile(
                  event.target.files?.[0],
                  setEmployeeCsv,
                  setEmployeeFile
                )
              }
            />
            <p className="text-[0.625rem] text-muted-foreground">
              {employeeFile
                ? `Selected: ${employeeFile}`
                : "Select a CSV with first_name and last_name columns."}
            </p>
            <label className="flex items-center gap-2 text-[0.6875rem]">
              <input
                type="checkbox"
                checked={createAccounts}
                disabled={!canExecute || busy !== null}
                onChange={(event) => setCreateAccounts(event.target.checked)}
                className="size-3.5 accent-primary"
              />
              Create Supabase login accounts (requires password column)
            </label>
            <Button
              size="sm"
              disabled={!canExecute || busy !== null || !employeeCsv}
              onClick={() => handleImport("employees")}
            >
              <Upload />
              {busy === "import-employees" ? "Importing…" : "Import employees"}
            </Button>
          </div>

          {employeeResult && <ResultSummary result={employeeResult} />}
        </CardContent>
        {!canExecute && (
          <CardFooter>
            <p className="text-[0.625rem] text-muted-foreground">
              You can view this workspace but need the imports.execute
              permission to run imports or exports.
            </p>
          </CardFooter>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="size-4 text-primary" />
            Outlets
          </CardTitle>
          <CardDescription>
            Export outlet coordinates and coverage details, or import new outlets
            with geofence and status information.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!canExecute || busy !== null}
              onClick={() => handleExport("outlets")}
            >
              <Download />
              {busy === "export-outlets"
                ? "Exporting…"
                : `Export ${outletCount} outlet(s)`}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => downloadCsv("outlets-template.csv", OUTLET_TEMPLATE)}
            >
              <FileSpreadsheet />
              Template
            </Button>
          </div>

          <div className="space-y-2 rounded-md border border-dashed p-3">
            <Input
              type="file"
              accept=".csv,text/csv"
              disabled={!canExecute || busy !== null}
              onChange={(event) =>
                readFile(event.target.files?.[0], setOutletCsv, setOutletFile)
              }
            />
            <p className="text-[0.625rem] text-muted-foreground">
              {outletFile
                ? `Selected: ${outletFile}`
                : "Select a CSV with code and name columns."}
            </p>
            <Button
              size="sm"
              disabled={!canExecute || busy !== null || !outletCsv}
              onClick={() => handleImport("outlets")}
            >
              <Upload />
              {busy === "import-outlets" ? "Importing…" : "Import outlets"}
            </Button>
          </div>

          {outletResult && <ResultSummary result={outletResult} />}
        </CardContent>
        {!canExecute && (
          <CardFooter>
            <p className="text-[0.625rem] text-muted-foreground">
              Ask an administrator to grant imports.execute to import outlet
              data.
            </p>
          </CardFooter>
        )}
      </Card>
    </div>
  )
}
