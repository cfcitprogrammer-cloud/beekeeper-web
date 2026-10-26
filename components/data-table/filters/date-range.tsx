"use client"

import * as React from "react"
import { Column, RowData } from "@tanstack/react-table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { DataTableFeatures } from "@/hooks/use-data-table"
import { FilterPayload } from "@/types/data-table"
import { HugeiconsIcon } from "@hugeicons/react"
import { X } from "@hugeicons/core-free-icons"

export function DateRangeFilter<TData extends RowData, TValue = unknown>({
  column,
}: {
  column: Column<DataTableFeatures, TData, TValue>
}) {
  const filterPayload = column.getFilterValue() as
    Extract<FilterPayload, { operator: "range" }> | undefined

  const startDate =
    typeof filterPayload?.min === "string" ? filterPayload.min : ""
  const endDate =
    typeof filterPayload?.max === "string" ? filterPayload.max : ""

  const handleStartDate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStart = e.target.value
    if (!newStart && !endDate) {
      column.setFilterValue(undefined)
      return
    }
    const payload: FilterPayload = {
      operator: "range",
      min: newStart || null,
      max: endDate || null,
    }
    column.setFilterValue(payload)
  }

  const handleEndDate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEnd = e.target.value
    if (!startDate && !newEnd) {
      column.setFilterValue(undefined)
      return
    }
    const payload: FilterPayload = {
      operator: "range",
      min: startDate || null,
      max: newEnd || null,
    }
    column.setFilterValue(payload)
  }

  return (
    <div
      className="mt-2 flex flex-col space-y-2"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center space-x-2">
        <Input
          type="date"
          value={startDate}
          onChange={handleStartDate}
          className="h-8 w-full text-xs font-normal"
        />
        <span className="text-muted-foreground">to</span>
        <Input
          type="date"
          value={endDate}
          onChange={handleEndDate}
          className="h-8 w-full text-xs font-normal"
        />
      </div>
      {(startDate || endDate) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.setFilterValue(undefined)}
          className="h-6 text-xs font-normal text-muted-foreground"
        >
          <HugeiconsIcon icon={X} /> Clear dates
        </Button>
      )}
    </div>
  )
}
