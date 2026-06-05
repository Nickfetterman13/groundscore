'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import ArtistSearch, { type ArtistOption } from './ArtistSearch'
import type { Festival } from '@/lib/supabase'

// ——— Types ———

type MatchStatus = 'existing' | 'new' | 'ambiguous'

interface LineupRow {
  key: string
  displayName: string
  artist: ArtistOption | null
  isNewArtist: boolean
  matchStatus: MatchStatus
  hasB2B: boolean
  b2bArtist: ArtistOption | null
  isNewB2BArtist: boolean
  showcaseEnabled: boolean
  showcaseName: string
  stage: string
  day: string
  dayOrder: number | null
}

interface NewFestivalFields {
  name: string
  slug: string
  edition: string
  full_name: string
  location: string
  start_date: string
  end_date: string
  spotify_playlist_id: string
  description: string
  is_published: boolean
}

interface DayOption {
  label: string
  order: number
}

// ——— Helpers ———

let keyCounter = 0
function makeKey() { return `r${++keyCounter}` }

function emptyRow(displayName = ''): LineupRow {
  return {
    key: makeKey(),
    displayName,
    artist: null,
    isNewArtist: false,
    matchStatus: 'new',
    hasB2B: false,
    b2bArtist: null,
    isNewB2BArtist: false,
    showcaseEnabled: false,
    showcaseName: '',
    stage: '',
    day: '',
    dayOrder: null,
  }
}

function parseLines(text: string): LineupRow[] {
  return text
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0)
    .map(l => emptyRow(l))
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
}

function generateDays(start: string, end: string): DayOption[] {
  const s = new Date(start + 'T12:00:00Z')
  const e = new Date(end + 'T12:00:00Z')
  const days: DayOption[] = []
  let curr = new Date(s)
  let i = 1
  while (curr <= e && i <= 31) {
    days.push({ label: `Day ${i}`, order: i })
    curr.setUTCDate(curr.getUTCDate() + 1)
    i++
  }
  return days
}

// ——— Shared style tokens ———

const inputCls =
  'w-full bg-[#1F1F1F] text-[#F5F2EC] text-xs px-2 py-1.5 rounded-sm outline-none placeholder:text-[#A8A29E] focus:ring-1 focus:ring-[#4C1D95]'
const labelCls =
  'block font-mono text-[10px] uppercase tracking-widest text-[#A8A29E] mb-1'
const btnPrimary =
  'bg-[#4C1D95] text-[#F5F2EC] font-mono text-xs uppercase tracking-widest py-2 px-5 rounded-sm hover:opacity-90 disabled:opacity-40 transition-opacity'

const EMPTY_NEW_FESTIVAL: NewFestivalFields = {
  name: '', slug: '', edition: '', full_name: '',
  location: '', start_date: '', end_date: '',
  spotify_playlist_id: '', description: '', is_published: false,
}

// ——— Component ———

export default function ImportClient({ festivals: initialFestivals }: { festivals: Festival[] }) {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3>(1)

  // Step 1 state
  const [festivals, setFestivals] = useState<Festival[]>(initialFestivals)
  const [selectedFestival, setSelectedFestival] = useState<Festival | null>(null)
  const [showNewForm, setShowNewForm] = useState(false)
  const [newFest, setNewFest] = useState<NewFestivalFields>(EMPTY_NEW_FESTIVAL)
  const [newFestError, setNewFestError] = useState<string | null>(null)
  const [newFestLoading, setNewFestLoading] = useState(false)
  const [slugUserEdited, setSlugUserEdited] = useState(false)

  // Step 2 state
  const [rawText, setRawText] = useState('')
  const [parsing, setParsing] = useState(false)

  // Step 3 state
  const [rows, setRows] = useState<LineupRow[]>([])
  const [importError, setImportError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)

  // ——— Step 1 ———

  function handleFestivalSelect(id: string) {
    if (id === '__new__') {
      setShowNewForm(true)
      setSelectedFestival(null)
    } else if (id === '') {
      setShowNewForm(false)
      setSelectedFestival(null)
    } else {
      setShowNewForm(false)
      setSelectedFestival(festivals.find(f => f.id === id) ?? null)
    }
  }

  async function handleCreateFestival() {
    setNewFestLoading(true)
    setNewFestError(null)

    const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
    if (!SLUG_RE.test(newFest.slug)) {
      setNewFestError('Slug must be lowercase letters, numbers, and dashes only')
      setNewFestLoading(false)
      return
    }
    if (festivals.some(f => f.slug.toLowerCase() === newFest.slug.toLowerCase())) {
      setNewFestError(`Slug "${newFest.slug}" is already taken`)
      setNewFestLoading(false)
      return
    }

    const body: Record<string, unknown> = {
      name: newFest.name,
      slug: newFest.slug,
      full_name: newFest.full_name || newFest.name,
      location: newFest.location,
      start_date: newFest.start_date,
      end_date: newFest.end_date,
      is_published: newFest.is_published,
    }
    if (newFest.edition.trim()) body.edition = newFest.edition.trim()
    if (newFest.description.trim()) body.description = newFest.description.trim()
    if (newFest.spotify_playlist_id.trim()) body.spotify_playlist_id = newFest.spotify_playlist_id.trim()

    const res = await fetch('/api/admin/festivals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const d = await res.json()
      setNewFestError(d.error ?? 'failed to create festival')
      setNewFestLoading(false)
      return
    }

    const created = await res.json()
    setFestivals(prev => [created, ...prev])
    setSelectedFestival(created)
    setShowNewForm(false)
    setNewFest(EMPTY_NEW_FESTIVAL)
    setSlugUserEdited(false)
    setNewFestLoading(false)
    setStep(2)
  }

  // ——— Step 2 ———

  async function handleParse() {
    setParsing(true)
    const parsed = parseLines(rawText)
    const names = parsed.map(r => r.displayName)

    let matchMap: Record<string, { id: string; name: string }[]> = {}
    try {
      const res = await fetch('/api/admin/artists/batch-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ names }),
      })
      if (res.ok) matchMap = await res.json()
    } catch { /* network failure — treat all as new */ }

    const linked: LineupRow[] = parsed.map(r => {
      const key = r.displayName.trim().toLowerCase()
      const matches = matchMap[key] ?? []
      if (matches.length === 1) {
        return { ...r, artist: matches[0], isNewArtist: false, matchStatus: 'existing' as const }
      } else if (matches.length >= 2) {
        return { ...r, artist: null, isNewArtist: false, matchStatus: 'ambiguous' as const }
      } else {
        return { ...r, artist: { id: '', name: r.displayName.trim() }, isNewArtist: true, matchStatus: 'new' as const }
      }
    })

    setRows(linked)
    setParsing(false)
    setStep(3)
  }

  // ——— Step 3 ———

  const updateRow = useCallback((key: string, patch: Partial<LineupRow>) => {
    setRows(prev => prev.map(r => r.key === key ? { ...r, ...patch } : r))
  }, [])

  const deleteRow = useCallback((key: string) => {
    setRows(prev => prev.filter(r => r.key !== key))
  }, [])

  // ——— Step 4: commit ———

  async function handleImport() {
    if (!selectedFestival) return
    setImporting(true)
    setImportError(null)

    const res = await fetch('/api/admin/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ festivalId: selectedFestival.id, rows }),
    })

    if (!res.ok) {
      const d = await res.json()
      setImportError(d.error ?? 'import failed')
      setImporting(false)
      return
    }

    router.push(`/festivals/${selectedFestival.slug}`)
  }

  // ——— Derived ———

  const dayOptions: DayOption[] = selectedFestival
    ? generateDays(selectedFestival.start_date, selectedFestival.end_date)
    : []

  const existingCount = rows.filter(r => r.matchStatus === 'existing').length
  const newCount = rows.filter(r => r.matchStatus === 'new').length
  const ambiguousCount = rows.filter(r => r.matchStatus === 'ambiguous').length

  // ——— Render ———

  return (
    <div>

      {/* ── Step 1: Festival selector ── */}
      {step === 1 && (
        <section>
          <p className={labelCls}>1 — select festival</p>

          <select
            value={selectedFestival?.id ?? (showNewForm ? '__new__' : '')}
            onChange={e => handleFestivalSelect(e.target.value)}
            className="bg-[#1F1F1F] text-[#F5F2EC] text-sm px-3 py-2 rounded-sm outline-none focus:ring-1 focus:ring-[#4C1D95] max-w-sm w-full"
          >
            <option value="">— pick a festival —</option>
            {festivals.map(f => (
              <option key={f.id} value={f.id}>{f.full_name}</option>
            ))}
            <option value="__new__">+ new festival</option>
          </select>

          {selectedFestival && !showNewForm && (
            <div className="mt-4">
              <button onClick={() => setStep(2)} className={btnPrimary}>
                next →
              </button>
            </div>
          )}

          {showNewForm && (
            <div className="mt-6 border border-[#1F1F1F] rounded p-5 max-w-lg">
              <p className="font-mono text-[10px] uppercase tracking-widest text-[#A8A29E] mb-5">
                new festival
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>name *</label>
                  <input
                    className={inputCls}
                    value={newFest.name}
                    onChange={e => setNewFest(p => ({
                      ...p,
                      name: e.target.value,
                      full_name: p.full_name || e.target.value,
                      slug: slugUserEdited ? p.slug : toSlug(e.target.value),
                    }))}
                  />
                </div>
                <div>
                  <label className={labelCls}>slug *</label>
                  <input
                    className={inputCls}
                    value={newFest.slug}
                    onChange={e => {
                      setSlugUserEdited(true)
                      setNewFest(p => ({ ...p, slug: e.target.value }))
                    }}
                    placeholder="awakenings-2026"
                  />
                </div>
                <div>
                  <label className={labelCls}>full name *</label>
                  <input
                    className={inputCls}
                    value={newFest.full_name}
                    onChange={e => setNewFest(p => ({ ...p, full_name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className={labelCls}>edition</label>
                  <input
                    className={inputCls}
                    value={newFest.edition}
                    onChange={e => setNewFest(p => ({ ...p, edition: e.target.value }))}
                    placeholder="optional"
                  />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>location *</label>
                  <input
                    className={inputCls}
                    value={newFest.location}
                    onChange={e => setNewFest(p => ({ ...p, location: e.target.value }))}
                  />
                </div>
                <div>
                  <label className={labelCls}>start date *</label>
                  <input
                    type="date"
                    className={inputCls}
                    value={newFest.start_date}
                    onChange={e => setNewFest(p => ({ ...p, start_date: e.target.value }))}
                  />
                </div>
                <div>
                  <label className={labelCls}>end date *</label>
                  <input
                    type="date"
                    className={inputCls}
                    value={newFest.end_date}
                    onChange={e => setNewFest(p => ({ ...p, end_date: e.target.value }))}
                  />
                </div>
                <div>
                  <label className={labelCls}>spotify playlist id</label>
                  <input
                    className={inputCls}
                    value={newFest.spotify_playlist_id}
                    onChange={e => setNewFest(p => ({ ...p, spotify_playlist_id: e.target.value }))}
                    placeholder="optional"
                  />
                </div>
                <div>
                  <label className={labelCls}>description</label>
                  <input
                    className={inputCls}
                    value={newFest.description}
                    onChange={e => setNewFest(p => ({ ...p, description: e.target.value }))}
                    placeholder="optional"
                  />
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="pub"
                    checked={newFest.is_published}
                    onChange={e => setNewFest(p => ({ ...p, is_published: e.target.checked }))}
                    className="accent-[#4C1D95]"
                  />
                  <label htmlFor="pub" className="font-mono text-[10px] uppercase tracking-widest text-[#A8A29E] cursor-pointer">
                    publish immediately
                  </label>
                </div>
              </div>

              {newFestError && (
                <p className="mt-3 font-mono text-xs text-red-400">{newFestError}</p>
              )}

              <div className="mt-5 flex items-center gap-4">
                <button
                  onClick={handleCreateFestival}
                  disabled={
                    newFestLoading ||
                    !newFest.name.trim() ||
                    !newFest.slug.trim() ||
                    !newFest.location.trim() ||
                    !newFest.start_date ||
                    !newFest.end_date
                  }
                  className={btnPrimary}
                >
                  {newFestLoading ? '...' : 'create festival'}
                </button>
                <button
                  onClick={() => { setShowNewForm(false); setSlugUserEdited(false) }}
                  className="font-mono text-[10px] text-[#A8A29E] hover:text-[#F5F2EC]"
                >
                  cancel
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── Step 2: Paste lineup ── */}
      {step === 2 && selectedFestival && (
        <section>
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => setStep(1)}
              className="font-mono text-[10px] text-[#A8A29E] hover:text-[#F5F2EC]"
            >
              ← back
            </button>
            <span className="font-mono text-[10px] text-[#A8A29E]">{selectedFestival.full_name}</span>
          </div>

          <p className={labelCls}>2 — paste lineup (one billing per line, top of poster first)</p>

          <textarea
            className="w-full max-w-lg h-64 bg-[#1F1F1F] text-[#F5F2EC] text-sm font-mono px-3 py-2.5 rounded-sm outline-none placeholder:text-[#A8A29E] focus:ring-1 focus:ring-[#4C1D95] resize-none"
            value={rawText}
            onChange={e => setRawText(e.target.value)}
            placeholder={'DJ Stingray\nXavier\nMalena\n...'}
            autoFocus
          />

          <div className="mt-4">
            <button
              onClick={handleParse}
              disabled={!rawText.trim() || parsing}
              className={btnPrimary}
            >
              {parsing ? 'detecting…' : 'parse →'}
            </button>
          </div>
        </section>
      )}

      {/* ── Step 3: Preview table ── */}
      {step === 3 && selectedFestival && (
        <section>
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => setStep(2)}
              className="font-mono text-[10px] text-[#A8A29E] hover:text-[#F5F2EC]"
            >
              ← back
            </button>
            <span className="font-mono text-[10px] text-[#A8A29E]">{selectedFestival.full_name}</span>
          </div>

          <p className={labelCls}>3 — preview &amp; assign</p>

          {/* Counter */}
          <p className="font-mono text-[10px] text-[#A8A29E] mb-4">
            <code className="text-[#F5F2EC]">{existingCount}</code> existing
            {' · '}
            <code className="text-[#4C1D95]">{newCount}</code> new
            {ambiguousCount > 0 && (
              <> · <code className="text-amber-400">{ambiguousCount}</code> ambiguous</>
            )}
          </p>

          {/* Table */}
          <div className="overflow-x-auto border border-[#1F1F1F] rounded">
            <table
              className="w-full border-collapse text-sm"
              style={{ tableLayout: 'fixed', minWidth: 880 }}
            >
              <colgroup>
                <col style={{ width: 36 }} />   {/* # */}
                <col style={{ width: 170 }} />  {/* display name */}
                <col style={{ width: 160 }} />  {/* artist */}
                <col style={{ width: 180 }} />  {/* b2b */}
                <col style={{ width: 145 }} />  {/* showcase */}
                <col style={{ width: 100 }} />  {/* stage */}
                <col style={{ width: 85 }} />   {/* day */}
                <col style={{ width: 24 }} />   {/* delete */}
              </colgroup>
              <thead>
                <tr className="border-b border-[#1F1F1F] bg-[#0d0d0d]">
                  {['#', 'display name', 'artist', 'b2b', 'showcase', 'stage', 'day', ''].map((h, i) => (
                    <th
                      key={i}
                      className="font-mono text-[9px] uppercase tracking-widest text-[#A8A29E] text-left py-2 px-2 first:pl-3"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr
                    key={row.key}
                    className={[
                      'border-b border-[#1F1F1F]',
                      row.matchStatus === 'ambiguous'
                        ? 'bg-amber-950/20 hover:bg-amber-950/30'
                        : 'hover:bg-[#0d0d0d]',
                    ].join(' ')}
                  >

                    {/* Position + status */}
                    <td className="py-1.5 pl-3 pr-2">
                      <div className="flex flex-col items-start leading-none gap-0.5">
                        <span className="font-mono text-[10px] text-[#A8A29E]">{idx + 1}</span>
                        {row.matchStatus === 'new' && (
                          <span className="font-mono text-[8px] text-[#4C1D95]">NEW</span>
                        )}
                        {row.matchStatus === 'ambiguous' && (
                          <span className="font-mono text-[8px] text-amber-400">AMB</span>
                        )}
                      </div>
                    </td>

                    {/* Display name */}
                    <td className="py-1.5 px-2">
                      <input
                        type="text"
                        value={row.displayName}
                        onChange={e => updateRow(row.key, { displayName: e.target.value })}
                        className={inputCls}
                      />
                    </td>

                    {/* Artist */}
                    <td className="py-1.5 px-2">
                      <div className={row.matchStatus === 'ambiguous' ? 'ring-1 ring-amber-500/50 rounded-sm' : ''}>
                        <ArtistSearch
                          value={row.artist}
                          isNew={row.isNewArtist}
                          onChange={(a, isNew) => updateRow(row.key, {
                            artist: a,
                            isNewArtist: isNew,
                            matchStatus: a ? (isNew ? 'new' : 'existing') : 'new',
                          })}
                        />
                      </div>
                    </td>

                    {/* B2B */}
                    <td className="py-1.5 px-2">
                      <div className="flex items-start gap-1.5">
                        <input
                          type="checkbox"
                          checked={row.hasB2B}
                          onChange={e => updateRow(row.key, {
                            hasB2B: e.target.checked,
                            b2bArtist: e.target.checked ? row.b2bArtist : null,
                            isNewB2BArtist: e.target.checked ? row.isNewB2BArtist : false,
                          })}
                          className="mt-1 flex-shrink-0 accent-[#4C1D95]"
                          title="b2b"
                        />
                        {row.hasB2B && (
                          <ArtistSearch
                            value={row.b2bArtist}
                            isNew={row.isNewB2BArtist}
                            onChange={(a, isNew) => updateRow(row.key, { b2bArtist: a, isNewB2BArtist: isNew })}
                            placeholder="b2b partner…"
                          />
                        )}
                      </div>
                    </td>

                    {/* Showcase */}
                    <td className="py-1.5 px-2">
                      <div className="flex items-start gap-1.5">
                        <input
                          type="checkbox"
                          checked={row.showcaseEnabled}
                          onChange={e => updateRow(row.key, { showcaseEnabled: e.target.checked })}
                          className="mt-1 flex-shrink-0 accent-[#4C1D95]"
                          title="showcase"
                        />
                        {row.showcaseEnabled && (
                          <input
                            type="text"
                            value={row.showcaseName}
                            onChange={e => updateRow(row.key, { showcaseName: e.target.value })}
                            placeholder="label name…"
                            className={inputCls}
                          />
                        )}
                      </div>
                    </td>

                    {/* Stage */}
                    <td className="py-1.5 px-2">
                      <input
                        type="text"
                        value={row.stage}
                        onChange={e => updateRow(row.key, { stage: e.target.value })}
                        className={inputCls}
                      />
                    </td>

                    {/* Day */}
                    <td className="py-1.5 px-2">
                      <select
                        value={row.day}
                        onChange={e => {
                          const opt = dayOptions.find(d => d.label === e.target.value)
                          updateRow(row.key, { day: e.target.value, dayOrder: opt?.order ?? null })
                        }}
                        className={inputCls}
                      >
                        <option value=""></option>
                        {dayOptions.map(d => (
                          <option key={d.label} value={d.label}>{d.label}</option>
                        ))}
                      </select>
                    </td>

                    {/* Delete */}
                    <td className="py-1.5 px-2">
                      <button
                        type="button"
                        onClick={() => deleteRow(row.key)}
                        className="text-[#A8A29E] hover:text-red-400 transition-colors text-base leading-none"
                        title="remove row"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add row */}
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setRows(prev => [...prev, emptyRow()])}
              className="font-mono text-[10px] uppercase tracking-widest text-[#A8A29E] hover:text-[#F5F2EC] transition-colors"
            >
              + add row
            </button>
          </div>

          {/* Error */}
          {importError && (
            <div className="mt-4 border border-red-900 bg-red-950/40 rounded p-3">
              <p className="font-mono text-xs text-red-400">{importError}</p>
            </div>
          )}

          {/* Import button */}
          <div className="mt-6 pb-16">
            {ambiguousCount > 0 && (
              <p className="font-mono text-[10px] text-amber-400 mb-3">
                resolve {ambiguousCount} ambiguous row{ambiguousCount !== 1 ? 's' : ''} before importing
              </p>
            )}
            <button
              onClick={handleImport}
              disabled={importing || rows.length === 0 || ambiguousCount > 0}
              className={btnPrimary}
            >
              {importing ? 'importing…' : `import ${rows.length} billing${rows.length !== 1 ? 's' : ''} →`}
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
