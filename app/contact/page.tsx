import { Mail } from 'lucide-react'

// TODO: replace with your real contact email before deploying.
const CONTACT_EMAIL = 'hello@levpriv.app'

export default function ContactPage() {
  return (
    <main className="flex-1 px-6 py-16">
      <div className="w-full max-w-2xl mx-auto animate-fadeIn">
        <h1 className="font-display text-3xl tracking-tight mb-3">Contact</h1>
        <p className="text-base-muted text-sm mb-10">
          Questions, feedback, or something not working the way it should  -  reach out directly.
        </p>

        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="flex items-center gap-3 border border-base-border rounded-md px-5 py-4 hover:border-base-mid transition-colors max-w-sm"
        >
          <Mail size={18} className="text-base-muted shrink-0" />
          <span className="text-sm text-base-white">{CONTACT_EMAIL}</span>
        </a>

        <p className="text-xs text-base-muted mt-6">
          We aim to respond within a few business days. For anything involving a note you
          created, it helps to include the note's slug (the random characters at the end of its
          link)  -  never the note's content or private key itself.
        </p>
      </div>
    </main>
  )
}
