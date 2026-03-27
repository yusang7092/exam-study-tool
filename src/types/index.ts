export interface UserSettings {
  id: string
  gemini_api_key: string | null
  claude_api_key: string | null
  preferred_ai: 'gemini' | 'claude' | null
  created_at: string
  updated_at: string
}

export interface Subject {
  id: string
  user_id: string
  name: string
  color: string
  created_at: string
}

export interface ProblemSet {
  id: string
  user_id: string
  subject_id: string
  title: string
  source_file_url: string | null
  file_type: 'pdf' | 'image'
  status: 'uploading' | 'extracting' | 'reviewing' | 'ready' | 'failed'
  created_at: string
}

export interface Problem {
  id: string
  problem_set_id: string
  user_id: string
  subject_id: string
  sequence_num: number
  question_text: string | null
  image_url: string | null
  crop_rect: { x: number; y: number; w: number; h: number } | null
  answer_type: 'mcq' | 'short' | 'essay'
  correct_answer: string | null
  options: string[] | null
  source_page: number | null
  created_at: string
}

export interface SolveSession {
  id: string
  user_id: string
  subject_id: string | null
  problem_set_id: string | null
  mode: 'sequential' | 'random'
  status: 'active' | 'completed'
  created_at: string
  completed_at: string | null
}

export interface Attempt {
  id: string
  session_id: string
  problem_id: string
  user_id: string
  user_answer: string | null
  is_correct: boolean | null
  ai_feedback: string | null
  time_spent_sec: number | null
  attempted_at: string
}
