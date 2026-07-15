import Link from 'next/link'

export function Navbar() {
  return (
    <header className="w-full border-b border-base-border">
      <div className="max-w-2xl mx-auto px-6 py-5 flex flex-wrap items-center justify-between gap-y-3">
        <Link
          href="/"
          className="font-display text-xl tracking-tight text-base-white hover:text-base-muted transition-colors"
        >
          LevPriv
        </Link>
        <nav className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1.5 text-xs text-base-muted">
          <Link href="/dashboard" className="hover:text-base-white transition-colors">
            My notes
          </Link>
          <Link href="/about" className="hover:text-base-white transition-colors">
            About
          </Link>
          <Link href="/faq" className="hover:text-base-white transition-colors">
            FAQ
          </Link>
          <Link href="/privacy" className="hover:text-base-white transition-colors">
            Privacy
          </Link>
          <Link href="/contact" className="hover:text-base-white transition-colors">
            Contact
          </Link>
        </nav>
      </div>
    </header>
  )
}
