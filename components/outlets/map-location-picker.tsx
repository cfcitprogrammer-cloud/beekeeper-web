"use client"

/* eslint-disable @next/next/no-img-element */

import * as React from "react"
import { LocateFixed, MapPin, Minus, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

const GRID = 3
const DEFAULT_LAT = 14.5995
const DEFAULT_LNG = 120.9842
const DRAG_THRESHOLD_PX = 3

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function lngToTileX(lng: number, zoom: number) {
  return ((lng + 180) / 360) * 2 ** zoom
}

function latToTileY(lat: number, zoom: number) {
  const radians = (clamp(lat, -85.05112878, 85.05112878) * Math.PI) / 180
  return (
    ((1 - Math.log(Math.tan(radians) + 1 / Math.cos(radians)) / Math.PI) / 2) *
    2 ** zoom
  )
}

function tileXToLng(x: number, zoom: number) {
  return (x / 2 ** zoom) * 360 - 180
}

function tileYToLat(y: number, zoom: number) {
  const n = Math.PI - (2 * Math.PI * y) / 2 ** zoom
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)))
}

function metersToPixels(radiusM: number, lat: number, zoom: number) {
  const metersPerPixel =
    (156543.03392 * Math.cos((lat * Math.PI) / 180)) / 2 ** zoom
  if (!Number.isFinite(metersPerPixel) || metersPerPixel <= 0) return 0
  return radiusM / metersPerPixel
}

type ViewCenter = { lat: number; lng: number }

export function MapLocationPicker({
  latitude,
  longitude,
  radiusM = 150,
  onChange,
  className,
}: {
  latitude: number | null | undefined
  longitude: number | null | undefined
  radiusM?: number
  onChange: (latitude: number, longitude: number) => void
  className?: string
}) {
  const lat = Number.isFinite(latitude) ? Number(latitude) : DEFAULT_LAT
  const lng = Number.isFinite(longitude) ? Number(longitude) : DEFAULT_LNG

  const [zoom, setZoom] = React.useState(15)
  const [viewCenter, setViewCenter] = React.useState<ViewCenter>({ lat, lng })
  const [latText, setLatText] = React.useState(lat.toFixed(6))
  const [lngText, setLngText] = React.useState(lng.toFixed(6))
  const [interaction, setInteraction] = React.useState<"idle" | "panning" | "pin">(
    "idle"
  )

  const mapRef = React.useRef<HTMLDivElement | null>(null)

  const gestureRef = React.useRef<{
    startX: number
    startY: number
    startCenterX: number
    startCenterY: number
    moved: boolean
  } | null>(null)
  const pinDragRef = React.useRef<{ moved: boolean } | null>(null)

  // Coordinates always come from the parent; the picker reports every change
  // back through onChange, so no local duplication/effects are needed.
  const externalLat = Number.isFinite(latitude) ? Number(latitude) : DEFAULT_LAT
  const externalLng = Number.isFinite(longitude) ? Number(longitude) : DEFAULT_LNG

  const centerX = lngToTileX(viewCenter.lng, zoom)
  const centerY = latToTileY(viewCenter.lat, zoom)
  const tileX = Math.floor(centerX)
  const tileY = Math.floor(centerY)
  const offset = Math.floor(GRID / 2)

  const pinTileX = lngToTileX(externalLng, zoom)
  const pinTileY = latToTileY(externalLat, zoom)
  // Pin position as a percentage of the 3x3 tile grid.
  const pinLeftPct = ((pinTileX - (tileX - offset)) / GRID) * 100
  const pinTopPct = ((pinTileY - (tileY - offset)) / GRID) * 100
  const pinInView =
    pinLeftPct >= 0 && pinLeftPct <= 100 && pinTopPct >= 0 && pinTopPct <= 100

  function emitPin(nextLat: number, nextLng: number, recenter = false) {
    const safeLat = clamp(nextLat, -85.05112878, 85.05112878)
    const safeLng = clamp(nextLng, -180, 180)
    setLatText(safeLat.toFixed(6))
    setLngText(safeLng.toFixed(6))
    if (recenter) setViewCenter({ lat: safeLat, lng: safeLng })
    onChange(Number(safeLat.toFixed(6)), Number(safeLng.toFixed(6)))
  }

  function pointToLatLng(clientX: number, clientY: number) {
    const rect = mapRef.current?.getBoundingClientRect()
    if (!rect) return null
    const x = (clientX - rect.left) / rect.width
    const y = (clientY - rect.top) / rect.height
    const globalX = tileX - offset + x * GRID
    const globalY = tileY - offset + y * GRID
    return { lat: tileYToLat(globalY, zoom), lng: tileXToLng(globalX, zoom) }
  }

  function isControlTarget(target: EventTarget | null) {
    return (
      target instanceof HTMLElement &&
      Boolean(target.closest("button,a,input,[data-map-control]"))
    )
  }

  function onMapPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (isControlTarget(event.target)) return
    if (event.button !== undefined && event.button !== 0) return
    gestureRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      startCenterX: lngToTileX(viewCenter.lng, zoom),
      startCenterY: latToTileY(viewCenter.lat, zoom),
      moved: false,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function onMapPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const gesture = gestureRef.current
    const rect = mapRef.current?.getBoundingClientRect()
    if (!gesture || !rect) return

    const dx = event.clientX - gesture.startX
    const dy = event.clientY - gesture.startY

    if (!gesture.moved) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return
      gesture.moved = true
      setInteraction("panning")
    }

    const tilePixelsX = rect.width / GRID
    const tilePixelsY = rect.height / GRID
    const nextCenterX = gesture.startCenterX - dx / tilePixelsX
    const nextCenterY = gesture.startCenterY - dy / tilePixelsY

    setViewCenter({
      lat: clamp(tileYToLat(nextCenterY, zoom), -85.05112878, 85.05112878),
      lng: clamp(tileXToLng(nextCenterX, zoom), -180, 180),
    })
  }

  function onMapPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    const gesture = gestureRef.current
    gestureRef.current = null
    setInteraction("idle")

    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      // ignore
    }

    if (!gesture || gesture.moved) return
    // A simple click (not a drag) drops the pin exactly where the user clicked.
    // The viewport intentionally stays put so the map does not jump.
    const point = pointToLatLng(event.clientX, event.clientY)
    if (point) emitPin(point.lat, point.lng)
  }

  function onPinPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.stopPropagation()
    event.preventDefault()
    pinDragRef.current = { moved: false }
    setInteraction("pin")
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function onPinPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!pinDragRef.current) return
    const point = pointToLatLng(event.clientX, event.clientY)
    if (!point) return
    pinDragRef.current.moved = true
    emitPin(point.lat, point.lng)
  }

  function onPinPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    pinDragRef.current = null
    setInteraction("idle")
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      // ignore
    }
  }

  function commitInputs(nextLat: string, nextLng: string) {
    setLatText(nextLat)
    setLngText(nextLng)
    const parsedLat = Number(nextLat)
    const parsedLng = Number(nextLng)
    if (
      Number.isFinite(parsedLat) &&
      parsedLat >= -90 &&
      parsedLat <= 90 &&
      Number.isFinite(parsedLng) &&
      parsedLng >= -180 &&
      parsedLng <= 180
    ) {
      setViewCenter({ lat: parsedLat, lng: parsedLng })
      onChange(parsedLat, parsedLng)
    }
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (position) =>
        emitPin(position.coords.latitude, position.coords.longitude, true),
      () => undefined,
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  const circleRadiusPx = metersToPixels(radiusM, externalLat, zoom)
  const circleDiameter = Math.max(0, circleRadiusPx * 2)

  return (
    <div className={cn("space-y-2", className)}>
      <div className="mx-auto w-full max-w-md overflow-hidden rounded-lg border">
        <div
          ref={mapRef}
          className={cn(
            "relative aspect-square w-full touch-none select-none",
            interaction === "idle" ? "cursor-grab" : "cursor-grabbing"
          )}
          onPointerDown={onMapPointerDown}
          onPointerMove={onMapPointerMove}
          onPointerUp={onMapPointerUp}
          onPointerCancel={onMapPointerUp}
        >
          <div className="grid h-full w-full grid-cols-3 grid-rows-3">
            {Array.from({ length: GRID * GRID }, (_, index) => {
              const dx = (index % GRID) - offset
              const dy = Math.floor(index / GRID) - offset
              const tx = tileX + dx
              const ty = tileY + dy
              return (
                <div key={`${zoom}-${tx}-${ty}`} className="overflow-hidden">
                  <img
                    src={`https://tile.openstreetmap.org/${zoom}/${tx}/${ty}.png`}
                    alt=""
                    draggable={false}
                    className="pointer-events-none block size-full object-fill"
                    loading="lazy"
                  />
                </div>
              )
            })}
          </div>

          {circleDiameter > 0 ? (
            <div
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary/70 bg-primary/15"
              style={{
                left: `${pinLeftPct}%`,
                top: `${pinTopPct}%`,
                width: circleDiameter,
                height: circleDiameter,
              }}
              aria-hidden="true"
            />
          ) : null}

          <div
            className="absolute -translate-x-1/2 -translate-y-full cursor-grab touch-none p-2 -m-2 text-primary drop-shadow"
            style={{ left: `${pinLeftPct}%`, top: `${pinTopPct}%` }}
            onPointerDown={onPinPointerDown}
            onPointerMove={onPinPointerMove}
            onPointerUp={onPinPointerUp}
            onPointerCancel={onPinPointerUp}
            role="button"
            tabIndex={0}
            aria-label="Drag outlet pin"
            data-map-control
          >
            <MapPin className="size-7 fill-primary/20" />
          </div>

          <div className="absolute top-2 right-2 flex flex-col gap-1" data-map-control>
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              className="bg-background/90"
              onClick={() => setZoom((value) => Math.min(19, value + 1))}
              aria-label="Zoom in"
            >
              <Plus />
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              className="bg-background/90"
              onClick={() => setZoom((value) => Math.max(3, value - 1))}
              aria-label="Zoom out"
            >
              <Minus />
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              className="bg-background/90"
              onClick={useCurrentLocation}
              aria-label="Use my current location"
            >
              <LocateFixed />
            </Button>
          </div>

          {!pinInView ? (
            <button
              type="button"
              data-map-control
              className="absolute bottom-2 left-2 rounded bg-background/90 px-2 py-1 text-[0.625rem] font-medium text-foreground shadow-sm"
              onClick={() => setViewCenter({ lat: externalLat, lng: externalLng })}
            >
              Recenter on pin
            </button>
          ) : null}

          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer"
            data-map-control
            className="absolute right-1 bottom-1 rounded bg-background/80 px-1 text-[0.5rem] text-muted-foreground"
          >
            © OpenStreetMap
          </a>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="map-latitude">Latitude (X)</Label>
          <Input
            id="map-latitude"
            value={latText}
            onChange={(event) => commitInputs(event.target.value, lngText)}
            inputMode="decimal"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="map-longitude">Longitude (Y)</Label>
          <Input
            id="map-longitude"
            value={lngText}
            onChange={(event) => commitInputs(latText, event.target.value)}
            inputMode="decimal"
          />
        </div>
      </div>
      <p className="text-[0.625rem] text-muted-foreground">
        Drag the pin to move the outlet pin, click the map to drop it, or drag the
        map to pan. The circle shows the geofence radius.
      </p>
    </div>
  )
}
