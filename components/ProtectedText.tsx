'use client'

import { useState } from 'react'
import { WatermarkOverlay } from './WatermarkOverlay'
import type { ViewWatermark } from '@/lib/types'

interface ProtectedTextProps {
  content: string
  watermark: ViewWatermark
}

export function ProtectedText({ content, watermark }: ProtectedTextProps) {
  const [revealed, setRevealed] = useState(false)

  function blockClipboard(e: React.ClipboardEvent) {
    e.preventDefault()
  }

  function blockContextMenu(e: React.MouseEvent) {
    e.preventDefault()
  }

  function blockShortcuts(e: React.KeyboardEvent) {
    const key = e.key.toLowerCase()
    if ((e.ctrlKey || e.metaKey) && ['c', 'x', 'a', 's', 'p'].includes(key)) {
      e.preventDefault()
    }
  }

  return (
    <div
      className="relative bg-base-near border border-base-border rounded-md overflow-hidden"
      onCopy={blockClipboard}
      onCut={blockClipboard}
      onContextMenu={blockContextMenu}
      onKeyDown={blockShortcuts}
      tabIndex={0}
    >
      <div
        onClick={() => setRevealed(true)}
        className={`px-5 py-4 whitespace-pre-wrap break-words text-sm leading-relaxed select-none transition-all duration-200 ${
          revealed ? '' : 'blur-md cursor-pointer'
        }`}
        style={{ WebkitUserSelect: 'none', userSelect: 'none' }}
      >
        {content}
      </div>

      {!revealed && (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="absolute inset-0 flex items-center justify-center bg-base-black/30 text-xs text-base-white"
        >
          Tap to view
        </button>
      )}

      <WatermarkOverlay ip={watermark.ip} viewedAt={watermark.viewedAt} viewId={watermark.viewId} />
    </div>
  )
}