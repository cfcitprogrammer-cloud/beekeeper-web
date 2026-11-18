"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Upload,
  Warehouse,
} from "lucide-react"

import { importInventoryWarehouses } from "@/actions/inventory-warehouse-import.action"
import { Modal } from "@/components/shared/modal"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/toast"
import {
  downloadWarehouseTemplate,
  exportWarehouseCsv,
  exportWarehouseExcel,
  exportWarehousePdf,
  toWarehouseExportRow,
  type WarehouseExportRow,
} from "@/lib/inventory/warehouse-export"
import type { InventoryWarehouse } from "@/types/database"

export function WarehouseImportExport({
  canImport,
  warehouses,
}: {
  canImport: boolean
  warehouses: InventoryWarehouse[]
}) {
  const router = useRouter()
  const [exporting, setExporting] = React.useState<string | null>(null)
  const [importOpen, setImportOpen] = React.useState(false)
  const [csv, setCsv] = React.useState("")
  const [fileName, setFileName] = React.useState("")
  const [importing, setImporting] = React.useState(false)
  const [result, setResult] = React.useState<{
    created: number
    updated: number
    errors: { row: number; message: string }[]
  } | null>(null)

  const rows: WarehouseExportRow[] = React.useMemo(
    () => warehouses.map(toWarehouseExportRow),
    [warehouses]
  )

  const busy = exporting !== null || importing

  function closeImport() {
    setImportOpen(false)
    setCsv("")
    setFileName("")
    setResult(null)
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    const text = await file.text()
    setCsv(text)
    setResult(null)
  }

  async function handleExport(format: "csv" | "excel" | "pdf") {
    setExporting(format)
    try {
      if (format === "csv") exportWarehouseCsv(rows)
      else if (format === "excel") await exportWarehouseExcel(rows)
      else await exportWarehousePdf(rows)
      toast.add({
        type: "success",
        title: "Export ready",
        description: `${rows.length} warehouse${rows.length === 1 ? "" : "s"} included.`,
      })
    } catch (error) {
      console.error("[warehouses:export]", error)
      toast.add({
        type: "error",
        title: "Export failed",
        description: "The file could not be generated. Please try again.",
      })
    } finally {
      setExporting(null)
    }
  }

  async function handleImport() {
    if (!csv.trim()) {
      toast.add({
        type: "error",
        title: "Missing file",
        description: "Choose a CSV file to import.",
      })
      return
    }
    setImporting(true)
    try {
      const response = await importInventoryWarehouses({ csv })
      if (!response.success) {
        toast.add({
          type: "error",
          title: "Import failed",
          description: response.error,
        })
        return
      }
      setResult(response.data)
      toast.add({
        type: "success",
        title: "Import complete",
        description: `${response.data.created} created · ${response.data.updated} updated · ${response.data.errors.length} error${response.data.errors.length === 1 ? "" : "s"}.`,
      })
      router.refresh()
    } catch (error) {
      console.error("[warehouses:import]", error)
      toast.add({
        type: "error",
        title: "Import failed",
        description: "The file could not be processed. Please try again.",
      })
    } finally {
      setImporting(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="outline" size="sm" disabled={busy} />}
        >
          {exporting ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Download />
          )}
          {exporting ? "Preparing…" : "Export"}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuLabel>Export warehouses</DropdownMenuLabel>
          <DropdownMenuItem
            className="gap-2"
            onClick={() => void handleExport("csv")}
          >
            <Download className="size-3.5 text-sky-600" />
            <span className="flex-1">CSV file</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="gap-2"
            onClick={() => void handleExport("excel")}
          >
            <FileSpreadsheet className="size-3.5 text-emerald-600" />
            <span className="flex-1">Excel workbook</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="gap-2"
            onClick={() => void handleExport("pdf")}
          >
            <FileText className="size-3.5 text-rose-500" />
            <span className="flex-1">PDF report</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="gap-2"
            onClick={downloadWarehouseTemplate}
          >
            <Warehouse className="size-3.5 text-muted-foreground" />
            <span className="flex-1">Download template</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {canImport ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setImportOpen(true)}
          disabled={busy}
        >
          <Upload />
          Import
        </Button>
      ) : null}

      <Modal
        open={importOpen}
        onOpenChange={(open) => (open ? setImportOpen(true) : closeImport())}
        title="Import warehouses"
        description="Match rows by warehouse code. Existing warehouses are updated and new ones are created."
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={closeImport} disabled={importing}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={importing || !csv.trim()}>
              {importing ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Upload />
              )}
              {importing ? "Importing…" : "Import"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="warehouse-import-file"
              className="text-xs font-medium"
            >
              CSV file
            </label>
            <Input
              id="warehouse-import-file"
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
            />
            <p className="text-[0.625rem] text-muted-foreground">
              Columns: code, name, address, contact_person, phone, email, notes,
              is_active. Download the template for the expected headers.
            </p>
            {fileName ? (
              <p className="text-[0.625rem] text-muted-foreground">
                Selected: {fileName}
              </p>
            ) : null}
          </div>

          {result ? (
            <div className="rounded-md border bg-muted/30 p-3 text-xs">
              <p className="font-medium">
                {result.created} created · {result.updated} updated ·{" "}
                {result.errors.length} error
                {result.errors.length === 1 ? "" : "s"}
              </p>
              {result.errors.length > 0 ? (
                <ul className="mt-2 space-y-1 text-[0.625rem] text-destructive">
                  {result.errors.slice(0, 20).map((error, index) => (
                    <li key={index}>
                      Row {error.row}: {error.message}
                    </li>
                  ))}
                  {result.errors.length > 20 ? (
                    <li>…and {result.errors.length - 20} more.</li>
                  ) : null}
                </ul>
              ) : null}
            </div>
          ) : null}

          {result?.errors.length ? (
            <div className="flex items-start gap-2 text-[0.625rem] text-amber-600 dark:text-amber-400">
              <AlertTriangle className="mt-0.5 size-3 shrink-0" />
              <span>
                Rows with errors were skipped. Fix them and re-import; the rest
                of the file was still processed.
              </span>
            </div>
          ) : null}
        </div>
      </Modal>
    </>
  )
}
