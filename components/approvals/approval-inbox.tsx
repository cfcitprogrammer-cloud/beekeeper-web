"use client"

import * as React from "react"
import Link from "next/link"
import { Check, Clock3, Package, ShoppingCart, Store } from "lucide-react"

import { StatusBadge } from "@/components/shared/status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { NativeSelect } from "@/components/ui/native-select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatCurrency, formatDateTime, formatRelative } from "@/lib/format"
import type { ApprovalDocumentType, ApprovalHistoryItem, MyPendingApproval } from "@/types/database"

const documentIcon: Record<ApprovalDocumentType, typeof Package> = { BOOKING: ShoppingCart, OUTLET: Store }
const documentLabel: Record<ApprovalDocumentType, string> = { BOOKING: "Booking", OUTLET: "Outlet onboarding" }

export function ApprovalInbox({ pending, history }: { pending: MyPendingApproval[]; history: ApprovalHistoryItem[] }) {
  const [type, setType] = React.useState("all")
  const filtered = React.useMemo(() => pending.filter((approval) => (type === "all" ? true : approval.document_type === type)), [pending, type])

  return (
    <Tabs defaultValue="pending" className="gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TabsList>
          <TabsTrigger value="pending">Pending<Badge variant="secondary" className="ml-1 h-4 px-1 text-[0.5625rem]">{pending.length}</Badge></TabsTrigger>
          <TabsTrigger value="history">History<Badge variant="secondary" className="ml-1 h-4 px-1 text-[0.5625rem]">{history.length}</Badge></TabsTrigger>
        </TabsList>
        <NativeSelect value={type} onChange={(event) => setType(event.target.value)} aria-label="Filter by document type">
          <option value="all">All document types</option>
          {Object.entries(documentLabel).map(([value, label]) => (<option key={value} value={value}>{label}</option>))}
        </NativeSelect>
      </div>

      <TabsContent value="pending" className="space-y-3">
        {filtered.length === 0 ? (
          <Card><CardContent className="flex flex-col items-center gap-2 py-14 text-center"><Check className="size-7 text-emerald-500" /><p className="text-sm font-medium">Inbox zero</p><p className="max-w-sm text-xs text-muted-foreground">There are no documents waiting for your decision. New requests will appear here as they are routed to your stage.</p></CardContent></Card>
        ) : filtered.map((approval) => {
          const Icon = documentIcon[approval.document_type]
          return (
            <Card key={approval.request_stage_id}>
              <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="size-4" /></span>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2"><p className="text-xs font-semibold">{approval.title}</p><Badge variant="outline" className="text-[0.5625rem]">{documentLabel[approval.document_type]}</Badge></div>
                  <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[0.625rem] text-muted-foreground"><span className="font-mono">{approval.document_no}</span><span>·</span><span>{approval.requested_by_name}</span><span>·</span><span className="inline-flex items-center gap-1"><Clock3 className="size-2.5" />{formatRelative(approval.submitted_at)}</span></p>
                  <div className="flex flex-wrap items-center gap-2 pt-1"><Badge variant="secondary" className="text-[0.5625rem]">Stage {approval.stage_sequence}: {approval.stage_name}</Badge>{approval.amount > 0 && <span className="text-[0.6875rem] font-medium tabular-nums">{formatCurrency(approval.amount)}</span>}</div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {approval.document_type === "BOOKING" && <Button variant="ghost" size="sm" render={<Link href={`/bookings/${approval.document_id}`} />}>Open document</Button>}
                  <Button variant="outline" size="sm" render={<Link href={`/approvals/inbox/${approval.request_stage_id}`} />}>Review</Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </TabsContent>

      <TabsContent value="history">
        <Card>
          <CardHeader className="border-b pb-3"><CardTitle>Decision history</CardTitle><CardDescription>Recently completed approval requests across the workspace.</CardDescription></CardHeader>
          <CardContent className="pt-0">
            <div className="divide-y">
              {history.length === 0 ? <p className="py-8 text-center text-xs text-muted-foreground">No completed approvals yet.</p> : history.map((item) => {
                const Icon = documentIcon[item.document_type]
                return (
                  <div key={`${item.id}-${item.completed_at}`} className="flex items-center gap-3 py-2.5 first:pt-1 last:pb-1">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"><Icon className="size-3.5" /></span>
                    <div className="min-w-0 flex-1"><p className="truncate text-xs font-medium">{item.title}</p><p className="text-[0.625rem] text-muted-foreground">{item.document_no} · {item.requested_by_name} · {formatDateTime(item.completed_at)}</p></div>
                    {item.amount > 0 && <span className="hidden text-[0.6875rem] font-medium tabular-nums sm:block">{formatCurrency(item.amount)}</span>}
                    <StatusBadge status={item.status} />
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
