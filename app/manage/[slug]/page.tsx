'use client'

import { Suspense, useEffect, useState, useCallback } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { formatRemaining, EXTEND_PRESETS } from '@/lib/duration'
import type { NotePublicMeta } from '@/lib/types'
import { Toast } from '@/components/Toast'
import { useToast } from '@/lib/useToast'
import { DestructIcon } from '@/components/icons/DestructIcon'
import { SuccessTick } from '@/components/icons/SuccessTick'
import { PadlockIcon } from '@/components/icons/PadlockIcon'

type PageState = 'loading' | 'ready' | 'deleted' | 'gone' | 'unauthorized'

export default function ManagePage() {
  return (
    <Suspense
      fallback={
        <main className="flex-1 flex items-center justify-center px-6 py-16">
          <div className="text-center text-base-muted text-sm">Loading…</div>
        </main>
      }
    >
      <ManagePageInner />
    </Suspense>
  )
}

function ManagePageInner() {
  const params = useParams<{ slug: string }>()
  const searchParams = useSearchParams()
  const slug = params.slug

  const [token, setToken] = useState<string | null>(null)
  const [state, setState] = useState<PageState>('loading')
  const [meta, setMeta] = useState<NotePublicMeta | null>(null)
  const [remaining, setRemaining] = useState('')
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [extending, setExtending] = useState<number | null>(null)
  const { message: toastMessage, showToast } = useToast()

  // Resolve owner token: URL param first, fall back to localStorage record.
  useEffect(() => {
    const fromUrl = searchParams.get('token')
    if (fromUrl) {
      setToken(fromUrl)
      return
    }
    try {
      const stored = JSON.parse(localStorage.getItem('levpriv_notes') || '[]') as Array<{
        slug: string
        ownerToken: string
      }>
      const match = stored.find((n) => n.slug === slug)
      setToken(match?.ownerToken ?? null)
    } catch {
      setToken(null)
    }
  }, [slug, searchParams])

  const fetchMeta = useCallback(async () => {
    if (!token) return
    const res = await fetch(`/api/notes/${slug}?token=${encodeURIComponent(token)}`)
    const data = (await res.json()) as NotePublicMeta

    if (!data.exists) {
      setState('gone')
      return
    }
    if (data.views === undefined) {
      // views is only populated by the API for verified owners
      setState('unauthorized')
      return
    }
    setMeta(data)
    setState('ready')
  }, [slug, token])

  useEffect(() => {
    if (token) fetchMeta()
  }, [token, fetchMeta])

  useEffect(() => {
    if (token === null) setState('unauthorized')
  }, [token])

  useEffect(() => {
    if (!meta?.expiresAt) return
    const tick = () => {
      const ms = meta.expiresAt! - Date.now()
      if (ms <= 0) {
        setRemaining('0s')
        setState('gone')
        return
      }
      setRemaining(formatRemaining(ms))
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [meta?.expiresAt])

  async function handleDelete() {
    if (!token) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/notes/${slug}?token=${encodeURIComponent(token)}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        showToast('Note permanently deleted')
        setState('deleted')
      } else {
        showToast('Failed to delete note')
      }
    } finally {
      setDeleting(false)
    }
  }

  async function handleExtend(seconds: number) {
    if (!token) return
    setExtending(seconds)
    try {
      const res = await fetch(`/api/notes/${slug}?token=${encodeURIComponent(token)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ additionalSeconds: seconds }),
      })
      const data = await res.json()
      if (res.ok) {
        setMeta((prev) => (prev ? { ...prev, expiresAt: data.expiresAt } : prev))
        showToast('Expiration extended')
      } else {
        showToast(data.error || 'Failed to extend expiration')
      }
    } finally {
      setExtending(null)
    }
  }

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-lg animate-fadeIn">
        {state === 'loading' && (
          <div className="text-center text-base-muted text-sm">Loading…</div>
        )}

        {state === 'unauthorized' && (
          <div className="text-center">
            <PadlockIcon />
            <h1 className="text-xl font-medium mb-2 mt-4">Management link required</h1>
            <p className="text-base-muted text-sm">
              This page needs the owner token from your note's management link to show status or
              allow deletion.
            </p>
          </div>
        )}

        {(state === 'gone' || state === 'deleted') && (
          <div className="text-center">
            {state === 'deleted' ? <SuccessTick /> : <DestructIcon />}
            <h1 className="text-xl font-medium mb-2 mt-4">
              {state === 'deleted' ? 'Note deleted' : 'This note has self-destructed'}
            </h1>
            <p className="text-base-muted text-sm">
              {state === 'deleted'
                ? 'It has been permanently removed and is no longer accessible.'
                : 'Its time simply ran out.'}
            </p>
            <a
              href="/"
              className="inline-block mt-8 border border-base-border rounded-md px-5 py-2.5 text-sm hover:border-base-mid transition-colors"
            >
              Create a new note
            </a>
          </div>
        )}

        {state === 'ready' && meta && (
          <div>
            <h1 className="text-xl font-medium mb-1">Note management</h1>
            <p className="text-base-muted text-sm mb-8">Slug: {slug}</p>

            <dl className="space-y-4 mb-8">
              <Row label="Status" value="Active" />
              <Row
                label="Created"
                value={new Date(meta.createdAt!).toLocaleString(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              />
              <Row
                label="Expires"
                value={new Date(meta.expiresAt!).toLocaleString(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              />
              <Row label="Self-destructs in" value={remaining} />
              <Row label="Views" value={String(meta.views ?? 0)} />
              <Row label="Protected with private key" value={meta.hasPrivateKey ? 'Yes' : 'No'} />
              <Row label="Deletes after first read" value={meta.burnAfterReading ? 'Yes' : 'No'} />
            </dl>

            <div className="mb-8">
              <label className="block text-xs uppercase tracking-wide text-base-muted mb-2">
                Extend expiration
              </label>
              <div className="grid grid-cols-3 gap-2">
                {EXTEND_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => handleExtend(preset.seconds)}
                    disabled={extending !== null}
                    className="text-sm rounded-md py-2.5 border border-base-border text-base-muted hover:text-base-white hover:border-base-mid transition-colors disabled:opacity-50"
                  >
                    {extending === preset.seconds ? '…' : preset.label}
                  </button>
                ))}
              </div>
            </div>

            {!confirmingDelete ? (
              <button
                onClick={() => setConfirmingDelete(true)}
                className="w-full border border-base-border rounded-md py-3 text-sm text-base-white hover:border-base-mid transition-colors"
              >
                Delete note now
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-base-muted text-center mb-2">
                  This can't be undone. Delete permanently?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmingDelete(false)}
                    className="flex-1 border border-base-border rounded-md py-3 text-sm hover:border-base-mid transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex-1 bg-base-white text-base-black rounded-md py-3 text-sm font-medium hover:bg-base-muted transition-colors disabled:opacity-50"
                  >
                    {deleting ? 'Deleting…' : 'Confirm delete'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <Toast message={toastMessage} />
    </main>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-base-border pb-3">
      <dt className="text-sm text-base-muted">{label}</dt>
      <dd className="text-sm text-base-white">{value}</dd>
    </div>
  )
}
