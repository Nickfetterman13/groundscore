import { NextRequest } from 'next/server'
import { verifyAuth } from '@/lib/adminAuth'
import { getSpotifyToken, toCandidate, type SpotifyArtistItem } from '@/lib/spotify'

export async function GET(req: NextRequest) {
  if (!(await verifyAuth())) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  const q = req.nextUrl.searchParams.get('q') ?? ''
  if (!q.trim()) return Response.json({ candidates: [] })

  let token: string
  try {
    token = await getSpotifyToken()
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'spotify auth failed' },
      { status: 500 }
    )
  }

  const res = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=artist&limit=5`,
    { headers: { Authorization: `Bearer ${token}` } }
  )

  if (res.status === 429) {
    return Response.json({ error: 'rate_limited' }, { status: 429 })
  }
  if (!res.ok) {
    return Response.json({ error: `spotify search failed (${res.status})` }, { status: 500 })
  }

  const data: { artists?: { items?: SpotifyArtistItem[] } } = await res.json()
  const candidates = (data.artists?.items ?? []).slice(0, 3).map(toCandidate)

  return Response.json({ candidates })
}
