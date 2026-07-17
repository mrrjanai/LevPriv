import Link from 'next/link'

export function Navbar() {
  return (
    <header className="w-full border-b border-base-border">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between gap-3">
        <Link
          href="/"
          className="font-display text-lg sm:text-xl tracking-tight text-base-white hover:text-base-muted transition-colors shrink-0"
        >
          LevPriv
        </Link>
        <nav className="flex items-center gap-x-3 sm:gap-x-4 text-[11px] sm:text-xs text-base-muted overflow-x-auto whitespace-nowrap scrollbar-none">
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