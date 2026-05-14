import { Resend } from 'resend'
import { supabase } from '@/lib/supabase'

const resend = new Resend(process.env.RESEND_API_KEY)
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const email: unknown = body?.email
  const source: unknown = body?.source

  if (typeof email !== 'string' || !EMAIL_RE.test(email)) {
    return Response.json({ ok: false, error: 'invalid email' }, { status: 400 })
  }

  const { error } = await supabase.from('subscribers').insert({
    email: email.toLowerCase().trim(),
    source: typeof source === 'string' ? source : null,
  })

  if (error) {
    // 23505 = unique_violation — duplicate email is not an error from the user's perspective
    if (error.code === '23505') {
      return Response.json({ ok: true, alreadySubscribed: true })
    }
    console.error('supabase insert error:', error)
    return Response.json({ ok: false, error: 'could not save email' }, { status: 500 })
  }

  // Confirmation email — awaited so it actually completes on serverless.
  // If Resend fails, log but still return success to the user.
  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM as string,
      to: email,
      subject: "you're on the list — groundscore",
      text: [
        "thanks for signing up. we'll email when set times drop for movement,",
        'and when new festival playlists go live.',
        '',
        '— groundscore',
      ].join('\n'),
    })
  } catch (err: unknown) {
    console.error('resend error:', err)
  }

  return Response.json({ ok: true })
}
