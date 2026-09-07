# Case Study: Debugging a Phantom Platform Bug in LevPriv's File Uploads

**Or: how a confusing CORS error turned out to be a one-word configuration mismatch, and what it took to find that out.**

## The problem

LevPriv is a self-destructing notes app - write something, share a link, it disappears on its own. Partway through building it, I decided to add support for audio, video, photo, and file attachments, recorded or uploaded directly in the browser.

That decision ran headfirst into a real infrastructure constraint: Vercel's serverless functions cap request bodies at roughly 4.5MB, on every plan, with no way to configure around it. To support attachments up to 20MB, the file couldn't pass through my own server at all - it had to go directly from the browser to storage.

## First attempt: direct-to-storage uploads

Vercel Blob has a documented pattern for exactly this: the browser requests a short-lived upload token from your server, then uploads the file straight to Blob's storage, bypassing your serverless functions entirely. I wired this up following their docs closely.

It failed immediately, with this in the browser console:

```
Access to fetch at 'https://blob.vercel-storage.com/?pathname=...' from origin
'https://lev-priv.vercel.app' has been blocked by CORS policy: No
'Access-Control-Allow-Origin' header is present on the requested resource.
```

## Chasing the wrong lead

CORS errors usually mean a server misconfiguration on the *receiving* end - something Vercel's own infrastructure would need to fix, not something in my code. I searched for the exact error and found an active Vercel Community thread, posted just days earlier, describing the identical symptom on the identical (and latest) version of the SDK. A Vercel staff member had responded that it needed internal investigation. No fix, no workaround offered.

At that point, the reasonable conclusion was: this is a real, currently unresolved bug in Vercel's platform. Not something I could fix by writing better code.

## The pragmatic pivot

Rather than wait on a platform fix with no timeline, I changed strategy: proxy the upload through my own server after all, accepting the 4.5MB function limit as a hard ceiling, and lower the attachment cap from a planned 20MB down to 4MB. Not the original goal, but a real, working feature beats a theoretically-larger one that doesn't function at all.

This actually worked - files uploaded, attachments played back, the feature shipped. But it came with an error I hadn't seen before, surfaced clearly for the first time because the server-side `put()` call reports failures more explicitly than the client-side token flow did:

```
Vercel Blob: Cannot use public access on a private store. The store is
configured with private access.
```

## The actual breakthrough

That error was the whole answer, sitting there in plain language. My Blob store had been created with **private** access (a newer default in Vercel's Blob offering), but every upload call across the entire project - both the abandoned direct-upload attempt and the new proxy path - was requesting `access: 'public'`.

Once I fixed the proxy path to use `access: 'private'`, uploads worked immediately. But the real question was bigger than that one fix: **was the "unresolved platform bug" from the community thread ever a platform bug at all, or was it this exact same mismatch, just surfacing as an opaque CORS error instead of a clear one?**

Digging into how Vercel Blob's client-upload token flow actually authorizes access, the answer became clear: the `access` value for a *client*-initiated upload is set by the client's own `upload()` call, not dictated purely by the server. If the browser requests `public` access against a store that's actually `private`, the mismatch gets rejected in a way that manifests as a browser-side CORS failure rather than a clean server error message - because the rejection happens at Vercel's edge, before the browser's own CORS preflight logic ever gets a proper answer to work with.

## Reverting the "unfixable" conclusion

Armed with that theory, I reverted to the original direct-to-Blob approach - the one I'd abandoned as blocked by an unfixable platform bug - and set `access: 'private'` explicitly in the client upload call this time.

It worked. Full 20MB uploads, direct browser-to-storage, no server proxy limitation at all.

The bug was never in Vercel's platform. It was a one-word mismatch between what my code was requesting and how my own storage was actually configured - and the error surfaced through browser CORS machinery in a way that made it look like something else entirely.

## What this actually demonstrates

- **A CORS error is often not the real error.** It's frequently just how the browser reports a rejection whose actual cause happened somewhere else - a server-side auth check, an access-mode mismatch, a token that doesn't match what's being requested. Treating the browser's error message as the full story cost real time here.
- **"Someone else already reported this as unfixable" is evidence, not proof.** A community thread with no confirmed root cause is a hypothesis, not a conclusion - it was worth revisiting once new, more specific evidence appeared.
- **A clearer error message from a different code path can retroactively explain an earlier, murkier one.** The server-side `put()` call's plain-language error was the key that unlocked understanding the client-side failure from days earlier - they were the same bug, just reported differently by different parts of the same SDK.
- **Shipping the smaller, working version first wasn't a failure - it was what surfaced the real error that led to the actual fix.** Chasing the ideal 20MB solution without ever shipping the working 4MB fallback would have meant staying stuck on the confusing CORS error indefinitely.

## Related fixes from the same debugging session

A few other issues surfaced and were resolved during this same stretch of work, each worth a one-line mention:

- **A codec-qualified MIME type validation bug**: recorded audio/video comes tagged as e.g. `audio/webm;codecs=opus`, but an allow-list check was doing an exact string match against the bare `audio/webm` - rejecting every single recording before it ever reached the server.
- **A missing `Content-Length` header**: after switching to reading from the private store via the Blob SDK's `get()` function, the response stream was missing its length header, which caused some browsers to reject audio/video playback outright as an unsupported format, despite the file being perfectly valid.
- **Text encoding corruption across a dozen files**: a PowerShell script written to strip an invisible byte-order-mark from source files inadvertently corrupted em dashes and other non-ASCII characters into garbled multi-byte sequences, requiring a second targeted pass (built from explicit character codes rather than the fragile glyphs themselves) to fully repair.

## Outcome

LevPriv now supports 20MB audio, video, photo, and file attachments, uploaded directly from the browser to a private Vercel Blob store, streamed back through a token-gated server route that never exposes the underlying storage URL. The whole feature is built on infrastructure that, for a few days, looked like it might not be usable at all.
