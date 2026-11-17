import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuth } from '../features/auth/AuthProvider'
import { useDiary } from '../features/diary/DiaryProvider'
import { Button, ErrorBanner, FullPageSpinner } from '../ui/components'

/** Everything but the login screen needs a session. */
export function RequireAuth() {
  const location = useLocation()
  const { session, loading } = useAuth()
  if (loading) return <FullPageSpinner />
  if (!session) return <Navigate to="/login" replace state={{ from: location }} />
  return <Outlet />
}

/** The app proper needs a diary: without one the user is sent to name it. */
export function RequireDiary() {
  const { diary, loading, error, refresh } = useDiary()
  if (loading) return <FullPageSpinner />
  if (error) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-4 px-6">
        <ErrorBanner message={error} />
        <Button onClick={() => void refresh()}>Riprova</Button>
      </div>
    )
  }
  if (!diary) return <Navigate to="/nuovo-diario" replace />
  return <Outlet />
}
