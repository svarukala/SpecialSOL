import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { assertAdmin } from '@/lib/admin/assert-admin'
import { getResend, FROM_ADDRESS, REPLY_TO } from '@/lib/email/resend'
import { buildEmail, type TemplateType } from '@/lib/email/templates'

interface Recipient {
  parentId: string
  parentEmail: string
  childNames?: string[]
  lastSessionDate?: string
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const userIdOrErr = await assertAdmin(supabase).catch(e => e)
  if (userIdOrErr instanceof Response) return userIdOrErr

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const { template, recipients }: { template: TemplateType; recipients: Recipient[] } = body
  if (!template || !Array.isArray(recipients) || recipients.length === 0) {
    return NextResponse.json({ error: 'template and recipients are required' }, { status: 400 })
  }

  const admin = createAdminClient()
  const results: { email: string; ok: boolean; error?: string }[] = []

  // Fetch current nudge counts in one query
  const parentIds = recipients.map(r => r.parentId)
  const { data: nudgeCounts } = await admin
    .from('parents')
    .select('id, nudge_count')
    .in('id', parentIds)
  const nudgeMap = new Map((nudgeCounts ?? []).map(p => [p.id, p.nudge_count ?? 0]))

  for (const r of recipients) {
    try {
      const { subject, html } = buildEmail(template, {
        childNames: r.childNames,
        lastSessionDate: r.lastSessionDate,
      })

      const { error } = await getResend().emails.send({
        from: FROM_ADDRESS,
        replyTo: REPLY_TO,
        to: r.parentEmail,
        subject,
        html,
      })

      if (error) {
        results.push({ email: r.parentEmail, ok: false, error: error.message })
        continue
      }

      await admin
        .from('parents')
        .update({
          last_nudge_sent_at: new Date().toISOString(),
          nudge_count: (nudgeMap.get(r.parentId) ?? 0) + 1,
        })
        .eq('id', r.parentId)

      results.push({ email: r.parentEmail, ok: true })
    } catch (err) {
      results.push({ email: r.parentEmail, ok: false, error: String(err) })
    }
  }

  const sent = results.filter(r => r.ok).length
  const failed = results.filter(r => !r.ok).length
  return NextResponse.json({ sent, failed, results })
}
