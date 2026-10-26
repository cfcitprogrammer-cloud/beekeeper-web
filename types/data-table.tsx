export type FilterPayload =
  | {
      operator: "range"
      min: number | string | null
      max: number | string | null
    }
  | { operator: "in"; values: string[] }
  | { operator: "eq"; value: string | number }
  | { operator: "ilike"; value: string }
  | string // Fallback for raw text input

export interface CustomColumnMeta {
  filterVariant?: "number-range" | "date-range" | "date" | "checkbox" | "text"
  filterOptions?: { label: string; value: string }[]
  filterName?: string // Optional: Name to display for the filter
}

export type FetchParams = {
  pageIndex: number
  pageSize: number
  globalFilter?: string
  sorting?: { id: string; desc: boolean }[]
  columnFilters?: { id: string; value: FilterPayload }[]
}
