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

interface ArtistOption {
  id: string
  name: string
}

interface ImportRow {
  displayName: string
  artist: ArtistOption | null
  isNewArtist: boolean
  hasB2B: boolean
  b2bArtist: ArtistOption | null
  isNewB2BArtist: boolean
  showcaseEnabled: boolean
  showcaseName: string
  stage: string
  day: string
  dayOrder: number | null
}

export async function POST(req: Request) {
  if (!(await verifyAuth())) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { festivalId, rows }: { festivalId: string; rows: ImportRow[] } = await req.json()

  if (!festivalId || !Array.isArray(rows) || rows.length === 0) {
    return Response.json({ error: 'invalid input' }, { status: 400 })
  }

  const admin = adminClient()

  // Collect unique new artist names to create (deduplicated by lowercase)
  const toCreate = new Map<string, string>() // lowerName -> displayName
  for (const r of rows) {
    if (r.isNewArtist && r.artist) {
      const lower = r.artist.name.toLowerCase()
      if (!toCreate.has(lower)) toCreate.set(lower, r.artist.name)
    }
    if (r.hasB2B && r.isNewB2BArtist && r.b2bArtist) {
      const lower = r.b2bArtist.name.toLowerCase()
      if (!toCreate.has(lower)) toCreate.set(lower, r.b2bArtist.name)
    }
  }

  // Insert new artists and build name→id map
  const nameToId = new Map<string, string>() // lowerName -> id

  if (toCreate.size > 0) {
    const inserts = [...toCreate.values()].map(name => ({ name }))
    const { data, error } = await admin
      .from('artists')
      .insert(inserts)
      .select('id, name')

    if (error) {
      return Response.json({ error: `Failed to create artists: ${error.message}` }, { status: 500 })
    }
    for (const a of data ?? []) {
      nameToId.set(a.name.toLowerCase(), a.id)
    }
  }

  // Build lineup inserts in order (display_order = poster position)
  const lineupInserts = []
  for (let idx = 0; idx < rows.length; idx++) {
    const r = rows[idx]
    if (!r.artist) continue

    const artistId = r.isNewArtist
      ? nameToId.get(r.artist.name.toLowerCase())
      : r.artist.id

    if (!artistId) {
      return Response.json({ error: `Could not resolve artist id for "${r.artist.name}"` }, { status: 500 })
    }

    let b2bId: string | null = null
    if (r.hasB2B && r.b2bArtist) {
      b2bId = r.isNewB2BArtist
        ? (nameToId.get(r.b2bArtist.name.toLowerCase()) ?? null)
        : r.b2bArtist.id
    }

    lineupInserts.push({
      festival_id: festivalId,
      artist_id: artistId,
      b2b_partner_id: b2bId,
      display_order: idx + 1,
      display_name: r.displayName || null,
      day: r.day || null,
      day_order: r.dayOrder ?? null,
      stage: r.stage || null,
      showcase: r.showcaseEnabled ? (r.showcaseName || null) : null,
      is_headliner: false,
    })
  }

  if (lineupInserts.length === 0) {
    return Response.json({ error: 'No valid rows to import (all rows missing an artist)' }, { status: 400 })
  }

  const { error: lineupError } = await admin.from('lineups').insert(lineupInserts)

  if (lineupError) {
    return Response.json({ error: `Failed to insert lineup: ${lineupError.message}` }, { status: 500 })
  }

  return Response.json({ ok: true })
}
