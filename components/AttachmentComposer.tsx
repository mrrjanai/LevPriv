'use client'

import { useEffect, useRef, useState } from 'react'
import { Mic, Square, Camera, Paperclip, X, Loader2, Music, Video, Image as ImageIcon, File as FileIcon } from 'lucide-react'
import { CameraCapture } from './CameraCapture'
import { uploadAttachment } from '@/lib/uploadAttachment'
import { isAllowedMediaType, detectMediaKind, MAX_MEDIA_BYTES, MAX_ATTACHMENTS_PER_NOTE, formatBytes, ALL_ALLOWED_MEDIA_TYPES } from '@/lib/media'
import type { AttachmentInput } from '@/lib/types'
import type { MediaKind } from '@/lib/media'

const AUDIO_MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
const MAX_AUDIO_SECONDS = 300

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

interface PendingAttachment {
  id: string
  kind: MediaKind
  fileName: string
  sizeBytes: number
  status: 'uploading' | 'ready' | 'error'
  errorMsg?: string
  result?: AttachmentInput
}

interface AttachmentComposerProps {
  onAttachmentsChange: (attachments: AttachmentInput[]) => void
  disabled?: boolean
}

export function AttachmentComposer({ onAttachmentsChange, disabled }: AttachmentComposerProps) {
  const [items, setItems] = useState<PendingAttachment[]>([])
  const [recording, setRecording] = useState(false)
  const [recordSeconds, setRecordSeconds] = useState(0)
  const [showCamera, setShowCamera] = useState(false)
  const [globalError, setGlobalError] = useState('')

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

  // Notify the parent every time the set of successfully-uploaded attachments changes.
  useEffect(() => {
    const ready = items.filter((i) => i.status === 'ready' && i.result).map((i) => i.result!)
    onAttachmentsChange(ready)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items])

  async function handleFileReady(fileOrBlob: Blob, name: string, mimeType: string) {
    setGlobalError('')

    if (items.length >= MAX_ATTACHMENTS_PER_NOTE) {
      setGlobalError(`You can attach up to ${MAX_ATTACHMENTS_PER_NOTE} files per note.`)
      return
    }
    if (!isAllowedMediaType(mimeType)) {
      setGlobalError('That file type is not supported.')
      return
    }
    if (fileOrBlob.size > MAX_MEDIA_BYTES) {
      setGlobalError(`File is too large (${formatBytes(MAX_MEDIA_BYTES)} limit, this is ${formatBytes(fileOrBlob.size)}).`)
      return
    }

    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const kind = detectMediaKind(mimeType)

    setItems((prev) => [
      ...prev,
      { id, kind, fileName: name, sizeBytes: fileOrBlob.size, status: 'uploading' },
    ])

    try {
      const result = await uploadAttachment(fileOrBlob, name, mimeType)
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: 'ready', result } : item))
      )
    } catch {
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: 'error', errorMsg: 'Upload failed.' } : item
        )
      )
    }
  }

  function handleRemove(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  async function handleMicClick() {
    if (recording) {
      recorderRef.current?.stop()
      return
    }

    setGlobalError('')
    if (items.length >= MAX_ATTACHMENTS_PER_NOTE) {
      setGlobalError(`You can attach up to ${MAX_ATTACHMENTS_PER_NOTE} files per note.`)
      return
    }

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
        setRecording(false)
      }

      recorder.start()
      recorderRef.current = recorder
      setRecording(true)
      setRecordSeconds(0)
      timerRef.current = setInterval(() => {
        setRecordSeconds((s) => {
          if (s + 1 >= MAX_AUDIO_SECONDS) recorder.stop()
          return s + 1
        })
      }, 1000)
    } catch {
      setGlobalError('Could not access your microphone. Check permissions and try again.')
    }
  }

  function handleFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFileReady(file, file.name, file.type)
    e.target.value = ''
  }

  const atCap = items.length >= MAX_ATTACHMENTS_PER_NOTE

  return (
    <div>
      {items.length > 0 && (
        <div className="space-y-2 mb-3">
          {items.map((item) => {
            const KindIcon = KIND_ICON[item.kind]
            return (
              <div
                key={item.id}
                className="flex items-center gap-3 border border-base-border rounded-md px-4 py-3"
              >
                <KindIcon size={16} className="text-base-muted shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-base-white truncate">{item.fileName}</p>
                  <p className="text-xs text-base-muted">
                    {item.status === 'uploading' && 'Uploading…'}
                    {item.status === 'ready' && formatBytes(item.sizeBytes)}
                    {item.status === 'error' && (item.errorMsg || 'Upload failed')}
                  </p>
                </div>
                {item.status === 'uploading' ? (
                  <Loader2 size={16} className="animate-spin text-base-muted shrink-0" />
                ) : (
                  <button
                    type="button"
                    onClick={() => handleRemove(item.id)}
                    aria-label="Remove attachment"
                    className="text-base-muted hover:text-base-white transition-colors shrink-0"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {!atCap && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleMicClick}
            disabled={disabled}
            className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-md border transition-colors disabled:opacity-40 ${
              recording
                ? 'bg-base-white text-base-black border-base-white'
                : 'border-base-border text-base-muted hover:text-base-white hover:border-base-mid'
            }`}
          >
            {recording ? (
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
            disabled={disabled || recording}
            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-md border border-base-border text-base-muted hover:text-base-white hover:border-base-mid transition-colors disabled:opacity-40"
          >
            <Camera size={13} /> Camera
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || recording}
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

      {atCap && (
        <p className="text-xs text-base-muted">
          Maximum of {MAX_ATTACHMENTS_PER_NOTE} attachments reached.
        </p>
      )}

      {globalError && <p className="text-xs text-base-white mt-2">{globalError}</p>}

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