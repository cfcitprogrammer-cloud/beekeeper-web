"use client"

import * as React from "react"
import { Column, RowData } from "@tanstack/react-table"
import { Input } from "@/components/ui/input"
import { DataTableFeatures } from "@/hooks/use-data-table"
import { FilterPayload } from "@/types/data-table"

export function NumberRangeFilter<TData extends RowData, TValue = unknown>({
  column,
}: {
  column: Column<DataTableFeatures, TData, TValue>
}) {
  const filterPayload = column.getFilterValue() as
    Extract<FilterPayload, { operator: "range" }> | undefined

  const [min, setMin] = React.useState<number | "">(
    typeof filterPayload?.min === "number" ? filterPayload.min : ""
  )
  const [max, setMax] = React.useState<number | "">(
    typeof filterPayload?.max === "number" ? filterPayload.max : ""
  )

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      if (min === "" && max === "") {
        column.setFilterValue(undefined)
      } else {
        const payload: FilterPayload = {
          operator: "range",
          min: min === "" ? null : min,
          max: max === "" ? null : max,
        }
        column.setFilterValue(payload)
      }
    }, 300)
    return () => clearTimeout(timeout)
  }, [min, max, column])

  return (
    <div
      className="mt-2 flex items-center space-x-2"
      onClick={(e) => e.stopPropagation()}
    >
      <Input
        type="number"
        value={min}
        onChange={(e) => setMin(e.target.value ? Number(e.target.value) : "")}
        placeholder="Min"
        className="h-8 w-full text-xs font-normal"
      />
      <span className="text-muted-foreground">-</span>
      <Input
        type="number"
        value={max}
        onChange={(e) => setMax(e.target.value ? Number(e.target.value) : "")}
        placeholder="Max"
        className="h-8 w-full text-xs font-normal"
      />
    </div>
  )
}
