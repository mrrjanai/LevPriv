import { Lock } from 'lucide-react'

export function PadlockIcon({ size = 56 }: { size?: number }) {
  return (
    <div
      className="relative flex items-center justify-center mx-auto icon-pop"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 60 60"
        fill="none"
        className="absolute inset-0"
        aria-hidden="true"
      >
        <circle cx="30" cy="30" r="27" stroke="#222222" strokeWidth="1.5" />
      </svg>
      <Lock size={size * 0.36} strokeWidth={1.75} className="relative text-base-white" />
    </div>
  )
}
