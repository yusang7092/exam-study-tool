import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { ProblemSet } from '@/types/index'

interface CreateProblemSetData {
  subject_id: string | null
  title: string
  file_type: 'pdf' | 'image'
  source_file_url?: string | null
}

interface UseProblemSetsReturn {
  problemSets: ProblemSet[]
  loading: boolean
  createProblemSet: (data: CreateProblemSetData) => Promise<ProblemSet | null>
  updateProblemSetStatus: (id: string, status: ProblemSet['status']) => Promise<void>
}

export function useProblemSets(): UseProblemSetsReturn {
  const { user } = useAuth()
  const [problemSets, setProblemSets] = useState<ProblemSet[]>([])
  const [loading, setLoading] = useState(true)

  const fetchProblemSets = useCallback(async () => {
    if (!user) {
      setProblemSets([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await supabase
      .from('problem_sets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setProblemSets((data as ProblemSet[]) ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => {
    void fetchProblemSets()
  }, [fetchProblemSets])

  const createProblemSet = useCallback(
    async (data: CreateProblemSetData): Promise<ProblemSet | null> => {
      if (!user) return null

      const { data: inserted, error } = await supabase
        .from('problem_sets')
        .insert({
          user_id: user.id,
          subject_id: data.subject_id,
          title: data.title.trim(),
          file_type: data.file_type,
          source_file_url: data.source_file_url ?? null,
          status: 'uploading',
        })
        .select()
        .single()

      if (error || !inserted) return null

      const ps = inserted as ProblemSet
      setProblemSets(prev => [ps, ...prev])
      return ps
    },
    [user]
  )

  const updateProblemSetStatus = useCallback(
    async (id: string, status: ProblemSet['status']): Promise<void> => {
      await supabase.from('problem_sets').update({ status }).eq('id', id)
      setProblemSets(prev => prev.map(ps => (ps.id === id ? { ...ps, status } : ps)))
    },
    []
  )

  return { problemSets, loading, createProblemSet, updateProblemSetStatus }
}
