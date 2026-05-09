'use server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { assertAdmin } from '@/lib/admin/assert-admin'
import { getResend, FROM_ADDRESS } from '@/lib/email/resend'
import { revalidatePath } from 'next/cache'

export async function approveEarlyAccess(parentId: string, email: string) {
  const supabase = await createClient()
  await assertAdmin(supabase)
  const admin = createAdminClient()

  await admin
    .from('parents')
    .update({ summer_learning_access: true, summer_learning_requested: true })
    .eq('id', parentId)

  try {
    const resend = getResend()
    await resend.emails.send({
      from: FROM_ADDRESS,
      replyTo: 'admin@t20squares.com',
      to: email,
      subject: "You're in — Summer Learning is ready for you on SolPrep",
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
          <p>Your early access to <strong>Summer Learning</strong> on SolPrep is ready. You now have access to three new features:</p>
          <ul style="padding-left: 20px; line-height: 2;">
            <li>🐝 <strong>Spelling Bee</strong> — hear a word, spell it correctly</li>
            <li>✖️ <strong>Times Tables Trainer</strong> — speed drills with personal bests</li>
            <li>📚 <strong>Summer Reading Library</strong> — age-appropriate stories with TTS read-aloud</li>
          </ul>
          <p>Head to your dashboard and you'll see the Summer Learning section is now unlocked.</p>
          <p style="margin: 28px 0;">
            <a href="https://solprep.app/dashboard" style="background: #1a1a1a; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-size: 14px;">Go to Dashboard →</a>
          </p>
          <p style="margin-top: 24px;">— Sri</p>
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
    // Email failure shouldn't block the approval
  }

  revalidatePath('/admin/early-access')
}

export async function revokeEarlyAccess(parentId: string) {
  const supabase = await createClient()
  await assertAdmin(supabase)
  const admin = createAdminClient()

  await admin
    .from('parents')
    .update({ summer_learning_access: false })
    .eq('id', parentId)

  revalidatePath('/admin/early-access')
}
