'use client'

import { useEffect, useRef, useState } from 'react'
import { Share2 } from 'lucide-react'

interface ShareButtonProps {
  url: string
  title?: string
}

export function ShareButton({ url, title = 'A private note' }: ShareButtonProps) {
  const [canNativeShare, setCanNativeShare] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setCanNativeShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function')
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  async function handleClick() {
    if (canNativeShare) {
      try {
        await navigator.share({ title, url })
      } catch {
        // User cancelled the share sheet â€” no action needed.
      }
    } else {
      setMenuOpen((v) => !v)
    }
  }

  const encodedUrl = encodeURIComponent(url)
  const encodedTitle = encodeURIComponent(title)

  const fallbackLinks = [
    { label: 'WhatsApp', href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}` },
    { label: 'Telegram', href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}` },
    { label: 'X (Twitter)', href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}` },
    { label: 'Email', href: `mailto:?subject=${encodedTitle}&body=${encodedUrl}` },
  ]

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={handleClick}
        className="w-full flex items-center justify-center gap-2 border border-base-border rounded-md py-2.5 text-sm text-base-white hover:border-base-mid transition-colors"
      >
        <Share2 size={15} />
        Share
      </button>

      {menuOpen && !canNativeShare && (
        <div className="absolute left-0 right-0 mt-2 bg-base-near border border-base-border rounded-md overflow-hidden z-10 animate-fadeIn">
          {fallbackLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMenuOpen(false)}
              className="block px-4 py-2.5 text-sm text-base-white hover:bg-base-panel transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
