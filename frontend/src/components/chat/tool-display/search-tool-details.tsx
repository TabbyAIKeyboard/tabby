'use client'

import { Database } from 'lucide-react'

interface SearchDetailsProps {
  data: any
}

export function TavilySearchDetails({ data }: SearchDetailsProps) {
  return (
    <div className="py-2 space-y-2">
      {data.answer && <p className="text-xs text-foreground/80">{data.answer}</p>}
      <div className="flex flex-wrap gap-1">
        {data.results?.slice(0, 4).map((result: any, i: number) => (
          <a
            key={i}
            href={result.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] px-2 py-1 rounded bg-muted/50 hover:bg-muted text-primary truncate max-w-[150px]"
          >
            {result.title}
          </a>
        ))}
      </div>
    </div>
  )
}

export function SupabaseQueryDetails({ data }: { data: any }) {
  const rows = Array.isArray(data) ? data : data?.data

  if (!rows || rows.length === 0) {
    return (
      <div className="py-2 text-xs text-muted-foreground">No data returned from the query.</div>
    )
  }

  const headers = Object.keys(rows[0])
  const displayRows = rows.slice(0, 5)

  return (
    <div className="py-2">
      <div className="overflow-x-auto rounded border border-border/50">
        <table className="min-w-full text-xs">
          <thead className="bg-muted/50">
            <tr>
              {headers.slice(0, 4).map((header) => (
                <th
                  key={header}
                  className="px-2 py-1 text-left text-[10px] font-medium text-muted-foreground uppercase"
                >
                  {header}
                </th>
              ))}
              {headers.length > 4 && (
                <th className="px-2 py-1 text-left text-[10px] font-medium text-muted-foreground">
                  +{headers.length - 4} more
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {displayRows.map((row: any, i: number) => (
              <tr key={i}>
                {headers.slice(0, 4).map((header) => (
                  <td
                    key={header}
                    className="px-2 py-1 text-muted-foreground truncate max-w-[100px]"
                  >
                    {typeof row[header] === 'object'
                      ? JSON.stringify(row[header]).slice(0, 20)
                      : String(row[header] ?? '').slice(0, 30)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > 5 && (
        <div className="text-[10px] text-muted-foreground mt-1">+{rows.length - 5} more rows</div>
      )}
    </div>
  )
}

export function getSearchToolSummary(toolName: string, data: any): string | null {
  if (!data) return null

  switch (toolName) {
    case 'tavilySearch':
      return `${data.results?.length || 0} results`
    case 'querySupabase': {
      const rows = Array.isArray(data) ? data : data?.data
      return `${rows?.length || 0} rows`
    }
    default:
      return null
  }
}
