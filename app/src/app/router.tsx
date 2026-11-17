import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { LoginPage } from '../features/auth/LoginPage'
import { NewDiaryPage } from '../features/diary/NewDiaryPage'
import { RecordPage } from '../features/stories/RecordPage'
import { StoriesPage } from '../features/stories/StoriesPage'
import { StoryPage } from '../features/stories/StoryPage'
import { AppShell } from './AppShell'
import { RequireAuth, RequireDiary } from './guards'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RequireAuth />}>
          <Route path="/nuovo-diario" element={<NewDiaryPage />} />
          <Route element={<RequireDiary />}>
            <Route element={<AppShell />}>
              <Route index element={<StoriesPage />} />
              <Route path="/registra" element={<RecordPage />} />
              <Route path="/storia/:id" element={<StoryPage />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
