export function LogoMark({ size = 26 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="shrink-0"
    >
      <rect x="30" y="24" width="11" height="44" rx="2.5" fill="#FFFFFF" />
      <rect x="30" y="57" width="28" height="11" rx="2.5" fill="#FFFFFF" />
      <rect x="64" y="58.5" width="8" height="8" rx="2" fill="#FFFFFF" opacity="0.7" />
      <rect x="76" y="60.5" width="6" height="6" rx="1.5" fill="#888888" opacity="0.55" />
      <rect x="86" y="62" width="4" height="4" rx="1" fill="#888888" opacity="0.3" />
    </svg>
  )
}
