'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { formatRemaining } from '@/lib/duration'
import type { NotePublicMeta, PublicAttachmentMeta } from '@/lib/types'
import { PasswordField } from '@/components/PasswordField'
import { DestructIcon } from '@/components/icons/DestructIcon'
import { PadlockIcon } from '@/components/icons/PadlockIcon'
import { AttachmentPlayer } from '@/components/AttachmentPlayer'
import { ProtectedText } from '@/components/ProtectedText'
import { AlertTriangle } from 'lucide-react'
import type { ViewWatermark } from '@/lib/types'

type ViewState = 'loading' | 'need-key' | 'revealed' | 'gone' | 'error'

const EXPIRY_WARNING_MS = 60_000

export default function NoteViewerPage() {
  const params = useParams<{ slug: string }>()
  const slug = params.slug

  const [state, setState] = useState<ViewState>('loading')
  const [meta, setMeta] = useState<NotePublicMeta | null>(null)
  const [content, setContent] = useState('')
  const [privateKey, setPrivateKey] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [remaining, setRemaining] = useState('')
  const [remainingMs, setRemainingMs] = useState<number | null>(null)
  const [views, setViews] = useState<number | null>(null)
  const [burned, setBurned] = useState(false)
  const [attachment, setAttachment] = useState<PublicAttachmentMeta | null>(null)
  const [mediaToken, setMediaToken] = useState<string | null>(null)
  const [watermark, setWatermark] = useState<ViewWatermark | null>(null)

  const fetchMeta = useCallback(async () => {
    const res = await fetch(`/api/notes/${slug}`)
    const data = (await res.json()) as NotePublicMeta
    setMeta(data)
    if (!data.exists) {
      setState('gone')
    } else {
      setState((prev) => (prev === 'loading' ? (data.hasPrivateKey ? 'need-key' : 'loading') : prev))
      if (!data.hasPrivateKey && state !== 'revealed') {
        reveal(undefined)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  useEffect(() => {
    fetchMeta()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  useEffect(() => {
    if (!meta?.expiresAt) return
    const tick = () => {
      const ms = meta.expiresAt! - Date.now()
      if (ms <= 0) {
        setRemaining('0s')
        setRemainingMs(0)
        setState('gone')
        return
      }
      setRemaining(formatRemaining(ms))
      setRemainingMs(ms)
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [meta?.expiresAt])

  async function reveal(key: string | undefined) {
    setErrorMsg('')
    try {
      const res = await fetch(`/api/notes/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privateKey: key }),
      })
      const data = await res.json()

      if (!res.ok) {
        if (data.requiresKey) {
          setState('need-key')
          if (key) setErrorMsg(data.error || 'Incorrect private key. Try again.')
        } else {
          setState('gone')
        }
        return
      }

      setContent(data.content)
      setViews(data.views)
      setBurned(Boolean(data.burned))
      setAttachment(data.attachment ?? null)
      setMediaToken(data.mediaToken ?? null)
      setWatermark(data.watermark ?? null)
      setState('revealed')
    } catch {
      setState('error')
      setErrorMsg('Network error. Please refresh and try again.')
    }
  }

  function handleKeySubmit(e: React.FormEvent) {
    e.preventDefault()
    reveal(privateKey)
  }

  const showExpiryWarning =
    state === 'revealed' && !burned && remainingMs !== null && remainingMs > 0 && remainingMs <= EXPIRY_WARNING_MS

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-lg animate-fadeIn">
        {state === 'loading' && (
          <div className="text-center text-base-muted text-sm">Loading note…</div>
        )}

        {state === 'gone' && (
          <div className="text-center">
            <DestructIcon />
            <h1 className="text-xl font-medium mb-2 mt-4">This note has self-destructed</h1>
            <p className="text-base-muted text-sm">
              It was either deleted by its creator or its time simply ran out.
            </p>
            <a
              href="/"
              className="inline-block mt-8 border border-base-border rounded-md px-5 py-2.5 text-sm hover:border-base-mid transition-colors"
            >
              Create your own note
            </a>
          </div>
        )}

        {state === 'error' && (
          <div className="text-center">
            <h1 className="text-xl font-medium mb-2">Something went wrong</h1>
            <p className="text-base-muted text-sm">{errorMsg}</p>
          </div>
        )}

        {state === 'need-key' && (
          <form onSubmit={handleKeySubmit} className="text-center">
            <PadlockIcon />
            <h1 className="text-xl font-medium mb-2 mt-4">This note is protected</h1>
            <p className="text-base-muted text-sm mb-6">
              Enter the private key to view its content.
            </p>
            <div className="mb-3 text-left">
              <PasswordField value={privateKey} onChange={setPrivateKey} placeholder="Private key" autoFocus />
            </div>
            {errorMsg && <p className="text-sm text-base-white mb-3">{errorMsg}</p>}
            <button
              type="submit"
              className="w-full bg-base-white text-base-black rounded-md py-3 text-sm font-medium hover:bg-base-muted transition-colors"
            >
              Unlock note
            </button>
          </form>
        )}

        {state === 'revealed' && (
          <div>
            <div className="flex items-center justify-between mb-4 text-xs text-base-muted">
              <span>{burned ? 'Destroyed after this view' : `Self-destructs in ${remaining}`}</span>
              {views !== null && <span>{views} view{views === 1 ? '' : 's'}</span>}
            </div>

            {showExpiryWarning && (
              <div className="flex items-center gap-2 mb-3 bg-base-near border border-base-border rounded-md px-3 py-2.5 text-xs text-base-white">
                <AlertTriangle size={14} className="shrink-0" />
                This note will disappear any second — copy anything you need now.
              </div>
            )}

            {attachment && mediaToken && (
              <div className="mb-4">
                <AttachmentPlayer
                  attachment={attachment}
                  mediaSrc={`/api/notes/${slug}/media?vt=${encodeURIComponent(mediaToken)}`}
                />
              </div>
            )}

            {content && watermark && (
              <ProtectedText content={content} watermark={watermark} />
            )}

            <p className="text-xs text-base-muted mt-4 text-center">
              {burned
                ? 'This note has now been permanently destroyed. It cannot be viewed again.'
                : 'This note is not saved anywhere permanent. Copy anything you need now.'}
            </p>
          </div>
        )}
      </div>
    </main>
  )
}