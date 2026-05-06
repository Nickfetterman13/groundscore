import { createClient } from '@supabase/supabase-js'

export type Festival = {
  id: string
  slug: string
  name: string
  edition: string | null
  full_name: string
  location: string
  start_date: string
  end_date: string
  spotify_playlist_id: string | null
  description: string | null
  is_published: boolean
  created_at: string
  updated_at: string
}

export type Artist = {
  id: string
  name: string
  spotify_url: string | null
  soundcloud_url: string | null
  created_at: string
}

export type Lineup = {
  id: string
  festival_id: string
  artist_id: string
  day: string | null
  day_order: number | null
  stage: string | null
  set_time: string | null
  is_headliner: boolean
  created_at: string
}

export type LineupWithArtist = Lineup & { artists: Artist }

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
