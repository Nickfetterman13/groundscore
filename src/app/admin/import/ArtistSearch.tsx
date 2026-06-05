'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

export interface ArtistOption {
  id: string
  name: string
}

interface Props {
  value: ArtistOption | null
  isNew: boolean
  onChange: (artist: ArtistOption | null, isNew: boolean) => void
  placeholder?: string
}

export default function ArtistSearch({ value, isNew, onChange, placeholder }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ArtistOption[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const containerRef = useRef<HTMLDivElement>(null)

  const search = useCallback(async (q: string) => {
    if (q.length === 0) { setResults([]); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/artists/search?q=${encodeURIComponent(q)}`)
      if (res.ok) setResults(await res.json())
    } catch { /* network failure — dropdown stays empty */ }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!open) return
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(query), 300)
    return () => clearTimeout(debounceRef.current)
  }, [query, open, search])

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  function clear() {
    onChange(null, false)
    setQuery('')
    setResults([])
  }

  // Selected state: show badge + clear button
  if (value) {
    return (
      <div className="flex items-center gap-1 min-w-0">
        <span className="text-xs text-[#F5F2EC] truncate">
          {value.name}
          {isNew && <span className="font-mono text-[9px] text-[#A8A29E] ml-1">(new)</span>}
        </span>
        <button
          type="button"
          onClick={clear}
          className="flex-shrink-0 text-[#A8A29E] hover:text-[#F5F2EC] text-sm leading-none"
          tabIndex={0}
        >
          ×
        </button>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => { if (query.length > 0) setOpen(true) }}
        placeholder={placeholder ?? 'search artist…'}
        className="w-full bg-[#1F1F1F] text-[#F5F2EC] text-xs px-2 py-1.5 rounded-sm outline-none placeholder:text-[#A8A29E] focus:ring-1 focus:ring-[#4C1D95]"
      />
      {open && query.length > 0 && (
        <div className="absolute z-20 top-full left-0 w-56 mt-0.5 bg-[#1a1a1a] border border-[#2F2F2F] rounded shadow-xl max-h-48 overflow-y-auto">
          {loading && (
            <p className="px-3 py-2 font-mono text-[10px] text-[#A8A29E]">searching…</p>
          )}
          {!loading && results.map(a => (
            <button
              key={a.id}
              type="button"
              onMouseDown={e => {
                e.preventDefault()
                onChange(a, false)
                setQuery('')
                setOpen(false)
              }}
              className="w-full text-left px-3 py-1.5 text-xs text-[#F5F2EC] hover:bg-[#2F2F2F]"
            >
              {a.name}
            </button>
          ))}
          {!loading && (
            <button
              type="button"
              onMouseDown={e => {
                e.preventDefault()
                onChange({ id: '', name: query }, true)
                setQuery('')
                setOpen(false)
              }}
              className="w-full text-left px-3 py-1.5 font-mono text-[10px] text-[#4C1D95] hover:bg-[#2F2F2F] border-t border-[#2F2F2F]"
            >
              + create &quot;{query}&quot;
            </button>
          )}
        </div>
      )}
    </div>
  )
}
