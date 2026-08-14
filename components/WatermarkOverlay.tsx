interface WatermarkOverlayProps {
  ip: string
  viewedAt: number
  viewId: string
}

export function WatermarkOverlay({ ip, viewedAt, viewId }: WatermarkOverlayProps) {
  const label = `${ip} Â· ${new Date(viewedAt).toLocaleString(undefined, {
    dateStyle: 'short',
    timeStyle: 'short',
  })} Â· #${viewId}`

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none overflow-hidden select-none"
      style={{ opacity: 0.09 }}
    >
      <div
        className="absolute inset-0 flex flex-wrap content-around justify-around"
        style={{ transform: 'rotate(-22deg) scale(1.5)' }}
      >
        {Array.from({ length: 12 }).map((_, i) => (
          <span key={i} className="text-[10px] whitespace-nowrap text-base-white px-4 py-2">
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}