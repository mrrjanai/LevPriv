'use client'

interface ToastProps {
  message: string | null
}

export function Toast({ message }: ToastProps) {
  if (!message) return null

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-base-white text-base-black text-sm px-5 py-3 rounded-md shadow-lg z-50 animate-fadeIn"
      role="status"
    >
      {message}
    </div>
  )
}
