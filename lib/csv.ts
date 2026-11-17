/** Small helpers for RFC 4180-compatible CSV import/export. */

export function escapeCsv(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value)
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

export function toCsv(
  headers: readonly string[],
  rows: (string | number | null | undefined)[][]
) {
  return [
    headers.join(","),
    ...rows.map((row) => row.map(escapeCsv).join(",")),
  ].join("\r\n")
}

/**
 * RFC 4180-compatible parser with quoted fields, escaped quotes and newlines.
 */
export function parseCsv(input: string): string[][] {
  const text = input.replace(/^\uFEFF/, "")
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]

    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"'
          index += 1
        } else {
          quoted = false
        }
      } else {
        field += char
      }
      continue
    }

    if (char === '"') {
      quoted = true
    } else if (char === ",") {
      row.push(field)
      field = ""
    } else if (char === "\n") {
      row.push(field.replace(/\r$/, ""))
      field = ""
      if (row.some((value) => value.trim() !== "")) rows.push(row)
      row = []
    } else {
      field += char
    }
  }

  row.push(field.replace(/\r$/, ""))
  if (row.some((value) => value.trim() !== "")) rows.push(row)

  return rows
}

export function headerMap(headerRow: string[]) {
  const map = new Map<string, number>()
  headerRow.forEach((value, index) => {
    map.set(value.trim().toLowerCase().replace(/\s+/g, "_"), index)
  })
  return map
}

export function cell(
  row: string[],
  map: Map<string, number>,
  key: string
) {
  const index = map.get(key)
  if (index === undefined) return ""
  return (row[index] ?? "").trim()
}
