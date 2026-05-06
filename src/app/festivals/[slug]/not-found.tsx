import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-6">
      <div className="text-center">
        <p className="font-mono text-[10px] uppercase tracking-widest text-[#A8A29E] mb-4">
          404
        </p>
        <h1 className="font-sans font-extrabold text-3xl text-[#F5F2EC] mb-6">
          festival not found.
        </h1>
        <Link
          href="/"
          className="font-mono text-xs text-[#A8A29E] hover:text-[#F5F2EC] underline underline-offset-2 tracking-wide transition-colors"
        >
          back to groundscore
        </Link>
      </div>
    </main>
  )
}
