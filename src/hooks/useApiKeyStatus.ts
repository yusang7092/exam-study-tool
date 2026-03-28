import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export function useApiKeyStatus() {
  const { user } = useAuth()
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null)

  useEffect(() => {
    if (!user) return
    const check = async () => {
      const { data } = await supabase
        .from('user_settings')
        .select('gemini_api_key, claude_api_key')
        .eq('id', user.id)
        .single()
      const has = !!(data?.gemini_api_key?.trim() || data?.claude_api_key?.trim())
      setHasApiKey(has)
    }
    void check()
  }, [user])

  return hasApiKey
}
