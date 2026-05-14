'use client'

import { useState } from 'react'

type State = 'idle' | 'loading' | 'success' | 'error'

export default function SubscribeForm({ source }: { source: string }) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<State>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function submit() {
    if (state === 'loading') return
    setState('loading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source }),
      })
      const data = await res.json()
      if (data.ok) {
        setState('success')
      } else {
        setErrorMsg(data.error ?? 'something went wrong')
        setState('error')
      }
    } catch {
      setErrorMsg('something went wrong')
      setState('error')
    }
  }

  return (
    <section className="mt-12 pt-6 border-t border-[#1F1F1F]">
      <p className="font-mono text-[10px] uppercase tracking-widest text-[#A8A29E] pb-2 mb-4">
        get notified
      </p>

      {state === 'success' ? (
        <p className="text-sm text-[#F5F2EC]">you&apos;re in. check your email.</p>
      ) : (
        <>
          <p className="text-sm text-[#A8A29E] mb-4">
            we&apos;ll email when set times drop.
          </p>
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
              placeholder="your@email.com"
              className="flex-1 min-w-0 bg-[#1F1F1F] text-[#F5F2EC] text-sm px-3 py-2 rounded-sm outline-none placeholder:text-[#A8A29E] focus:ring-1 focus:ring-[#4C1D95]"
            />
            <button
              onClick={submit}
              disabled={state === 'loading'}
              className="font-mono text-[10px] uppercase tracking-widest bg-[#4C1D95] text-[#F5F2EC] px-4 py-2 rounded-sm hover:bg-[#5b21b6] disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            >
              {state === 'loading' ? '...' : 'notify me'}
            </button>
          </div>
          {state === 'error' && (
            <p className="mt-2 text-xs text-[#A8A29E]">{errorMsg}</p>
          )}
        </>
      )}
    </section>
  )
}
