# LevPriv

Private, self-destructing notes. No accounts. Encrypted at rest. Auto-deletes itself.

## What's new since the first build

- **Burn after reading**: optional toggle to destroy a note the instant it's opened once,
  regardless of the timer.
- **Show/hide toggle** on every private-key input field.
- **Copy-all button** on the note viewer, plus upgraded copy buttons everywhere with a
  checkmark confirmation.
- **Ctrl+Enter / Cmd+Enter** submits the note form from the textarea.
- **Color-coded character counter** — turns white as you approach the 20,000-char limit.
- **QR code** shown after creating a note, for quick scan-to-open on another device.
- **Private-key reminder badge** on the "note created" screen so you don't forget to share
  the passphrase separately.
- **Share button** — uses the native share sheet on mobile (WhatsApp, Messages, etc. all
  show up automatically); falls back to a small menu (WhatsApp/Telegram/X/Email links) on
  desktop, where no native share sheet exists.
- **Expiry warning banner** on the note viewer when under 60 seconds remain.
- **Extend expiration** button on the management page (+10 min / +1 hour / +24 hours).
- **Toast confirmations** for delete and extend actions.
- **`/dashboard`** — a no-login list of every note created from the current browser
  (reads the same `localStorage` record used for management links), with per-note delete.
- **Lightweight bot protection** on note creation: an invisible honeypot field plus a
  minimum-time-since-page-load check. No CAPTCHA service, no extra account/API keys needed.
  See "Upgrading bot protection" below if you want something stronger later.
- **Wrong-private-key lockout + delay**: 5 wrong attempts per note per IP within 5 minutes
  triggers a temporary lockout, and every failed attempt has a small artificial delay to
  slow down brute-forcing short passphrases.
- **Request size guard**: the create API now rejects oversized request bodies before
  parsing, independent of the client-side character limit.
- **Footer** with a rights-reserved notice on every page.
- **Navbar** on every page with the "LevPriv" wordmark (set in a distinct serif display font,
  Fraunces) linking back to the home page, plus quiet links to My Notes / About / FAQ /
  Privacy / Contact.
- **Animated status icons** replacing plain text/dots: a circled X-draw for expired/
  self-destructed states, a circled checkmark-draw for success states (note created, note
  manually deleted), and a circled padlock wherever a passphrase or owner token is required.
- **Four new pages**: `/about`, `/faq` (interactive accordion), `/privacy`, `/contact`.
  **Before deploying, open `app/contact/page.tsx` and replace the placeholder
  `hello@levpriv.app` with your real contact email.**

## How it works (architecture)

- **Storage**: Upstash Redis (serverless, REST-based). Every note is stored under key
  `note:<slug>` with a Redis TTL exactly matching its expiration — so even if application
  logic somehow failed to check expiry, Redis physically deletes the key on schedule.
- **Slugs**: 10-character base62 strings (`nanoid`), ~59.5 bits of entropy. Collision check
  against Redis on creation, with automatic retry (practically never triggers).
- **Encryption**:
  - Content is **always** encrypted with AES-256-GCM before it touches Redis.
  - If the creator sets a private key, the AES key is derived from that passphrase via
    PBKDF2 (210,000 iterations) with a random salt. The server never stores the passphrase,
    so it *cannot* decrypt that note without the visitor supplying the key.
  - If no private key is set, content is encrypted with a key derived from the server-only
    `SERVER_ENCRYPTION_KEY` env var, so raw note content is never sitting in plaintext in
    the database.
- **Ownership without accounts**: on creation, the server generates a random `ownerToken`,
  returns it once in the response, and stores only its SHA-256 hash. The `/manage/[slug]`
  page (and the delete API) require the raw token — matching it against the stored hash —
  so only whoever holds the management link (or has it cached in their browser's
  `localStorage`) can see stats or delete early.
- **Rate limiting**: `@upstash/ratelimit` sliding-window limiters cap note creation (10/min/IP)
  and viewing/polling (60/min/IP) to blunt abuse and scraping.
- **Security headers**: CSP, X-Frame-Options, nosniff, and a locked-down Permissions-Policy
  are set globally in `next.config.js`.

## Project structure

```
levpriv/
├── app/
│   ├── layout.tsx              # Root layout, dark mode, Inter font
│   ├── globals.css             # Tailwind + minimal custom styles
│   ├── page.tsx                # Home: note creation form
│   ├── not-found.tsx           # Custom 404
│   ├── note/[slug]/page.tsx    # Public note viewer (countdown, private key prompt)
│   ├── manage/[slug]/page.tsx  # Owner-only management view (stats, delete)
│   └── api/
│       ├── notes/route.ts             # POST: create note
│       └── notes/[slug]/route.ts      # GET: metadata, POST: reveal content, DELETE: destroy
├── lib/
│   ├── redis.ts        # Upstash Redis client
│   ├── crypto.ts       # AES-256-GCM encrypt/decrypt, PBKDF2, hashing
│   ├── slug.ts          # Base62 slug generator
│   ├── ratelimit.ts     # Sliding-window rate limiters
│   ├── duration.ts      # Duration presets, validation, countdown formatting
│   └── types.ts         # Shared TypeScript types
├── vercel.json
├── next.config.js
├── tailwind.config.ts
├── package.json
└── .env.example
```

## Setup & local development

### 1. Prerequisites
- Node.js 18.18+ (20.x recommended)
- A free [Upstash](https://console.upstash.com) account for Redis

### 2. Install
```bash
npm install
```

### 3. Create an Upstash Redis database
1. Go to https://console.upstash.com → **Create Database**.
2. Choose the **Regional** or **Global** free tier (either works — TTL/eviction not needed
   since we set per-key TTLs ourselves).
3. Copy the **REST URL** and **REST TOKEN** from the database details page.

### 4. Configure environment variables
```bash
cp .env.example .env.local
```
Fill in:
```
UPSTASH_REDIS_REST_URL=https://xxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxxxxxxx
SERVER_ENCRYPTION_KEY=<generate with: openssl rand -hex 32>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 5. Run locally
```bash
npm run dev
```
Visit http://localhost:3000.

## Deploying to Vercel

### Option A — via the Vercel dashboard (recommended for first deploy)
1. Push this project to a GitHub repository.
2. Go to https://vercel.com/new and import the repo.
3. Vercel auto-detects Next.js — no build settings need changing.
4. **Add environment variables** under Project Settings → Environment Variables:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
   - `SERVER_ENCRYPTION_KEY` (generate a fresh one for production — don't reuse your local one)
   - `NEXT_PUBLIC_APP_URL` — set to your actual deployment URL, e.g.
     `https://levpriv.vercel.app` (update this once Vercel assigns your domain, then redeploy)
5. Click **Deploy**.

**Easier alternative for Redis**: In the Vercel dashboard, go to your project → **Storage** →
**Browse Marketplace** → **Upstash**. This provisions a Redis database and auto-injects
`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` into your project for you — skip
step 3 above if you do this.

### Option B — via Vercel CLI
```bash
npm i -g vercel
vercel login
vercel                # first deploy, follow prompts
vercel env add UPSTASH_REDIS_REST_URL production
vercel env add UPSTASH_REDIS_REST_TOKEN production
vercel env add SERVER_ENCRYPTION_KEY production
vercel env add NEXT_PUBLIC_APP_URL production
vercel --prod         # redeploy with env vars applied
```

## Connecting a custom domain later

1. Buy a domain (Namecheap, Cloudflare Registrar, Google Domains successor, etc.) —
   anything that lets you edit DNS records.
2. In the Vercel dashboard: your project → **Settings** → **Domains** → add your domain
   (e.g. `levpriv.com`).
3. Vercel will show you either:
   - An **A record** (`76.76.21.21`) to point the root domain, or
   - A **CNAME** (`cname.vercel-dns.com`) for a subdomain like `note.levpriv.com`.
4. Add that record in your domain registrar's DNS settings.
5. Wait for DNS propagation (usually minutes, sometimes up to a few hours). Vercel
   auto-issues an SSL certificate once it verifies the record.
6. Update the `NEXT_PUBLIC_APP_URL` environment variable to your new domain and redeploy —
   this is what's used to build the shareable links returned to users.

## Testing checklist

**Expiration**
1. Create a note with the 3-minute preset.
2. Open the note link — content should display with a live countdown.
3. Wait past 3 minutes (or temporarily set a custom duration of 1 minute to test faster).
4. Refresh the note link — should show "This note has self-destructed."

**Manual deletion**
1. Create a note, copy the **management link** shown after creation.
2. Open the management link — should show views, created/expiry timestamps, and a
   delete button.
3. Click **Delete note now** → **Confirm delete**.
4. Open the original note link — should show the self-destructed message immediately,
   even though the timer hadn't run out.

**Private key flow**
1. Create a note and fill in the "Private key" field, e.g. `test1234`.
2. Open the note link in an incognito window — should prompt "This note is protected."
3. Enter the wrong key — should show "Incorrect private key."
4. Enter the correct key — content should reveal and the view counter should increment.

**View count**
1. Create a note without a private key.
2. Open the link 3 times (refresh each time, or open in different browsers/incognito).
3. Open the **management link** — "Views" should read 3.

**Rate limiting**
1. Rapidly submit the creation form more than 10 times within a minute from the same
   network — the 11th request should return "Too many notes created."

**Burn after reading**
1. Create a note with "Delete immediately after being read once" checked.
2. Open the note link — content displays, and the footer note says it's been destroyed.
3. Refresh the same link — should immediately show "self-destructed," even though the
   timer hadn't run out.

**Extend expiration**
1. Create a short note (e.g. 3 minutes), open its management link.
2. Click one of the extend buttons (e.g. "+10 minutes").
3. The "Expires" and "Self-destructs in" rows should update, and a toast should confirm
   "Expiration extended."

**Dashboard**
1. Create two or three notes in the same browser.
2. Visit `/dashboard` — all of them should be listed with live status and remaining time.
3. Delete one from the dashboard directly — its status should flip to "Deleted."

**Wrong-key lockout**
1. Create a note with a private key.
2. On the note link, enter the wrong key 5 times in a row.
3. The 6th attempt (even with the correct key) should return a temporary lockout message.
   Wait 5 minutes, or test with a shorter window temporarily in `lib/ratelimit.ts` if you
   don't want to wait.

**Bot honeypot**
- This one is hard to trigger manually since the honeypot field is invisible in normal use —
  it's mainly there for scripted/automated submissions. No manual test needed unless you
  want to fill the hidden `website` field via browser dev tools to confirm it's rejected.

## Upgrading bot protection later

The current honeypot + timing-trap approach requires no external accounts and works out of
the box, but it won't stop a determined scripted attacker. If abuse becomes a real problem,
swap in [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/) (free, no
login walls for end users) — it needs a site key and secret key from a free Cloudflare
account, added as two more environment variables, plus a small widget added to the create
form and a server-side verification call in `app/api/notes/route.ts`. Ask me when you're
ready to wire it in.

## Notes on the encryption model

- Losing the private key means the note is **unrecoverable** — this is by design, since the
  server never stores it. Make sure this is communicated to users if you extend the UI.
- Rotating `SERVER_ENCRYPTION_KEY` in production will make any notes *not* using a private
  key (i.e., encrypted with the server key) undecryptable. Only rotate it if you're okay
  invalidating in-flight notes, or if you build a re-encryption migration.

## Future-proofing for a mobile app

- All state-changing logic lives behind the `/api/notes` and `/api/notes/[slug]` REST
  endpoints — a React Native or TWA (Trusted Web Activity) client can call these directly
  with no changes needed.
- The web app itself is installable as a PWA-lite today (add a `manifest.json` and service
  worker if you want home-screen installability without a full native shell).
- `lib/types.ts` is the single source of truth for the request/response shapes — share this
  file (or regenerate it) in a future mobile client to keep both in sync.
