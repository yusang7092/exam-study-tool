import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useSubjects } from '@/hooks/useSubjects'
import type { ProblemSet } from '@/types/index'

const statusLabel = (status: ProblemSet['status']) => {
  if (status === 'ready') return { text: '학습 가능', color: '#16a34a', bg: '#f0fdf4' }
  if (status === 'extracting') return { text: '추출 중', color: '#d97706', bg: '#fffbeb' }
  if (status === 'reviewing') return { text: '검토 필요', color: '#2563eb', bg: '#eff6ff' }
  if (status === 'uploading') return { text: '업로드 중', color: '#7c3aed', bg: '#f5f3ff' }
  return { text: '실패', color: '#dc2626', bg: '#fef2f2' }
}

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr)
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`
}

const FAVORITES_KEY = 'ps_favorites'

function loadFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY)
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

function saveFavorites(set: Set<string>) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify([...set]))
}

export default function SubjectDetailPage() {
  const { subjectId } = useParams<{ subjectId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { subjects } = useSubjects()

  const [problemSets, setProblemSets] = useState<ProblemSet[]>([])
  const [loading, setLoading] = useState(true)
  const [favorites, setFavorites] = useState<Set<string>>(loadFavorites)
  const [deleteTarget, setDeleteTarget] = useState<ProblemSet | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [filter, setFilter] = useState<'all' | 'favorites'>('all')

  const subject = useMemo(() => subjects.find(s => s.id === subjectId), [subjects, subjectId])

  const fetchProblemSets = async () => {
    if (!user || !subjectId) return
    setLoading(true)
    const { data } = await supabase
      .from('problem_sets')
      .select('*')
      .eq('user_id', user.id)
      .eq('subject_id', subjectId)
      .order('created_at', { ascending: false })
    setProblemSets((data as ProblemSet[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    void fetchProblemSets()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, subjectId])

  const toggleFavorite = (id: string) => {
    setFavorites(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      saveFavorites(next)
      return next
    })
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    await supabase.from('problem_sets').delete().eq('id', deleteTarget.id)
    // also remove from favorites
    setFavorites(prev => {
      const next = new Set(prev)
      next.delete(deleteTarget.id)
      saveFavorites(next)
      return next
    })
    setProblemSets(prev => prev.filter(ps => ps.id !== deleteTarget.id))
    setDeleting(false)
    setDeleteTarget(null)
  }

  const handleCardClick = (ps: ProblemSet) => {
    if (ps.status === 'reviewing') {
      navigate(`/review-extraction?setId=${ps.id}`)
    } else if (ps.status === 'ready') {
      navigate(`/review-extraction?setId=${ps.id}`)
    } else if (ps.status === 'failed') {
      navigate('/upload')
    }
  }

  const displayed = filter === 'favorites'
    ? problemSets.filter(ps => favorites.has(ps.id))
    : problemSets

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', color: '#111827', minHeight: '100%', background: '#f9fafb', paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '16px 20px 14px' }}>
        <button
          onClick={() => navigate('/')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6366f1', fontSize: 14, fontWeight: 600, padding: '0 0 10px', display: 'flex', alignItems: 'center', gap: 4 }}
        >
          ← 대시보드
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {subject && <div style={{ width: 14, height: 14, borderRadius: 4, background: subject.color, flexShrink: 0 }} />}
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
            {subject?.name ?? '과목'}
          </h1>
          <span style={{ fontSize: 13, color: '#9ca3af', marginLeft: 4 }}>{problemSets.length}개</span>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '0 16px', display: 'flex', gap: 0 }}>
        {(['all', 'favorites'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            style={{
              padding: '12px 16px',
              background: 'none',
              border: 'none',
              borderBottom: filter === tab ? '2px solid #6366f1' : '2px solid transparent',
              color: filter === tab ? '#6366f1' : '#6b7280',
              fontWeight: filter === tab ? 600 : 400,
              fontSize: 14,
              cursor: 'pointer',
              marginBottom: -1,
            }}
          >
            {tab === 'all' ? '전체' : '⭐ 즐겨찾기'}
            {tab === 'favorites' && favorites.size > 0 && (
              <span style={{ marginLeft: 4, fontSize: 12, color: '#f59e0b' }}>
                {problemSets.filter(ps => favorites.has(ps.id)).length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div style={{ padding: '16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: '#9ca3af', padding: 40 }}>불러오는 중...</div>
        ) : displayed.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>{filter === 'favorites' ? '⭐' : '📂'}</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              {filter === 'favorites' ? '즐겨찾기한 문제집이 없어요' : '문제집이 없습니다'}
            </div>
            {filter === 'all' && (
              <button
                onClick={() => navigate('/upload')}
                style={{ marginTop: 16, padding: '10px 24px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
              >
                문제집 업로드
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {displayed.map(ps => {
              const status = statusLabel(ps.status)
              const isFav = favorites.has(ps.id)
              const clickable = ps.status === 'reviewing' || ps.status === 'ready' || ps.status === 'failed'
              return (
                <div
                  key={ps.id}
                  style={{
                    background: '#fff',
                    borderRadius: 12,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
                    overflow: 'hidden',
                  }}
                >
                  {/* Subject color bar */}
                  {subject && <div style={{ height: 3, background: subject.color }} />}

                  <div style={{ padding: '14px 14px 14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    {/* Main content — clickable */}
                    <button
                      onClick={() => clickable && handleCardClick(ps)}
                      disabled={!clickable}
                      style={{
                        flex: 1,
                        background: 'none',
                        border: 'none',
                        textAlign: 'left',
                        padding: 0,
                        cursor: clickable ? 'pointer' : 'default',
                        minWidth: 0,
                      }}
                    >
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 6 }}>
                        {ps.title}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 500, color: status.color, background: status.bg }}>
                          {status.text}
                        </span>
                        <span style={{ fontSize: 12, color: '#9ca3af' }}>{formatDate(ps.created_at)}</span>
                      </div>
                    </button>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      {/* Favorite */}
                      <button
                        onClick={() => toggleFavorite(ps.id)}
                        style={{
                          width: 36, height: 36, borderRadius: 8,
                          background: isFav ? '#fffbeb' : '#f9fafb',
                          border: `1px solid ${isFav ? '#fcd34d' : '#e5e7eb'}`,
                          fontSize: 18, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                        title={isFav ? '즐겨찾기 해제' : '즐겨찾기 추가'}
                      >
                        {isFav ? '⭐' : '☆'}
                      </button>
                      {/* Delete */}
                      <button
                        onClick={() => setDeleteTarget(ps)}
                        style={{
                          width: 36, height: 36, borderRadius: 8,
                          background: '#fff5f5', border: '1px solid #fecaca',
                          fontSize: 18, fontWeight: 700, cursor: 'pointer', color: '#ef4444',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          lineHeight: 1,
                        }}
                        title="삭제"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => navigate('/upload')}
        style={{
          position: 'fixed', bottom: 'calc(72px + env(safe-area-inset-bottom))', right: 20,
          width: 56, height: 56, borderRadius: '50%', background: '#6366f1',
          color: '#fff', border: 'none', fontSize: 26, cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(99,102,241,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
        }}
        aria-label="새 문제집 업로드"
      >
        +
      </button>

      {/* Delete confirm modal */}
      {deleteTarget && (
        <div
          onClick={() => !deleting && setDeleteTarget(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            zIndex: 200, padding: '0 0 env(safe-area-inset-bottom)',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: '20px 20px 0 0',
              padding: '24px 20px 32px', width: '100%', maxWidth: 480,
            }}
          >
            <div style={{ width: 36, height: 4, background: '#e5e7eb', borderRadius: 2, margin: '0 auto 20px' }} />
            <div style={{ fontSize: 20, marginBottom: 8, textAlign: 'center' }}>🗑️</div>
            <div style={{ fontSize: 16, fontWeight: 700, textAlign: 'center', marginBottom: 6 }}>문제집 삭제</div>
            <div style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 24 }}>
              <strong style={{ color: '#111827' }}>"{deleteTarget.title}"</strong>을(를)<br />삭제하면 되돌릴 수 없어요.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                style={{
                  flex: 1, padding: '14px', background: '#f3f4f6', color: '#374151',
                  border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: 'pointer',
                }}
              >
                취소
              </button>
              <button
                onClick={() => { void handleDelete() }}
                disabled={deleting}
                style={{
                  flex: 1, padding: '14px', background: deleting ? '#fca5a5' : '#ef4444',
                  color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: 'pointer',
                }}
              >
                {deleting ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
