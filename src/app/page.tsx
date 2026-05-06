import Link from 'next/link'
import { supabase, type Festival } from '@/lib/supabase'

type FestivalSummary = Pick<Festival, 'slug' | 'full_name' | 'start_date' | 'end_date'>

async function getPublishedFestivals(): Promise<FestivalSummary[]> {
  const { data } = await supabase
    .from('festivals')
    .select('slug, full_name, start_date, end_date')
    .eq('is_published', true)
    .order('start_date', { ascending: true })
  return (data ?? []) as FestivalSummary[]
}

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

export default async function HomePage() {
  const festivals = await getPublishedFestivals()

  return (
    <main className="min-h-screen bg-[#0A0A0A] flex flex-col">
      <div className="flex-1 px-6 pt-24 pb-16">
        <div className="max-w-sm mx-auto">
          <h1 className="font-sans font-extrabold text-5xl text-[#F5F2EC] tracking-tight mb-2">
            groundscore
          </h1>
          <p className="font-mono text-sm text-[#A8A29E] mb-14">
            find something good.
          </p>

          {festivals.length > 0 ? (
            <ul className="space-y-6">
              {festivals.map((f) => (
                <li key={f.slug}>
                  <Link href={`/festivals/${f.slug}`} className="group block">
                    <span className="text-sm text-[#F5F2EC] group-hover:text-[#4C1D95] transition-colors">
                      {f.full_name}
                    </span>
                    <span className="block font-mono text-xs text-[#A8A29E] mt-0.5">
                      {formatDateRange(f.start_date, f.end_date)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[#A8A29E]">no festivals yet.</p>
          )}
        </div>
      </div>

      <footer className="px-6 pb-8">
        <div className="max-w-sm mx-auto">
          <p className="font-mono text-[10px] uppercase tracking-widest text-[#A8A29E]">
            GS · 2026
          </p>
        </div>
      </footer>
    </main>
  )
}
