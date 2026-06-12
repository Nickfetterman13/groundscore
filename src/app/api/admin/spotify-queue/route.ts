import { NextRequest } from 'next/server'
import { adminClient, verifyAuth } from '@/lib/adminAuth'

export async function GET(req: NextRequest) {
  if (!(await verifyAuth())) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  const festivalId = req.nextUrl.searchParams.get('festival_id')
  const admin = adminClient()

  let artistIds: string[] | null = null
  if (festivalId) {
    const { data, error } = await admin
      .from('lineups')
      .select('artist_id')
      .eq('festival_id', festivalId)

    if (error) return Response.json({ error: error.message }, { status: 500 })

    artistIds = [...new Set((data ?? []).map(r => r.artist_id))]
    if (artistIds.length === 0) return Response.json({ artists: [], total: 0 })
  }

  let query = admin
    .from('artists')
    .select('id, name')
    .is('spotify_url', null)
    .or('not_on_spotify.is.null,not_on_spotify.is.false')
    .order('name')

  if (artistIds) query = query.in('id', artistIds)

  const { data, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const artists = data ?? []
  return Response.json({ artists, total: artists.length })
}
