import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'

export type ToastTone = 'success' | 'error'

interface ToastState {
  id: number
  message: string
  tone: ToastTone
}

interface ToastContextValue {
  showToast: (message: string, tone?: ToastTone) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const TOAST_MS = 5000

/** One toast at a time, rendered above the router so it survives navigation. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null)
  const timer = useRef<number | null>(null)
  const counter = useRef(0)

  const showToast = useCallback((message: string, tone: ToastTone = 'success') => {
    if (timer.current !== null) window.clearTimeout(timer.current)
    counter.current += 1
    setToast({ id: counter.current, message, tone })
    timer.current = window.setTimeout(() => setToast(null), TOAST_MS)
  }, [])

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current)
    },
    [],
  )

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast && (
        <div
          key={toast.id}
          role="status"
          className={`page-enter fixed inset-x-4 bottom-6 z-50 mx-auto max-w-sm rounded-2xl px-4 py-3 text-sm font-medium shadow-lift ${
            toast.tone === 'success' ? 'bg-accent-800 text-white' : 'bg-rec-soft text-rec-ink'
          }`}
        >
          {toast.message}
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast richiede ToastProvider')
  return ctx
}
