import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? ''
  if (q.length === 0) return Response.json([])

  const { data, error } = await supabase
    .from('artists')
    .select('id, name')
    .ilike('name', `%${q}%`)
    .limit(8)
    .order('name')

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data ?? [])
}
