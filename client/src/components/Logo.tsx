/**
 * ReMedi logo: a soft gradient badge with a geometric "R" whose bowl curves
 * back on itself like a reuse loop, plus a small pulse/heart accent dot.
 */
export function LogoMark({ size = 40, className = '' }: { size?: number; className?: string }) {
  const gid = 'rm-grad';
  const sgid = 'rm-shine';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="ReMedi logo"
      role="img"
    >
      <defs>
        {/* NHS Blue → NHS Dark Blue */}
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#005EB8" />
          <stop offset="100%" stopColor="#003087" />
        </linearGradient>
        <linearGradient id={sgid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.35)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>
      {/* Badge */}
      <rect x="0" y="0" width="48" height="48" rx="12" fill={`url(#${gid})`} />
      {/* Subtle top sheen */}
      <rect x="0" y="0" width="48" height="22" rx="12" fill={`url(#${sgid})`} />
      {/* R letterform: stem + bowl that loops back + leg */}
      <g
        stroke="#ffffff"
        strokeWidth="3.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        {/* stem */}
        <path d="M14 12 L14 36" />
        {/* bowl + reuse loop: arc back through stem */}
        <path d="M14 12 L24 12 A8 8 0 0 1 24 28 L14 28" />
        {/* leg */}
        <path d="M22 28 L32 36" />
      </g>
      {/* NHS Green reuse accent — moderate use, signals the sustainability angle. */}
      <circle cx="35" cy="13" r="3" fill="#009639" />
    </svg>
  );
}

/** Inline wordmark in Space Grotesk, mixed weight for "Re" / "Medi". */
export function LogoWordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`font-display tracking-tight leading-none ${className}`}>
      <span className="font-normal">Re</span>
      <span className="font-bold">Medi</span>
    </span>
  );
}

export function Logo({ size = 36 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark size={size} />
      <div className="flex flex-col">
        <LogoWordmark className="text-lg" />
        <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-400">
          NHS device reuse
        </span>
      </div>
    </div>
  );
}
