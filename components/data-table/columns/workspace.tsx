"use client"

import { ColumnDef } from "@tanstack/react-table"
import { DataTableFeatures } from "@/hooks/use-data-table"
import { Workspace } from "@/db/models/workspace"

export const columns: ColumnDef<DataTableFeatures, Workspace>[] = [
  {
    accessorKey: "id",
    header: "ID",
    cell: ({ row }) => (
      <span className="font-mono text-xs">{row.original.id}</span>
    ),
    size: 80,
  },
  {
    accessorKey: "code",
    header: "Code",
    cell: ({ row }) => (
      <span className="rounded bg-muted px-2 py-1 font-mono text-xs font-semibold">
        {row.original.code ?? "—"}
      </span>
    ),
    size: 120,
  },
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <span className="font-medium text-foreground">
        {row.original.name ?? "Untitled"}
      </span>
    ),
    size: 200,
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => (
      <span className="truncate text-muted-foreground">
        {row.original.description ?? "—"}
      </span>
    ),
    size: 300,
  },
  {
    accessorKey: "created_at",
    header: "Created At",
    cell: ({ row }) => {
      const date = row.original.created_at
      return (
        <span className="text-muted-foreground">
          {date ? new Date(date).toLocaleDateString() : "—"}
        </span>
      )
    },
    size: 150,
  },
]
