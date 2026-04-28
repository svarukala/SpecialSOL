import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: process.env.ENV_FILE ?? '.env.local', override: true })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  const { count: before } = await supabase
    .from('questions_pending')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')
  console.log(`Pending before: ${before}`)

  // Find admin user to satisfy reviewed_by FK constraint
  const { data: admin } = await supabase
    .from('parents')
    .select('id')
    .eq('is_admin', true)
    .limit(1)
    .single()

  if (!admin) { console.error('No admin user found'); process.exit(1) }

  const now = new Date().toISOString()
  const { error } = await supabase
    .from('questions_pending')
    .update({ status: 'approved', reviewed_at: now, reviewed_by: admin.id })
    .eq('status', 'pending')

  if (error) { console.error('Error:', error.message); process.exit(1) }

  const { count: after } = await supabase
    .from('questions_pending')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')
  console.log(`Pending after: ${after}`)
}

main().catch(e => { console.error(e); process.exit(1) })
