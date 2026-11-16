"use client"

import * as React from "react"

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import type { ProductionSkuSummary } from "@/lib/data/operations"
import { formatNumber } from "@/lib/format"

/**
 * Stage SKU lists can reach a thousand entries, so the picker only mounts a
 * capped slice of the matches at a time. Typing narrows the list further.
 */
const MAX_VISIBLE_ITEMS = 40

function skuLabel(sku: ProductionSkuSummary) {
  return `${sku.sku_code} · ${sku.name}`
}

function skuSearchText(sku: ProductionSkuSummary) {
  return [sku.sku_code, sku.name, sku.brand, sku.uom]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
}

function filterSku(sku: ProductionSkuSummary, query: string) {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return true
  const haystack = skuSearchText(sku)
  return tokens.every((token) => haystack.includes(token))
}

export function SkuCombobox({
  skus,
  value,
  onChange,
  usedIds,
  placeholder = "Search SKU code or name…",
  disabled = false,
  ariaLabel,
}: {
  skus: ProductionSkuSummary[]
  value: string
  onChange: (skuId: string) => void
  /** IDs already picked on other lines; they stay visible but can't be re-picked. */
  usedIds?: ReadonlySet<string>
  placeholder?: string
  disabled?: boolean
  ariaLabel?: string
}) {
  const selected = React.useMemo(
    () => skus.find((sku) => sku.id === value) ?? null,
    [skus, value]
  )

  return (
    <Combobox
      items={skus}
      value={selected}
      onValueChange={(next) =>
        onChange((next as ProductionSkuSummary | null)?.id ?? "")
      }
      isItemEqualToValue={(item, current) => item.id === current.id}
      itemToStringLabel={skuLabel}
      filter={filterSku}
      limit={MAX_VISIBLE_ITEMS}
      autoHighlight
      disabled={disabled}
    >
      <ComboboxInput
        className="w-full"
        placeholder={placeholder}
        aria-label={ariaLabel}
        showClear={Boolean(selected)}
        disabled={disabled}
      />
      <ComboboxContent>
        <ComboboxList>
          {(sku: ProductionSkuSummary) => {
            const alreadyUsed =
              sku.id !== value && Boolean(usedIds?.has(sku.id))

            return (
              <ComboboxItem
                key={sku.id}
                value={sku}
                disabled={alreadyUsed}
                className="items-center pr-7"
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate">{sku.name}</span>
                  <span className="truncate font-mono text-[0.5625rem] text-muted-foreground">
                    {sku.sku_code}
                    {sku.brand ? ` · ${sku.brand}` : ""}
                  </span>
                </span>
                <span className="ml-2 shrink-0 rounded-sm bg-muted px-1 py-0.5 text-[0.5625rem] text-muted-foreground">
                  {alreadyUsed ? "Added" : sku.uom}
                </span>
              </ComboboxItem>
            )
          }}
        </ComboboxList>
        <ComboboxEmpty>No SKU matches your search.</ComboboxEmpty>
        {skus.length > MAX_VISIBLE_ITEMS ? (
          <div className="border-t px-2 py-1.5 text-[0.5625rem] text-muted-foreground">
            {formatNumber(skus.length)} stage SKUs · up to{" "}
            {MAX_VISIBLE_ITEMS} matches shown at a time — keep typing to narrow
            the list.
          </div>
        ) : null}
      </ComboboxContent>
    </Combobox>
  )
}
