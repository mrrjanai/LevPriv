export interface DurationPreset {
  label: string
  seconds: number
}

export const DURATION_PRESETS: DurationPreset[] = [
  { label: '3 minutes', seconds: 3 * 60 },
  { label: '10 minutes', seconds: 10 * 60 },
  { label: '1 hour', seconds: 60 * 60 },
  { label: '24 hours', seconds: 24 * 60 * 60 },
  { label: '7 days', seconds: 7 * 24 * 60 * 60 },
]

export const MIN_DURATION_SECONDS = 60 // 1 minute floor
export const MAX_DURATION_SECONDS = 30 * 24 * 60 * 60 // 30 day ceiling
export const MAX_CONTENT_LENGTH = 20_000 // characters
export const CONTENT_LENGTH_WARNING_THRESHOLD = 0.9 // 90% of max triggers warning color

export const EXTEND_PRESETS: DurationPreset[] = [
  { label: '+10 minutes', seconds: 10 * 60 },
  { label: '+1 hour', seconds: 60 * 60 },
  { label: '+24 hours', seconds: 24 * 60 * 60 },
]

export function isValidDuration(seconds: number): boolean {
  return (
    Number.isFinite(seconds) &&
    Number.isInteger(seconds) &&
    seconds >= MIN_DURATION_SECONDS &&
    seconds <= MAX_DURATION_SECONDS
  )
}

export function formatRemaining(msRemaining: number): string {
  if (msRemaining <= 0) return '0s'
  const totalSeconds = Math.floor(msRemaining / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const parts: string[] = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0 || days > 0) parts.push(`${hours}h`)
  if (minutes > 0 || hours > 0 || days > 0) parts.push(`${minutes}m`)
  parts.push(`${seconds}s`)
  return parts.join(' ')
}
