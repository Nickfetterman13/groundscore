'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface QueueArtist {
  id: string
  name: string
}

interface FestivalOption {
  id: string
  name: string
  slug: string
}

interface Candidate {
  spotifyId: string
  name: string
  imageUrl: string | null
  followers: number | null
  popularity: number | null
  genres: string[]
  externalUrl: string | null
}

type Phase = 'queue' | 'matching' | 'done'

// ——— Shared style tokens ———

const inputCls =
  'bg-[#1F1F1F] text-[#F5F2EC] text-xs px-2 py-1.5 rounded-sm outline-none placeholder:text-[#A8A29E] focus:ring-1 focus:ring-[#4C1D95]'
const labelCls =
  'block font-mono text-[10px] uppercase tracking-widest text-[#A8A29E] mb-1'
const btnPrimary =
  'bg-[#4C1D95] text-[#F5F2EC] font-mono text-xs uppercase tracking-widest py-2 px-5 rounded-sm hover:opacity-90 disabled:opacity-40 transition-opacity'
const linkCls =
  'font-mono text-[10px] uppercase tracking-widest text-[#A8A29E] hover:text-[#F5F2EC] transition-colors'

// ——— Helpers ———

function formatFollowers(n: number | null): string | null {
  if (n == null) return null
  if (n < 1000) return `${n} followers`
  if (n < 1_000_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K followers`
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M followers`
}

// ——— Component ———

export default function SpotifyClient() {
  const [phase, setPhase] = useState<Phase>('queue')

  // Festival filter + queue summary
  const [festivals, setFestivals] = useState<FestivalOption[]>([])
  const [festivalId, setFestivalId] = useState('')
  const [queueTotal, setQueueTotal] = useState<number | null>(null)
  const [queueLoading, setQueueLoading] = useState(true)
  const [queueError, setQueueError] = useState<string | null>(null)

  // Matching state
  const [queue, setQueue] = useState<QueueArtist[]>([])
  const [index, setIndex] = useState(0)
  const [matchedCount, setMatchedCount] = useState(0)
  const [skippedCount, setSkippedCount] = useState(0)

  const [query, setQuery] = useState('')
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  // ——— Data loading ———

  useEffect(() => {
    fetch('/api/admin/festivals')
      .then(res => (res.ok ? res.json() : null))
      .then(data => { if (data?.festivals) setFestivals(data.festivals) })
      .catch(() => { /* festival filter just stays empty */ })
  }, [])

  const fetchQueue = useCallback(async (fid: string): Promise<QueueArtist[] | null> => {
    setQueueLoading(true)
    setQueueError(null)
    try {
      const url = fid
        ? `/api/admin/spotify-queue?festival_id=${encodeURIComponent(fid)}`
        : '/api/admin/spotify-queue'
      const res = await fetch(url)
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data.error) {
        setQueueError(data.error ?? 'failed to load queue')
        setQueueTotal(null)
        setQueueLoading(false)
        return null
      }
      setQueueTotal(data.total ?? 0)
      setQueueLoading(false)
      return data.artists ?? []
    } catch {
      setQueueError('failed to load queue — network error')
      setQueueTotal(null)
      setQueueLoading(false)
      return null
    }
  }, [])

  useEffect(() => {
    if (phase !== 'queue') return
    const timer = setTimeout(() => fetchQueue(festivalId), 0)
    return () => clearTimeout(timer)
  }, [festivalId, phase, fetchQueue])

  const runSearch = useCallback(async (q: string) => {
    setSearchLoading(true)
    setSearchError(null)
    try {
      const res = await fetch(`/api/admin/spotify-search?q=${encodeURIComponent(q)}`)
      const data = await res.json().catch(() => ({}))
      if (res.status === 429) {
        setSearchError('rate limited by spotify — wait a moment and try again')
        setCandidates([])
      } else if (!res.ok || data.error) {
        setSearchError(data.error ?? 'search failed')
        setCandidates([])
      } else {
        setCandidates(data.candidates ?? [])
      }
    } catch {
      setSearchError('search failed — network error')
      setCandidates([])
    }
    setSearchLoading(false)
  }, [])

  // ——— Actions ———

  async function handleStart() {
    const artists = await fetchQueue(festivalId)
    if (!artists || artists.length === 0) return
    setQueue(artists)
    setIndex(0)
    setMatchedCount(0)
    setSkippedCount(0)
    setPhase('matching')
    setQuery(artists[0].name)
    setActionError(null)
    runSearch(artists[0].name)
  }

  function advance() {
    const next = index + 1
    if (next >= queue.length) {
      setPhase('done')
      return
    }
    setIndex(next)
    setQuery(queue[next].name)
    setActionError(null)
    runSearch(queue[next].name)
  }

  async function handleMatch(candidate: Candidate) {
    const artist = queue[index]
    if (!artist) return
    setActionLoading(true)
    setActionError(null)
    try {
      const res = await fetch('/api/admin/spotify-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artistId: artist.id,
          spotifyId: candidate.spotifyId,
          spotifyUrl: candidate.externalUrl,
          followers: candidate.followers,
          popularity: candidate.popularity,
          genres: candidate.genres,
          imageUrl: candidate.imageUrl,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data.error) {
        setActionError(data.error ?? 'failed to save match')
        setActionLoading(false)
        return
      }
      setMatchedCount(c => c + 1)
      setActionLoading(false)
      advance()
    } catch {
      setActionError('failed to save match — network error')
      setActionLoading(false)
    }
  }

  async function handleSkip() {
    const artist = queue[index]
    if (!artist) return
    setActionLoading(true)
    setActionError(null)
    try {
      const res = await fetch('/api/admin/spotify-skip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artistId: artist.id }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data.error) {
        setActionError(data.error ?? 'failed to skip')
        setActionLoading(false)
        return
      }
      setSkippedCount(c => c + 1)
      setActionLoading(false)
      advance()
    } catch {
      setActionError('failed to skip — network error')
      setActionLoading(false)
    }
  }

  function handleBackToQueue() {
    setPhase('queue')
    setQueue([])
    setIndex(0)
    setCandidates([])
    setQuery('')
    setSearchError(null)
    setActionError(null)
  }

  const selectedFestival = festivals.find(f => f.id === festivalId) ?? null
  const currentArtist = queue[index]

  // ——— Render: STATE 3 — completion ———

  if (phase === 'done') {
    return (
      <section>
        <h2 className="font-sans font-extrabold text-3xl tracking-tight mb-4">all done.</h2>
        <p className="font-mono text-xs text-[#A8A29E] mb-8">
          {matchedCount} matched, {skippedCount} skipped
        </p>
        <div className="flex flex-wrap items-center gap-6">
          <button onClick={handleBackToQueue} className={linkCls}>
            ← back to queue
          </button>
          {selectedFestival ? (
            <a href={`/festivals/${selectedFestival.slug}`} className={linkCls}>
              view {selectedFestival.name} page →
            </a>
          ) : (
            <Link href="/" className={linkCls}>
              ← back to homepage
            </Link>
          )}
        </div>
      </section>
    )
  }

  // ——— Render: STATE 2 — matching ———

  if (phase === 'matching') {
    return (
      <section>
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#1F1F1F]">
          <span className="font-mono text-xs text-[#A8A29E]">
            {index} / {queue.length} matched
          </span>
        </div>

        <h2 className="font-sans font-extrabold text-3xl tracking-tight mb-6 truncate">
          {currentArtist?.name}
        </h2>

        <div className="flex gap-2 mb-6 max-w-lg">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className={`${inputCls} flex-1`}
          />
          <button onClick={() => runSearch(query)} disabled={searchLoading} className={btnPrimary}>
            search
          </button>
        </div>

        {searchError && (
          <div className="mb-6 border border-red-900 bg-red-950/40 rounded p-3">
            <p className="font-mono text-xs text-red-400">{searchError}</p>
          </div>
        )}

        {searchLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {[0, 1, 2].map(i => (
              <div key={i} className="border border-[#1F1F1F] bg-[#1F1F1F] rounded p-3 h-[280px] animate-pulse" />
            ))}
          </div>
        ) : candidates.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {candidates.map(c => {
              const followers = formatFollowers(c.followers)
              return (
                <div key={c.spotifyId} className="border border-[#1F1F1F] bg-[#1F1F1F] rounded p-3 flex flex-col">
                  {c.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.imageUrl}
                      alt={c.name}
                      className="w-[120px] h-[120px] object-cover rounded-sm mb-3"
                    />
                  ) : (
                    <div className="w-[120px] h-[120px] bg-[#0A0A0A] border border-[#1F1F1F] rounded-sm mb-3" />
                  )}
                  <p className="font-sans font-bold text-sm mb-1 truncate">{c.name}</p>
                  {followers && (
                    <p className="font-mono text-[10px] text-[#A8A29E] mb-2">{followers}</p>
                  )}
                  {c.genres.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {c.genres.slice(0, 3).map(g => (
                        <span
                          key={g}
                          className="font-mono text-[9px] text-[#A8A29E] border border-[#1F1F1F] rounded px-1.5 py-0.5"
                        >
                          {g}
                        </span>
                      ))}
                    </div>
                  )}
                  {c.externalUrl && (
                    <a
                      href={c.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block font-mono text-[9px] text-[#A8A29E] hover:text-[#F5F2EC] truncate mb-3"
                    >
                      {c.externalUrl}
                    </a>
                  )}
                  <button
                    onClick={() => handleMatch(c)}
                    disabled={actionLoading}
                    className="mt-auto w-full bg-[#4C1D95] text-[#F5F2EC] font-mono text-xs uppercase tracking-widest py-2 px-4 rounded-sm hover:opacity-90 disabled:opacity-40 transition-opacity"
                  >
                    this is them
                  </button>
                </div>
              )
            })}
          </div>
        ) : (
          !searchError && <p className="font-mono text-xs text-[#A8A29E] mb-6">no results</p>
        )}

        {actionError && (
          <div className="mb-4 border border-red-900 bg-red-950/40 rounded p-3">
            <p className="font-mono text-xs text-red-400">{actionError}</p>
          </div>
        )}

        <button
          onClick={handleSkip}
          disabled={actionLoading}
          className="font-mono text-xs uppercase tracking-widest text-[#A8A29E] hover:text-[#F5F2EC] disabled:opacity-40 transition-colors"
        >
          not on spotify
        </button>
      </section>
    )
  }

  // ——— Render: STATE 1 — queue ———

  return (
    <section className="max-w-md">
      <p className="font-mono text-xs text-[#A8A29E] mb-6">
        {queueLoading
          ? 'loading…'
          : queueError
            ? queueError
            : `${queueTotal} artist${queueTotal === 1 ? '' : 's'} missing spotify urls`}
      </p>

      <div className="mb-6">
        <label className={labelCls}>festival</label>
        <select
          value={festivalId}
          onChange={e => setFestivalId(e.target.value)}
          className="bg-[#1F1F1F] text-[#F5F2EC] text-sm px-3 py-2 rounded-sm outline-none focus:ring-1 focus:ring-[#4C1D95] w-full"
        >
          <option value="">all festivals</option>
          {festivals.map(f => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
      </div>

      {queueError && (
        <div className="mb-4 border border-red-900 bg-red-950/40 rounded p-3">
          <p className="font-mono text-xs text-red-400">{queueError}</p>
        </div>
      )}

      {!queueLoading && !queueError && queueTotal === 0 && (
        <div>
          <p className="text-sm text-[#A8A29E] mb-4">
            nothing to match. all artists have spotify urls or are marked not-on-spotify.
          </p>
          <Link href="/" className={linkCls}>← back to homepage</Link>
        </div>
      )}

      {!queueLoading && !queueError && queueTotal !== null && queueTotal > 0 && (
        <button onClick={handleStart} disabled={queueLoading} className={btnPrimary}>
          start matching →
        </button>
      )}
    </section>
  )
}
