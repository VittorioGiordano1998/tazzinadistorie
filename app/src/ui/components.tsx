import type { ButtonHTMLAttributes, ComponentProps, InputHTMLAttributes, ReactNode } from 'react'

export function Spinner({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
    </svg>
  )
}

export function FullPageSpinner() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <Spinner className="h-7 w-7 text-accent-glyph" />
    </div>
  )
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'md' | 'sm'

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-br from-accent-500 to-accent-700 text-white shadow-md shadow-accent-600/25 hover:shadow-lg hover:shadow-accent-600/35 active:scale-[0.98] disabled:bg-none disabled:bg-accent-300 disabled:shadow-none',
  secondary:
    'bg-surface text-ink shadow-card ring-1 ring-line hover:bg-surface-soft active:scale-[0.98] disabled:text-ink-faint',
  ghost: 'text-accent-ink hover:bg-accent-100 disabled:text-ink-faint',
  danger: 'text-rec-ink hover:bg-rec-soft disabled:text-ink-faint',
}

const BUTTON_SIZES: Record<ButtonSize, string> = {
  md: 'px-4 py-3',
  sm: 'px-3.5 py-2',
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition disabled:cursor-not-allowed ${BUTTON_SIZES[size]} ${BUTTON_VARIANTS[variant]} ${className}`}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  )
}

const FIELD_CLASS =
  'w-full rounded-xl bg-surface px-4 py-3 text-sm text-ink ring-1 ring-line transition placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent-400'

export function TextInput({ className = '', ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} className={`${FIELD_CLASS} ${className}`} />
}

export function TextArea({ className = '', ...rest }: ComponentProps<'textarea'>) {
  return <textarea {...rest} className={`${FIELD_CLASS} min-h-24 resize-y leading-relaxed ${className}`} />
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-faint">{hint}</span>}
    </label>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl bg-surface p-4 shadow-card ring-1 ring-line/60 ${className}`}>
      {children}
    </div>
  )
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <p role="alert" className="rounded-xl bg-rec-soft px-3.5 py-2.5 text-sm text-rec-ink">
      {message}
    </p>
  )
}

export function EmptyState({
  icon,
  title,
  description,
}: {
  icon?: ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line-strong bg-surface/50 px-6 py-10 text-center">
      {icon && <span className="text-accent-glyph">{icon}</span>}
      <p className="font-display text-lg font-semibold text-ink">{title}</p>
      <p className="max-w-xs text-pretty text-sm text-ink-muted">{description}</p>
    </div>
  )
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
}) {
  return (
    <header className="flex items-start justify-between gap-3">
      <div className="min-w-0 space-y-1">
        <h1 className="text-balance text-[1.75rem] font-semibold leading-tight text-ink">{title}</h1>
        {description && <p className="text-pretty text-sm text-ink-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0 pt-0.5">{action}</div>}
    </header>
  )
}
