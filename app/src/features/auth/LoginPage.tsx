import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { Button, Card, ErrorBanner, Field, TextInput } from '../../ui/components'
import { CupIcon } from '../../ui/icons'
import { useAuth } from './AuthProvider'

export function LoginPage() {
  const { session, signIn } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // RequireAuth remembers where the visitor was headed: after signing in they land there.
  const from = location.state as { from?: { pathname?: string; search?: string } } | null
  const target = from?.from?.pathname ? `${from.from.pathname}${from.from.search ?? ''}` : '/'

  if (session) return <Navigate to={target} replace />

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setPending(true)
    try {
      await signIn(email.trim(), password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Si è verificato un errore.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-6 py-10">
      <header className="space-y-3 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-100 text-accent-ink">
          <CupIcon className="h-8 w-8" />
        </span>
        <h1 className="text-balance text-3xl font-semibold leading-tight text-ink">
          Una tazzina di storie
        </h1>
        <p className="text-pretty text-sm text-ink-muted">
          Il diario privato dei racconti di famiglia. Accedi per ascoltarli.
        </p>
      </header>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Email">
            <TextInput
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </Field>
          <Field label="Password">
            <TextInput
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </Field>
          {error && <ErrorBanner message={error} />}
          <Button type="submit" loading={pending} className="w-full">
            Accedi
          </Button>
        </form>
      </Card>
    </div>
  )
}
