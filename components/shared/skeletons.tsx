import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"

export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-8 w-32" />
      </div>
      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="flex h-9 items-center gap-4 border-b bg-muted/40 px-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-3 flex-1" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, index) => (
          <div
            key={index}
            className="flex h-11 items-center gap-4 border-b px-3 last:border-0"
          >
            {Array.from({ length: 6 }).map((_, cell) => (
              <Skeleton
                key={cell}
                className="h-3 flex-1"
                style={{ opacity: 1 - index * 0.05 }}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-48" />
        <Skeleton className="h-7 w-36" />
      </div>
    </div>
  )
}

export function MetricsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="gap-0 py-4">
          <CardContent className="flex items-start justify-between">
            <div className="w-full space-y-2">
              <Skeleton className="h-2.5 w-24" />
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-2.5 w-32" />
            </div>
            <Skeleton className="size-9 rounded-lg" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function PageSkeleton() {
  return (
    <div className="space-y-5 p-1">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-3 w-80" />
        </div>
        <Skeleton className="h-8 w-32" />
      </div>
      <MetricsSkeleton />
      <TableSkeleton />
    </div>
  )
}
