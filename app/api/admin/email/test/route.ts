import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { assertAdmin } from '@/lib/admin/assert-admin'
import { getResend, FROM_ADDRESS, REPLY_TO } from '@/lib/email/resend'
import { buildEmail, type TemplateType } from '@/lib/email/templates'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const userIdOrErr = await assertAdmin(supabase).catch(e => e)
  if (userIdOrErr instanceof Response) return userIdOrErr

  const body = await req.json().catch(() => null)
  const template: TemplateType = body?.template ?? 'no_children'

  // Send to the logged-in admin's own email
  const { data: { user } } = await supabase.auth.getUser()
  const toEmail = user?.email
  if (!toEmail) return NextResponse.json({ error: 'No email for current user' }, { status: 400 })

  const { subject, html } = buildEmail(template, {
    childNames: ['Alex'],
    lastSessionDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
  })

  const { error } = await getResend().emails.send({
    from: FROM_ADDRESS,
    replyTo: REPLY_TO,
    to: toEmail,
    subject: `[TEST] ${subject}`,
    html,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, sentTo: toEmail, template })
}
