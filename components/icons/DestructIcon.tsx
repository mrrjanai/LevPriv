export function DestructIcon({ size = 56 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 60 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="mx-auto"
    >
      <circle cx="30" cy="30" r="27" stroke="#222222" strokeWidth="1.5" className="icon-ring" />
      <line
        x1="19"
        y1="19"
        x2="41"
        y2="41"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="34"
        strokeDashoffset="34"
        className="draw-stroke"
      />
      <line
        x1="41"
        y1="19"
        x2="19"
        y2="41"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="34"
        strokeDashoffset="34"
        className="draw-stroke-delay"
      />
    </svg>
  )
}
