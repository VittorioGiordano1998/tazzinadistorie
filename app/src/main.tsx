import { StrictMode } from 'react'
import type { ReactNode } from 'react'
import { createRoot } from 'react-dom/client'

import './index.css'
import { AppRouter } from './app/router'
import { ErrorBoundary } from './app/ErrorBoundary'
import { isSupabaseConfigured } from './core/env'
import { SetupScreen } from './core/SetupScreen'
import { AuthProvider } from './features/auth/AuthProvider'
import { DiaryProvider } from './features/diary/DiaryProvider'
import { ToastProvider } from './ui/toast'

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('Elemento #root non trovato')

function SetupGate({ children }: { children: ReactNode }) {
  if (!isSupabaseConfigured) return <SetupScreen />
  return <>{children}</>
}

createRoot(rootEl).render(
  <StrictMode>
    <SetupGate>
      <AuthProvider>
        <DiaryProvider>
          <ToastProvider>
            <ErrorBoundary fullPage>
              <AppRouter />
            </ErrorBoundary>
          </ToastProvider>
        </DiaryProvider>
      </AuthProvider>
    </SetupGate>
  </StrictMode>,
)
