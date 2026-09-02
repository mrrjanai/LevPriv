'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

interface CopyButtonProps {
  text: string
  label?: string
  copiedLabel?: string
  variant?: 'filled' | 'outline'
  className?: string
}

export function CopyButton({
  text,
  label = 'Copy',
  copiedLabel = 'Copied',
  variant = 'filled',
  className = '',
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard API unavailable  -  fail silently, button just won't confirm.
    }
  }

  const base =
    variant === 'filled'
      ? 'bg-base-white text-base-black hover:bg-base-muted'
      : 'border border-base-border text-base-white hover:border-base-mid'

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`shrink-0 flex items-center gap-1.5 text-sm px-4 py-2.5 rounded-md transition-colors ${base} ${className}`}
    >
      {copied ? <Check size={15} /> : <Copy size={15} />}
      {copied ? copiedLabel : label}
    </button>
  )
}
