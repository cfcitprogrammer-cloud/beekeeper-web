"use client"

import * as React from "react"
import {
  type ColumnDef,
  type RowData,
  type PaginationState,
  type Row,
  type Column,
} from "@tanstack/react-table"
import type { Atom } from "@tanstack/react-store"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"

import {
  features,
  useAppTable,
  type DataTableFeatures,
} from "@/hooks/use-data-table"
import DataTablePagination from "./data-table-pagination"
import { useUrlTableState } from "@/hooks/use-url-table-state"
import { DataTableViewOptions } from "./data-table-column-visibility"
import { DataTableSortList } from "./data-table-sort-list"
import { cn } from "@/lib/utils"
import { DataTableGlobalSearch } from "./data-table-global-search"
import { NumberRangeFilter } from "../filters/value-range"
import { DateRangeFilter } from "../filters/date-range"
import { CheckboxFilter } from "../filters/checkbox-multi-select"
import { DateFilter } from "../filters/single-date"
import { CustomColumnMeta } from "@/types/data-table"
import {
  ArrowDownToLineIcon,
  ArrowUpToLineIcon,
  PinOff,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

interface DataTableProps<TData extends RowData> {
  tkey: string
  columns: ColumnDef<DataTableFeatures, TData>[]
  data: TData[]
  paginationAtom?: Atom<PaginationState>
  pageCount: number
  rowCount: number
  onRowClick?: (row: Row<DataTableFeatures, TData>) => void
}

// --- Extracted outside to prevent recreating the component on every render ---
const ContextMenuRowInner = <TData extends RowData>({
  row,
  className,
  table,
  getStickyStyles,
  onRowClick,
}: {
  row: Row<typeof features, TData>
  className?: string
  table: any
  getStickyStyles: (
    column: Column<typeof features, TData, unknown>
  ) => React.CSSProperties
  onRowClick?: (row: any) => void
}) => {
  const isPinned = row.getIsPinned()

  return (
    <ContextMenu>
      {/* Use the 'render' prop so the trigger renders directly as the <TableRow> */}
      <ContextMenuTrigger
        render={
          <TableRow
            data-state={row.getIsSelected() && "selected"}
            className={cn(className, onRowClick && "cursor-pointer")}
            onClick={() => onRowClick?.(row)}
          />
        }
      >
        {row.getVisibleCells().map((cell) => {
          const isColumnPinned = cell.column.getIsPinned()
          return (
            <TableCell
              key={cell.id}
              style={{
                width: cell.column.getSize(),
                ...getStickyStyles(
                  cell.column as Column<typeof features, TData, unknown>
                ),
              }}
              className={cn(
                // Prevent text overlapping into the next column:
                "truncate overflow-hidden text-ellipsis",

                // Apply z-10 for pinned body cells so they scroll UNDER the header
                isColumnPinned ? "z-10 bg-background" : "",
                // Only apply the necessary border side based on pin direction (start/end)
                isColumnPinned === "start"
                  ? "border-r shadow-[1px_0_0_0_theme(colors.border)]"
                  : "",
                isColumnPinned === "end"
                  ? "border-l shadow-[-1px_0_0_0_theme(colors.border)]"
                  : ""
              )}
            >
              <table.FlexRender cell={cell} />
            </TableCell>
          )
        })}
      </ContextMenuTrigger>

      <ContextMenuContent className="w-48">
        {isPinned !== "top" && (
          <ContextMenuItem onClick={() => row.pin("top")}>
            <HugeiconsIcon icon={ArrowUpToLineIcon} /> Pin to Top
          </ContextMenuItem>
        )}
        {isPinned !== "bottom" && (
          <ContextMenuItem onClick={() => row.pin("bottom")}>
            <HugeiconsIcon icon={ArrowDownToLineIcon} /> Pin to Bottom
          </ContextMenuItem>
        )}
        {isPinned && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={() => row.pin(false)}>
              <HugeiconsIcon icon={PinOff} /> Unpin Row
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  )
}

// Memoize to prevent row re-renders when table state (like dragged column) changes
const ContextMenuRow = React.memo(
  ContextMenuRowInner
) as typeof ContextMenuRowInner

export function DataTable<TData extends RowData>({
  tkey,
  columns,
  data,
  pageCount = -1,
  rowCount,
  onRowClick,
}: DataTableProps<TData>) {
  const {
    pagination,
    rowPinning,
    columnPinning,
    columnOrder,
    columnFilters,
    setRowPinning,
    setColumnPinning,
    setColumnOrder,
    setColumnFilters,
  } = useUrlTableState()

  const table = useAppTable({
    key: tkey,
    data,
    columns,
    rowCount,
    pageCount,

    state: {
      pagination,
      rowPinning,
      columnPinning,
      columnOrder,
      columnFilters,
    },
    onColumnFiltersChange: setColumnFilters,
    onRowPinningChange: setRowPinning,
    onColumnPinningChange: setColumnPinning,
    onColumnOrderChange: setColumnOrder,
  })

  // --- Drag and Drop State ---
  const [draggedColumn, setDraggedColumn] = React.useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = React.useState<string | null>(
    null
  )
  const draggedColumnRef = React.useRef<string | null>(null)

  // Memoized handlers to prevent recreation
  const handleDragStart = React.useCallback(
    (e: React.DragEvent, id: string) => {
      draggedColumnRef.current = id
      setDraggedColumn(id)
    },
    []
  )

  const handleDragOver = React.useCallback((e: React.DragEvent, id: string) => {
    e.preventDefault()
    setDragOverColumn((prev) => (prev !== id ? id : prev))
  }, [])

  const handleDrop = React.useCallback(
    (e: React.DragEvent, targetId: string) => {
      e.preventDefault()
      setDragOverColumn(null)

      const currentDragged = draggedColumnRef.current
      if (!currentDragged || currentDragged === targetId) {
        setDraggedColumn(null)
        return
      }

      const currentOrder = table.getAllLeafColumns().map((c) => c.id)

      const draggedIndex = currentOrder.indexOf(currentDragged)
      const targetIndex = currentOrder.indexOf(targetId)

      const newOrder = [...currentOrder]
      newOrder.splice(draggedIndex, 1)
      newOrder.splice(targetIndex, 0, currentDragged)

      table.setColumnOrder(newOrder)
      draggedColumnRef.current = null
      setDraggedColumn(null)
    },
    [table]
  )

  // --- Helper: Calculate sticky styles for pinned columns ---
  const getStickyStyles = React.useCallback(
    (column: Column<typeof features, TData, unknown>): React.CSSProperties => {
      const isPinned = column.getIsPinned()
      if (!isPinned) return {}

      return {
        position: "sticky",
        left:
          isPinned === "start" ? `${column.getStart("start")}px` : undefined,
        right: isPinned === "end" ? `${column.getAfter("end")}px` : undefined,
      }
    },
    []
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <DataTableGlobalSearch />

        <div className="flex items-center gap-2">
          <DataTableSortList table={table} />
          <DataTableViewOptions table={table} />
        </div>
      </div>

      <div className="mt-2 flex">
        {table.getVisibleLeafColumns().map((column) => {
          const meta = column.columnDef.meta as CustomColumnMeta
          const filterVariant = meta?.filterVariant
          const filterOptions = meta?.filterOptions ?? []

          if (!column.getCanFilter()) {
            return null
          }

          return (
            <div key={column.id}>
              {filterVariant === "number-range" ? (
                <NumberRangeFilter column={column} />
              ) : filterVariant === "date-range" ? (
                <DateRangeFilter column={column} />
              ) : filterVariant === "date" ? (
                <DateFilter
                  column={column}
                  title={column.columnDef.meta?.filterName as string}
                />
              ) : filterVariant === "checkbox" ? (
                <CheckboxFilter
                  column={column}
                  title={column.columnDef.meta?.filterName as string}
                  options={filterOptions}
                />
              ) : null}
            </div>
          )
        })}
      </div>

      <div className="overflow-hidden rounded-md border">
        <Table
          className="w-full bg-background"
          style={{ minWidth: table.getTotalSize(), tableLayout: "fixed" }}
        >
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const isColumnPinned = header.column.getIsPinned()

                  return (
                    <TableHead
                      key={header.id}
                      draggable={!isColumnPinned}
                      onDragStart={(e) => handleDragStart(e, header.column.id)}
                      onDragOver={(e) => handleDragOver(e, header.column.id)}
                      onDrop={(e) => handleDrop(e, header.column.id)}
                      onDragLeave={() => setDragOverColumn(null)}
                      onDragEnd={() => {
                        setDraggedColumn(null)
                        setDragOverColumn(null)
                        draggedColumnRef.current = null
                      }}
                      style={{
                        width: header.column.getSize(),
                        ...getStickyStyles(
                          header.column as Column<
                            typeof features,
                            TData,
                            unknown
                          >
                        ),
                      }}
                      className={cn(
                        "group relative transition-colors duration-200",
                        isColumnPinned ? "z-20 bg-background" : "",
                        isColumnPinned === "start"
                          ? "border-r shadow-[1px_0_0_0_theme(colors.border)]"
                          : "",
                        isColumnPinned === "end"
                          ? "border-l shadow-[-1px_0_0_0_theme(colors.border)]"
                          : "",
                        draggedColumn === header.column.id
                          ? "bg-accent opacity-40"
                          : "",
                        dragOverColumn === header.column.id
                          ? "border-l-4 border-l-primary bg-accent/50"
                          : ""
                      )}
                    >
                      {header.isPlaceholder ? null : (
                        <div className="flex h-full w-full flex-col py-2">
                          <div className="flex-1 font-semibold">
                            <table.FlexRender header={header} />
                          </div>
                        </div>
                      )}

                      {header.column.getCanResize() && (
                        <div
                          onDoubleClick={() => header.column.resetSize()}
                          onMouseDown={header.getResizeHandler()}
                          onTouchStart={header.getResizeHandler()}
                          draggable
                          onDragStart={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                          }}
                          className={cn(
                            "absolute top-0 right-0 z-30 h-full w-1 cursor-col-resize touch-none bg-border select-none",
                            header.column.getIsResizing()
                              ? "bg-primary opacity-100"
                              : "opacity-0 group-hover:opacity-100"
                          )}
                        />
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {table.getTopRows().map((row) => (
              <ContextMenuRow
                key={row.id}
                row={row}
                table={table}
                getStickyStyles={getStickyStyles}
                className="sticky top-0 z-20 bg-primary shadow-sm backdrop-blur"
                onRowClick={onRowClick}
              />
            ))}

            {table.getCenterRows().length
              ? table
                  .getCenterRows()
                  .map((row) => (
                    <ContextMenuRow
                      key={row.id}
                      row={row}
                      table={table}
                      getStickyStyles={getStickyStyles}
                      onRowClick={onRowClick}
                    />
                  ))
              : table.getTopRows().length === 0 &&
                table.getBottomRows().length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      No results.
                    </TableCell>
                  </TableRow>
                )}

            {table.getBottomRows().map((row) => (
              <ContextMenuRow
                key={row.id}
                row={row}
                table={table}
                getStickyStyles={getStickyStyles}
                className="sticky bottom-0 z-20 border-t bg-primary shadow-sm backdrop-blur"
                onRowClick={onRowClick}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      <DataTablePagination table={table} />
    </div>
  )
}
