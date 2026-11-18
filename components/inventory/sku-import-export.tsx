"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  Download,
  FileSpreadsheet,
  FileText,
  Layers,
  Loader2,
  Package,
  Upload,
} from "lucide-react"

import {
  getSkuBomExportRows,
  importSkuBom,
  importSkuCatalog,
  type SkuBomImportResult,
  type SkuCatalogImportResult,
} from "@/actions/sku-import.action"
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
  downloadSkuBomTemplate,
  downloadSkuCatalogTemplate,
  exportSkuBomCsv,
  exportSkuBomExcel,
  exportSkuBomPdf,
  exportSkuCatalogCsv,
  exportSkuCatalogExcel,
  exportSkuCatalogPdf,
  type SkuCatalogExportRow,
} from "@/lib/inventory/sku-export"

type ImportMode = "catalog" | "bom"

type ImportResult =
  | { kind: "catalog"; data: SkuCatalogImportResult }
  | { kind: "bom"; data: SkuBomImportResult }

function resultSummary(result: ImportResult) {
  if (result.kind === "catalog") {
    const { created, updated, categoriesCreated, errors } = result.data
    return [
      `${created} created`,
      `${updated} updated`,
      categoriesCreated > 0 ? `${categoriesCreated} categor${categoriesCreated === 1 ? "y" : "ies"} created` : null,
      `${errors.length} error${errors.length === 1 ? "" : "s"}`,
    ]
      .filter(Boolean)
      .join(" · ")
  }

  const { created, updated, unchanged, errors } = result.data
  return [
    `${created} added`,
    `${updated} updated`,
    `${unchanged} unchanged`,
    `${errors.length} error${errors.length === 1 ? "" : "s"}`,
  ].join(" · ")
}

export function SkuImportExport({
  canImport,
  catalogRows,
}: {
  canImport: boolean
  catalogRows: SkuCatalogExportRow[]
}) {
  const router = useRouter()
  const [exporting, setExporting] = React.useState<string | null>(null)
  const [mode, setMode] = React.useState<ImportMode | null>(null)
  const [csv, setCsv] = React.useState("")
  const [fileName, setFileName] = React.useState("")
  const [importing, setImporting] = React.useState(false)
  const [result, setResult] = React.useState<ImportResult | null>(null)

  const busy = exporting !== null || importing

  function openImport(nextMode: ImportMode) {
    setMode(nextMode)
    setCsv("")
    setFileName("")
    setResult(null)
  }

  function closeImport() {
    setMode(null)
    setCsv("")
    setFileName("")
    setResult(null)
  }

  async function handleExport(
    kind: "catalog" | "bom",
    format: "csv" | "excel" | "pdf"
  ) {
    const kindLabel = kind === "catalog" ? "SKU catalog" : "BOM & components"
    const toastId = toast.add({
      type: "loading",
      title: "Preparing export",
      description: `${kindLabel} · ${format.toUpperCase()}`,
    })
    setExporting(`${kind}-${format}`)

    try {
      if (kind === "catalog") {
        if (format === "csv") exportSkuCatalogCsv(catalogRows)
        else if (format === "excel") await exportSkuCatalogExcel(catalogRows)
        else await exportSkuCatalogPdf(catalogRows)
      } else {
        const response = await getSkuBomExportRows()
        if (!response.success) {
          toast.close(toastId)
          toast.add({
            type: "error",
            title: "Export failed",
            description: response.error,
          })
          return
        }
        if (format === "csv") exportSkuBomCsv(response.data)
        else if (format === "excel") await exportSkuBomExcel(response.data)
        else await exportSkuBomPdf(response.data)
      }

      toast.close(toastId)
      toast.add({
        type: "success",
        title: "Export ready",
        description: `${kindLabel} downloaded as ${format.toUpperCase()}.`,
      })
    } catch (error) {
      toast.close(toastId)
      toast.add({
        type: "error",
        title: "Export failed",
        description:
          error instanceof Error ? error.message : "Unexpected export error.",
      })
    } finally {
      setExporting(null)
    }
  }

  async function handleImport() {
    if (!mode) return
    if (!csv.trim()) {
      toast.add({
        type: "error",
        title: "Choose a CSV file to import",
      })
      return
    }

    setImporting(true)
    const toastId = toast.add({
      type: "loading",
      title:
        mode === "catalog" ? "Importing SKU catalog" : "Importing BOM components",
      description: fileName || undefined,
    })

    try {
      const response =
        mode === "catalog"
          ? await importSkuCatalog({ csv })
          : await importSkuBom({ csv })

      toast.close(toastId)

      if (!response.success) {
        toast.add({
          type: "error",
          title: "Import failed",
          description: response.error,
        })
        return
      }

      const nextResult: ImportResult =
        mode === "catalog"
          ? { kind: "catalog", data: response.data as SkuCatalogImportResult }
          : { kind: "bom", data: response.data as SkuBomImportResult }
      setResult(nextResult)

      const errors = response.data.errors.length
      toast.add({
        type: errors > 0 ? "warning" : "success",
        title: "Import finished",
        description: resultSummary(nextResult),
      })
      router.refresh()
    } catch (error) {
      toast.close(toastId)
      toast.add({
        type: "error",
        title: "Import failed",
        description:
          error instanceof Error ? error.message : "Unexpected import error.",
      })
    } finally {
      setImporting(false)
    }
  }

  async function readFile(file: File | undefined) {
    if (!file) {
      setCsv("")
      setFileName("")
      return
    }
    setCsv(await file.text())
    setFileName(file.name)
    setResult(null)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="outline" size="sm" disabled={busy} />}
        >
          {exporting ? <Loader2 className="animate-spin" /> : <Download />}
          Export
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="text-[0.625rem] tracking-wide text-muted-foreground uppercase">
            SKU catalog
          </DropdownMenuLabel>
          <DropdownMenuItem
            className="gap-2"
            disabled={exporting !== null}
            onClick={() => void handleExport("catalog", "csv")}
          >
            <FileSpreadsheet className="size-3.5" />
            CSV
          </DropdownMenuItem>
          <DropdownMenuItem
            className="gap-2"
            disabled={exporting !== null}
            onClick={() => void handleExport("catalog", "excel")}
          >
            <FileSpreadsheet className="size-3.5" />
            Excel
          </DropdownMenuItem>
          <DropdownMenuItem
            className="gap-2"
            disabled={exporting !== null}
            onClick={() => void handleExport("catalog", "pdf")}
          >
            <FileText className="size-3.5" />
            PDF
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-[0.625rem] tracking-wide text-muted-foreground uppercase">
            BOM &amp; components
          </DropdownMenuLabel>
          <DropdownMenuItem
            className="gap-2"
            disabled={exporting !== null}
            onClick={() => void handleExport("bom", "csv")}
          >
            <FileSpreadsheet className="size-3.5" />
            CSV
          </DropdownMenuItem>
          <DropdownMenuItem
            className="gap-2"
            disabled={exporting !== null}
            onClick={() => void handleExport("bom", "excel")}
          >
            <FileSpreadsheet className="size-3.5" />
            Excel
          </DropdownMenuItem>
          <DropdownMenuItem
            className="gap-2"
            disabled={exporting !== null}
            onClick={() => void handleExport("bom", "pdf")}
          >
            <FileText className="size-3.5" />
            PDF
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {canImport ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="outline" size="sm" disabled={busy} />}
          >
            {importing ? <Loader2 className="animate-spin" /> : <Upload />}
            Import
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuItem
              className="gap-2"
              onClick={() => openImport("catalog")}
            >
              <Package className="size-3.5" />
              <span className="flex flex-col items-start">
                <span>SKU catalog</span>
                <span className="text-[0.625rem] text-muted-foreground">
                  Products, pricing and categories
                </span>
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="gap-2"
              onClick={() => openImport("bom")}
            >
              <Layers className="size-3.5" />
              <span className="flex flex-col items-start">
                <span>BOM &amp; components</span>
                <span className="text-[0.625rem] text-muted-foreground">
                  Parent-to-component quantities
                </span>
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}

      <Modal
        open={mode !== null}
        onOpenChange={(open) => {
          if (!open) closeImport()
        }}
        title={
          mode === "bom"
            ? "Mass import BOM & components"
            : "Mass import SKU catalog"
        }
        description={
          mode === "bom"
            ? "Match rows by parent and component SKU code. Existing component lines are updated and new ones are added. Download the template for the expected headers."
            : "Match rows by SKU code. Existing SKUs are updated, new SKUs are created, and missing categories are created automatically. Leave a cell blank to keep the current value on an existing SKU. Production warehouses are matched by code or name and must already exist under Inventory → Warehouses."
        }
        size="lg"
        footer={
          <>
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() =>
                mode === "bom"
                  ? downloadSkuBomTemplate()
                  : downloadSkuCatalogTemplate()
              }
            >
              <FileSpreadsheet />
              Download template
            </Button>
            <Button variant="outline" size="sm" onClick={closeImport} disabled={importing}>
              Close
            </Button>
            <Button
              size="sm"
              onClick={() => void handleImport()}
              disabled={busy || !csv.trim()}
            >
              {importing ? <Loader2 className="animate-spin" /> : <Upload />}
              {importing ? "Importing…" : "Apply import"}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="space-y-2 rounded-md border border-dashed p-3">
            <Input
              type="file"
              accept=".csv,text/csv"
              disabled={importing}
              onChange={(event) => void readFile(event.target.files?.[0])}
            />
            <p className="text-[0.625rem] text-muted-foreground">
              {fileName
                ? `Selected: ${fileName}`
                : mode === "bom"
                  ? "Columns: parent_sku_code, component_sku_code, quantity. Both SKUs must already exist in the catalog."
                  : "Columns: sku_code, name, category, brand, uom, unit_price, tax_rate, barcode, description, is_active, production_warehouse."}
            </p>
          </div>

          {result ? (
            <div className="space-y-2 rounded-md border bg-muted/20 p-3">
              <p className="text-xs font-medium">{resultSummary(result)}</p>
              {result.data.errors.length > 0 ? (
                <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
                  {result.data.errors.map((error) => (
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
              ) : (
                <p className="text-[0.625rem] text-muted-foreground">
                  All rows were applied successfully.
                </p>
              )}
            </div>
          ) : null}
        </div>
      </Modal>
    </>
  )
}
