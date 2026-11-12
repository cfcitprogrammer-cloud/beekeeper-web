"use client"

import * as React from "react"
import Link from "next/link"
import { FlaskConical, Plus } from "lucide-react"

import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { Button } from "@/components/ui/button"
import { formatDate, formatNumber } from "@/lib/format"
import type { ProductionUsageWithRelations } from "@/lib/data/operations"
import {
  groupProductionUsage,
  type ProductionUsageBatch,
} from "@/lib/production/usage"

export function UsageManager({
  usage,
  canRecord,
  recordHref = "/production/usage/new",
}: {
  usage: ProductionUsageWithRelations[]
  canRecord: boolean
  recordHref?: string
}) {
  const batches = React.useMemo(() => groupProductionUsage(usage), [usage])

  const columns: DataTableColumn<ProductionUsageBatch>[] = [
    {
      id: "date",
      header: "Date",
      sortValue: (row) => row.usageDate,
      cell: (row) => (
        <span className="text-xs tabular-nums">
          {formatDate(row.usageDate)}
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
      id: "skus",
      header: "SKUs",
      sortValue: (row) =>
        row.items
          .map((item) => item.sku?.sku_code ?? "")
          .join(" "),
      cell: (row) => (
        <div className="space-y-1">
          {row.items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 text-xs"
            >
              <span className="min-w-0 truncate">
                {item.sku ? item.sku.name : "Legacy run usage"}
                {item.sku ? (
                  <span className="ml-1 font-mono text-[0.625rem] text-muted-foreground">
                    {item.sku.sku_code}
                  </span>
                ) : null}
              </span>
              <span className="shrink-0 tabular-nums">
                {formatNumber(item.quantity)}{" "}
                <span className="text-muted-foreground">{item.uom ?? ""}</span>
              </span>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: "items",
      header: "Lines",
      align: "right",
      hideBelow: "sm",
      sortValue: (row) => row.items.length,
      cell: (row) => (
        <span className="text-xs tabular-nums">{row.items.length}</span>
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
              : row.submittedBy
                ? `User ${row.submittedBy.slice(0, 8)}`
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
      data={batches}
      columns={columns}
      getRowId={(row) => row.id}
      searchable={(row) =>
        [
          row.pipeline?.name,
          row.pipeline?.code,
          row.stage?.name,
          row.submitter?.first_name,
          row.submitter?.last_name,
          row.submitter?.employee_no,
          row.notes,
          ...row.items.flatMap((item) => [
            item.sku?.name,
            item.sku?.sku_code,
          ]),
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
          <Button size="sm" render={<Link href={recordHref} />}>
            <Plus />
            New usage
          </Button>
        ) : null
      }
    />
  )
}
