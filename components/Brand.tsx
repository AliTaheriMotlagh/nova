export function NovaMark({ size = 30 }: { size?: number }) {
  return (
    <span
      className="nova-mark"
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.3) }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 32 32" width={size * 0.62} height={size * 0.62} fill="none">
        <path
          d="M8 23V9l16 14V9"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function NovaLogo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="nova-logo">
      <NovaMark />
      {!compact && (
        <span className="nova-wordmark">
          nova<span>studio</span>
        </span>
      )}
    </span>
  );
}
