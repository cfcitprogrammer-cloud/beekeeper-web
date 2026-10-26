"use client"

import * as React from "react"
import { Column, RowData } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { DataTableFeatures } from "@/hooks/use-data-table"
import { FilterPayload } from "@/types/data-table"
import { HugeiconsIcon } from "@hugeicons/react"
import { Filter } from "@hugeicons/core-free-icons"

export function CheckboxFilter<TData extends RowData, TValue = unknown>({
  column,
  title,
  options,
}: {
  column: Column<DataTableFeatures, TData, TValue>
  title: string
  options: { label: string; value: string }[]
}) {
  const filterPayload = column.getFilterValue() as
    Extract<FilterPayload, { operator: "in" }> | undefined
  const selectedValues = new Set(filterPayload?.values || [])

  const toggleOption = (value: string) => {
    const newSelected = new Set(selectedValues)
    if (newSelected.has(value)) {
      newSelected.delete(value)
    } else {
      newSelected.add(value)
    }

    const filterArray = Array.from(newSelected)

    if (filterArray.length > 0) {
      const payload: FilterPayload = { operator: "in", values: filterArray }
      column.setFilterValue(payload)
    } else {
      column.setFilterValue(undefined)
    }
  }

  return (
    <DropdownMenu>
      {/* Use the 'render' prop to prevent nested <button> elements */}
      <DropdownMenuTrigger render={<Button variant="outline" size="xs" />}>
        <HugeiconsIcon icon={Filter} />
        {title}
        {selectedValues.size > 0 && (
          <>
            <DropdownMenuSeparator className="hidden h-4 md:block" />
            <span className="ml-2 rounded-sm bg-secondary px-1 text-xs font-normal">
              {selectedValues.size} selected
            </span>
          </>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-[200px]">
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            key={option.value}
            checked={selectedValues.has(option.value)}
            onCheckedChange={() => toggleOption(option.value)}
            onSelect={(e) => e.preventDefault()}
          >
            {option.label}
          </DropdownMenuCheckboxItem>
        ))}

        {selectedValues.size > 0 && (
          <>
            <DropdownMenuSeparator />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => column.setFilterValue(undefined)}
              className="w-full justify-center text-xs font-normal"
            >
              Clear filters
            </Button>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
