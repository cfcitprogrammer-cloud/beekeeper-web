"use client"

import * as React from "react"

import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { useUrlTableState } from "@/hooks/use-url-table-state"
import { HugeiconsIcon } from "@hugeicons/react"
import { Search, X } from "@hugeicons/core-free-icons"

interface DataTableSearchProps {
  // Define which fields the user can select to search
  searchableColumns: { id: string; title: string }[]
}

export function DataTableSearch({ searchableColumns }: DataTableSearchProps) {
  // 1. Hook into your unified URL state
  const { searchQuery, searchField, setSearch } = useUrlTableState()

  const defaultField = searchableColumns[0]?.id ?? ""

  // 2. Local state for immediate typing feedback (prevents input lag)
  const [query, setQuery] = React.useState(searchQuery)
  const [field, setField] = React.useState(searchField || defaultField)

  // 3. Sync local state if the URL changes externally (e.g., browser back button)
  React.useEffect(() => {
    setQuery(searchQuery)
    setField(searchField || defaultField)
  }, [searchQuery, searchField, defaultField])

  // --- DEBOUNCE LOGIC ---
  // Wait 300ms after the user stops typing before pushing to the Next.js router
  React.useEffect(() => {
    const timeout = setTimeout(() => {
      // Only push to URL if the local state actually differs from the URL state
      if (query !== searchQuery || field !== (searchField || defaultField)) {
        setSearch(query, field)
      }
    }, 300)

    return () => clearTimeout(timeout)
  }, [query, field, searchQuery, searchField, defaultField, setSearch])

  return (
    <div className="flex items-center gap-2">
      {/* Field Selector */}
      <Select
        value={field}
        onValueChange={(value) => {
          if (value !== null) {
            setField(value)
          }
        }}
      >
        <SelectTrigger
          render={<Button variant="outline" className="h-8 w-[150px]" />}
        >
          <SelectValue placeholder="Select field" />
        </SelectTrigger>
        <SelectContent>
          {searchableColumns.map((col) => (
            <SelectItem key={col.id} value={col.id}>
              {col.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Search Input */}
      <div className="relative flex items-center">
        <HugeiconsIcon icon={Search} />
        <Input
          placeholder={`Search ${searchableColumns.find((c) => c.id === field)?.title}...`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-8 w-[250px] pr-8 pl-8"
        />
        {/* Clear Button */}
        {query.length > 0 && (
          <Button
            variant="ghost"
            onClick={() => setQuery("")}
            className="absolute right-0 h-8 w-8 p-0 hover:bg-transparent"
          >
            <HugeiconsIcon icon={X} />
          </Button>
        )}
      </div>
    </div>
  )
}
