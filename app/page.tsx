'use client'

import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { DURATION_PRESETS, MAX_CONTENT_LENGTH, CONTENT_LENGTH_WARNING_THRESHOLD } from '@/lib/duration'
import type { CreateNoteResponse, LocalNoteRecord } from '@/lib/types'
import { PasswordField } from '@/components/PasswordField'
import { CopyButton } from '@/components/CopyButton'
import { ShareButton } from '@/components/ShareButton'
import { SuccessTick } from '@/components/icons/SuccessTick'
import { LogoMark } from '@/components/LogoMark'
import { AttachmentComposer } from '@/components/AttachmentComposer'
import { KeyRound } from 'lucide-react'
import type { AttachmentInput } from '@/lib/types'

type CustomUnit = 'minutes' | 'hours'

export default function HomePage() {
  const [content, setContent] = useState('')
  const [privateKey, setPrivateKey] = useState('')
  const [burnAfterReading, setBurnAfterReading] = useState(false)
  const [attachment, setAttachment] = useState<AttachmentInput | null>(null)
  const [selectedSeconds, setSelectedSeconds] = useState<number>(DURATION_PRESETS[1].seconds)
  const [useCustom, setUseCustom] = useState(false)
  const [customValue, setCustomValue] = useState(30)
  const [customUnit, setCustomUnit] = useState<CustomUnit>('minutes')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<CreateNoteResponse | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)

  // Honeypot field value (should always stay empty for real users) and the
  // timestamp the form was rendered, used server-side as a timing trap.
  const [website, setWebsite] = useState('')
  const formRenderedAtRef = useRef<number>(Date.now())

  const durationSeconds = useCustom
    ? Math.max(60, Math.round(customValue * (customUnit === 'hours' ? 3600 : 60)))
    : selectedSeconds

  useEffect(() => {
    formRenderedAtRef.current = Date.now()
  }, [])

  useEffect(() => {
    if (result) {
      QRCode.toDataURL(result.url, {
        margin: 1,
        width: 200,
        color: { dark: '#000000', light: '#ffffff' },
      })
        .then(setQrDataUrl)
        .catch(() => setQrDataUrl(null))
    }
  }, [result])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (content.trim().length === 0 && !attachment) {
      setError('Write something or attach a file before sending it into the void.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          durationSeconds,
          privateKey: privateKey.length > 0 ? privateKey : undefined,
          burnAfterReading,
          attachment: attachment ?? undefined,
          website,
          formRenderedAt: formRenderedAtRef.current,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Something went wrong.')
        setLoading(false)
        return
      }

      const created = data as CreateNoteResponse
      setResult(created)

      // Persist ownership locally so the /manage and /dashboard pages work
      // without the URL token too.
      try {
        const stored: LocalNoteRecord[] = JSON.parse(localStorage.getItem('levpriv_notes') || '[]')
        stored.unshift({
          slug: created.slug,
          ownerToken: created.ownerToken,
          createdAt: Date.now(),
          expiresAt: created.expiresAt,
          hasPrivateKey: created.hasPrivateKey,
          hasAttachment: created.hasAttachment,
        })
        localStorage.setItem('levpriv_notes', JSON.stringify(stored.slice(0, 50)))
      } catch {
        // localStorage may be unavailable (private browsing); non-fatal.
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSubmit(e as unknown as React.FormEvent)
    }
  }

  function reset() {
    setContent('')
    setPrivateKey('')
    setBurnAfterReading(false)
    setAttachment(null)
    setResult(null)
    setError(null)
    setUseCustom(false)
    setSelectedSeconds(DURATION_PRESETS[1].seconds)
    setQrDataUrl(null)
    formRenderedAtRef.current = Date.now()
  }

  const charRatio = content.length / MAX_CONTENT_LENGTH
  const charCountColor =
    charRatio >= CONTENT_LENGTH_WARNING_THRESHOLD ? 'text-base-white' : 'text-base-muted'

  if (result) {
    return (
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-lg animate-fadeIn">
          <div className="mb-8 text-center">
            <SuccessTick />
            <h1 className="text-2xl font-medium tracking-tight mt-4">Note created</h1>
            <p className="text-base-muted mt-2 text-sm">
              It will self-destruct on{' '}
              {new Date(result.expiresAt).toLocaleString(undefined, {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
              {burnAfterReading ? ', or the instant it is opened' : ''}.
            </p>
            {result.hasPrivateKey && (
              <div className="flex items-center gap-2 mt-4 bg-base-near border border-base-border rounded-md px-3 py-2.5 text-xs text-base-muted">
                <KeyRound size={14} className="shrink-0" />
                This note requires a private key to view. Remember to share it with the
                recipient separately — the link alone won't work.
              </div>
            )}
          </div>

          <div className="space-y-4">
            <Field label="Shareable link">
              <div className="flex gap-2">
                <code className="flex-1 truncate bg-base-near border border-base-border rounded-md px-3 py-2.5 text-sm text-base-white">
                  {result.url}
                </code>
                <CopyButton text={result.url} />
              </div>
            </Field>

            <ShareButton url={result.url} title="Someone shared a private note with you" />

            {qrDataUrl && (
              <div className="flex flex-col items-center pt-2">
                <img
                  src={qrDataUrl}
                  alt="QR code for the note link"
                  className="rounded-md border border-base-border"
                  width={160}
                  height={160}
                />
                <p className="text-xs text-base-muted mt-2">Scan to open on another device</p>
              </div>
            )}

            <Field label="Management link (keep this private — lets you delete or extend the note)">
              <div className="flex gap-2">
                <code className="flex-1 truncate bg-base-near border border-base-border rounded-md px-3 py-2.5 text-sm text-base-muted">
                  {result.manageUrl}
                </code>
                <CopyButton text={result.manageUrl} variant="outline" />
              </div>
            </Field>

            <a
              href={result.manageUrl}
              className="block text-center text-sm text-base-muted hover:text-base-white transition-colors pt-2"
            >
              Go to management view →
            </a>
          </div>

          <button
            onClick={reset}
            className="mt-10 w-full border border-base-border rounded-md py-3 text-sm text-base-muted hover:text-base-white hover:border-base-mid transition-colors"
          >
            Create another note
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      {/* Honeypot: sits outside the <form> entirely so password managers/autofill,
          which only target fields inside login-like forms, never touch it.
          Hidden with display:none (not just off-screen) so autofill can't reach it either.
          Real users never see or interact with this. */}
      <div
        aria-hidden="true"
        style={{ display: 'none' }}
      >
        <input
          type="text"
          name="hp_ref_9f2"
          id="hp_ref_9f2"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>
      <form onSubmit={handleSubmit} className="w-full max-w-lg">
        <div className="mb-10">
          <div className="flex items-center gap-2.5">
            <LogoMark size={42} />
            <h1 className="font-display text-3xl tracking-tight">LevPriv</h1>
          </div>
          <p className="text-base-muted mt-2 text-sm">
            Write something. Share a link. It disappears on its own.
          </p>
        </div>

        <Field label="Note (optional if you attach something below)">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={MAX_CONTENT_LENGTH}
            rows={8}
            placeholder="Type your note here... (Ctrl+Enter to send)"
            className="w-full resize-none bg-base-near border border-base-border rounded-md px-4 py-3 text-sm leading-relaxed placeholder:text-base-muted focus:border-base-mid transition-colors"
          />
          <div className={`text-right text-xs mt-1 transition-colors ${charCountColor}`}>
            {content.length} / {MAX_CONTENT_LENGTH}
          </div>
        </Field>

        <Field label="Record or attach (audio, video, photo, or file — 25MB max)">
          <AttachmentComposer onAttached={setAttachment} disabled={loading} />
        </Field>

        <Field label="Expires after">
          <div className="grid grid-cols-3 gap-2">
            {DURATION_PRESETS.map((preset) => (
              <button
                type="button"
                key={preset.label}
                onClick={() => {
                  setUseCustom(false)
                  setSelectedSeconds(preset.seconds)
                }}
                className={`text-sm rounded-md py-2.5 border transition-colors ${
                  !useCustom && selectedSeconds === preset.seconds
                    ? 'bg-base-white text-base-black border-base-white'
                    : 'border-base-border text-base-muted hover:text-base-white hover:border-base-mid'
                }`}
              >
                {preset.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setUseCustom(true)}
              className={`text-sm rounded-md py-2.5 border transition-colors ${
                useCustom
                  ? 'bg-base-white text-base-black border-base-white'
                  : 'border-base-border text-base-muted hover:text-base-white hover:border-base-mid'
              }`}
            >
              Custom
            </button>
          </div>

          {useCustom && (
            <div className="flex gap-2 mt-3">
              <input
                type="number"
                min={1}
                value={customValue}
                onChange={(e) => setCustomValue(Number(e.target.value))}
                className="w-24 bg-base-near border border-base-border rounded-md px-3 py-2 text-sm focus:border-base-mid transition-colors"
              />
              <select
                value={customUnit}
                onChange={(e) => setCustomUnit(e.target.value as CustomUnit)}
                className="flex-1 bg-base-near border border-base-border rounded-md px-3 py-2 text-sm focus:border-base-mid transition-colors"
              >
                <option value="minutes">Minutes</option>
                <option value="hours">Hours</option>
              </select>
            </div>
          )}
        </Field>

        <Field label="Private key (optional)">
          <PasswordField
            value={privateKey}
            onChange={setPrivateKey}
            placeholder="Require a passphrase to view this note"
          />
          <p className="text-xs text-base-muted mt-1.5">
            If set, anyone with the link will also need this passphrase. We never store it.
          </p>
        </Field>

        <label className="flex items-center gap-2.5 mb-8 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={burnAfterReading}
            onChange={(e) => setBurnAfterReading(e.target.checked)}
            className="w-4 h-4 rounded border-base-border bg-base-near accent-white"
          />
          <span className="text-sm text-base-white">Delete immediately after being read once</span>
        </label>

        {error && (
          <p className="text-sm text-base-white bg-base-near border border-base-border rounded-md px-4 py-3 mb-6">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-base-white text-base-black rounded-md py-3.5 text-sm font-medium hover:bg-base-muted transition-colors disabled:opacity-50"
        >
          {loading ? 'Creating…' : 'Create self-destructing note'}
        </button>
      </form>
    </main>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <label className="block text-xs uppercase tracking-wide text-base-muted mb-2">
        {label}
      </label>
      {children}
    </div>
  )
}