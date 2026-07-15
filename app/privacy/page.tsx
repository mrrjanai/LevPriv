export default function PrivacyPage() {
  return (
    <main className="flex-1 px-6 py-16">
      <div className="w-full max-w-2xl mx-auto animate-fadeIn">
        <h1 className="font-display text-3xl tracking-tight mb-3">Privacy Policy</h1>
        <p className="text-base-muted text-sm mb-10">Last updated: July 2026</p>

        <div className="space-y-8 text-sm leading-relaxed">
          <section>
            <h2 className="text-base-white font-medium mb-2">What we store</h2>
            <p className="text-base-muted">
              When you create a note, we store its encrypted content, an expiration timestamp,
              a view count, and a hashed ownership token — nothing else. We do not require or
              collect a name, email address, or any account information to use LevPriv.
            </p>
          </section>

          <section>
            <h2 className="text-base-white font-medium mb-2">Encryption</h2>
            <p className="text-base-muted">
              Note content is always encrypted before it is stored. If you set a private key on
              a note, the encryption key is derived from that passphrase, and we never store the
              passphrase itself — meaning we cannot decrypt that note without it either.
              Otherwise, content is encrypted using a server-side key, which still keeps it
              unreadable in the underlying database.
            </p>
          </section>

          <section>
            <h2 className="text-base-white font-medium mb-2">Automatic deletion</h2>
            <p className="text-base-muted">
              Every note is stored with an expiration you choose — from a few minutes up to
              several days. Notes are automatically and permanently deleted once that time
              passes, once the creator deletes them manually, or immediately after being read
              once if "delete after reading" was enabled. We do not keep backups of expired or
              deleted notes.
            </p>
          </section>

          <section>
            <h2 className="text-base-white font-medium mb-2">IP addresses and rate limiting</h2>
            <p className="text-base-muted">
              To prevent abuse, we temporarily process your IP address when you create or view
              notes, solely to enforce rate limits (capping how many requests can be made in a
              short window). This is not linked to note content and is not retained as a
              permanent log tied to your identity.
            </p>
          </section>

          <section>
            <h2 className="text-base-white font-medium mb-2">Local storage (browser)</h2>
            <p className="text-base-muted">
              Your browser may save a local list of notes you've created, so the "My notes"
              dashboard can show their status without requiring an account. This list lives only
              in your browser and is never transmitted to us as a data set — clearing your
              browser storage clears it, without affecting the notes themselves on the server.
            </p>
          </section>

          <section>
            <h2 className="text-base-white font-medium mb-2">No advertising, no tracking, no selling data</h2>
            <p className="text-base-muted">
              We do not run analytics trackers on note content, sell data to third parties, or
              use note content for any purpose beyond delivering it to whoever holds the link.
            </p>
          </section>

          <section>
            <h2 className="text-base-white font-medium mb-2">Changes to this policy</h2>
            <p className="text-base-muted">
              If this policy changes, the updated version will be posted on this page with a
              new "last updated" date.
            </p>
          </section>

          <section>
            <h2 className="text-base-white font-medium mb-2">Questions</h2>
            <p className="text-base-muted">
              If you have questions about how LevPriv handles data, reach out via the{' '}
              <a href="/contact" className="text-base-white hover:underline">
                Contact page
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
