"use client"

import * as React from "react"
import { Camera, RefreshCw, VideoOff } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

type CameraState = "starting" | "ready" | "error"

export function PhotoCapture({
  id,
  label,
  file,
  onChange,
  disabled,
}: {
  id: string
  label: string
  file: File | null
  onChange: (file: File | null) => void
  disabled?: boolean
}) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null)
  const streamRef = React.useRef<MediaStream | null>(null)
  const [stream, setStream] = React.useState<MediaStream | null>(null)
  const [state, setState] = React.useState<CameraState>("starting")
  const [error, setError] = React.useState<string | null>(null)

  const preview = React.useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file]
  )

  React.useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  const releaseCamera = React.useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setStream(null)
  }, [])

  const startCamera = React.useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("This device does not provide a camera API.")
      }

      let media: MediaStream
      try {
        media = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        })
      } catch {
        // Some desktop cameras cannot satisfy facingMode.
        media = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        })
      }

      streamRef.current = media
      setStream(media)
      setState("ready")
      setError(null)
    } catch (cameraError) {
      streamRef.current = null
      setStream(null)
      setState("error")
      setError(
        cameraError instanceof Error
          ? cameraError.message
          : "Could not start the camera."
      )
    }
  }, [])

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      void startCamera()
    }, 0)
    return () => {
      window.clearTimeout(timer)
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [startCamera])

  React.useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  function retryCamera() {
    setState("starting")
    setError(null)
    void startCamera()
  }

  function capturePhoto() {
    const video = videoRef.current
    if (!video || video.videoWidth === 0) {
      setError("The camera is not ready yet. Wait a moment and try again.")
      setState("error")
      return
    }

    const canvas = document.createElement("canvas")
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const context = canvas.getContext("2d")
    if (!context) {
      setError("Could not capture the camera frame.")
      setState("error")
      return
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError("Could not capture the camera frame.")
          setState("error")
          return
        }
        onChange(
          new File([blob], `visit-${Date.now()}.jpg`, { type: "image/jpeg" })
        )
        releaseCamera()
      },
      "image/jpeg",
      0.9
    )
  }

  function retake() {
    onChange(null)
    setState("starting")
    setError(null)
    void startCamera()
  }

  return (
    <div id={id} className="space-y-2 rounded-md border p-3">
      <div>
        <Label className="flex items-center gap-1.5">
          <Camera className="size-3.5" />
          {label}
          <span className="text-destructive">*</span>
        </Label>
        <p className="mt-1 text-[0.625rem] text-muted-foreground">
          The photo is captured live from the device camera. File uploads are
          not allowed.
        </p>
      </div>

      {file && preview ? (
        <div className="space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt={`${label} preview`}
            className="max-h-56 w-full rounded-md border object-cover"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={retake}
            disabled={disabled}
          >
            <RefreshCw />
            Retake photo
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="relative overflow-hidden rounded-md border bg-black">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="max-h-56 w-full object-cover"
            />
            {state !== "ready" ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70 px-4 text-center text-[0.625rem] text-white">
                {state === "starting" ? (
                  <p>Starting camera…</p>
                ) : (
                  <>
                    <VideoOff className="size-5" />
                    <p>{error ?? "The camera is not available."}</p>
                  </>
                )}
              </div>
            ) : null}
          </div>

          {state === "error" ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={retryCamera}
              disabled={disabled}
            >
              <RefreshCw />
              Retry camera
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={capturePhoto}
              disabled={disabled || state !== "ready"}
            >
              <Camera />
              Capture photo
            </Button>
          )}
        </div>
      )}

      <p className="text-[0.625rem] text-muted-foreground">
        {file
          ? `Captured: ${file.name}`
          : state === "ready"
            ? "Camera live. Capture the photo to continue."
            : "Waiting for the camera."}
      </p>
    </div>
  )
}
