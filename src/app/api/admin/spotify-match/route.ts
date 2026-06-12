import { adminClient, verifyAuth } from '@/lib/adminAuth'

interface MatchBody {
  artistId: string
  spotifyId: string
  spotifyUrl: string
  followers: number | null
  popularity: number | null
  genres: string[]
  imageUrl: string | null
}

export async function POST(req: Request) {
  if (!(await verifyAuth())) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  const body: Partial<MatchBody> = await req.json()
  if (!body.artistId) {
    return Response.json({ error: 'artistId is required' }, { status: 400 })
  }

  const admin = adminClient()
  const { error } = await admin
    .from('artists')
    .update({
      spotify_url: body.spotifyUrl ?? null,
      spotify_id: body.spotifyId ?? null,
      followers: body.followers ?? null,
      popularity: body.popularity ?? null,
      genres: body.genres ?? null,
      image_url: body.imageUrl ?? null,
    })
    .eq('id', body.artistId)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
}
