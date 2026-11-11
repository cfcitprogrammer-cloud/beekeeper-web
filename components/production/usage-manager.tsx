"use client"

import Link from "next/link"
import { FlaskConical, Plus } from "lucide-react"

import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { Button } from "@/components/ui/button"
import { formatDate, formatNumber } from "@/lib/format"
import type { ProductionUsageWithRelations } from "@/lib/data/operations"

export function UsageManager({
  usage,
  canRecord,
}: {
  usage: ProductionUsageWithRelations[]
  canRecord: boolean
}) {
  const columns: DataTableColumn<ProductionUsageWithRelations>[] = [
    {
      id: "date",
      header: "Date",
      sortValue: (row) => row.usage_date,
      cell: (row) => (
        <span className="text-xs tabular-nums">
          {formatDate(row.usage_date)}
        </span>
      ),
    },
    {
      id: "pipeline",
      header: "Pipeline / stage",
      sortValue: (row) =>
        `${row.pipeline?.name ?? ""} ${row.stage?.sequence ?? 0}`,
      cell: (row) => (
        <div>
          <p className="text-xs font-medium">
            {row.pipeline?.name ?? "—"}
          </p>
          <p className="text-[0.625rem] text-muted-foreground">
            {row.stage
              ? `${row.stage.sequence}. ${row.stage.name}`
              : "Stage removed"}
          </p>
        </div>
      ),
    },
    {
      id: "sku",
      header: "SKU",
      sortValue: (row) => row.sku?.sku_code ?? "",
      cell: (row) =>
        row.sku ? (
          <div>
            <p className="text-xs">{row.sku.name}</p>
            <p className="font-mono text-[0.625rem] text-muted-foreground">
              {row.sku.sku_code}
            </p>
          </div>
        ) : (
          <span className="text-[0.625rem] text-muted-foreground">
            No SKU (legacy run usage)
          </span>
        ),
    },
    {
      id: "quantity",
      header: "Quantity",
      align: "right",
      sortValue: (row) => row.quantity,
      cell: (row) => (
        <span className="text-xs tabular-nums">
          {formatNumber(row.quantity)}{" "}
          <span className="text-muted-foreground">{row.uom ?? ""}</span>
        </span>
      ),
    },
    {
      id: "submitter",
      header: "Submitted by",
      hideBelow: "md",
      sortValue: (row) =>
        row.submitter
          ? `${row.submitter.first_name} ${row.submitter.last_name}`
          : "",
      cell: (row) => (
        <div>
          <p className="text-xs">
            {row.submitter
              ? `${row.submitter.first_name} ${row.submitter.last_name}`
              : row.submitted_by
                ? `User ${row.submitted_by.slice(0, 8)}`
                : "Unknown user"}
          </p>
          <p className="text-[0.625rem] text-muted-foreground">
            {row.submitter?.employee_no ?? "No employee record"}
          </p>
        </div>
      ),
    },
    {
      id: "notes",
      header: "Notes",
      hideBelow: "lg",
      cell: (row) => (
        <span className="line-clamp-1 max-w-56 text-[0.625rem] text-muted-foreground">
          {row.notes || "—"}
        </span>
      ),
    },
  ]

  return (
    <DataTable
      data={usage}
      columns={columns}
      getRowId={(row) => row.id}
      searchable={(row) =>
        [
          row.pipeline?.name,
          row.pipeline?.code,
          row.stage?.name,
          row.sku?.name,
          row.sku?.sku_code,
          row.submitter?.first_name,
          row.submitter?.last_name,
          row.submitter?.employee_no,
          row.notes,
        ]
          .filter(Boolean)
          .join(" ")
      }
      searchPlaceholder="Search usage by pipeline, stage, SKU or user…"
      pageSize={10}
      emptyTitle="No production usage yet"
      emptyDescription="Record usage against a stage SKU to start tracking production."
      emptyIcon={FlaskConical}
      initialSort={{ id: "date", desc: true }}
      toolbar={
        canRecord ? (
          <Button size="sm" render={<Link href="/production/usage/new" />}>
            <Plus />
            New usage
          </Button>
        ) : null
      }
    />
  )
}
