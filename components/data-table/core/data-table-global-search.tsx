"use client"

import * as React from "react"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useUrlTableState } from "@/hooks/use-url-table-state"
import { HugeiconsIcon } from "@hugeicons/react"
import { Search, X } from "@hugeicons/core-free-icons"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"

interface DataTableGlobalSearchProps {
  placeholder?: string
}

export function DataTableGlobalSearch({
  placeholder = "Search all columns...",
}: DataTableGlobalSearchProps) {
  // 1. Hook into your unified URL state
  const { globalFilter, setGlobalFilter } = useUrlTableState()

  // 2. Local state for immediate typing feedback
  const [query, setQuery] = React.useState(globalFilter)

  // 3. Sync local state if the URL changes externally (e.g., Back button)
  React.useEffect(() => {
    setQuery(globalFilter)
  }, [globalFilter])

  // --- DEBOUNCE LOGIC ---
  React.useEffect(() => {
    const timeout = setTimeout(() => {
      // Only push to URL if the local state actually differs
      if (query !== globalFilter) {
        setGlobalFilter(query)
      }
    }, 300)

    return () => clearTimeout(timeout)
  }, [query, globalFilter, setGlobalFilter])

  return (
    <InputGroup className="max-w-xs">
      <InputGroupInput
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <InputGroupAddon>
        <HugeiconsIcon icon={Search} />
      </InputGroupAddon>
      <InputGroupAddon align={"inline-end"}>
        {query.length > 0 && (
          <Button
            variant="ghost"
            onClick={() => setQuery("")}
            className="absolute right-0 h-8 w-8 p-0 hover:bg-transparent"
          >
            <HugeiconsIcon icon={X} />
          </Button>
        )}
      </InputGroupAddon>
    </InputGroup>
  )
}
