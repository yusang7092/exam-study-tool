import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { SolveSession, Problem, Attempt } from '@/types/index'

interface UseSolveSessionReturn {
  session: SolveSession | null
  problems: Problem[]
  currentProblem: Problem | null
  currentIndex: number
  totalProblems: number
  completedCount: number
  loading: boolean
  error: string | null
  canGoNext: boolean
  canGoPrev: boolean
  nextProblem: () => void
  prevProblem: () => void
  attempts: Attempt[]
  refetchAttempts: () => Promise<void>
  isComplete: boolean
}

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function useSolveSession(
  sessionId: string | undefined,
  onComplete?: () => void
): UseSolveSessionReturn {
  const [session, setSession] = useState<SolveSession | null>(null)
  const [problems, setProblems] = useState<Problem[]>([])
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isComplete, setIsComplete] = useState(false)

  const fetchAttempts = useCallback(async (sid: string) => {
    const { data } = await supabase
      .from('attempts')
      .select('*')
      .eq('session_id', sid)
      .order('attempted_at', { ascending: true })
    if (data) setAttempts(data as Attempt[])
  }, [])

  const refetchAttempts = useCallback(async () => {
    if (sessionId) await fetchAttempts(sessionId)
  }, [sessionId, fetchAttempts])

  useEffect(() => {
    if (!sessionId) {
      setLoading(false)
      setError('세션 ID가 없습니다.')
      return
    }

    const load = async () => {
      setLoading(true)
      setError(null)

      // Fetch session
      const { data: sessionData, error: sessionError } = await supabase
        .from('solve_sessions')
        .select('*')
        .eq('id', sessionId)
        .single()

      if (sessionError || !sessionData) {
        setError('세션을 찾을 수 없습니다.')
        setLoading(false)
        return
      }

      const sess = sessionData as SolveSession
      setSession(sess)

      if (sess.status === 'completed') {
        setIsComplete(true)
      }

      // Fetch problems via problem_set_id
      if (!sess.problem_set_id) {
        setError('문제 세트가 연결되지 않았습니다.')
        setLoading(false)
        return
      }

      const { data: problemData, error: problemError } = await supabase
        .from('problems')
        .select('*')
        .eq('problem_set_id', sess.problem_set_id)
        .order('sequence_num', { ascending: true })

      if (problemError || !problemData) {
        setError('문제를 불러올 수 없습니다.')
        setLoading(false)
        return
      }

      const ordered = problemData as Problem[]
      const finalProblems = sess.mode === 'random' ? shuffleArray(ordered) : ordered
      setProblems(finalProblems)

      // Fetch existing attempts
      await fetchAttempts(sessionId)

      setLoading(false)
    }

    void load()
  }, [sessionId, fetchAttempts])

  // Check if all answered → mark complete
  useEffect(() => {
    if (problems.length === 0 || isComplete) return
    const answeredIds = new Set(attempts.map(a => a.problem_id))
    const allAnswered = problems.every(p => answeredIds.has(p.id))
    if (allAnswered && attempts.length > 0) {
      setIsComplete(true)
      // Mark session as completed in DB
      if (sessionId && session?.status !== 'completed') {
        void supabase
          .from('solve_sessions')
          .update({ status: 'completed', completed_at: new Date().toISOString() })
          .eq('id', sessionId)
        onComplete?.()
      }
    }
  }, [attempts, problems, isComplete, sessionId, session, onComplete])

  const nextProblem = useCallback(() => {
    setCurrentIndex(prev => Math.min(prev + 1, problems.length - 1))
  }, [problems.length])

  const prevProblem = useCallback(() => {
    setCurrentIndex(prev => Math.max(prev - 1, 0))
  }, [])

  const currentProblem = problems[currentIndex] ?? null
  const completedCount = new Set(attempts.map(a => a.problem_id)).size
  const canGoNext = currentIndex < problems.length - 1
  const canGoPrev = currentIndex > 0

  return {
    session,
    problems,
    currentProblem,
    currentIndex,
    totalProblems: problems.length,
    completedCount,
    loading,
    error,
    canGoNext,
    canGoPrev,
    nextProblem,
    prevProblem,
    attempts,
    refetchAttempts,
    isComplete,
  }
}
