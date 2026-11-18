import {
  exportExcel,
  exportPdf,
  type TableExport,
} from "@/lib/inventory/sku-export"
import type { InventoryWarehouse } from "@/types/database"

export const WAREHOUSE_CSV_HEADERS = [
  "code",
  "name",
  "address",
  "contact_person",
  "phone",
  "email",
  "notes",
  "is_active",
] as const

export type WarehouseExportRow = {
  code: string
  name: string
  address: string
  contactPerson: string
  phone: string
  email: string
  notes: string
  isActive: boolean
}

export function toWarehouseExportRow(
  warehouse: InventoryWarehouse
): WarehouseExportRow {
  return {
    code: warehouse.code,
    name: warehouse.name,
    address: warehouse.address ?? "",
    contactPerson: warehouse.contact_person ?? "",
    phone: warehouse.phone ?? "",
    email: warehouse.email ?? "",
    notes: warehouse.notes ?? "",
    isActive: warehouse.is_active,
  }
}

export function buildWarehouseCsv(rows: WarehouseExportRow[]) {
  return [
    WAREHOUSE_CSV_HEADERS.join(","),
    ...rows.map((row) =>
      [
        row.code,
        row.name,
        row.address,
        row.contactPerson,
        row.phone,
        row.email,
        row.notes,
        row.isActive ? "true" : "false",
      ]
        .map((value) => {
          const text = value === null || value === undefined ? "" : String(value)
          return /[",\r\n]/.test(text)
            ? `"${text.replace(/"/g, '""')}"`
            : text
        })
        .join(",")
    ),
  ].join("\r\n")
}

export function downloadWarehouseTemplate() {
  const blob = new Blob([`\uFEFF${WAREHOUSE_CSV_HEADERS.join(",")}\r\n`], {
    type: "text/csv;charset=utf-8;",
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = "warehouse-import-template.csv"
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function exportWarehouseCsv(rows: WarehouseExportRow[]) {
  const blob = new Blob([`\uFEFF${buildWarehouseCsv(rows)}`], {
    type: "text/csv;charset=utf-8;",
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `warehouses-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function warehouseTable(rows: WarehouseExportRow[]): Omit<TableExport, "fileName"> {
  return {
    sheetName: "Warehouses",
    title: "Warehouses",
    subtitle: `${rows.length} warehouse${rows.length === 1 ? "" : "s"}`,
    columns: [
      { header: "Code", width: 16 },
      { header: "Name", width: 28 },
      { header: "Address", width: 34 },
      { header: "Contact person", width: 20 },
      { header: "Phone", width: 16 },
      { header: "Email", width: 24 },
      { header: "Notes", width: 40 },
      { header: "Status", width: 10 },
    ],
    rows: rows.map((row) => [
      row.code,
      row.name,
      row.address,
      row.contactPerson,
      row.phone,
      row.email,
      row.notes,
      row.isActive ? "Active" : "Inactive",
    ]),
  }
}

export async function exportWarehouseExcel(rows: WarehouseExportRow[]) {
  await exportExcel({
    ...warehouseTable(rows),
    fileName: `warehouses-${new Date().toISOString().slice(0, 10)}`,
  })
}

export async function exportWarehousePdf(rows: WarehouseExportRow[]) {
  await exportPdf({
    ...warehouseTable(rows),
    fileName: `warehouses-${new Date().toISOString().slice(0, 10)}`,
  })
}
