"use client"

import { RowData, type Table } from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DataTableFeatures } from "@/hooks/use-data-table"
import { HugeiconsIcon } from "@hugeicons/react"
import { Settings02Icon } from "@hugeicons/core-free-icons"

interface DataTableViewOptionsProps<TData extends RowData> {
  table: Table<DataTableFeatures, TData>
}

export function DataTableViewOptions<TData extends RowData>({
  table,
}: DataTableViewOptionsProps<TData>) {
  return (
    <DropdownMenu>
      {/* Children placed inside the Button within the render prop */}
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="sm" className="ml-auto h-8 lg:flex">
            <HugeiconsIcon icon={Settings02Icon} />
            View
          </Button>
        }
      />

      <DropdownMenuContent align="end" className="w-[150px]">
        {/* DropdownMenuGroup satisfies Base UI's MenuGroupContext requirement */}
        <DropdownMenuGroup>
          <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {table
            .getAllColumns()
            .filter((column) => column.getCanHide())
            .map((column) => {
              return (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  className="capitalize"
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}
                >
                  {column.id}
                </DropdownMenuCheckboxItem>
              )
            })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
