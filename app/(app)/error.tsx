"use client"

import { AlertTriangle, RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
          <span className="flex size-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="size-5" />
          </span>
          <div className="space-y-1">
            <h2 className="font-heading text-sm font-semibold">
              This view could not be loaded
            </h2>
            <p className="text-xs text-muted-foreground">
              {error.message || "An unexpected error occurred while loading data."}
            </p>
          </div>
          <Button onClick={reset} className="mt-1">
            <RotateCcw />
            Try again
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
