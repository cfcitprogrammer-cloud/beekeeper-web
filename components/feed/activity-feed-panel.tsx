"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Activity,
  ArrowLeftRight,
  CircleDot,
  LogIn,
  LogOut,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { NativeSelect } from "@/components/ui/native-select"
import { toast } from "@/components/ui/toast"
import { formatRelative, humanize } from "@/lib/format"
import type { FeedItem } from "@/actions/feed.action"

const actionIcons: Record<string, React.ElementType> = {
  create: Plus,
  update: Pencil,
  delete: Trash2,
  check_in: LogIn,
  check_out: LogOut,
  import: ArrowLeftRight,
  cancel: CircleDot,
}

const actionTones: Record<string, string> = {
  create: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  update: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  delete: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  check_in: "bg-primary/10 text-primary",
  check_out: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  import: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  cancel: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
}

export function ActivityFeedPanel({ items }: { items: FeedItem[] }) {
  const router = useRouter()
  const [entity, setEntity] = React.useState("all")
  const [refreshing, setRefreshing] = React.useState(false)

  const entities = React.useMemo(
    () => Array.from(new Set(items.map((item) => item.entity_type))).sort(),
    [items]
  )

  const filtered = React.useMemo(
    () =>
      entity === "all"
        ? items
        : items.filter((item) => item.entity_type === entity),
    [entity, items]
  )

  function refresh() {
    setRefreshing(true)
    router.refresh()
    setTimeout(() => {
      setRefreshing(false)
      toast.add({
        type: "success",
        title: "Activity refreshed",
        description: "The latest recorded operations were loaded.",
      })
    }, 600)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2">
          <Activity className="size-4 text-primary" />
          Activity feed
        </CardTitle>
        <div className="flex items-center gap-2">
          <NativeSelect
            value={entity}
            onChange={(event) => setEntity(event.target.value)}
            aria-label="Filter activity by entity"
            className="h-8"
          >
            <option value="all">All entities</option>
            {entities.map((value) => (
              <option key={value} value={value}>
                {humanize(value)}
              </option>
            ))}
          </NativeSelect>
          <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing}>
            <RefreshCw className={refreshing ? "animate-spin" : undefined} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <p className="rounded-md border border-dashed p-6 text-center text-xs text-muted-foreground">
            No activity recorded yet. Creating employees, outlets, plans, expenses
            or production entries will appear here.
          </p>
        ) : (
          <ul className="divide-y">
            {filtered.map((item) => {
              const Icon = actionIcons[item.action] ?? CircleDot
              const tone =
                actionTones[item.action] ??
                "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400"
              return (
                <li key={item.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <span
                    className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full ${tone}`}
                  >
                    <Icon className="size-3.5" />
                  </span>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="text-xs font-medium">{item.summary}</p>
                    <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[0.625rem] text-muted-foreground">
                      <span>{item.actor_name ?? "System"}</span>
                      <span aria-hidden>·</span>
                      <span>{humanize(item.action)}</span>
                      <span aria-hidden>·</span>
                      <span>{humanize(item.entity_type)}</span>
                    </p>
                  </div>
                  <span className="shrink-0 text-[0.625rem] text-muted-foreground">
                    {formatRelative(item.created_at)}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
