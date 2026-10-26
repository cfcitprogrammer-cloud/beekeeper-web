"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import type {
  SortingState,
  RowPinningState,
  Updater,
  ColumnPinningState,
  ColumnOrderState,
  ColumnFiltersState,
} from "@tanstack/react-table"
import { useMemo } from "react"

export function useUrlTableState() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // -----------------------------
  // Pagination
  // -----------------------------

  const page = Number(searchParams.get("page")) || 1
  const size = Number(searchParams.get("size")) || 100

  const pagination = {
    pageIndex: page - 1,
    pageSize: size,
  }

  // -----------------------------
  // Search
  // -----------------------------

  const searchQuery = searchParams.get("q") ?? ""
  const searchField = searchParams.get("f") ?? ""

  // -----------------------------
  // Sorting
  // -----------------------------

  const sortParam = searchParams.get("sort")

  const sorting: SortingState = sortParam
    ? sortParam
        .split(",")
        .map((value) => {
          const [id, direction] = value.split(".")

          return {
            id,
            desc: direction === "desc",
          }
        })
        .filter((sort) => sort.id)
    : []

  // -----------------------------
  // Row Pinning
  // -----------------------------

  const pinTopParam = searchParams.get("pinTop")
  const pinBottomParam = searchParams.get("pinBottom")

  const rowPinning: RowPinningState = {
    top: pinTopParam ? pinTopParam.split(",").filter(Boolean) : [],
    bottom: pinBottomParam ? pinBottomParam.split(",").filter(Boolean) : [],
  }

  // -----------------------------
  // Update URL
  // -----------------------------

  const updateParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())

    for (const [key, value] of Object.entries(updates)) {
      if (value === null) {
        params.delete(key)
      } else {
        params.set(key, value)
      }
    }

    router.push(`${pathname}?${params.toString()}`)
  }

  // -----------------------------
  // Setters
  // -----------------------------

  const setSearch = (query: string, field: string) => {
    updateParams({
      q: query || null,
      f: field || null,
      page: "1", // Always reset to page 1 when searching
    })
  }

  const setSorting = (updater: Updater<SortingState>) => {
    const nextSorting =
      typeof updater === "function" ? updater(sorting) : updater

    const nextSortParam =
      nextSorting.length > 0
        ? nextSorting
            .map((sort) => `${sort.id}.${sort.desc ? "desc" : "asc"}`)
            .join(",")
        : null

    updateParams({
      sort: nextSortParam,
      page: "1", // Reset page to 1 when sorting changes
    })
  }

  const setRowPinning = (updater: Updater<RowPinningState>) => {
    const nextPinning =
      typeof updater === "function" ? updater(rowPinning) : updater

    const nextPinTop =
      nextPinning.top && nextPinning.top.length > 0
        ? nextPinning.top.join(",")
        : null

    const nextPinBottom =
      nextPinning.bottom && nextPinning.bottom.length > 0
        ? nextPinning.bottom.join(",")
        : null

    updateParams({
      pinTop: nextPinTop,
      pinBottom: nextPinBottom,
      // We usually don't reset the page for pinning, so we leave page alone
    })
  }

  // -----------------------------
  // Column Pinning
  // -----------------------------
  const pinStartParam = searchParams.get("pinStart")
  const pinEndParam = searchParams.get("pinEnd")

  const columnPinning: ColumnPinningState = {
    start: pinStartParam ? pinStartParam.split(",").filter(Boolean) : [],
    end: pinEndParam ? pinEndParam.split(",").filter(Boolean) : [],
  }

  const setColumnPinning = (updater: Updater<ColumnPinningState>) => {
    const nextPinning =
      typeof updater === "function" ? updater(columnPinning) : updater

    updateParams({
      pinStart: nextPinning.start?.length ? nextPinning.start.join(",") : null,
      pinEnd: nextPinning.end?.length ? nextPinning.end.join(",") : null,
    })
  }

  // -----------------------------
  // Column Ordering
  // -----------------------------
  const colsParam = searchParams.get("cols")

  // TanStack uses an array of column string IDs
  const columnOrder: ColumnOrderState = colsParam ? colsParam.split(",") : []

  const setColumnOrder = (updater: Updater<ColumnOrderState>) => {
    const nextOrder =
      typeof updater === "function" ? updater(columnOrder) : updater

    updateParams({
      cols: nextOrder?.length > 0 ? nextOrder.join(",") : null,
    })
  }

  // -----------------------------
  // Global Search
  // -----------------------------
  const globalFilter = searchParams.get("g") ?? ""

  const setGlobalFilter = (query: string) => {
    updateParams({
      g: query || null,
      page: "1", // Always reset to page 1 when searching
    })
  }

  // -----------------------------
  // Column Filters
  // -----------------------------
  const filtersParam = searchParams.get("filters")

  const columnFilters: ColumnFiltersState = useMemo(() => {
    try {
      return filtersParam ? JSON.parse(filtersParam) : []
    } catch {
      return []
    }
  }, [filtersParam])

  const setColumnFilters = (updater: Updater<ColumnFiltersState>) => {
    const nextFilters =
      typeof updater === "function" ? updater(columnFilters) : updater

    updateParams({
      filters: nextFilters.length > 0 ? JSON.stringify(nextFilters) : null,
      page: "1", // Always reset to page 1 when a filter changes
    })
  }

  return {
    page,
    size,
    pagination,

    searchQuery,
    searchField,
    setSearch,

    sorting,
    setSorting,

    rowPinning,
    setRowPinning,

    // Exported here so DataTable can consume them!
    columnPinning,
    setColumnPinning,

    columnOrder,
    setColumnOrder,

    globalFilter,
    setGlobalFilter,

    columnFilters,
    setColumnFilters,
  }
}
