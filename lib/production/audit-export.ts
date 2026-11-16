import { formatDate, formatDateTime, formatNumber, formatTime } from "@/lib/format"

export type AuditExportFilters = {
  pipeline: string
  stage: string
  sku: string
  fromDate: string
  toDate: string
}

export type AuditExportSummary = {
  lines: number
  submissions: number
  skus: number
  stages: number
}

export type AuditExportMeta = {
  companyName: string
  companyLegalName?: string | null
  companyAddress?: string | null
  preparedBy: string
  generatedAt: Date
  filters: AuditExportFilters
  summary: AuditExportSummary
}

export type AuditExportRow = {
  usageDate: string
  recordedAt: string
  pipeline: string
  pipelineCode: string
  stage: string
  stageSequence: number | null
  sku: string
  skuCode: string
  quantity: number
  uom: string
  submitter: string
  employeeNo: string
  notes: string
}

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

function pad(value: number) {
  return String(value).padStart(2, "0")
}

function fileStamp(date: Date) {
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(
    date.getHours()
  )}${pad(date.getMinutes())}`
}

export function auditFileBase(meta: AuditExportMeta) {
  return `production-audit-${fileStamp(meta.generatedAt)}`
}

export function auditFilterEntries(meta: AuditExportMeta) {
  const { filters } = meta
  const range =
    filters.fromDate && filters.toDate
      ? `${formatDate(filters.fromDate)} to ${formatDate(filters.toDate)}`
      : filters.fromDate
        ? `From ${formatDate(filters.fromDate)}`
        : filters.toDate
          ? `Until ${formatDate(filters.toDate)}`
          : "All dates"

  return [
    { label: "Pipeline", value: filters.pipeline || "All pipelines" },
    { label: "Stage", value: filters.stage || "All stages" },
    { label: "SKU", value: filters.sku || "All SKUs" },
    { label: "Date range", value: range },
  ]
}

export function auditQuantityByUom(rows: AuditExportRow[]) {
  const totals = new Map<string, number>()
  for (const row of rows) {
    const key = row.uom || "—"
    totals.set(key, (totals.get(key) ?? 0) + row.quantity)
  }
  return [...totals.entries()]
    .map(([uom, quantity]) => ({ uom, quantity }))
    .sort((a, b) => a.uom.localeCompare(b.uom))
}

function quantitySummaryText(rows: AuditExportRow[]) {
  const totals = auditQuantityByUom(rows)
  if (totals.length === 0) return "No quantities recorded."
  return totals
    .map((total) => `${formatNumber(total.quantity)} ${total.uom}`)
    .join(" · ")
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

/* -------------------------------------------------------------------------- */
/*                                    CSV                                     */
/* -------------------------------------------------------------------------- */

const CSV_HEADERS = [
  "Usage date",
  "Recorded at",
  "Pipeline",
  "Pipeline code",
  "Stage",
  "Stage sequence",
  "SKU",
  "SKU code",
  "Quantity",
  "UOM",
  "Submitted by",
  "Employee no.",
  "Notes",
]

function csvCell(value: string | number | null | undefined) {
  const text = value === null || value === undefined ? "" : String(value)
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function buildAuditCsv(rows: AuditExportRow[]) {
  const lines = [CSV_HEADERS.map(csvCell).join(",")]
  for (const row of rows) {
    lines.push(
      [
        row.usageDate,
        row.recordedAt,
        row.pipeline,
        row.pipelineCode,
        row.stage,
        row.stageSequence ?? "",
        row.sku,
        row.skuCode,
        row.quantity,
        row.uom,
        row.submitter,
        row.employeeNo,
        row.notes,
      ]
        .map(csvCell)
        .join(",")
    )
  }
  return lines.join("\r\n")
}

export function exportAuditCsv(rows: AuditExportRow[], meta: AuditExportMeta) {
  // The BOM keeps Excel from mangling non-ASCII names in UTF-8 CSV files.
  const blob = new Blob([`\uFEFF${buildAuditCsv(rows)}`], {
    type: "text/csv;charset=utf-8;",
  })
  triggerDownload(blob, `${auditFileBase(meta)}.csv`)
}

/* -------------------------------------------------------------------------- */
/*                                   Excel                                    */
/* -------------------------------------------------------------------------- */

const EXCEL_COLUMNS = [
  { header: "Usage date", width: 13 },
  { header: "Recorded at", width: 20 },
  { header: "Pipeline", width: 22 },
  { header: "Pipeline code", width: 14 },
  { header: "Stage", width: 22 },
  { header: "Seq.", width: 7 },
  { header: "SKU", width: 30 },
  { header: "SKU code", width: 16 },
  { header: "Quantity", width: 12 },
  { header: "UOM", width: 9 },
  { header: "Submitted by", width: 24 },
  { header: "Employee no.", width: 15 },
  { header: "Notes", width: 42 },
]

const EXCEL_BORDER = {
  top: { style: "thin" as const, color: { argb: "FFE2E8F0" } },
  left: { style: "thin" as const, color: { argb: "FFE2E8F0" } },
  bottom: { style: "thin" as const, color: { argb: "FFE2E8F0" } },
  right: { style: "thin" as const, color: { argb: "FFE2E8F0" } },
}

export async function exportAuditExcel(
  rows: AuditExportRow[],
  meta: AuditExportMeta
) {
  const excelModule = await import("exceljs")
  const ExcelJS = (
    excelModule as unknown as { default?: typeof excelModule }
  ).default ?? excelModule

  const workbook = new ExcelJS.Workbook()
  workbook.creator = meta.companyName
  workbook.title = "Production Audit Report"
  workbook.subject = "SKU-level production usage audit"
  workbook.created = meta.generatedAt
  workbook.modified = meta.generatedAt

  const sheet = workbook.addWorksheet("Audit", {
    views: [{ state: "frozen", ySplit: 8 }],
    pageSetup: {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      paperSize: 9,
    },
  })

  EXCEL_COLUMNS.forEach((column, index) => {
    sheet.getColumn(index + 1).width = column.width
  })

  const lastColumn = EXCEL_COLUMNS.length
  const titleRow = sheet.getRow(1)
  sheet.mergeCells(1, 1, 1, lastColumn)
  titleRow.getCell(1).value = "Production Audit Report"
  titleRow.getCell(1).font = {
    size: 16,
    bold: true,
    color: { argb: "FF0F172A" },
  }
  titleRow.height = 24

  const companyRow = sheet.getRow(2)
  sheet.mergeCells(2, 1, 2, lastColumn)
  companyRow.getCell(1).value =
    meta.companyLegalName || meta.companyName || "Company"
  companyRow.getCell(1).font = {
    size: 11,
    bold: true,
    color: { argb: "FF334155" },
  }

  const addressRow = sheet.getRow(3)
  sheet.mergeCells(3, 1, 3, lastColumn)
  addressRow.getCell(1).value = meta.companyAddress || ""
  addressRow.getCell(1).font = { size: 9, color: { argb: "FF64748B" } }

  const generatedRow = sheet.getRow(4)
  sheet.mergeCells(4, 1, 4, lastColumn)
  generatedRow.getCell(1).value = `Generated ${formatDateTime(
    meta.generatedAt
  )} · Prepared by ${meta.preparedBy || "—"}`
  generatedRow.getCell(1).font = { size: 9, color: { argb: "FF64748B" } }

  const filtersRow = sheet.getRow(5)
  sheet.mergeCells(5, 1, 5, lastColumn)
  filtersRow.getCell(1).value = auditFilterEntries(meta)
    .map((entry) => `${entry.label}: ${entry.value}`)
    .join("   ·   ")
  filtersRow.getCell(1).font = { size: 9, color: { argb: "FF334155" } }

  const totalsRow = sheet.getRow(6)
  sheet.mergeCells(6, 1, 6, lastColumn)
  totalsRow.getCell(1).value = `Total quantity by unit: ${quantitySummaryText(rows)}`
  totalsRow.getCell(1).font = { size: 9, color: { argb: "FF334155" } }

  sheet.getRow(7).height = 6

  const headerRowNumber = 8
  const headerRow = sheet.getRow(headerRowNumber)
  EXCEL_COLUMNS.forEach((column, index) => {
    const cell = headerRow.getCell(index + 1)
    cell.value = column.header
    cell.font = { size: 9, bold: true, color: { argb: "FFFFFFFF" } }
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E293B" },
    }
    cell.alignment = {
      vertical: "middle",
      horizontal: index === 8 ? "right" : "left",
      wrapText: true,
    }
    cell.border = EXCEL_BORDER
  })
  headerRow.height = 22

  rows.forEach((row, index) => {
    const dataRow = sheet.addRow([
      row.usageDate,
      `${formatDate(row.recordedAt)} ${formatTime(row.recordedAt)}`,
      row.pipeline,
      row.pipelineCode,
      row.stage,
      row.stageSequence ?? "",
      row.sku,
      row.skuCode,
      row.quantity,
      row.uom,
      row.submitter,
      row.employeeNo,
      row.notes,
    ])

    const striped = index % 2 === 1
    dataRow.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
      cell.font = { size: 9, color: { argb: "FF334155" } }
      cell.alignment = {
        vertical: "middle",
        horizontal: columnNumber === 9 ? "right" : "left",
        wrapText: columnNumber === 13,
      }
      cell.border = EXCEL_BORDER
      if (columnNumber === 9) cell.numFmt = "#,##0.####"
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

  const footerRow = sheet.addRow([
    rows.length === 0
      ? "No usage matches the selected filters."
      : `${rows.length} usage line${rows.length === 1 ? "" : "s"} · ${meta.summary.submissions} submission${
          meta.summary.submissions === 1 ? "" : "s"
        } · ${meta.summary.skus} SKU${meta.summary.skus === 1 ? "" : "s"} · ${
          meta.summary.stages
        } stage${meta.summary.stages === 1 ? "" : "s"}`,
  ])
  sheet.mergeCells(footerRow.number, 1, footerRow.number, lastColumn)
  footerRow.getCell(1).font = {
    size: 9,
    italic: true,
    color: { argb: "FF64748B" },
  }

  // ---- Summary sheet -------------------------------------------------------
  const summary = workbook.addWorksheet("Summary")
  summary.getColumn(1).width = 26
  summary.getColumn(2).width = 70

  const summaryTitle = summary.getRow(1)
  summary.mergeCells(1, 1, 1, 2)
  summaryTitle.getCell(1).value = "Production Audit Report — Summary"
  summaryTitle.getCell(1).font = {
    size: 14,
    bold: true,
    color: { argb: "FF0F172A" },
  }
  summaryTitle.height = 22

  function addSummaryLine(label: string, value: string | number, bold = false) {
    const row = summary.addRow([label, value])
    row.getCell(1).font = {
      size: 10,
      bold: true,
      color: { argb: "FF475569" },
    }
    row.getCell(2).font = {
      size: 10,
      bold,
      color: { argb: "FF0F172A" },
    }
    row.getCell(2).alignment = { wrapText: true }
    return row
  }

  addSummaryLine(
    "Company",
    meta.companyLegalName || meta.companyName || "Company"
  )
  addSummaryLine("Generated", formatDateTime(meta.generatedAt))
  addSummaryLine("Prepared by", meta.preparedBy || "—")
  summary.addRow([])

  addSummaryLine("Filters", "")
  for (const entry of auditFilterEntries(meta)) {
    addSummaryLine(entry.label, entry.value)
  }
  summary.addRow([])

  addSummaryLine("Result", "")
  addSummaryLine("Matching usage lines", meta.summary.lines, true)
  addSummaryLine("Submissions", meta.summary.submissions, true)
  addSummaryLine("Distinct SKUs", meta.summary.skus, true)
  addSummaryLine("Stages covered", meta.summary.stages, true)
  summary.addRow([])

  addSummaryLine("Quantity by unit", "")
  const quantities = auditQuantityByUom(rows)
  if (quantities.length === 0) {
    addSummaryLine("—", "No quantities recorded.")
  } else {
    for (const total of quantities) {
      addSummaryLine(total.uom, formatNumber(total.quantity))
    }
  }

  addSummaryLine("", "")
  addSummaryLine(
    "Note",
    "Usage quantities are recorded per SKU line. Units are shown per row, so quantities are only comparable within the same UOM."
  )

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer as unknown as BlobPart], { type: XLSX_MIME })
  triggerDownload(blob, `${auditFileBase(meta)}.xlsx`)
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

export async function exportAuditPdf(
  rows: AuditExportRow[],
  meta: AuditExportMeta
) {
  const [{ jsPDF }, { autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ])

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 12
  const contentWidth = pageWidth - margin * 2

  // Header band
  doc.setFillColor(...PDF_COLORS.ink)
  doc.rect(0, 0, pageWidth, 30, "F")

  doc.setTextColor(255, 255, 255)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(15)
  doc.text(meta.companyLegalName || meta.companyName || "Company", margin, 12)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(203, 213, 225)
  doc.text("Production Audit Report", margin, 18.5)

  if (meta.companyAddress) {
    doc.setFontSize(7)
    doc.text(
      doc.splitTextToSize(meta.companyAddress, contentWidth * 0.55)[0] ?? "",
      margin,
      24
    )
  }

  doc.setFontSize(7.5)
  doc.text(
    `Generated ${formatDateTime(meta.generatedAt)}`,
    pageWidth - margin,
    12.5,
    { align: "right" }
  )
  doc.text(`Prepared by ${meta.preparedBy || "—"}`, pageWidth - margin, 18, {
    align: "right",
  })
  doc.text(
    `${rows.length} usage line${rows.length === 1 ? "" : "s"}`,
    pageWidth - margin,
    23.5,
    { align: "right" }
  )

  // Filters
  const filterEntries = auditFilterEntries(meta)
  const filterCellWidth = contentWidth / filterEntries.length
  filterEntries.forEach((entry, index) => {
    const x = margin + index * filterCellWidth
    doc.setFont("helvetica", "bold")
    doc.setFontSize(6.5)
    doc.setTextColor(...PDF_COLORS.muted)
    doc.text(entry.label.toUpperCase(), x, 37)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.setTextColor(...PDF_COLORS.ink)
    const valueLines = doc.splitTextToSize(entry.value, filterCellWidth - 4)
    doc.text(valueLines.slice(0, 2), x, 41.5)
  })

  // Metric cards
  const metrics = [
    { label: "Matching lines", value: meta.summary.lines },
    { label: "Submissions", value: meta.summary.submissions },
    { label: "Distinct SKUs", value: meta.summary.skus },
    { label: "Stages covered", value: meta.summary.stages },
  ]
  const boxGap = 3
  const boxWidth = (contentWidth - boxGap * (metrics.length - 1)) / metrics.length
  const boxTop = 52
  const boxHeight = 14
  metrics.forEach((metric, index) => {
    const x = margin + index * (boxWidth + boxGap)
    doc.setFillColor(...PDF_COLORS.soft)
    doc.setDrawColor(...PDF_COLORS.line)
    doc.setLineWidth(0.2)
    doc.roundedRect(x, boxTop, boxWidth, boxHeight, 2, 2, "FD")
    doc.setFont("helvetica", "bold")
    doc.setFontSize(6.5)
    doc.setTextColor(...PDF_COLORS.muted)
    doc.text(metric.label.toUpperCase(), x + 3, boxTop + 4.8)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    doc.setTextColor(...PDF_COLORS.ink)
    doc.text(String(metric.value), x + 3, boxTop + 11.2)
  })

  const tableStartY = boxTop + boxHeight + 8

  if (rows.length === 0) {
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.setTextColor(...PDF_COLORS.muted)
    doc.text("No usage matches the selected filters.", margin, tableStartY + 4)
  } else {
    autoTable(doc, {
      head: [
        [
          "Usage date",
          "Recorded",
          "Pipeline",
          "Stage",
          "SKU",
          "Qty",
          "UOM",
          "Submitted by",
          "Notes",
        ],
      ],
      body: rows.map((row) => [
        formatDate(row.usageDate),
        formatTime(row.recordedAt),
        `${row.pipeline} (${row.pipelineCode})`,
        row.stageSequence === null
          ? row.stage
          : `${row.stage} (${row.stageSequence})`,
        `${row.skuCode} · ${row.sku}`,
        formatNumber(row.quantity),
        row.uom,
        row.submitter,
        row.notes,
      ]),
      startY: tableStartY,
      margin: { left: margin, right: margin, top: 20, bottom: 16 },
      theme: "grid",
      styles: {
        font: "helvetica",
        fontSize: 6.8,
        cellPadding: 1.5,
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
        fontSize: 6.8,
      },
      alternateRowStyles: { fillColor: PDF_COLORS.soft },
      columnStyles: {
        0: { cellWidth: 23 },
        1: { cellWidth: 18 },
        2: { cellWidth: 38 },
        3: { cellWidth: 36 },
        4: { cellWidth: 50 },
        5: { cellWidth: 15, halign: "right" },
        6: { cellWidth: 12 },
        7: { cellWidth: 34 },
        8: { cellWidth: "auto" },
      },
      didDrawPage: (data) => {
        if (data.pageNumber > 1) {
          doc.setFont("helvetica", "normal")
          doc.setFontSize(7)
          doc.setTextColor(...PDF_COLORS.muted)
          doc.text(
            `${meta.companyName} · Production Audit Report`,
            margin,
            10
          )
          doc.text("continued", pageWidth - margin, 10, { align: "right" })
        }
      },
    })

    const finalY =
      (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable
        ?.finalY ?? tableStartY

    let cursorY = finalY + 9
    if (cursorY + 14 > pageHeight - 16) {
      doc.addPage()
      cursorY = 20
    }

    doc.setFont("helvetica", "bold")
    doc.setFontSize(8)
    doc.setTextColor(...PDF_COLORS.ink)
    doc.text("Total quantity by unit", margin, cursorY)

    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.setTextColor(...PDF_COLORS.slate)
    doc.text(quantitySummaryText(rows), margin, cursorY + 5, {
      maxWidth: contentWidth,
    })
  }

  // Footer on every page
  const pageCount = doc.getNumberOfPages()
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page)
    doc.setDrawColor(...PDF_COLORS.line)
    doc.setLineWidth(0.2)
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(6.5)
    doc.setTextColor(...PDF_COLORS.muted)
    doc.text(
      `${meta.companyName} · Production audit report`,
      margin,
      pageHeight - 7
    )
    doc.text(`Page ${page} of ${pageCount}`, pageWidth - margin, pageHeight - 7, {
      align: "right",
    })
  }

  doc.save(`${auditFileBase(meta)}.pdf`)
}
