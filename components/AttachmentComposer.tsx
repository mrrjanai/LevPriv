'use client'

import { useEffect, useRef, useState } from 'react'
import { Mic, Square, Camera, Paperclip, X, Loader2, Music, Video, Image as ImageIcon, File as FileIcon } from 'lucide-react'
import { CameraCapture } from './CameraCapture'
import { uploadAttachment } from '@/lib/uploadAttachment'
import { isAllowedMediaType, detectMediaKind, MAX_MEDIA_BYTES, formatBytes, ALL_ALLOWED_MEDIA_TYPES } from '@/lib/media'
import type { AttachmentInput } from '@/lib/types'
import type { MediaKind } from '@/lib/media'

const AUDIO_MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
const MAX_AUDIO_SECONDS = 300 // 5 minute cap

function pickSupportedMimeType(candidates: string[]): string {
  for (const type of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
      return type
    }
  }
  return candidates[candidates.length - 1]
}

const KIND_ICON: Record<MediaKind, typeof Music> = {
  audio: Music,
  video: Video,
  image: ImageIcon,
  file: FileIcon,
}

interface AttachmentComposerProps {
  onAttached: (attachment: AttachmentInput | null) => void
  disabled?: boolean
}

type Status = 'idle' | 'recording' | 'uploading' | 'ready' | 'error'

export function AttachmentComposer({ onAttached, disabled }: AttachmentComposerProps) {
  const [status, setStatus] = useState<Status>('idle')
  const [kind, setKind] = useState<MediaKind | null>(null)
  const [fileName, setFileName] = useState('')
  const [sizeBytes, setSizeBytes] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const [showCamera, setShowCamera] = useState(false)
  const [uploadPercent, setUploadPercent] = useState(0)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  async function handleFileReady(fileOrBlob: Blob, name: string, mimeType: string) {
    setErrorMsg('')

    if (!isAllowedMediaType(mimeType)) {
      setStatus('error')
      setErrorMsg('That file type is not supported.')
      return
    }
    if (fileOrBlob.size > MAX_MEDIA_BYTES) {
      setStatus('error')
      setErrorMsg(
        `File is too large (${formatBytes(MAX_MEDIA_BYTES)} limit, this is ${formatBytes(fileOrBlob.size)}).`
      )
      return
    }


    const detectedKind = detectMediaKind(mimeType)
    setKind(detectedKind)
    setFileName(name)
    setSizeBytes(fileOrBlob.size)
    setStatus('uploading')

    try {
      const attachment = await uploadAttachment(fileOrBlob, name, mimeType, setUploadPercent)
      setStatus('ready')
      onAttached(attachment)
    } catch (err) {
      console.error('Upload error:', err)
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Upload failed. Please try again.')
      onAttached(null)
    }
  }

  function handleRemove() {
    setStatus('idle')
    setKind(null)
    setFileName('')
    setSizeBytes(0)
    setErrorMsg('')
    onAttached(null)
  }

  async function handleMicClick() {
    if (status === 'recording') {
      recorderRef.current?.stop()
      return
    }

    setErrorMsg('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mimeType = pickSupportedMimeType(AUDIO_MIME_CANDIDATES)
      const recorder = new MediaRecorder(stream, { mimeType })
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        if (timerRef.current) clearInterval(timerRef.current)
        const blob = new Blob(chunksRef.current, { type: mimeType })
        handleFileReady(blob, `voice-note-${Date.now()}.webm`, mimeType)
      }

      recorder.start()
      recorderRef.current = recorder
      setStatus('recording')
      setRecordSeconds(0)
      timerRef.current = setInterval(() => {
        setRecordSeconds((s) => {
          if (s + 1 >= MAX_AUDIO_SECONDS) {
            recorder.stop()
          }
          return s + 1
        })
      }, 1000)
    } catch (err) {
      console.error('Mic error:', err)
      setStatus('error')
      setErrorMsg('Could not access your microphone. Check permissions and try again.')
    }
  }

  function handleFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFileReady(file, file.name, file.type)
    e.target.value = ''
  }

  const KindIcon = kind ? KIND_ICON[kind] : null
  const hasAttachment = status === 'ready' || status === 'uploading'

  return (
    <div>
      {!hasAttachment && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleMicClick}
            disabled={disabled}
            className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-md border transition-colors disabled:opacity-40 ${
              status === 'recording'
                ? 'bg-base-white text-base-black border-base-white'
                : 'border-base-border text-base-muted hover:text-base-white hover:border-base-mid'
            }`}
          >
            {status === 'recording' ? (
              <>
                <Square size={13} />
                {Math.floor(recordSeconds / 60)}:{String(recordSeconds % 60).padStart(2, '0')}
              </>
            ) : (
              <>
                <Mic size={13} /> Record
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setShowCamera(true)}
            disabled={disabled || status === 'recording'}
            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-md border border-base-border text-base-muted hover:text-base-white hover:border-base-mid transition-colors disabled:opacity-40"
          >
            <Camera size={13} /> Camera
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || status === 'recording'}
            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-md border border-base-border text-base-muted hover:text-base-white hover:border-base-mid transition-colors disabled:opacity-40"
          >
            <Paperclip size={13} /> Attach file
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept={ALL_ALLOWED_MEDIA_TYPES.join(',')}
            onChange={handleFilePicked}
            className="hidden"
          />
        </div>
      )}

      {hasAttachment && KindIcon && (
        <div className="flex items-center gap-3 border border-base-border rounded-md px-4 py-3">
          <KindIcon size={16} className="text-base-muted shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-base-white truncate">{fileName}</p>
            <p className="text-xs text-base-muted">
              {status === 'uploading' ? `Uploading… ${uploadPercent}%` : formatBytes(sizeBytes)}
            </p>
          </div>
          {status === 'uploading' ? (
            <Loader2 size={16} className="animate-spin text-base-muted shrink-0" />
          ) : (
            <button
              type="button"
              onClick={handleRemove}
              aria-label="Remove attachment"
              className="text-base-muted hover:text-base-white transition-colors shrink-0"
            >
              <X size={16} />
            </button>
          )}
        </div>
      )}

      {errorMsg && <p className="text-xs text-base-white mt-2">{errorMsg}</p>}

      {showCamera && (
        <CameraCapture
          onCapture={(blob, name, mimeType) => {
            setShowCamera(false)
            handleFileReady(blob, name, mimeType)
          }}
          onClose={() => setShowCamera(false)}
        />
      )}
    </div>
  )
}