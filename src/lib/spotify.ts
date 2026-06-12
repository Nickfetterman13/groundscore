// Server-side Spotify Client Credentials helper. Never expose to the client.

let cachedToken: { accessToken: string; expiresAt: number } | null = null

export async function getSpotifyToken(): Promise<string> {
  const now = Date.now()
  if (cachedToken && cachedToken.expiresAt > now) {
    return cachedToken.accessToken
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('Spotify credentials are not configured')
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  if (!res.ok) {
    throw new Error(`Spotify token request failed: ${res.status}`)
  }

  const data: { access_token: string } = await res.json()

  // Tokens last 60min — refresh at 55min to stay ahead of expiry.
  cachedToken = { accessToken: data.access_token, expiresAt: now + 55 * 60 * 1000 }
  return cachedToken.accessToken
}

export interface SpotifyArtistItem {
  id: string
  name: string
  images?: { url: string }[]
  followers?: { total: number }
  popularity?: number
  genres?: string[]
  external_urls?: { spotify?: string }
}

export interface SpotifyArtistCandidate {
  spotifyId: string
  name: string
  imageUrl: string | null
  followers: number | null
  popularity: number | null
  genres: string[]
  externalUrl: string | null
}

export function toCandidate(item: SpotifyArtistItem): SpotifyArtistCandidate {
  return {
    spotifyId: item.id,
    name: item.name,
    imageUrl: item.images?.[0]?.url ?? null,
    followers: item.followers?.total ?? null,
    popularity: item.popularity ?? null,
    genres: item.genres ?? [],
    externalUrl: item.external_urls?.spotify ?? null,
  }
}
