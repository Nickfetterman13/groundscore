import { verifyAuth } from '@/lib/adminAuth'
import SpotifyClient from './SpotifyClient'
import BackfillPanel from './BackfillPanel'
import PasswordGate from './PasswordGate'

export const metadata = {
  title: 'spotify matcher — groundscore',
  robots: { index: false, follow: false },
}

export default async function SpotifyPage() {
  if (!(await verifyAuth())) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] text-[#F5F2EC] flex items-center justify-center px-6">
        <div className="w-full max-w-xs">
          <p className="font-mono text-[10px] uppercase tracking-widest text-[#A8A29E] mb-6">
            groundscore / admin
          </p>
          <PasswordGate />
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-[#F5F2EC] px-6 py-14">
      <div className="max-w-[960px] mx-auto">
        <header className="mb-8 pb-4 border-b border-[#1F1F1F]">
          <p className="font-mono text-[10px] uppercase tracking-widest text-[#A8A29E] mb-1">
            groundscore / admin
          </p>
          <h1 className="font-sans font-extrabold text-3xl tracking-tight">spotify matcher</h1>
        </header>
        <SpotifyClient />

        <section className="mt-12 pt-8 border-t border-[#1F1F1F]">
          <h2 className="font-sans font-extrabold text-2xl tracking-tight mb-6">backfill metadata</h2>
          <BackfillPanel />
        </section>
      </div>
    </main>
  )
}
