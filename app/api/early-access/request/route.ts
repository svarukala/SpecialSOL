import { createClient } from '@/lib/supabase/server'
import { getResend, FROM_ADDRESS } from '@/lib/email/resend'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await supabase
    .from('parents')
    .update({ summer_learning_requested: true })
    .eq('id', user.id)

  try {
    const resend = getResend()
    await resend.emails.send({
      from: FROM_ADDRESS,
      replyTo: 'admin@t20squares.com',
      to: user.email!,
      subject: "You're on the list — Summer Learning early access",
      html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="font-family: Georgia, serif; background: #f9f9f9; margin: 0; padding: 0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #f9f9f9; padding: 40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 8px; padding: 40px; max-width: 560px;">
        <tr><td style="font-size: 22px; font-weight: bold; color: #111; padding-bottom: 24px;">SolPrep</td></tr>
        <tr><td style="font-size: 15px; line-height: 1.7; color: #333;">
          <p>Hi,</p>
          <p>You're on the early access list for <strong>Summer Learning</strong> on SolPrep! 🎉</p>
          <p>We're putting the finishing touches on three new activities launching after SOL season:</p>
          <ul style="padding-left: 20px; line-height: 2;">
            <li>🐝 <strong>Spelling Bee</strong> — hear a word, spell it correctly</li>
            <li>✖️ <strong>Times Tables Trainer</strong> — speed drills with personal bests</li>
            <li>📚 <strong>Summer Reading Library</strong> — age-appropriate stories with read-aloud</li>
          </ul>
          <p>We'll email you as soon as your access is ready — usually within a day or two.</p>
          <p style="margin-top: 24px;">— Sri<br/><span style="color: #999; font-size: 13px;">Built this as a Virginia parent. Reply to this email with any questions.</span></p>
        </td></tr>
        <tr><td style="padding-top: 32px; font-size: 12px; color: #999; border-top: 1px solid #eee;">
          SolPrep · Free Virginia SOL practice for grades 3–8<br/>
          <a href="https://solprep.app" style="color: #999;">solprep.app</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    })
  } catch {
    // Email failure doesn't block the request
  }

  return NextResponse.json({ ok: true })
}
