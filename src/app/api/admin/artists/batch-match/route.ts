import { supabase } from '@/lib/supabase'

export async function POST(req: Request) {
  const { names }: { names: string[] } = await req.json()
  if (!Array.isArray(names) || names.length === 0) return Response.json({})

  const trimmed = names.map(n => n.trim()).filter(Boolean)
  if (trimmed.length === 0) return Response.json({})

  const { data, error } = await supabase
    .from('artists')
    .select('id, name')
    .or(trimmed.map(n => `name.ilike.${n}`).join(','))

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const all = data ?? []
  const result: Record<string, { id: string; name: string }[]> = {}
  for (const input of trimmed) {
    const key = input.toLowerCase()
    result[key] = all.filter(a => a.name.toLowerCase() === key)
  }

  return Response.json(result)
}
