import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: process.env.ENV_FILE ?? '.env.local', override: true })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  const email = process.argv[2]
  if (!email) { console.error('Usage: npx tsx scripts/test-smtp.ts your@email.com'); process.exit(1) }

  console.log(`Sending test password-reset email to ${email}...`)

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'https://solprep.app/reset-password',
  })

  if (error) { console.error('FAILED:', error.message); process.exit(1) }
  console.log('Success — check your inbox. If it arrives, SMTP is working correctly.')
}

main().catch(e => { console.error(e); process.exit(1) })
