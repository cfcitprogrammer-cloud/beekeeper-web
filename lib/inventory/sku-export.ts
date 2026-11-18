import { formatCurrency, formatDateTime, formatNumber } from "@/lib/format"

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

export const SKU_CATALOG_CSV_HEADERS = [
  "sku_code",
  "name",
  "category",
  "brand",
  "uom",
  "unit_price",
  "tax_rate",
  "barcode",
  "description",
  "is_active",
  "production_warehouse",
] as const

export const SKU_BOM_CSV_HEADERS = [
  "parent_sku_code",
  "component_sku_code",
  "quantity",
] as const

export type SkuCatalogExportRow = {
  skuCode: string
  name: string
  category: string
  brand: string
  uom: string
  unitPrice: number
  taxRate: number
  barcode: string
  description: string
  isActive: boolean
  productionWarehouse: string
}

export type SkuBomExportRow = {
  parentSkuCode: string
  parentName: string
  componentSkuCode: string
  componentName: string
  quantity: number
  componentUom: string
}

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

/* -------------------------------------------------------------------------- */
/*                                  Helpers                                   */
/* -------------------------------------------------------------------------- */

function csvCell(value: string | number | null | undefined) {
  const text = value === null || value === undefined ? "" : String(value)
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function fileStamp(date: Date) {
  return date.toISOString().slice(0, 10)
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function downloadCsv(filename: string, content: string) {
  // The BOM keeps Excel from mangling non-ASCII names in UTF-8 CSV files.
  triggerDownload(
    new Blob([`\uFEFF${content}`], { type: "text/csv;charset=utf-8;" }),
    filename
  )
}

/* -------------------------------------------------------------------------- */
/*                                    CSV                                     */
/* -------------------------------------------------------------------------- */

export function buildSkuCatalogCsv(rows: SkuCatalogExportRow[]) {
  return [
    SKU_CATALOG_CSV_HEADERS.join(","),
    ...rows.map((row) =>
      [
        row.skuCode,
        row.name,
        row.category,
        row.brand,
        row.uom,
        row.unitPrice,
        row.taxRate,
        row.barcode,
        row.description,
        row.isActive ? "true" : "false",
        row.productionWarehouse,
      ]
        .map(csvCell)
        .join(",")
    ),
  ].join("\r\n")
}

export function buildSkuBomCsv(rows: SkuBomExportRow[]) {
  return [
    SKU_BOM_CSV_HEADERS.join(","),
    ...rows.map((row) =>
      [row.parentSkuCode, row.componentSkuCode, row.quantity]
        .map(csvCell)
        .join(",")
    ),
  ].join("\r\n")
}

export function downloadSkuCatalogTemplate() {
  downloadCsv(
    "sku-catalog-import-template.csv",
    `${SKU_CATALOG_CSV_HEADERS.join(",")}\r\n`
  )
}

export function downloadSkuBomTemplate() {
  downloadCsv(
    "sku-bom-import-template.csv",
    `${SKU_BOM_CSV_HEADERS.join(",")}\r\n`
  )
}

export function exportSkuCatalogCsv(rows: SkuCatalogExportRow[]) {
  downloadCsv(
    `sku-catalog-${fileStamp(new Date())}.csv`,
    buildSkuCatalogCsv(rows)
  )
}

export function exportSkuBomCsv(rows: SkuBomExportRow[]) {
  downloadCsv(`sku-bom-${fileStamp(new Date())}.csv`, buildSkuBomCsv(rows))
}

/* -------------------------------------------------------------------------- */
/*                                   Excel                                    */
/* -------------------------------------------------------------------------- */

type TableColumn = { header: string; width: number }

type TableExport = {
  fileName: string
  sheetName: string
  title: string
  subtitle: string
  columns: TableColumn[]
  rows: (string | number)[][]
  numericColumns?: number[]
  rightAlignColumns?: number[]
}

const EXCEL_BORDER = {
  top: { style: "thin" as const, color: { argb: "FFE2E8F0" } },
  left: { style: "thin" as const, color: { argb: "FFE2E8F0" } },
  bottom: { style: "thin" as const, color: { argb: "FFE2E8F0" } },
  right: { style: "thin" as const, color: { argb: "FFE2E8F0" } },
}

async function exportExcel({
  fileName,
  sheetName,
  title,
  subtitle,
  columns,
  rows,
  numericColumns = [],
  rightAlignColumns = [],
}: TableExport) {
  const excelModule = await import("exceljs")
  const ExcelJS = (
    excelModule as unknown as { default?: typeof excelModule }
  ).default ?? excelModule

  const workbook = new ExcelJS.Workbook()
  workbook.creator = "Beekeeper"
  workbook.title = title
  workbook.created = new Date()
  workbook.modified = new Date()

  const sheet = workbook.addWorksheet(sheetName, {
    views: [{ state: "frozen", ySplit: 4 }],
    pageSetup: {
      orientation: columns.length > 7 ? "landscape" : "portrait",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      paperSize: 9,
    },
  })

  columns.forEach((column, index) => {
    sheet.getColumn(index + 1).width = column.width
  })

  const lastColumn = columns.length
  const titleRow = sheet.getRow(1)
  sheet.mergeCells(1, 1, 1, lastColumn)
  titleRow.getCell(1).value = title
  titleRow.getCell(1).font = {
    size: 15,
    bold: true,
    color: { argb: "FF0F172A" },
  }
  titleRow.height = 22

  const subtitleRow = sheet.getRow(2)
  sheet.mergeCells(2, 1, 2, lastColumn)
  subtitleRow.getCell(1).value = `${subtitle} · Generated ${formatDateTime(
    new Date()
  )}`
  subtitleRow.getCell(1).font = { size: 9, color: { argb: "FF64748B" } }

  sheet.getRow(3).height = 5

  const headerRowNumber = 4
  const headerRow = sheet.getRow(headerRowNumber)
  columns.forEach((column, index) => {
    const cell = headerRow.getCell(index + 1)
    cell.value = column.header
    cell.font = { size: 9, bold: true, color: { argb: "FFFFFFFF" } }
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E293B" },
    }
    cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true }
    cell.border = EXCEL_BORDER
  })
  headerRow.height = 20

  rows.forEach((row, index) => {
    const dataRow = sheet.addRow(row)
    const striped = index % 2 === 1
    dataRow.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
      cell.font = { size: 9, color: { argb: "FF334155" } }
      cell.alignment = {
        vertical: "middle",
        horizontal: rightAlignColumns.includes(columnNumber) ? "right" : "left",
        wrapText: true,
      }
      cell.border = EXCEL_BORDER
      if (numericColumns.includes(columnNumber)) cell.numFmt = "#,##0.####"
      if (striped) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF8FAFC" },
        }
      }
    })
  })

  const lastRow = Math.max(headerRowNumber + rows.length, headerRowNumber)
  sheet.autoFilter = {
    from: { row: headerRowNumber, column: 1 },
    to: { row: lastRow, column: lastColumn },
  }

  const buffer = await workbook.xlsx.writeBuffer()
  triggerDownload(
    new Blob([buffer as unknown as BlobPart], { type: XLSX_MIME }),
    `${fileName}.xlsx`
  )
}

/* -------------------------------------------------------------------------- */
/*                                    PDF                                     */
/* -------------------------------------------------------------------------- */

const PDF_COLORS = {
  ink: [15, 23, 42] as [number, number, number],
  slate: [51, 65, 85] as [number, number, number],
  muted: [100, 116, 139] as [number, number, number],
  line: [226, 232, 240] as [number, number, number],
  soft: [248, 250, 252] as [number, number, number],
  header: [30, 41, 59] as [number, number, number],
}

async function exportPdf({
  fileName,
  title,
  subtitle,
  columns,
  rows,
  rightAlignColumns = [],
}: TableExport) {
  const [{ jsPDF }, { autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ])

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 12

  doc.setFillColor(...PDF_COLORS.ink)
  doc.rect(0, 0, pageWidth, 26, "F")

  doc.setTextColor(255, 255, 255)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(14)
  doc.text(title, margin, 11)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8.5)
  doc.setTextColor(203, 213, 225)
  doc.text(subtitle, margin, 17)

  doc.setFontSize(7.5)
  doc.text(
    `Generated ${formatDateTime(new Date())}`,
    pageWidth - margin,
    11,
    { align: "right" }
  )
  doc.text(
    `${rows.length} row${rows.length === 1 ? "" : "s"}`,
    pageWidth - margin,
    17,
    { align: "right" }
  )

  autoTable(doc, {
    head: [columns.map((column) => column.header)],
    body: rows.map((row) => row.map((value) => String(value))),
    startY: 33,
    margin: { left: margin, right: margin, top: 20, bottom: 16 },
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 7,
      cellPadding: 1.6,
      textColor: PDF_COLORS.slate,
      lineColor: PDF_COLORS.line,
      lineWidth: 0.1,
      overflow: "linebreak",
      valign: "middle",
    },
    headStyles: {
      fillColor: PDF_COLORS.header,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7,
    },
    alternateRowStyles: { fillColor: PDF_COLORS.soft },
    columnStyles: Object.fromEntries(
      rightAlignColumns.map((column) => [
        column - 1,
        { halign: "right" as const },
      ])
    ),
    didDrawPage: (data) => {
      if (data.pageNumber > 1) {
        doc.setFont("helvetica", "normal")
        doc.setFontSize(7)
        doc.setTextColor(...PDF_COLORS.muted)
        doc.text(title, margin, 10)
      }
    },
  })

  const pageCount = doc.getNumberOfPages()
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(7)
    doc.setTextColor(...PDF_COLORS.muted)
    doc.text(
      `Beekeeper · ${title} · Page ${page} of ${pageCount}`,
      pageWidth - margin,
      doc.internal.pageSize.getHeight() - 7,
      { align: "right" }
    )
  }

  triggerDownload(doc.output("blob"), `${fileName}.pdf`)
}

/* -------------------------------------------------------------------------- */
/*                              Catalog exports                               */
/* -------------------------------------------------------------------------- */

function catalogTable(rows: SkuCatalogExportRow[]): Omit<TableExport, "fileName"> {
  return {
    sheetName: "SKU catalog",
    title: "SKU Catalog",
    subtitle: `${rows.length} SKU${rows.length === 1 ? "" : "s"}`,
    columns: [
      { header: "SKU code", width: 16 },
      { header: "Name", width: 32 },
      { header: "Category", width: 20 },
      { header: "Brand", width: 18 },
      { header: "UOM", width: 9 },
      { header: "Unit price", width: 13 },
      { header: "Tax %", width: 9 },
      { header: "Barcode", width: 18 },
      { header: "Status", width: 10 },
      { header: "Description", width: 42 },
      { header: "Production warehouse", width: 18 },
    ],
    rows: rows.map((row) => [
      row.skuCode,
      row.name,
      row.category,
      row.brand,
      row.uom,
      row.unitPrice,
      row.taxRate,
      row.barcode,
      row.isActive ? "Active" : "Inactive",
      row.description,
      row.productionWarehouse,
    ]),
    numericColumns: [6, 7],
    rightAlignColumns: [6, 7],
  }
}

export async function exportSkuCatalogExcel(rows: SkuCatalogExportRow[]) {
  await exportExcel({
    ...catalogTable(rows),
    fileName: `sku-catalog-${fileStamp(new Date())}`,
  })
}

export async function exportSkuCatalogPdf(rows: SkuCatalogExportRow[]) {
  await exportPdf({
    ...catalogTable(rows),
    fileName: `sku-catalog-${fileStamp(new Date())}`,
  })
}

/* -------------------------------------------------------------------------- */
/*                                 BOM exports                                */
/* -------------------------------------------------------------------------- */

function bomTable(rows: SkuBomExportRow[]): Omit<TableExport, "fileName"> {
  return {
    sheetName: "BOM",
    title: "Bill of Materials",
    subtitle: `${rows.length} component line${rows.length === 1 ? "" : "s"}`,
    columns: [
      { header: "Parent SKU code", width: 18 },
      { header: "Parent SKU", width: 32 },
      { header: "Component SKU code", width: 20 },
      { header: "Component SKU", width: 32 },
      { header: "Quantity", width: 12 },
      { header: "UOM", width: 9 },
    ],
    rows: rows.map((row) => [
      row.parentSkuCode,
      row.parentName,
      row.componentSkuCode,
      row.componentName,
      row.quantity,
      row.componentUom,
    ]),
    numericColumns: [5],
    rightAlignColumns: [5],
  }
}

export async function exportSkuBomExcel(rows: SkuBomExportRow[]) {
  await exportExcel({
    ...bomTable(rows),
    fileName: `sku-bom-${fileStamp(new Date())}`,
  })
}

export async function exportSkuBomPdf(rows: SkuBomExportRow[]) {
  await exportPdf({
    ...bomTable(rows),
    fileName: `sku-bom-${fileStamp(new Date())}`,
  })
}

/* -------------------------------------------------------------------------- */
/*                            Formatting re-exports                           */
/* -------------------------------------------------------------------------- */

export { formatCurrency, formatNumber }
