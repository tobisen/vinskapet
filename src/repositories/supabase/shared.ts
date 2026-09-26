import { supabase } from '@/services/supabase'

export class RepositoryError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message)
    this.name = 'RepositoryError'
  }
}

export async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session?.user.id) {
    throw new RepositoryError('Ingen autentiserad användare.', error)
  }
  return data.session.user.id
}
