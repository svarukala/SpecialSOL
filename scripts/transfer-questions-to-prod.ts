/**
 * Transfers all questions from local Supabase to production.
 * Run with: npx tsx scripts/transfer-questions-to-prod.ts
 */

const LOCAL_URL = 'http://127.0.0.1:54321'
const LOCAL_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const PROD_URL = 'https://cpcsxocziapgqpbtfytr.supabase.co'
const PROD_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwY3N4b2N6aWFwZ3FwYnRmeXRyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDMyMTI2NywiZXhwIjoyMDg5ODk3MjY3fQ.DnJQTrQ_zmUj6rHeQD5vntfEybG9PLGPcD3d4kbqAQE'

const BATCH_SIZE = 100
const COLUMNS = [
  'id', 'grade', 'subject', 'topic', 'subtopic', 'sol_standard',
  'difficulty', 'question_text', 'simplified_text', 'answer_type',
  'choices', 'hint_1', 'hint_2', 'hint_3', 'calculator_allowed',
  'source', 'tier', 'image_svg', 'source_year', 'source_test',
  'reading_passage', 'standards_rewritten', 'created_at',
]

async function fetchLocal(offset: number, limit: number) {
  const res = await fetch(
    `${LOCAL_URL}/rest/v1/questions?select=${COLUMNS.join(',')}&order=created_at.asc&offset=${offset}&limit=${limit}`,
    { headers: { apikey: LOCAL_KEY, Authorization: `Bearer ${LOCAL_KEY}` } }
  )
  if (!res.ok) throw new Error(`Local fetch failed: ${res.status} ${await res.text()}`)
  return res.json()
}

async function upsertProd(rows: any[]) {
  const res = await fetch(`${PROD_URL}/rest/v1/questions`, {
    method: 'POST',
    headers: {
      apikey: PROD_KEY,
      Authorization: `Bearer ${PROD_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(rows),
  })
  if (!res.ok) throw new Error(`Prod upsert failed: ${res.status} ${await res.text()}`)
}

async function getTotalCount() {
  const res = await fetch(`${LOCAL_URL}/rest/v1/questions?select=id`, {
    headers: { apikey: LOCAL_KEY, Authorization: `Bearer ${LOCAL_KEY}`, Prefer: 'count=exact', Range: '0-0' },
  })
  const range = res.headers.get('content-range') ?? ''
  return parseInt(range.split('/')[1] ?? '0', 10)
}

async function main() {
  const total = await getTotalCount()
  console.log(`Transferring ${total} questions in batches of ${BATCH_SIZE}...`)

  let transferred = 0
  let offset = 0

  while (offset < total) {
    const rows = await fetchLocal(offset, BATCH_SIZE)
    if (rows.length === 0) break

    await upsertProd(rows)
    transferred += rows.length
    offset += BATCH_SIZE

    const pct = Math.round((transferred / total) * 100)
    const withImages = rows.filter((r: any) => r.image_svg).length
    process.stdout.write(`\r  ${transferred}/${total} (${pct}%) — batch had ${withImages} with SVG images`)
  }

  console.log('\nDone!')

  // Verify prod count
  const res = await fetch(`${PROD_URL}/rest/v1/questions?select=id`, {
    headers: { apikey: PROD_KEY, Authorization: `Bearer ${PROD_KEY}`, Prefer: 'count=exact', Range: '0-0' },
  })
  const range = res.headers.get('content-range') ?? ''
  const prodCount = range.split('/')[1]
  console.log(`Prod question count: ${prodCount}`)
}

main().catch(err => { console.error(err); process.exit(1) })
