import { cache } from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { supabase, type Festival, type ArtistSummary, type LineupWithArtist } from '@/lib/supabase'

const getFestival = cache(async (slug: string): Promise<Festival | null> => {
  const { data } = await supabase
    .from('festivals')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .single()
  return data as Festival | null
})

const getLineups = cache(async (festivalId: string): Promise<LineupWithArtist[]> => {
  const { data } = await supabase
    .from('lineups')
    .select('*, artist:artist_id(id, name, spotify_url, soundcloud_url), partner:b2b_partner_id(id, name, spotify_url, soundcloud_url)')
    .eq('festival_id', festivalId)
    .order('day_order', { ascending: true })
    .order('stage', { ascending: true })
    .order('display_order', { ascending: true })
  return (data ?? []) as LineupWithArtist[]
})

function formatDateRange(start: string, end: string): string {
  const s = new Date(start)
  const e = new Date(end)
  const shortOpts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  const longOpts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }
  if (s.getFullYear() !== e.getFullYear()) {
    return `${s.toLocaleDateString('en-US', longOpts)} – ${e.toLocaleDateString('en-US', longOpts)}`
  }
  return `${s.toLocaleDateString('en-US', shortOpts)} – ${e.toLocaleDateString('en-US', longOpts)}`
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const festival = await getFestival(slug)
  if (!festival) return { title: 'festival not found — groundscore' }
  return {
    title: `${festival.full_name} — groundscore`,
    description:
      festival.description ??
      `${festival.full_name} lineup and spotify playlist.`,
  }
}

export default async function FestivalPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const festival = await getFestival(slug)
  if (!festival) notFound()

  const lineups = await getLineups(festival.id)

  // Group by day → stage, preserving day_order for sort
  const dayMap = new Map<
    string,
    { day_order: number; stages: Map<string, LineupWithArtist[]> }
  >()

  for (const row of lineups) {
    const dayKey = row.day ?? 'TBD'
    if (!dayMap.has(dayKey)) {
      dayMap.set(dayKey, { day_order: row.day_order ?? 999, stages: new Map() })
    }
    const dayData = dayMap.get(dayKey)!
    const stageKey = row.stage ?? 'TBD'
    if (!dayData.stages.has(stageKey)) {
      dayData.stages.set(stageKey, [])
    }
    dayData.stages.get(stageKey)!.push(row)
  }

  const sortedDays = [...dayMap.entries()].sort(
    (a, b) => a[1].day_order - b[1].day_order
  )

  // Unique artists (primary + b2b partner) with no Spotify URL
  const seenIds = new Set<string>()
  const noSpotify: ArtistSummary[] = []
  for (const row of lineups) {
    for (const a of [row.artist, row.partner]) {
      if (a && !a.spotify_url && !seenIds.has(a.id)) {
        seenIds.add(a.id)
        noSpotify.push(a)
      }
    }
  }
  noSpotify.sort((a, b) => a.name.localeCompare(b.name))

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-[#F5F2EC] px-6 py-14">
      <div className="max-w-[700px] mx-auto">

        {/* Header */}
        <header className="mb-10">
          <h1 className="font-sans font-extrabold text-4xl sm:text-5xl leading-tight tracking-tight">
            {festival.full_name}
          </h1>
          <p className="mt-2 font-mono text-xs text-[#A8A29E] tracking-wide uppercase">
            {formatDateRange(festival.start_date, festival.end_date)}
            <span className="mx-2">·</span>
            {festival.location}
          </p>
          {festival.description && (
            <p className="mt-4 text-sm text-[#A8A29E] leading-relaxed max-w-prose">
              {festival.description}
            </p>
          )}
        </header>

        {/* Spotify embed — centerpiece */}
        {festival.spotify_playlist_id ? (
          <section className="mb-3">
            <iframe
              src={`https://open.spotify.com/embed/playlist/${festival.spotify_playlist_id}?theme=0`}
              width="100%"
              height="152"
              style={{ border: 'none', display: 'block' }}
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              title={`${festival.full_name} playlist`}
            />
            <p className="mt-3 text-xs text-[#A8A29E]">
              tap the heart in the player to save this playlist to your spotify library.
            </p>
          </section>
        ) : null}

        {/* Lineup */}
        <section className="mt-12">
          <p className="font-mono text-[10px] uppercase tracking-widest text-[#A8A29E] border-b border-[#1F1F1F] pb-2 mb-8">
            lineup
          </p>

          {sortedDays.map(([day, { stages }]) => (
            <div key={day} className="mb-10">
              <h2 className="font-mono text-xs uppercase tracking-widest text-[#F5F2EC] border-b border-[#1F1F1F] pb-2 mb-5">
                {day}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[...stages.entries()].map(([stage, rows]) => {
                  const showcase = rows.find((r) => r.showcase)?.showcase ?? null
                  return (
                    <div key={stage}>
                      <span className="font-mono text-[10px] uppercase tracking-widest text-[#A8A29E] block mb-1">
                        {stage}
                      </span>
                      {showcase && (
                        <span className="font-mono text-[10px] tracking-widest text-[#A8A29E] block mb-2 opacity-70">
                          {showcase}
                        </span>
                      )}
                      {!showcase && <span className="block mb-2" />}
                      <ul className="space-y-1.5">
                        {rows.map((row) => (
                          <li key={row.id} className="text-sm leading-snug">
                            {row.artist.spotify_url ? (
                              <a
                                href={row.artist.spotify_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#F5F2EC] hover:underline underline-offset-2 decoration-[#4C1D95]"
                              >
                                {row.artist.name}
                              </a>
                            ) : (
                              <span className="text-[#F5F2EC]">{row.artist.name}</span>
                            )}
                            {row.partner && (
                              <>
                                <span className="font-mono text-[10px] text-[#A8A29E] mx-1">b2b</span>
                                {row.partner.spotify_url ? (
                                  <a
                                    href={row.partner.spotify_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[#F5F2EC] hover:underline underline-offset-2 decoration-[#4C1D95]"
                                  >
                                    {row.partner.name}
                                  </a>
                                ) : (
                                  <span className="text-[#F5F2EC]">{row.partner.name}</span>
                                )}
                              </>
                            )}
                            {row.notes && (
                              <span className="font-mono text-[10px] text-[#A8A29E] ml-1">
                                · {row.notes.toLowerCase()}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </section>

        {/* Not on Spotify callout */}
        {noSpotify.length > 0 && (
          <section className="mt-4 pt-6 border-t border-[#1F1F1F]">
            <p className="text-xs italic text-[#A8A29E] leading-relaxed">
              not on spotify:{' '}
              {noSpotify.map((artist, i) => (
                <span key={artist.id}>
                  {artist.soundcloud_url ? (
                    <a
                      href={artist.soundcloud_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-[#F5F2EC] underline underline-offset-2 transition-colors"
                    >
                      {artist.name}
                    </a>
                  ) : (
                    artist.name
                  )}
                  {i < noSpotify.length - 1 ? ', ' : ''}
                </span>
              ))}
            </p>
          </section>
        )}
      </div>
    </main>
  )
}
