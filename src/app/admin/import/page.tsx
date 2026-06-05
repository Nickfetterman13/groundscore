import { cookies } from 'next/headers'
import { supabase } from '@/lib/supabase'
import ImportClient from './ImportClient'
import PasswordGate from './PasswordGate'

function checkAdminAuth(cookieValue: string | undefined): boolean {
  if (!cookieValue || !process.env.ADMIN_PASSWORD) return false
  try {
    return Buffer.from(cookieValue, 'base64').toString() === process.env.ADMIN_PASSWORD
  } catch {
    return false
  }
}

export const metadata = {
  title: 'lineup importer — groundscore',
  robots: { index: false, follow: false },
}

export default async function ImportPage() {
  const cookieStore = await cookies()
  const authCookie = cookieStore.get('gs_admin_auth')

  if (!checkAdminAuth(authCookie?.value)) {
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

  const { data: festivals } = await supabase
    .from('festivals')
    .select('*')
    .order('start_date', { ascending: false })

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-[#F5F2EC] px-6 py-14">
      <div className="max-w-[960px] mx-auto">
        <header className="mb-8 pb-4 border-b border-[#1F1F1F]">
          <p className="font-mono text-[10px] uppercase tracking-widest text-[#A8A29E] mb-1">
            groundscore / admin
          </p>
          <h1 className="font-sans font-extrabold text-3xl tracking-tight">lineup importer</h1>
        </header>
        <ImportClient festivals={festivals ?? []} />
      </div>
    </main>
  )
}
