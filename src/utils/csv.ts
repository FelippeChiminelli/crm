export interface CsvSerializeOptions {
  delimiter?: string
  header?: boolean
}

export function toCsv<T extends Record<string, any>>(rows: T[], options: CsvSerializeOptions = {}): string {
  const delimiter = options.delimiter ?? ','
  const includeHeader = options.header ?? true
  if (!rows || rows.length === 0) return ''

  const headers = Object.keys(rows[0])
  const escapeCell = (value: any): string => {
    if (value === null || value === undefined) return ''
    const str = String(value)
    const needsQuote = str.includes(delimiter) || str.includes('"') || str.includes('\n') || str.includes('\r')
    const escaped = str.replace(/"/g, '""')
    return needsQuote ? `"${escaped}"` : escaped
  }

  const lines: string[] = []
  if (includeHeader) {
    lines.push(headers.map(escapeCell).join(delimiter))
  }
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCell(row[h])).join(delimiter))
  }
  return lines.join('\n')
}

export function parseCsv(content: string, delimiter = ','): { headers: string[]; rows: Record<string, string>[] } {
  const lines = content.split(/\r?\n/).filter(l => l.length > 0)
  if (lines.length === 0) return { headers: [], rows: [] }

  const parseLine = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (inQuotes) {
        if (char === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            current += '"'
            i++
          } else {
            inQuotes = false
          }
        } else {
          current += char
        }
      } else {
        if (char === '"') {
          inQuotes = true
        } else if (char === delimiter) {
          result.push(current)
          current = ''
        } else {
          current += char
        }
      }
    }
    result.push(current)
    return result
  }

  const headers = parseLine(lines[0])
  const rows: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i])
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => {
      row[h] = cols[idx] ?? ''
    })
    rows.push(row)
  }
  return { headers, rows }
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}


