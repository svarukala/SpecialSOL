import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import questions from '../supabase/seed/questions.json'

config({ path: process.env.ENV_FILE ?? '.env.local', override: true })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function seed() {
  console.log(`Seeding ${questions.length} questions...`)
  // Ensure tier defaults to 'standard' for legacy rows that predate the tier column
  const rows = (questions as Record<string, unknown>[]).map((q) => ({ tier: 'standard', ...q }))
  // idempotent: unique index on (sol_standard, question_text) prevents duplicates
  const { error } = await supabase.from('questions').upsert(rows, {
    onConflict: 'sol_standard,question_text',
  })
  if (error) {
    console.error('Seed failed:', error.message)
    process.exit(1)
  }
  console.log('Seed complete.')
}

seed()
