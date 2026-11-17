import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate } from 'react-router-dom'

import { Button, Card, ErrorBanner, Field, TextInput } from '../../ui/components'
import { CupIcon } from '../../ui/icons'
import { useDiary } from './DiaryProvider'

/** First-run screen: the signed-in user has no diary yet, so they name one. */
export function NewDiaryPage() {
  const { diary, createDiary } = useDiary()
  const [name, setName] = useState('Le storie della nonna')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (diary) return <Navigate to="/" replace />

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setPending(true)
    try {
      await createDiary(name)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Non sono riuscito a creare il diario.')
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
          Dai un nome al diario
        </h1>
        <p className="text-pretty text-sm text-ink-muted">
          Qui raccoglierai le storie. Potrai cambiare il nome più avanti.
        </p>
      </header>
      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Nome del diario">
            <TextInput
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
              required
            />
          </Field>
          {error && <ErrorBanner message={error} />}
          <Button type="submit" loading={pending} className="w-full">
            Crea il diario
          </Button>
        </form>
      </Card>
    </div>
  )
}
