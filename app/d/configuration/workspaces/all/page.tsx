"use client"

import * as React from "react"
import { useQuery, keepPreviousData } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Plus } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import Link from "next/link"
import { DataTable } from "@/components/data-table/core/data-table"
import { columns } from "@/components/data-table/columns/workspace" // Adjust path to your columns file
import { useUrlTableState } from "@/hooks/use-url-table-state"
import { fetchWorkspaces } from "@/actions/workspace.action"
import { FilterPayload } from "@/types/data-table"

export default function Page() {
  // 1. Sync table state with URL search parameters
  const { pagination, sorting, columnFilters, globalFilter } =
    useUrlTableState()

  // 2. Direct useQuery pattern for fetching data
  const {
    isPending,
    error,
    data: result,
  } = useQuery({
    queryKey: ["workspaces", pagination, sorting, columnFilters, globalFilter],
    queryFn: async () => {
      const res = await fetchWorkspaces({
        pageIndex: pagination.pageIndex,
        pageSize: pagination.pageSize,
        globalFilter,
        sorting,
        columnFilters: columnFilters as { id: string; value: FilterPayload }[],
      })
      return res
    },
    placeholderData: keepPreviousData,
  })

  if (error) {
    return (
      <div className="p-8 text-center text-red-500">Error: {error.message}</div>
    )
  }

  const data = result?.data ?? []
  const rowCount = result?.rowCount ?? 0
  const pageCount = Math.ceil(rowCount / pagination.pageSize)

  return (
    <section className="space-y-4">
      <Card className="border-t-4 border-t-primary">
        <CardHeader>
          <CardTitle>All Workspaces</CardTitle>
          <CardDescription>Manage all workspaces here.</CardDescription>
          <CardAction>
            <Link href={"/d/configuration/workspaces/new"}>
              <Button>
                <HugeiconsIcon icon={Plus} /> Create New
              </Button>
            </Link>
          </CardAction>
        </CardHeader>
      </Card>

      {/* DataTable integrated with TanStack Query and URL state */}
      <DataTable
        tkey="workspaces-table"
        columns={columns}
        data={data}
        rowCount={rowCount}
        pageCount={pageCount}
        onRowClick={(row) => {
          console.log("Clicked workspace:", row.original)
        }}
      />
    </section>
  )
}
