import { supabase, isSupabaseConfigured } from './supabase'
import type { User } from '@supabase/supabase-js'

export interface SessionData {
  protocol_type: string
  protocol_name: string
  duration_s?: number
  peak_force?: number
  avg_force?: number
  sets_data?: any
  config?: any
}

/**
 * Save an exercise session to Supabase. No-ops if not configured or not logged in.
 * Returns true if saved successfully.
 */
export async function saveSession(user: User | null, data: SessionData): Promise<boolean> {
  if (!user || !isSupabaseConfigured()) return false

  try {
    const { error } = await supabase
      .from('exercise_sessions')
      .insert({ user_id: user.id, ...data })

    if (error) { console.error('Save session error:', error.message); return false }
    return true
  } catch (err) {
    console.error('Save session error:', err)
    return false
  }
}

export interface ExerciseSession extends SessionData {
  id: string
  user_id: string
  completed_at: string
}

/**
 * Load exercise history for the current user.
 */
export async function loadHistory(user: User | null): Promise<ExerciseSession[]> {
  if (!user || !isSupabaseConfigured()) return []

  try {
    const { data, error } = await supabase
      .from('exercise_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('completed_at', { ascending: false })
      .limit(100)

    if (error) { console.error('Load history error:', error.message); return [] }
    return data || []
  } catch (err) {
    console.error('Load history error:', err)
    return []
  }
}
