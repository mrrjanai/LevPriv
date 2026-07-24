'use client'

import { formatBytes } from '@/lib/media'
import type { PublicAttachmentMeta } from '@/lib/types'
import { File as FileIcon, ExternalLink } from 'lucide-react'

interface AttachmentPlayerProps {
  attachment: PublicAttachmentMeta
  mediaSrc: string
}

function preventContextMenu(e: React.MouseEvent) {
  e.preventDefault()
}

export function AttachmentPlayer({ attachment, mediaSrc }: AttachmentPlayerProps) {
  if (attachment.kind === 'audio') {
    return (
      <div className="border border-base-border rounded-md px-4 py-3" onContextMenu={preventContextMenu}>
        <audio
          controls
          controlsList="nodownload noremoteplayback"
          src={mediaSrc}
          className="w-full"
        >
          Your browser does not support audio playback.
        </audio>
      </div>
    )
  }

  if (attachment.kind === 'video') {
    return (
      <div onContextMenu={preventContextMenu}>
        <video
          controls
          controlsList="nodownload noremoteplayback"
          disablePictureInPicture
          src={mediaSrc}
          className="w-full rounded-md border border-base-border bg-black"
        >
          Your browser does not support video playback.
        </video>
      </div>
    )
  }

  if (attachment.kind === 'image') {
    return (
      <div
        className="border border-base-border rounded-md overflow-hidden select-none"
        onContextMenu={preventContextMenu}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={mediaSrc}
          alt={attachment.fileName}
          draggable={false}
          className="w-full h-auto select-none pointer-events-none"
        />
      </div>
    )
  }

  // Generic file: no universal inline preview, and browsers necessarily
  // download/cache the bytes to open most file types. Being upfront about
  // this rather than pretending it's protected.
  return (
    <div className="border border-base-border rounded-md px-4 py-4">
      <div className="flex items-center gap-3">
        <FileIcon size={18} className="text-base-muted shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-base-white truncate">{attachment.fileName}</p>
          <p className="text-xs text-base-muted">{formatBytes(attachment.sizeBytes)}</p>
        </div>
      </div>
      
        href={mediaSrc}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 mt-3 border border-base-border rounded-md py-2.5 text-sm hover:border-base-mid transition-colors"
      >
        <ExternalLink size={14} />
        Open file
      </a>
      <p className="text-xs text-base-muted mt-3">
        This file type can't be previewed in-page, so opening it will use your browser or
        device's normal file handling — which may involve a temporary download to view it.
        The link above stops working once this note expires.
      </p>
    </div>
  )
}