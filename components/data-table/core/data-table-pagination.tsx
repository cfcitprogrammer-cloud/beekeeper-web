"use client"

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { DataTableFeatures } from "@/hooks/use-data-table"
import { RowData, Table } from "@tanstack/react-table"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

interface DataTablePaginationProps<TData extends RowData> {
  table: Table<DataTableFeatures, TData>
}

export default function DataTablePagination<TData extends RowData>({
  table,
}: DataTablePaginationProps<TData>) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // 1. Get current state directly from the table (which is synced to URL via useUrlTableState)
  const { pageIndex, pageSize } = table.store.state.pagination
  const currentPage = pageIndex + 1
  const pageCount = table.getPageCount()
  const rowCount = table.getRowCount()

  // 2. Math for "Showing X to Y of Z results"
  const startRow = rowCount === 0 ? 0 : pageIndex * pageSize + 1
  const endRow = Math.min(rowCount, (pageIndex + 1) * pageSize)

  // 3. Helper to update URL params safely
  const updateUrl = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null) params.delete(key)
      else params.set(key, value)
    })
    router.push(`${pathname}?${params.toString()}`)
  }

  // 4. Handlers
  const setPage = (newPage: number) => {
    updateUrl({ page: String(newPage) })
  }

  const setSize = (newSize: string) => {
    // When changing page size, always reset to page 1 to prevent empty states
    updateUrl({ size: newSize, page: "1" })
  }

  // 5. Generate page numbers with ellipses
  const generatePaginationLinks = () => {
    const pages: (number | "ellipsis")[] = []

    if (pageCount <= 5) {
      for (let i = 1; i <= pageCount; i++) pages.push(i)
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, "ellipsis", pageCount)
      } else if (currentPage >= pageCount - 2) {
        pages.push(
          1,
          "ellipsis",
          pageCount - 3,
          pageCount - 2,
          pageCount - 1,
          pageCount
        )
      } else {
        pages.push(
          1,
          "ellipsis",
          currentPage - 1,
          currentPage,
          currentPage + 1,
          "ellipsis",
          pageCount
        )
      }
    }
    return pages
  }

  return (
    <div className="flex flex-col items-center justify-between gap-4 px-2 sm:flex-row">
      {/* LEFT: Showing Results Text */}
      <div className="text-xs text-muted-foreground">
        Showing <span className="font-medium text-foreground">{startRow}</span>{" "}
        to <span className="font-medium text-foreground">{endRow}</span> of{" "}
        <span className="font-medium text-foreground">{rowCount}</span> results
      </div>

      <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6 lg:gap-8">
        {/* MIDDLE: Rows per page selector */}
        <div className="flex items-center space-x-2">
          <p className="text-xs font-medium">Rows per page</p>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => value && setSize(value)}
          >
            {/* Fixed Base UI nested button issue using the render prop */}
            <SelectTrigger
              render={<Button variant="outline" className="h-8 w-[70px]" />}
            >
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              <SelectGroup>
                {[10, 20, 50, 100, 200, 500].map((sizeOption) => (
                  <SelectItem key={sizeOption} value={String(sizeOption)}>
                    {sizeOption}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {/* RIGHT: Shadcn Pagination Controls */}
        <Pagination className="mx-0 w-auto">
          <PaginationContent>
            {/* Previous Button */}
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  if (table.getCanPreviousPage()) setPage(currentPage - 1)
                }}
                className={
                  !table.getCanPreviousPage()
                    ? "pointer-events-none opacity-50"
                    : ""
                }
              />
            </PaginationItem>

            {/* Page Numbers */}
            {generatePaginationLinks().map((pageNumber, index) => (
              <PaginationItem key={index}>
                {pageNumber === "ellipsis" ? (
                  <PaginationEllipsis />
                ) : (
                  <PaginationLink
                    href="#"
                    isActive={pageNumber === currentPage}
                    onClick={(e) => {
                      e.preventDefault()
                      setPage(pageNumber)
                    }}
                  >
                    {pageNumber}
                  </PaginationLink>
                )}
              </PaginationItem>
            ))}

            {/* Next Button */}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  if (table.getCanNextPage()) setPage(currentPage + 1)
                }}
                className={
                  !table.getCanNextPage()
                    ? "pointer-events-none opacity-50"
                    : ""
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  )
}
