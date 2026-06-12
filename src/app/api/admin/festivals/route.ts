import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function verifyAuth(): Promise<boolean> {
  const cookieStore = await cookies()
  const authCookie = cookieStore.get('gs_admin_auth')
  if (!authCookie || !process.env.ADMIN_PASSWORD) return false
  try {
    return Buffer.from(authCookie.value, 'base64').toString() === process.env.ADMIN_PASSWORD
  } catch {
    return false
  }
}

export async function GET() {
  if (!(await verifyAuth())) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  const admin = adminClient()
  const { data, error } = await admin
    .from('festivals')
    .select('id, name, slug')
    .order('name')

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ festivals: data ?? [] })
}

export async function POST(req: Request) {
  if (!(await verifyAuth())) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const admin = adminClient()

  const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
  if (!body.slug || !SLUG_RE.test(body.slug)) {
    return Response.json({ error: 'Slug must be lowercase letters, numbers, and dashes only' }, { status: 400 })
  }

  const { data: existing } = await admin
    .from('festivals')
    .select('id')
    .ilike('slug', body.slug)
    .maybeSingle()

  if (existing) {
    return Response.json({ error: `Slug "${body.slug}" is already taken` }, { status: 400 })
  }

  const { data, error } = await admin
    .from('festivals')
    .insert(body)
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}
