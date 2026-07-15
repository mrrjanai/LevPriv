export function SuccessTick({ size = 56 }: { size?: number }) {
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
      <path
        d="M17 31 L26 40 L44 20"
        stroke="#FFFFFF"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="46"
        strokeDashoffset="46"
        className="draw-stroke-delay"
      />
    </svg>
  )
}
