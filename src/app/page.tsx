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

const upcomingFestivals = [
  { name: "Beyond Wonderland Chicago", dates: "June 6–7, 2026", location: "Chicago, IL" },
  { name: "Electric Forest", dates: "June 25–28, 2026", location: "Rothbury, MI" },
  { name: "Beyond Wonderland at the Gorge", dates: "June 27–28, 2026", location: "George, WA" },
  { name: "Lollapalooza", dates: "July 30–Aug 2, 2026", location: "Chicago, IL" },
  { name: "HARD Summer", dates: "Aug 1–2, 2026", location: "Inglewood, CA" },
  { name: "Elements Music & Arts Festival", dates: "Aug 6–9, 2026", location: "Long Pond, PA" },
  { name: "Bass Canyon", dates: "Aug 14–16, 2026", location: "George, WA" },
  { name: "ARC Music Festival", dates: "Sept 4–7, 2026", location: "Chicago, IL" },
  { name: "North Coast Music Festival", dates: "Sept 4–6, 2026", location: "Chicago, IL" },
  { name: "Lost Lands", dates: "Sept 18–20, 2026", location: "Thornville, OH" },
  { name: "III Points", dates: "Oct 16–17, 2026", location: "Miami, FL" },
  { name: "EDC Orlando", dates: "Nov 6–8, 2026", location: "Orlando, FL" },
]

export default async function HomePage() {
  const festivals = await getPublishedFestivals()

  return (
    <main className="min-h-screen bg-[#0A0A0A] flex flex-col">
      <div className="flex-1 px-6 pt-24 pb-16">
        <div className="max-w-xl mx-auto">
          <h1 className="font-sans font-extrabold text-5xl text-[#F5F2EC] tracking-tight mb-2">
            groundscore
          </h1>
          <p className="font-mono text-sm text-[#A8A29E] mb-14">
            find something good.
          </p>

          <p className="font-mono text-xs text-[#A8A29E] mb-4">
            tap a festival to browse the lineup
          </p>

          <ul className="space-y-3">
            {festivals.map((f) => (
              <li key={f.slug}>
                <Link
                  href={`/festivals/${f.slug}`}
                  className="group w-full block border border-[#1F1F1F] rounded-xl p-5 flex justify-between items-center cursor-pointer transition-colors hover:border-[#4C1D95]"
                >
                  <div>
                    <span className="block font-sans font-bold text-lg text-[#F5F2EC] leading-snug">
                      {f.full_name}
                    </span>
                    <span className="block font-mono text-xs text-[#A8A29E] mt-1">
                      {formatDateRange(f.start_date, f.end_date)}
                    </span>
                  </div>
                  <span className="font-mono text-xl text-[#A8A29E] group-hover:text-[#4C1D95] transition-colors ml-4 select-none">
                    ›
                  </span>
                </Link>
              </li>
            ))}

            {upcomingFestivals.map((f) => (
              <li key={f.name}>
                <div className="w-full border border-[#1F1F1F] rounded-xl p-5 flex justify-between items-center cursor-default opacity-50">
                  <div>
                    <span className="block font-sans font-bold text-lg text-[#F5F2EC] leading-snug">
                      {f.name}
                    </span>
                    <span className="block font-mono text-xs text-[#A8A29E] mt-1">
                      {f.dates} · {f.location}
                    </span>
                  </div>
                  <span className="font-mono text-xs text-[#A8A29E] ml-4 whitespace-nowrap">
                    coming soon
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <footer className="px-6 pb-8">
        <div className="max-w-xl mx-auto">
          <p className="font-mono text-[10px] uppercase tracking-widest text-[#A8A29E]">
            GS · 2026
          </p>
        </div>
      </footer>
    </main>
  )
}
