import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Attempt } from '@/types/index'

interface SubmitAttemptData {
  session_id: string
  problem_id: string
  user_answer: string | null
  is_correct: boolean | null
  ai_feedback: string | null
  time_spent_sec: number | null
}

interface UseAttemptsReturn {
  attempts: Attempt[]
  loading: boolean
  submitAttempt: (data: SubmitAttemptData) => Promise<Attempt | null>
  fetchAttempts: (sessionId: string) => Promise<void>
}

export function useAttempts(): UseAttemptsReturn {
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [loading, setLoading] = useState(false)

  const fetchAttempts = useCallback(async (sessionId: string) => {
    setLoading(true)
    const { data, error } = await supabase
      .from('attempts')
      .select('*')
      .eq('session_id', sessionId)
      .order('attempted_at', { ascending: true })

    if (!error && data) {
      setAttempts(data as Attempt[])
    }
    setLoading(false)
  }, [])

  const submitAttempt = useCallback(async (data: SubmitAttemptData): Promise<Attempt | null> => {
    const { data: inserted, error } = await supabase
      .from('attempts')
      .insert({
        session_id: data.session_id,
        problem_id: data.problem_id,
        user_answer: data.user_answer,
        is_correct: data.is_correct,
        ai_feedback: data.ai_feedback,
        time_spent_sec: data.time_spent_sec,
      })
      .select()
      .single()

    if (error || !inserted) return null

    const attempt = inserted as Attempt
    setAttempts(prev => [...prev, attempt])
    return attempt
  }, [])

  return { attempts, loading, submitAttempt, fetchAttempts }
}
