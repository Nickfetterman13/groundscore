import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function verifyAuth(): Promise<boolean> {
  const cookieStore = await cookies()
  const authCookie = cookieStore.get('gs_admin_auth')
  if (!authCookie || !process.env.ADMIN_PASSWORD) return false
  try {
    return Buffer.from(authCookie.value, 'base64').toString() === process.env.ADMIN_PASSWORD
  } catch {
    return false
  }
}
