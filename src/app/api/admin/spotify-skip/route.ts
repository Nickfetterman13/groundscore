import { adminClient, verifyAuth } from '@/lib/adminAuth'

export async function POST(req: Request) {
  if (!(await verifyAuth())) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { artistId }: { artistId?: string } = await req.json()
  if (!artistId) {
    return Response.json({ error: 'artistId is required' }, { status: 400 })
  }

  const admin = adminClient()
  const { error } = await admin
    .from('artists')
    .update({ not_on_spotify: true })
    .eq('id', artistId)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
}
