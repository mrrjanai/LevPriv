'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Camera as CameraIcon, Video as VideoIcon, Circle, Square } from 'lucide-react'

interface CameraCaptureProps {
  onCapture: (file: Blob, fileName: string, mimeType: string) => void
  onClose: () => void
}

type Mode = 'photo' | 'video'

const VIDEO_MIME_CANDIDATES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
]

function pickSupportedMimeType(candidates: string[]): string {
  for (const type of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
      return type
    }
  }
  return candidates[candidates.length - 1]
}

const MAX_VIDEO_SECONDS = 120 // 2 minute cap keeps clips well under the 25MB ceiling

export function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [mode, setMode] = useState<Mode>('photo')
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: mode === 'video',
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
        setReady(true)
      } catch (err) {
        console.error('Camera error:', err)
        setError('Could not access your camera. Check permissions and try again.')
      }
    }

    startCamera()

    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [mode])

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  function handleTakePhoto() {
    if (!videoRef.current) return
    const video = videoRef.current
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0)
    canvas.toBlob(
      (blob) => {
        if (blob) {
          onCapture(blob, `photo-${Date.now()}.png`, 'image/png')
        }
      },
      'image/png',
      0.92
    )
  }

  function handleStartRecording() {
    if (!streamRef.current) return
    const mimeType = pickSupportedMimeType(VIDEO_MIME_CANDIDATES)
    const recorder = new MediaRecorder(streamRef.current, { mimeType })
    chunksRef.current = []

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType })
      onCapture(blob, `video-${Date.now()}.webm`, mimeType)
    }

    recorder.start()
    recorderRef.current = recorder
    setRecording(true)
    setSeconds(0)
    timerRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s + 1 >= MAX_VIDEO_SECONDS) {
          handleStopRecording()
        }
        return s + 1
      })
    }, 1000)
  }

  function handleStopRecording() {
    recorderRef.current?.stop()
    setRecording(false)
    if (timerRef.current) clearInterval(timerRef.current)
  }

  function handleClose() {
    if (recording) handleStopRecording()
    stopStream()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-base-black/95 flex items-center justify-center px-4 animate-fadeIn">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => !recording && setMode('photo')}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border transition-colors ${
                mode === 'photo'
                  ? 'bg-base-white text-base-black border-base-white'
                  : 'border-base-border text-base-muted'
              }`}
            >
              <CameraIcon size={13} /> Photo
            </button>
            <button
              type="button"
              onClick={() => !recording && setMode('video')}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border transition-colors ${
                mode === 'video'
                  ? 'bg-base-white text-base-black border-base-white'
                  : 'border-base-border text-base-muted'
              }`}
            >
              <VideoIcon size={13} /> Video
            </button>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close camera"
            className="text-base-muted hover:text-base-white transition-colors p-1"
          >
            <X size={20} />
          </button>
        </div>

        <div className="relative bg-base-near border border-base-border rounded-md overflow-hidden aspect-[3/4]">
          {error ? (
            <div className="absolute inset-0 flex items-center justify-center text-center px-6 text-sm text-base-muted">
              {error}
            </div>
          ) : (
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          )}
          {mode === 'video' && recording && (
            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-base-black/70 rounded-full px-2.5 py-1 text-xs">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
            </div>
          )}
        </div>

        {!error && ready && (
          <div className="flex justify-center mt-6">
            {mode === 'photo' ? (
              <button
                type="button"
                onClick={handleTakePhoto}
                aria-label="Take photo"
                className="w-16 h-16 rounded-full border-2 border-base-white flex items-center justify-center hover:bg-base-near transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-base-white" />
              </button>
            ) : (
              <button
                type="button"
                onClick={recording ? handleStopRecording : handleStartRecording}
                aria-label={recording ? 'Stop recording' : 'Start recording'}
                className="w-16 h-16 rounded-full border-2 border-base-white flex items-center justify-center hover:bg-base-near transition-colors"
              >
                {recording ? (
                  <Square size={22} className="fill-base-white text-base-white" />
                ) : (
                  <Circle size={48} className="fill-red-500 text-red-500" />
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}