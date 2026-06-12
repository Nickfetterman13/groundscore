'use client'

import { useState, useEffect } from 'react'

interface BackfillRow {
  id: string
  name: string
}

type Phase = 'idle' | 'running' | 'done'

const btnPrimary =
  'bg-[#4C1D95] text-[#F5F2EC] font-mono text-xs uppercase tracking-widest py-2 px-5 rounded-sm hover:opacity-90 disabled:opacity-40 transition-opacity'

export default function BackfillPanel() {
  const [count, setCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [phase, setPhase] = useState<Phase>('idle')
  const [runError, setRunError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [updated, setUpdated] = useState(0)
  const [failedNames, setFailedNames] = useState<string[]>([])

  useEffect(() => {
    fetch('/api/admin/spotify-backfill')
      .then(res => res.json().then(data => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok || data.error) {
          setLoadError(data.error ?? 'failed to load')
        } else {
          setCount(data.count ?? 0)
        }
        setLoading(false)
      })
      .catch(() => {
        setLoadError('failed to load — network error')
        setLoading(false)
      })
  }, [])

  async function handleBackfill() {
    if (!count) return
    setRunError(null)
    setPhase('running')
    setTotal(count)
    setUpdated(0)
    setFailedNames([])

    let excludeIds: string[] = []
    let updatedCount = 0
    const failed: string[] = []

    while (true) {
      let data: { processed?: BackfillRow[]; failed?: BackfillRow[]; error?: string }
      try {
        const res = await fetch('/api/admin/spotify-backfill', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ excludeIds }),
        })
        data = await res.json().catch(() => ({}))
        if (!res.ok || data.error) {
          setRunError(data.error ?? 'backfill failed')
          break
        }
      } catch {
        setRunError('backfill failed — network error')
        break
      }

      const processed = data.processed ?? []
      const failedRows = data.failed ?? []

      updatedCount += processed.length
      setUpdated(updatedCount)

      if (failedRows.length > 0) {
        for (const row of failedRows) {
          failed.push(row.name)
          excludeIds = [...excludeIds, row.id]
        }
        setFailedNames([...failed])
      }

      if (processed.length === 0) break
    }

    setPhase('done')
  }

  if (loading) {
    return <p className="font-mono text-xs text-[#A8A29E]">loading…</p>
  }

  if (loadError) {
    return (
      <div className="border border-red-900 bg-red-950/40 rounded p-3 max-w-md">
        <p className="font-mono text-xs text-red-400">{loadError}</p>
      </div>
    )
  }

  const progress = total > 0 ? Math.min(1, (updated + failedNames.length) / total) : 0

  return (
    <div className="max-w-md">
      <p className="text-sm text-[#A8A29E] mb-4">
        <span className="font-mono text-[#F5F2EC]">{count}</span> artist{count === 1 ? '' : 's'} need metadata.
      </p>

      {phase === 'idle' && count !== null && count > 0 && (
        <button onClick={handleBackfill} className={btnPrimary}>
          backfill metadata →
        </button>
      )}

      {phase === 'running' && (
        <div>
          <p className="font-mono text-xs text-[#A8A29E] mb-3">
            {updated + failedNames.length} / {total}
          </p>
          <div className="h-1 bg-[#1F1F1F] rounded-sm overflow-hidden">
            <div
              className="h-full bg-[#4C1D95] transition-all"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>
      )}

      {phase === 'done' && (
        <div>
          <p className="text-sm mb-2">
            <span className="font-mono text-[#F5F2EC]">{updated}</span> updated,{' '}
            <span className="font-mono text-[#F5F2EC]">{failedNames.length}</span> could not be fetched
          </p>
          {failedNames.length > 0 && (
            <ul className="font-mono text-[10px] text-[#A8A29E] space-y-0.5 mt-3">
              {failedNames.map(name => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {runError && (
        <div className="mt-4 border border-red-900 bg-red-950/40 rounded p-3">
          <p className="font-mono text-xs text-red-400">{runError}</p>
        </div>
      )}
    </div>
  )
}
