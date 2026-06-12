import { adminClient, verifyAuth } from '@/lib/adminAuth'
import { getArtistsMetadata, type SpotifyArtistMetadata } from '@/lib/spotify'

const SPOTIFY_ID_RE = /artist\/([A-Za-z0-9]+)/

interface BackfillBody {
  excludeIds?: string[]
}

export async function GET() {
  if (!(await verifyAuth())) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  const admin = adminClient()
  const { count, error } = await admin
    .from('artists')
    .select('id', { count: 'exact', head: true })
    .not('spotify_url', 'is', null)
    .is('spotify_id', null)
    .not('not_on_spotify', 'is', true)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ count: count ?? 0 })
}

export async function POST(req: Request) {
  if (!(await verifyAuth())) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  const body: BackfillBody = await req.json().catch(() => ({}))
  const excludeIds = body.excludeIds ?? []

  const admin = adminClient()
  const baseQuery = admin
    .from('artists')
    .select('id, name, spotify_url')
    .not('spotify_url', 'is', null)
    .is('spotify_id', null)
    .not('not_on_spotify', 'is', true)
    .limit(25)

  const { data, error } =
    excludeIds.length > 0
      ? await baseQuery.not('id', 'in', `(${excludeIds.join(',')})`)
      : await baseQuery

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const rows = data ?? []
  const processed: { id: string; name: string }[] = []
  const failed: { id: string; name: string }[] = []
  const withSpotifyId: { id: string; name: string; spotifyId: string }[] = []

  for (const row of rows) {
    const match = row.spotify_url?.match(SPOTIFY_ID_RE)
    if (!match) {
      failed.push({ id: row.id, name: row.name })
      continue
    }
    withSpotifyId.push({ id: row.id, name: row.name, spotifyId: match[1] })
  }

  if (withSpotifyId.length > 0) {
    let metadata: SpotifyArtistMetadata[]
    try {
      metadata = await getArtistsMetadata(withSpotifyId.map(r => r.spotifyId))
    } catch (err) {
      return Response.json(
        { error: err instanceof Error ? err.message : 'spotify metadata fetch failed' },
        { status: 500 }
      )
    }

    const metaById = new Map(metadata.map(m => [m.spotify_id, m]))

    for (const row of withSpotifyId) {
      const meta = metaById.get(row.spotifyId)
      if (!meta) {
        await admin
          .from('artists')
          .update({ not_on_spotify: true })
          .eq('id', row.id)

        failed.push({ id: row.id, name: row.name })
        continue
      }

      const { error: updateError } = await admin
        .from('artists')
        .update({
          spotify_id: meta.spotify_id,
          followers: meta.followers,
          popularity: meta.popularity,
          genres: meta.genres,
          image_url: meta.image_url,
        })
        .eq('id', row.id)

      if (updateError) {
        failed.push({ id: row.id, name: row.name })
        continue
      }
      processed.push({ id: row.id, name: row.name })
    }
  }

  return Response.json({ processed, failed })
}
