import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Problem } from '@/types/index'

interface UseProblemsReturn {
  problems: Problem[]
  loading: boolean
  error: string | null
  updateProblem: (id: string, updates: Partial<Pick<Problem, 'question_text' | 'answer_type' | 'correct_answer' | 'options'>>) => Promise<{ error: string | null }>
  addProblem: (problemSetId: string, subjectId: string) => Promise<Problem | null>
  deleteProblem: (id: string) => Promise<void>
  refetch: () => Promise<void>
}

export function useProblems(problemSetId: string | null): UseProblemsReturn {
  const { user } = useAuth()
  const [problems, setProblems] = useState<Problem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchProblems = useCallback(async () => {
    if (!problemSetId || !user) {
      setProblems([])
      return
    }
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('problems')
      .select('*')
      .eq('problem_set_id', problemSetId)
      .eq('user_id', user.id)
      .order('sequence_num', { ascending: true })

    if (fetchError) {
      setError(fetchError.message)
    } else {
      setProblems((data as Problem[]) ?? [])
    }
    setLoading(false)
  }, [problemSetId, user])

  useEffect(() => {
    void fetchProblems()
  }, [fetchProblems])

  const updateProblem = useCallback(
    async (
      id: string,
      updates: Partial<Pick<Problem, 'question_text' | 'answer_type' | 'correct_answer' | 'options'>>
    ): Promise<{ error: string | null }> => {
      const { error: updateError } = await supabase
        .from('problems')
        .update(updates)
        .eq('id', id)

      if (updateError) {
        return { error: updateError.message }
      }

      setProblems(prev =>
        prev.map(p => (p.id === id ? { ...p, ...updates } : p))
      )
      return { error: null }
    },
    []
  )

  const addProblem = useCallback(
    async (psId: string, subjectId: string): Promise<Problem | null> => {
      if (!user) return null

      const maxSeq = problems.reduce((m, p) => Math.max(m, p.sequence_num), 0)

      const { data, error: insertError } = await supabase
        .from('problems')
        .insert({
          problem_set_id: psId,
          user_id: user.id,
          subject_id: subjectId,
          sequence_num: maxSeq + 1,
          question_text: '',
          answer_type: 'mcq',
          options: ['①', '②', '③', '④', '⑤'],
          correct_answer: null,
          image_url: null,
          crop_rect: null,
          source_page: null,
        })
        .select()
        .single()

      if (insertError || !data) return null

      const newProblem = data as Problem
      setProblems(prev => [...prev, newProblem])
      return newProblem
    },
    [user, problems]
  )

  const deleteProblem = useCallback(async (id: string) => {
    const { error: deleteError } = await supabase
      .from('problems')
      .delete()
      .eq('id', id)

    if (deleteError) throw new Error(deleteError.message)

    setProblems(prev => prev.filter(p => p.id !== id))
  }, [])

  return {
    problems,
    loading,
    error,
    updateProblem,
    addProblem,
    deleteProblem,
    refetch: fetchProblems,
  }
}
