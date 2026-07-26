interface Props {
  size?: number
  className?: string
  showText?: boolean
}

export default function RoshanLogo({ size = 48, className = '', showText = false }: Props) {
  const iconSize = size
  const innerSize = iconSize * 0.52

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        <defs>
          <linearGradient id="rd-bg" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="50%" stopColor="#7C3AED" />
            <stop offset="100%" stopColor="#2563EB" />
          </linearGradient>
          <linearGradient id="rd-inner" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#E0E7FF" />
          </linearGradient>
          <linearGradient id="rd-bolt" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#D4A017" />
          </linearGradient>
          <filter id="rd-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#2563EB" floodOpacity="0.3" />
          </filter>
        </defs>

        <rect x="4" y="4" width="92" height="92" rx="22" fill="url(#rd-bg)" filter="url(#rd-shadow)" />

        <rect x="8" y="8" width="84" height="84" rx="20" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />

        <text
          x="50"
          y="58"
          textAnchor="middle"
          dominantBaseline="middle"
          fill="url(#rd-inner)"
          fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
          fontWeight="800"
          fontSize="42"
          letterSpacing="-2"
        >
          R
        </text>

        <circle cx="78" cy="22" r="6" fill="url(#rd-bolt)" opacity="0.9" />

        <path
          d="M78 16L75 22H81L78 28"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity="0.9"
        />
      </svg>

      {showText && (
        <div className="flex flex-col">
          <span className="font-bold text-gray-900 leading-tight" style={{ fontSize: iconSize * 0.25 }}>
            Roshan
          </span>
          <span className="font-medium text-blue-600 leading-tight" style={{ fontSize: iconSize * 0.18 }}>
            Digital
          </span>
        </div>
      )}
    </div>
  )
}
