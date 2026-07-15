'use client'

import { useCallback, useRef, useState } from 'react'

export function useToast(durationMs = 2500) {
  const [message, setMessage] = useState<string | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = useCallback(
    (text: string) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      setMessage(text)
      timeoutRef.current = setTimeout(() => setMessage(null), durationMs)
    },
    [durationMs]
  )

  return { message, showToast }
}
