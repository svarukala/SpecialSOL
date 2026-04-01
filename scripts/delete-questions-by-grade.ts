// scripts/delete-questions-by-grade.ts
// Deletes all questions (published + pending) for specified grades.
// Use this to purge low-quality AI-generated questions before regenerating.
//
// Usage:
//   npx tsx scripts/delete-questions-by-grade.ts --grades=6,7,8 [--dry-run]
//
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: process.env.ENV_FILE ?? '.env.local', override: true })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function getArg(flag: string): string | undefined {
  return process.argv.find(a => a.startsWith(`--${flag}=`))?.split('=')[1]
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const gradesArg = getArg('grades')
  if (!gradesArg) { console.error('Usage: --grades=6,7,8'); process.exit(1) }
  const grades = gradesArg.split(',').map(Number)

  if (dryRun) console.log('[dry-run] No changes will be written.\n')
  console.log(`Deleting questions for grade(s): ${grades.join(', ')}\n`)

  for (const grade of grades) {
    // Count first
    const { count: pubCount } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('grade', grade)

    const { count: pendCount } = await supabase
      .from('questions_pending')
      .select('*', { count: 'exact', head: true })
      .eq('grade', grade)

    console.log(`Grade ${grade}: ${pubCount ?? 0} published, ${pendCount ?? 0} pending`)

    if (!dryRun) {
      const { error: pubErr } = await supabase
        .from('questions')
        .delete()
        .eq('grade', grade)

      if (pubErr) {
        console.error(`  ✗ Failed to delete published questions for grade ${grade}: ${pubErr.message}`)
      } else {
        console.log(`  ✓ Deleted ${pubCount ?? 0} published questions`)
      }

      const { error: pendErr } = await supabase
        .from('questions_pending')
        .delete()
        .eq('grade', grade)

      if (pendErr) {
        console.error(`  ✗ Failed to delete pending questions for grade ${grade}: ${pendErr.message}`)
      } else {
        console.log(`  ✓ Deleted ${pendCount ?? 0} pending questions`)
      }
    }
  }

  console.log('\nDone.')
}

main().catch(e => { console.error(e); process.exit(1) })
