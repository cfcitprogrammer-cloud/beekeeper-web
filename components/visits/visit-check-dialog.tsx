"use client"

import * as React from "react"
import { Crosshair, LogIn, LogOut, RefreshCw } from "lucide-react"

import { checkInVisit, checkOutVisit } from "@/actions/visit.action"
import { uploadVisitPhoto } from "@/actions/visit-photo.action"
import { Modal } from "@/components/shared/modal"
import { PhotoCapture } from "@/components/visits/photo-capture"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/toast"
import { formatDate, formatTimeRange } from "@/lib/format"
import type { VisitWithRelations } from "@/lib/data/operations"

export type VisitCheckMode = "check_in" | "check_out"

type GpsState =
  | { status: "locating" }
  | { status: "ready"; latitude: number; longitude: number }
  | { status: "error"; error: string }

function gpsErrorMessage(error: GeolocationPositionError) {
  if (error.code === error.PERMISSION_DENIED) {
    return "Location permission was denied. Allow GPS access to check in or out."
  }
  if (error.code === error.POSITION_UNAVAILABLE) {
    return "GPS location is unavailable on this device."
  }
  if (error.code === error.TIMEOUT) {
    return "Timed out while waiting for a GPS fix."
  }
  return error.message || "Could not read the GPS location."
}

function currentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    })
  })
}

export function VisitCheckDialog({
  visit,
  mode,
  open,
  onOpenChange,
  onCompleted,
}: {
  visit: VisitWithRelations | null
  mode: VisitCheckMode
  open: boolean
  onOpenChange: (open: boolean) => void
  onCompleted: () => void
}) {
  const [saving, setSaving] = React.useState(false)
  const [photo, setPhoto] = React.useState<File | null>(null)
  const [gps, setGps] = React.useState<GpsState>({ status: "locating" })
  const [notes, setNotes] = React.useState(visit?.notes ?? "")

  const isCheckIn = mode === "check_in"

  const readGps = React.useCallback(() => {
    if (!navigator.geolocation) {
      setGps({
        status: "error",
        error: "This device does not provide a geolocation API.",
      })
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGps({
          status: "ready",
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
      },
      (error) => {
        setGps({ status: "error", error: gpsErrorMessage(error) })
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }, [])

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      readGps()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [readGps])

  function retryGps() {
    setGps({ status: "locating" })
    readGps()
  }

  async function submit() {
    if (!visit) return
    if (!photo) {
      toast.add({
        type: "error",
        title: `${isCheckIn ? "Check-in" : "Check-out"} photo required`,
        description: "Capture a live photo before continuing.",
      })
      return
    }
    if (!navigator.geolocation) {
      toast.add({
        type: "error",
        title: "GPS location required",
        description: "This device does not provide a geolocation API.",
      })
      return
    }

    setSaving(true)

    let position: GeolocationPosition
    try {
      position = await currentPosition()
      setGps({
        status: "ready",
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      })
    } catch (error) {
      setSaving(false)
      const message = gpsErrorMessage(error as GeolocationPositionError)
      setGps({ status: "error", error: message })
      toast.add({
        type: "error",
        title: "Could not read GPS location",
        description: message,
      })
      return
    }

    const formData = new FormData()
    formData.set("visitId", visit.id)
    formData.set("kind", mode)
    formData.set("file", photo)

    const upload = await uploadVisitPhoto(formData)
    if (!upload.success) {
      setSaving(false)
      toast.add({
        type: "error",
        title: "Could not upload photo",
        description: upload.error,
      })
      return
    }

    const payload = {
      visitId: visit.id,
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      photoPath: upload.data.path,
      notes,
    }

    const result = isCheckIn
      ? await checkInVisit(payload)
      : await checkOutVisit(payload)

    setSaving(false)

    if (!result.success) {
      toast.add({
        type: "error",
        title: isCheckIn ? "Could not check in" : "Could not check out",
        description: result.error,
      })
      return
    }

    toast.add({
      type: "success",
      title: isCheckIn ? "Visit checked in" : "Visit checked out",
    })
    onOpenChange(false)
    onCompleted()
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={isCheckIn ? "Check in to visit" : "Check out of visit"}
      description={
        visit
          ? `${visit.outlet?.name ?? "Outlet"} · ${formatDate(visit.start_date)} → ${formatDate(visit.end_date)}${
              visit.start_time || visit.end_time
                ? ` · ${formatTimeRange(visit.start_time, visit.end_time)}`
                : ""
            }`
          : undefined
      }
      size="md"
      footer={
        <>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            {isCheckIn ? <LogIn /> : <LogOut />}
            {saving
              ? isCheckIn
                ? "Checking in…"
                : "Checking out…"
              : isCheckIn
                ? "Check in"
                : "Check out"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <PhotoCapture
          id={`visit-${mode}-photo`}
          label={`${isCheckIn ? "Check-in" : "Check-out"} photo`}
          file={photo}
          onChange={setPhoto}
          disabled={saving}
        />

        <div className="space-y-2 rounded-md border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-xs font-medium">
              <Crosshair className="size-3.5" />
              GPS location
              <span className="text-destructive">*</span>
            </span>
            {gps.status === "locating" ? (
              <span className="text-[0.625rem] text-muted-foreground">
                Acquiring GPS…
              </span>
            ) : gps.status === "ready" ? (
              <span className="text-[0.625rem] font-medium text-emerald-600 dark:text-emerald-400">
                GPS locked
              </span>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={retryGps}
                disabled={saving}
              >
                <RefreshCw />
                Retry GPS
              </Button>
            )}
          </div>

          {gps.status === "ready" ? (
            <p className="text-[0.625rem] text-muted-foreground">
              {gps.latitude.toFixed(7)}, {gps.longitude.toFixed(7)}
            </p>
          ) : gps.status === "error" ? (
            <p className="text-[0.625rem] text-destructive">{gps.error}</p>
          ) : (
            <p className="text-[0.625rem] text-muted-foreground">
              Waiting for a GPS fix from the device.
            </p>
          )}

          <p className="text-[0.625rem] text-muted-foreground">
            The location is read automatically from the device GPS when you
            submit. Manual entry is not allowed.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`visit-${mode}-notes`}>Notes</Label>
          <Input
            id={`visit-${mode}-notes`}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Optional notes"
          />
        </div>
      </div>
    </Modal>
  )
}
