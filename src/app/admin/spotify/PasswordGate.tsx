'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function PasswordGate() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch('/api/admin/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    if (res.ok) {
      router.refresh()
    } else {
      setError('incorrect password')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xs">
      <label className="block font-mono text-[10px] uppercase tracking-widest text-[#A8A29E] mb-2">
        password
      </label>
      <input
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        className="w-full bg-[#1F1F1F] text-[#F5F2EC] text-sm px-3 py-2 rounded-sm outline-none placeholder:text-[#A8A29E] focus:ring-1 focus:ring-[#4C1D95]"
        autoFocus
        disabled={loading}
      />
      {error && (
        <p className="mt-2 font-mono text-xs text-red-400">{error}</p>
      )}
      <button
        type="submit"
        disabled={loading || !password}
        className="mt-3 w-full bg-[#4C1D95] text-[#F5F2EC] font-mono text-xs uppercase tracking-widest py-2 px-4 rounded-sm hover:opacity-90 disabled:opacity-40 transition-opacity"
      >
        {loading ? '...' : 'enter'}
      </button>
    </form>
  )
}
