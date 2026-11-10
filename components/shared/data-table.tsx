"use client"

import * as React from "react"
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  SlidersHorizontal,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

export type DataTableColumn<T> = {
  id: string
  header: React.ReactNode
  cell: (row: T) => React.ReactNode
  sortValue?: (row: T) => string | number
  className?: string
  headerClassName?: string
  align?: "left" | "center" | "right"
  width?: string
  hideBelow?: "sm" | "md" | "lg" | "xl"
}

export type DataTableProps<T> = {
  data: T[]
  columns: DataTableColumn<T>[]
  getRowId: (row: T) => string
  searchable?: (row: T) => string
  searchPlaceholder?: string
  filters?: React.ReactNode
  toolbar?: React.ReactNode
  pageSize?: number
  emptyTitle?: string
  emptyDescription?: string
  emptyIcon?: React.ElementType
  onRowClick?: (row: T) => void
  initialSort?: { id: string; desc: boolean }
  className?: string
  footer?: React.ReactNode
  hideSearch?: boolean
}

const alignClasses = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
} as const

const hideClasses = {
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
  xl: "hidden xl:table-cell",
} as const

export function DataTable<T>({
  data = [],
  columns,
  getRowId,
  searchable,
  searchPlaceholder = "Search records…",
  filters,
  toolbar,
  pageSize = 10,
  emptyTitle = "No records found",
  emptyDescription = "Try adjusting your search or filters, or create a new record.",
  emptyIcon: EmptyIcon = SlidersHorizontal,
  onRowClick,
  initialSort,
  className,
  footer,
  hideSearch,
}: DataTableProps<T>) {
  const [search, setSearch] = React.useState("")
  const deferredSearch = React.useDeferredValue(search)
  const [page, setPage] = React.useState(0)
  const [sort, setSort] = React.useState<{ id: string; desc: boolean } | null>(
    initialSort ?? null
  )

  const filtered = React.useMemo(() => {
    if (!deferredSearch.trim() || !searchable) return data
    const term = deferredSearch.trim().toLowerCase()
    return data.filter((row) => searchable(row).toLowerCase().includes(term))
  }, [data, deferredSearch, searchable])

  const sorted = React.useMemo(() => {
    if (!sort) return filtered
    const column = columns.find((col) => col.id === sort.id)
    if (!column?.sortValue) return filtered
    return [...filtered].sort((a, b) => {
      const aValue = column.sortValue!(a)
      const bValue = column.sortValue!(b)
      if (aValue === bValue) return 0
      const result = aValue > bValue ? 1 : -1
      return sort.desc ? -result : result
    })
  }, [filtered, sort, columns])

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize))
  const currentPage = Math.min(page, pageCount - 1)
  const pageRows = sorted.slice(
    currentPage * pageSize,
    currentPage * pageSize + pageSize
  )
  const from = sorted.length === 0 ? 0 : currentPage * pageSize + 1
  const to = Math.min(sorted.length, (currentPage + 1) * pageSize)

  function toggleSort(column: DataTableColumn<T>) {
    if (!column.sortValue) return
    setSort((current) => {
      if (!current || current.id !== column.id) {
        return { id: column.id, desc: false }
      }
      if (!current.desc) return { id: column.id, desc: true }
      return null
    })
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {!hideSearch && searchable && (
            <div className="relative w-full max-w-xs">
              <Search
                className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPage(0)
                }}
                placeholder={searchPlaceholder}
                className="h-8 pl-8"
                aria-label={searchPlaceholder}
              />
            </div>
          )}
          {filters}
        </div>
        {toolbar && (
          <div className="flex flex-wrap items-center gap-2">{toolbar}</div>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow className="hover:bg-transparent">
              {columns.map((column) => (
                <TableHead
                  key={column.id}
                  style={column.width ? { width: column.width } : undefined}
                  className={cn(
                    "h-9 text-[0.6875rem] font-semibold tracking-wide text-muted-foreground uppercase",
                    alignClasses[column.align ?? "left"],
                    column.headerClassName,
                    column.hideBelow && hideClasses[column.hideBelow]
                  )}
                >
                  {column.sortValue ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(column)}
                      className={cn(
                        "inline-flex items-center gap-1 transition-colors hover:text-foreground",
                        column.align === "right" && "flex-row-reverse"
                      )}
                    >
                      {column.header}
                      {sort?.id === column.id ? (
                        sort.desc ? (
                          <ArrowDown className="size-3" />
                        ) : (
                          <ArrowUp className="size-3" />
                        )
                      ) : (
                        <ArrowUpDown className="size-3 opacity-50" />
                      )}
                    </button>
                  ) : (
                    column.header
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns.length} className="p-0">
                  <Empty className="border-0 py-12">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <EmptyIcon className="size-4" />
                      </EmptyMedia>
                      <EmptyTitle>{emptyTitle}</EmptyTitle>
                      <EmptyDescription>{emptyDescription}</EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((row) => (
                <TableRow
                  key={getRowId(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    onRowClick && "cursor-pointer",
                    "last:border-0"
                  )}
                >
                  {columns.map((column) => (
                    <TableCell
                      key={column.id}
                      className={cn(
                        "py-2.5",
                        alignClasses[column.align ?? "left"],
                        column.className,
                        column.hideBelow && hideClasses[column.hideBelow]
                      )}
                    >
                      {column.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[0.6875rem] text-muted-foreground tabular-nums">
          Showing <span className="font-medium text-foreground">{from}</span>–
          <span className="font-medium text-foreground">{to}</span> of{" "}
          <span className="font-medium text-foreground">{sorted.length}</span>{" "}
          records
          {deferredSearch && sorted.length !== data.length && (
            <span className="ml-1">(filtered from {data.length})</span>
          )}
        </p>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setPage(0)}
            disabled={currentPage === 0}
            aria-label="First page"
          >
            <ChevronsLeft />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setPage((value) => Math.max(0, value - 1))}
            disabled={currentPage === 0}
            aria-label="Previous page"
          >
            <ChevronLeft />
          </Button>
          <span className="px-2 text-[0.6875rem] text-muted-foreground tabular-nums">
            Page {currentPage + 1} of {pageCount}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() =>
              setPage((value) => Math.min(pageCount - 1, value + 1))
            }
            disabled={currentPage >= pageCount - 1}
            aria-label="Next page"
          >
            <ChevronRight />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setPage(pageCount - 1)}
            disabled={currentPage >= pageCount - 1}
            aria-label="Last page"
          >
            <ChevronsRight />
          </Button>
        </div>
      </div>

      {footer}
    </div>
  )
}
