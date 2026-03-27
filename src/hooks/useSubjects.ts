import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Subject } from '@/types/index'

interface UseSubjectsReturn {
  subjects: Subject[]
  loading: boolean
  error: string | null
  addSubject: (name: string, color: string) => Promise<{ error: string | null }>
  updateSubject: (id: string, updates: Partial<Pick<Subject, 'name' | 'color'>>) => Promise<{ error: string | null }>
  deleteSubject: (id: string) => Promise<{ error: string | null }>
}

export function useSubjects(): UseSubjectsReturn {
  const { user } = useAuth()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSubjects = useCallback(async () => {
    if (!user) {
      setSubjects([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('subjects')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
    if (fetchError) {
      setError(fetchError.message)
    } else {
      setSubjects((data as Subject[]) ?? [])
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    void fetchSubjects()
  }, [fetchSubjects])

  const addSubject = async (name: string, color: string): Promise<{ error: string | null }> => {
    if (!user) return { error: '로그인이 필요합니다.' }
    const { data, error: insertError } = await supabase
      .from('subjects')
      .insert({ user_id: user.id, name: name.trim(), color })
      .select()
      .single()
    if (insertError) return { error: insertError.message }
    setSubjects(prev => [...prev, data as Subject])
    return { error: null }
  }

  const updateSubject = async (
    id: string,
    updates: Partial<Pick<Subject, 'name' | 'color'>>
  ): Promise<{ error: string | null }> => {
    if (!user) return { error: '로그인이 필요합니다.' }
    const { data, error: updateError } = await supabase
      .from('subjects')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()
    if (updateError) return { error: updateError.message }
    setSubjects(prev => prev.map(s => (s.id === id ? (data as Subject) : s)))
    return { error: null }
  }

  const deleteSubject = async (id: string): Promise<{ error: string | null }> => {
    if (!user) return { error: '로그인이 필요합니다.' }
    const { error: deleteError } = await supabase
      .from('subjects')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
    if (deleteError) return { error: deleteError.message }
    setSubjects(prev => prev.filter(s => s.id !== id))
    return { error: null }
  }

  return { subjects, loading, error, addSubject, updateSubject, deleteSubject }
}
