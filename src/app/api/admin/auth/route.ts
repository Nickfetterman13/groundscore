import { cookies } from 'next/headers'

export async function POST(req: Request) {
  const { password } = await req.json()
  const adminPassword = process.env.ADMIN_PASSWORD

  if (!adminPassword || password !== adminPassword) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  const cookieStore = await cookies()
  cookieStore.set('gs_admin_auth', Buffer.from(adminPassword).toString('base64'), {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24,
    path: '/',
  })

  return Response.json({ ok: true })
}
