import { Link, Outlet } from 'react-router-dom'

import { useAuth } from '../features/auth/AuthProvider'
import { useDiary } from '../features/diary/DiaryProvider'
import { CupIcon, LogoutIcon } from '../ui/icons'
import { ErrorBoundary } from './ErrorBoundary'

/** The app frame: a slim header with the diary name and sign-out, then the page. */
export function AppShell() {
  const { signOut } = useAuth()
  const { diary } = useDiary()

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-line/70 bg-canvas/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-100 text-accent-ink">
              <CupIcon className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-display text-base font-semibold leading-tight text-ink">
                Una tazzina di storie
              </span>
              <span className="block truncate text-xs text-ink-muted">{diary?.name}</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={() => void signOut()}
            aria-label="Esci"
            className="shrink-0 rounded-full p-2 text-ink-muted transition hover:bg-surface-muted hover:text-ink"
          >
            <LogoutIcon className="h-5 w-5" />
          </button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-xl px-4 py-6">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  )
}
