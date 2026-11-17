type IconProps = { className?: string }

function baseProps(className: string) {
  return {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    'aria-hidden': true,
  }
}

export function MicIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...baseProps(className)}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3" />
    </svg>
  )
}

export function StopIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...baseProps(className)} fill="currentColor" stroke="none">
      <rect x="6" y="6" width="12" height="12" rx="2.5" />
    </svg>
  )
}

export function PlayIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...baseProps(className)} fill="currentColor" stroke="none">
      <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" />
    </svg>
  )
}

export function PauseIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...baseProps(className)} fill="currentColor" stroke="none">
      <rect x="6.5" y="5" width="4" height="14" rx="1.2" />
      <rect x="13.5" y="5" width="4" height="14" rx="1.2" />
    </svg>
  )
}

export function UploadIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...baseProps(className)}>
      <path d="M12 16V4M7 9l5-5 5 5M5 20h14" />
    </svg>
  )
}

export function ChevronLeftIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...baseProps(className)}>
      <path d="m15 5-7 7 7 7" />
    </svg>
  )
}

export function LogoutIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...baseProps(className)}>
      <path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M15 8l4 4-4 4M19 12H9" />
    </svg>
  )
}

export function CupIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...baseProps(className)}>
      <path d="M5 10h11v4a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z" />
      <path d="M16 12h1.5a2.5 2.5 0 0 1 0 5H16M9 3c-1 1.5 1 2.5 0 4M12.5 3c-1 1.5 1 2.5 0 4" />
    </svg>
  )
}
