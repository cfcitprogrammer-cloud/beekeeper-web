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

export function MapLocationPicker({
  latitude,
  longitude,
  onChange,
  className,
}: {
  latitude: number | null | undefined
  longitude: number | null | undefined
  onChange: (latitude: number, longitude: number) => void
  className?: string
}) {
  const lat = Number.isFinite(latitude) ? Number(latitude) : DEFAULT_LAT
  const lng = Number.isFinite(longitude) ? Number(longitude) : DEFAULT_LNG
  const [zoom, setZoom] = React.useState(15)
  const [center, setCenter] = React.useState({ lat, lng })
  const [latText, setLatText] = React.useState(String(lat))
  const [lngText, setLngText] = React.useState(String(lng))

  const centerX = lngToTileX(center.lng, zoom)
  const centerY = latToTileY(center.lat, zoom)
  const tileX = Math.floor(centerX)
  const tileY = Math.floor(centerY)
  const offset = Math.floor(GRID / 2)

  function pick(latValue: number, lngValue: number) {
    const safeLat = clamp(latValue, -85.05112878, 85.05112878)
    const safeLng = clamp(lngValue, -180, 180)
    setCenter({ lat: safeLat, lng: safeLng })
    setLatText(safeLat.toFixed(6))
    setLngText(safeLng.toFixed(6))
    onChange(Number(safeLat.toFixed(6)), Number(safeLng.toFixed(6)))
  }

  function handleTileClick(
    event: React.MouseEvent<HTMLButtonElement>,
    clickedTileX: number,
    clickedTileY: number
  ) {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width
    const y = (event.clientY - rect.top) / rect.height
    const globalX = clickedTileX + x
    const globalY = clickedTileY + y
    pick(tileYToLat(globalY, zoom), tileXToLng(globalX, zoom))
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
      setCenter({ lat: parsedLat, lng: parsedLng })
      onChange(parsedLat, parsedLng)
    }
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (position) => pick(position.coords.latitude, position.coords.longitude),
      () => undefined,
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="overflow-hidden rounded-lg border">
        <div className="relative">
          <div className="grid grid-cols-3">
            {Array.from({ length: GRID * GRID }, (_, index) => {
              const dx = (index % GRID) - offset
              const dy = Math.floor(index / GRID) - offset
              const tx = tileX + dx
              const ty = tileY + dy
              return (
                <button
                  key={`${zoom}-${tx}-${ty}`}
                  type="button"
                  className="relative aspect-square cursor-crosshair overflow-hidden border-0 p-0"
                  onClick={(event) => handleTileClick(event, tx, ty)}
                  aria-label="Pick this location on the map"
                >
                  <img
                    src={`https://tile.openstreetmap.org/${zoom}/${tx}/${ty}.png`}
                    alt=""
                    draggable={false}
                    className="pointer-events-none size-full object-cover"
                    loading="lazy"
                  />
                </button>
              )
            })}
          </div>

          <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full text-primary drop-shadow">
            <MapPin className="size-7 fill-primary/20" />
          </div>

          <div className="absolute top-2 right-2 flex flex-col gap-1">
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

          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer"
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
        Click the map to drop the outlet pin, or enter exact coordinates.
      </p>
    </div>
  )
}
