import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import { supabase } from '../../core/supabase'
import { useAuth } from '../auth/AuthProvider'

export type DiaryRole = 'owner' | 'contributor' | 'viewer'

export interface Diary {
  id: string
  name: string
  role: DiaryRole
}

interface DiaryContextValue {
  /** The diary in use (the first one the user belongs to), or `null` when there is none. */
  diary: Diary | null
  loading: boolean
  error: string | null
  /** True when the user may record, edit and delete stories. */
  canRecord: boolean
  createDiary: (name: string) => Promise<void>
  refresh: () => Promise<void>
}

interface MembershipRow {
  role: DiaryRole
  diaries: { id: string; name: string } | { id: string; name: string }[] | null
}

const DiaryContext = createContext<DiaryContextValue | null>(null)

/** Loads the signed-in user's diary; everything below the guard reads it from here. */
export function DiaryProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const userId = session?.user.id ?? null
  const [diary, setDiary] = useState<Diary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!userId) {
      setDiary(null)
      setError(null)
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error: loadError } = await supabase
      .from('diary_members')
      .select('role, diaries(id, name)')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(1)
    if (loadError) {
      setError(loadError.message)
    } else {
      const row = ((data ?? []) as unknown as MembershipRow[])[0]
      const joined = Array.isArray(row?.diaries) ? row.diaries[0] : row?.diaries
      setDiary(row && joined ? { id: joined.id, name: joined.name, role: row.role } : null)
      setError(null)
    }
    setLoading(false)
  }, [userId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const createDiary = useCallback(
    async (name: string) => {
      const { error: rpcError } = await supabase.rpc('create_diary', { p_name: name.trim() })
      if (rpcError) throw new Error(rpcError.message)
      await refresh()
    },
    [refresh],
  )

  const value = useMemo<DiaryContextValue>(
    () => ({ diary, loading, error, canRecord: diary?.role === 'owner', createDiary, refresh }),
    [diary, loading, error, createDiary, refresh],
  )

  return <DiaryContext.Provider value={value}>{children}</DiaryContext.Provider>
}

export function useDiary(): DiaryContextValue {
  const ctx = useContext(DiaryContext)
  if (!ctx) throw new Error('useDiary richiede DiaryProvider')
  return ctx
}
