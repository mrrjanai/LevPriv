export default function TermsPage() {
  return (
    <main className="flex-1 px-6 py-16">
      <div className="w-full max-w-2xl mx-auto animate-fadeIn">
        <h1 className="font-display text-3xl tracking-tight mb-3">Terms of Service</h1>
        <p className="text-base-muted text-sm mb-10">Last updated: September 2026</p>

        <div className="space-y-8 text-sm leading-relaxed">
          <section>
            <h2 className="text-base-white font-medium mb-2">Acceptance of terms</h2>
            <p className="text-base-muted">
              By using LevPriv, you agree to these terms. If you do not agree, please do not use
              the service.
            </p>
          </section>

          <section>
            <h2 className="text-base-white font-medium mb-2">What LevPriv is</h2>
            <p className="text-base-muted">
              LevPriv is a tool for sharing text, audio, video, photo, and file content that
              automatically expires. It requires no account to use. Ownership of a note is
              controlled entirely by whoever holds its secret management link - if that link is
              lost, the note cannot be recovered or modified by us on your behalf.
            </p>
          </section>

          <section>
            <h2 className="text-base-white font-medium mb-2">Acceptable use</h2>
            <p className="text-base-muted mb-2">You agree not to use LevPriv to store or share:</p>
            <ul className="list-disc list-inside text-base-muted space-y-1">
              <li>Content that is illegal in your jurisdiction or ours</li>
              <li>Child sexual abuse material, in any form</li>
              <li>Content intended to harass, threaten, or exploit another person</li>
              <li>Malware, or content intended to facilitate unauthorized access to systems</li>
              <li>Content that infringes someone else's intellectual property rights</li>
            </ul>
            <p className="text-base-muted mt-2">
              We reserve the right to delete any note we become aware of that violates these
              terms, without notice.
            </p>
          </section>

          <section>
            <h2 className="text-base-white font-medium mb-2">No warranty</h2>
            <p className="text-base-muted">
              LevPriv is provided "as is," without warranty of any kind. We do not guarantee
              uninterrupted availability, that notes will always be recoverable within their
              stated lifespan, or that the service is free of bugs. Given content is encrypted
              and self-destructing by design, we cannot recover lost or prematurely deleted notes
              under any circumstances.
            </p>
          </section>

          <section>
            <h2 className="text-base-white font-medium mb-2">Limitation of liability</h2>
            <p className="text-base-muted">
              To the fullest extent permitted by law, LevPriv and its creator are not liable for
              any damages arising from your use of the service, including but not limited to lost
              data, lost private keys, or content shared without your intended recipient's
              consent.
            </p>
          </section>

          <section>
            <h2 className="text-base-white font-medium mb-2">Your responsibility</h2>
            <p className="text-base-muted">
              You are solely responsible for the content you create and share through LevPriv,
              and for safeguarding any private key or management link you generate. We cannot
              reset, recover, or bypass either on your behalf.
            </p>
          </section>

          <section>
            <h2 className="text-base-white font-medium mb-2">Changes to these terms</h2>
            <p className="text-base-muted">
              These terms may be updated from time to time. Continued use of LevPriv after a
              change constitutes acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-base-white font-medium mb-2">Contact</h2>
            <p className="text-base-muted">
              Questions about these terms can be sent via the{' '}
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