// Supabase istemcisi, oturum ve rol yardımcıları; ortam değişkeni yoksa uygulama salt-kamu modunda çalışır.

import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js'
import { parseRole } from '../core/access'
import type { Role } from '../core/types'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

function isUsable(value: string | undefined): value is string {
  return typeof value === 'string' && value.length > 0 && !/[<>]/.test(value)
}

function isHttpUrl(value: string): boolean {
  try {
    return new URL(value).protocol.startsWith('http')
  } catch {
    return false
  }
}

export const supabase: SupabaseClient | null =
  isUsable(url) && isHttpUrl(url) && isUsable(anonKey)
    ? createClient(url, anonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      })
    : null

export function isBackendConfigured(): boolean {
  return supabase !== null
}

export function roleFromSession(session: Session | null): Role {
  if (!session) return 'public'
  const appMeta = session.user.app_metadata as Record<string, unknown> | undefined
  return parseRole(appMeta?.['rol'] ?? appMeta?.['role'])
}

export async function currentSession(): Promise<Session | null> {
  if (!supabase) return null
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
}

export async function currentRole(): Promise<Role> {
  return roleFromSession(await currentSession())
}

export function onAuthChange(handler: (session: Session | null) => void): () => void {
  if (!supabase) return () => {}
  const { data } = supabase.auth.onAuthStateChange((_event, session) => handler(session))
  return () => data.subscription.unsubscribe()
}

export async function signInWithPassword(email: string, password: string): Promise<Session> {
  if (!supabase) throw new Error('Supabase yapılandırılmamış')
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  if (!data.session) throw new Error('Oturum açılamadı')
  return data.session
}

export async function signOut(): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}
