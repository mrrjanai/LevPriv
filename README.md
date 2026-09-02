# LevPriv

Private, self-destructing notes with optional audio/video/photo/file attachments. No accounts. Encrypted at rest. Auto-deletes itself.

## Features

- **Text notes** with configurable expiration (3 min to 30 days) or a custom duration
- **Burn after reading** - destroys the note the instant it's opened once, overriding the timer
- **Private key protection** - passphrase-derived encryption; the server never stores the key and cannot decrypt that note without it
- **Attachments** - record audio/video/photos directly in-browser (mic + camera, with front/back camera flip), or upload an existing file. 20MB cap.
- **Copy-protection on note text** - content loads blurred until tapped, text selection and copy/right-click are disabled, and a faint watermark (viewer's IP, timestamp, view ID) is overlaid on reveal for traceability if screenshotted
- **No accounts** - ownership is handled via a secret management link generated at creation; a local, no-login "My notes" dashboard reads from the browser's own storage
- **Extend or delete early** - from the management link, at any time before expiry
- **Lightweight bot protection** - invisible honeypot + timing trap on note creation, no CAPTCHA service required
- **Wrong-key lockout** - 5 attempts per note per IP per 5 minutes, plus artificial delay on every wrong guess
- Dark, minimal black/white/grey UI with a custom logo mark and Fraunces display font for the wordmark

## Architecture

### Storage
- **Upstash Redis** - all note metadata (expiry, view count, encrypted content, owner token hash, attachment metadata). Every note is stored with a Redis TTL matching its expiry, so it's physically purged even if application logic is bypassed.
- **Vercel Blob** (private access store) - the actual attachment files (audio/video/photo/file bytes).

### Attachment upload flow
Uploads go **directly from the browser to Vercel Blob** (not proxied through our own server), using `@vercel/blob/client`'s `upload()` function against a token our `/api/blob-upload` route issues. This bypasses Vercel serverless functions' hard ~4.5MB request body limit, which is what makes a 20MB cap possible.

The Blob store is configured with **private access**, not public - `access: 'private'` is set explicitly on both the client `upload()` call and the server-side `put()`/`get()` calls, and it must match the store's actual configured access mode (set once, permanently, when the store is created) or uploads fail outright.

### Attachment read flow
Because the store is private, attachment bytes are never served from a raw public URL. Instead, `/api/notes/[slug]/media` streams them server-side using the Blob SDK's `get()` function, gated behind a short-lived (15 min), HMAC-signed, slug-scoped token issued only after a note is successfully unlocked. The real Blob URL is never exposed to the browser.

### Encryption
- Note text is always encrypted with AES-256-GCM before storage.
- If a private key is set, the encryption key is derived from that passphrase via PBKDF2 (210,000 iterations) with a random salt - the server never stores the passphrase and cannot decrypt that note without it.
- If no private key is set, content is encrypted with a key derived from the server-only `SERVER_ENCRYPTION_KEY`.
- Attachments are currently **not** end-to-end encrypted the same way text is - they rely on the store's private access mode + our own token-gated read route for protection, not client-side encryption of the file bytes.

### The "no download" model - an honest limitation
Nothing that plays through a screen and speakers can ever be made screen-recording-proof - that's a universal limitation, not something specific to this app. What's actually implemented: no visible download button, the real file URL never appears in the browser's network tab, right-click/save is disabled on media and note text, and access dies the instant the note dies. This raises real friction against casual saving; it does not and cannot prevent deliberate screen capture. True OS-level screenshot-blocking (e.g. Android's `FLAG_SECURE`) requires a native app wrapper and has not been built yet - see "Planned: Android app" below.

For generic **file** attachments (PDF, docx, zip, etc.) there's an unavoidable exception: most file types require the browser to hand them to another app to open, which is a download by nature. The UI says this plainly rather than pretending otherwise.

## Project structure

```
levpriv/
├── app/
│   ├── layout.tsx              # Root layout, dark mode, Inter + Fraunces fonts, Navbar/Footer
│   ├── globals.css             # Tailwind + animations (status icons, toasts)
│   ├── page.tsx                # Home: note creation form + attachment composer
│   ├── about/, faq/, privacy/, contact/  # Static pages
│   ├── dashboard/page.tsx      # No-login list of notes created from this browser
│   ├── not-found.tsx
│   ├── icon.png, apple-icon.png # Favicon / apple touch icon (Next.js auto-detected)
│   ├── note/[slug]/page.tsx    # Public note viewer
│   ├── manage/[slug]/page.tsx  # Owner-only management view (stats, delete, extend)
│   └── api/
│       ├── notes/route.ts                  # POST: create note
│       ├── notes/[slug]/route.ts           # GET/POST/PATCH/DELETE: metadata/reveal/extend/delete
│       ├── notes/[slug]/media/route.ts     # GET: stream attachment bytes (token-gated)
│       └── blob-upload/route.ts            # POST: issues client-upload tokens for Vercel Blob
├── components/
│   ├── AttachmentComposer.tsx  # Mic record / camera / file-picker UI
│   ├── CameraCapture.tsx       # In-browser photo/video capture modal, front/back flip
│   ├── AttachmentPlayer.tsx    # Renders audio/video/image/file in the note viewer
│   ├── ProtectedText.tsx       # Blur-until-tap, copy/selection-blocked note text
│   ├── WatermarkOverlay.tsx    # Faint traceability overlay on revealed text
│   ├── PasswordField.tsx, CopyButton.tsx, ShareButton.tsx, Toast.tsx
│   ├── Navbar.tsx, Footer.tsx, LogoMark.tsx
│   └── icons/                  # Animated status icons (destruct/success/padlock)
├── lib/
│   ├── redis.ts, crypto.ts, slug.ts, ratelimit.ts, duration.ts, types.ts
│   ├── media.ts                # Attachment MIME allow-list, size cap, kind detection
│   ├── mediaToken.ts           # Short-lived signed tokens gating attachment reads
│   ├── blob.ts                 # Safe blob deletion helper
│   └── uploadAttachment.ts     # Client-side direct-to-Blob upload
├── .husky/pre-commit           # Runs `tsc --noEmit` before every commit
├── vercel.json, next.config.js, tailwind.config.ts
└── .env.example
```

## Setup & local development

### 1. Prerequisites
- Node.js 18.18+ (20.x recommended)
- A free [Upstash](https://console.upstash.com) account (Redis)
- A [Vercel](https://vercel.com) account with **Blob storage** enabled on this project

### 2. Install
```bash
npm install
```

### 3. Create an Upstash Redis database
Same as always - create one at console.upstash.com, copy the REST URL and token from the database's REST API section.

### 4. Create a Vercel Blob store
1. Vercel dashboard → your project → **Storage** tab → **Create Database** → **Blob**
2. **Connect it to your project**, choosing the environments you need (Production/Preview/Development)
3. Check **"Add a read-write token env var to this connection"** when connecting
4. This creates `BLOB_READ_WRITE_TOKEN` in your project's environment variables

Note: the store's access mode (public/private) is fixed at creation and cannot be changed later. This project expects **private** access - `get()`/`put()`/`upload()` calls throughout the codebase explicitly pass `access: 'private'`, and it must match the store's actual mode or uploads and reads fail.

### 5. Configure environment variables
```bash
cp .env.example .env.local
```
Fill in `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `BLOB_READ_WRITE_TOKEN`, and generate a `SERVER_ENCRYPTION_KEY`:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

For local development specifically, pulling Vercel's actual configured environment directly is more reliable than copying values by hand:
```bash
npm i -g vercel
vercel login
vercel link
vercel env pull .env.local
```

### 6. Run locally
```bash
npm run dev
```

## Deploying to Vercel

1. Push to GitHub, import the repo at vercel.com/new
2. Add all four environment variables before deploying (or let the Blob/Upstash integrations inject them automatically per the setup above)
3. Deploy
4. Once live, update `NEXT_PUBLIC_APP_URL` to match your actual assigned domain exactly, then redeploy

Every environment variable change requires a redeploy to take effect - it is never picked up by an already-running deployment.

## Pre-commit safety net

This project runs `tsc --noEmit` automatically before every commit via Husky + lint-staged, catching syntax errors, missing imports, and type mismatches before they ever reach a build. If a commit is rejected, the exact TypeScript error is printed in your terminal - fix it and commit again.

## Testing checklist

**Core note lifecycle**
- Create with each duration preset and a custom duration; confirm countdown and self-destruct
- Manual delete via the management link; confirm it's inaccessible immediately
- Extend expiration from the management page

**Private key**
- Set one, confirm the viewer requires it; wrong key 5x in a row triggers a temporary lockout

**Burn after reading**
- Enable it, open the note once, confirm a second open shows "self-destructed"

**Attachments**
- Record audio (mic), confirm playback with no visible download control
- Camera → photo and video, including the front/back flip button (only appears with 2+ cameras)
- Attach an existing file via the paperclip picker
- A note with only an attachment and no text
- Try a file over 20MB or an unsupported type - should show a clear error, not hang
- Attachment + burn-after-reading together
- Attachment + private key together

**Copy-protection**
- Open a note, confirm text starts blurred, tapping reveals it
- Confirm right-click and Ctrl+C do nothing on the revealed text
- Confirm the faint watermark (IP/timestamp/view ID) is visible once revealed

**Dashboard**
- Create several notes, confirm `/dashboard` lists them with live status and per-note delete

## Known limitations

- **iOS Safari**: `MediaRecorder` (used for all audio/video recording) has historically inconsistent support on Safari/iOS. This has not been verified on an actual iOS device - test before relying on it there.
- **Attachments are not end-to-end encrypted** the way text notes are (see Encryption section above).
- **Blob cleanup is lazy, not proactive**: an expired/deleted note's attachment file is only physically deleted from storage the next time something touches that note's API routes. It's never servable again the moment the note record is gone, but the file itself may linger in storage a while longer for notes nobody revisits.
- **No error monitoring** (e.g. Sentry) is currently configured - server-side errors are only visible via Vercel's function logs.
- **Screenshot-blocking is not implemented.** It cannot be done for a website - see "Planned: Android app" below.

## Planned: Android app

A native Android wrapper (Trusted Web Activity) is planned to enable genuine OS-level screenshot-blocking (`FLAG_SECURE`), which is only possible from a real native app, not a website. iOS does not expose this capability to any third-party app, native or otherwise, so this benefit would be Android-only. Not yet started.

## License

MIT