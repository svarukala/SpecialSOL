// scripts/generate-weekly-challenge-batch.ts
/**
 * generate-weekly-challenge-batch.ts
 *
 * Authors the first batch of weekly challenge puzzles (4 weeks Mystery
 * Code for Elementary, 4 weeks SOLdle for Middle) and inserts them into
 * weekly_puzzles as status='pending'. No AI API call — content is
 * hand-authored here, matching the project's zero-runtime-AI-cost
 * approach for this feature.
 *
 * Run:
 *   set -a && source .env.prod && npx tsx scripts/generate-weekly-challenge-batch.ts
 *
 * After running, review pending rows directly in Supabase, set
 * week_start_date (Mondays) on the ones you approve, and flip
 * status to 'approved'.
 */

import { createClient } from '@supabase/supabase-js'
import type { MysteryCodeContent, MysteryCodeSolution, SoldleContent, SoldleSolution } from '../lib/weekly-challenge/puzzle-types'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const db = createClient(url, key, { auth: { persistSession: false } })

const mysteryCodePuzzles: { title: string; content: MysteryCodeContent; solution: MysteryCodeSolution }[] = [
  {
    title: 'The Locker Code',
    content: {
      codeLabel: '3-digit code',
      questions: [
        { prompt: 'What is 8 x 6?', choices: ['46', '48', '54'], correctIndex: 1, revealsDigit: '4' },
        { prompt: 'Which word is a synonym for "brave"?', choices: ['scared', 'courageous', 'quiet'], correctIndex: 1, revealsDigit: '1' },
        { prompt: 'What is 900 - 350?', choices: ['550', '650', '450'], correctIndex: 0, revealsDigit: '9' },
      ],
    },
    solution: { code: '419' },
  },
  {
    title: 'The Treasure Map Code',
    content: {
      codeLabel: '3-digit code',
      questions: [
        { prompt: 'What fraction is shaded if 3 of 4 equal parts are colored in?', choices: ['1/4', '3/4', '4/3'], correctIndex: 1, revealsDigit: '7' },
        { prompt: 'Which sentence uses correct punctuation?', choices: ['Where are you going', 'Where are you going.', 'Where are you going?'], correctIndex: 2, revealsDigit: '2' },
        { prompt: 'What is 7 x 9?', choices: ['62', '63', '56'], correctIndex: 1, revealsDigit: '6' },
      ],
    },
    solution: { code: '726' },
  },
  {
    title: "The Robot's Password",
    content: {
      codeLabel: '3-digit code',
      questions: [
        { prompt: 'What is the perimeter of a square with sides of 5 cm?', choices: ['20 cm', '25 cm', '10 cm'], correctIndex: 0, revealsDigit: '5' },
        { prompt: 'Which word means the opposite of "ancient"?', choices: ['old', 'modern', 'historic'], correctIndex: 1, revealsDigit: '8' },
        { prompt: 'What is 144 divided by 12?', choices: ['11', '12', '13'], correctIndex: 1, revealsDigit: '3' },
      ],
    },
    solution: { code: '583' },
  },
  {
    title: 'The Secret Garden Gate',
    content: {
      codeLabel: '3-digit code',
      questions: [
        { prompt: 'Round 428 to the nearest hundred.', choices: ['400', '430', '500'], correctIndex: 0, revealsDigit: '6' },
        { prompt: 'Which word is spelled correctly?', choices: ['recieve', 'receive', 'receeve'], correctIndex: 1, revealsDigit: '0' },
        { prompt: 'What is 15 x 4?', choices: ['45', '50', '60'], correctIndex: 2, revealsDigit: '4' },
      ],
    },
    solution: { code: '604' },
  },
]

const soldlePuzzles: { title: string; content: SoldleContent; solution: SoldleSolution }[] = [
  {
    title: 'Ratio Riddle',
    content: {
      concept: 'ratio',
      clue: 'In a bag of marbles, the ratio of red to blue is 3:2. If there are 20 blue marbles, guess the number of red marbles.',
      min: 1,
      max: 100,
      maxGuesses: 6,
    },
    solution: { target: 30 },
  },
  {
    title: 'Percent Puzzle',
    content: {
      concept: 'percent',
      clue: 'A shirt originally costs $40. After a discount, it costs $30. Guess the discount percentage.',
      min: 1,
      max: 100,
      maxGuesses: 6,
    },
    solution: { target: 25 },
  },
  {
    title: 'Coordinate Clue',
    content: {
      concept: 'coordinate plane',
      clue: 'A point is reflected over the x-axis from (4, 7). Guess the y-coordinate of the reflected point (enter it as a positive number, then think about the sign).',
      min: -50,
      max: 50,
      maxGuesses: 6,
    },
    solution: { target: -7 },
  },
  {
    title: 'Probability Puzzle',
    content: {
      concept: 'probability',
      clue: 'A spinner has 8 equal sections, 2 of which are red. If you spin 40 times, guess about how many times you would expect red.',
      min: 1,
      max: 40,
      maxGuesses: 6,
    },
    solution: { target: 10 },
  },
]

async function main() {
  console.log(`Inserting ${mysteryCodePuzzles.length} Mystery Code (elementary) puzzles...`)
  for (const p of mysteryCodePuzzles) {
    const { error } = await db.from('weekly_puzzles').insert({
      band: 'elementary',
      puzzle_type: 'mystery_code',
      title: p.title,
      content: p.content,
      solution: p.solution,
      status: 'pending',
    })
    if (error) console.error(`FAILED (${p.title}): ${error.message}`)
    else console.log(`  ✓ ${p.title}`)
  }

  console.log(`\nInserting ${soldlePuzzles.length} SOLdle (middle) puzzles...`)
  for (const p of soldlePuzzles) {
    const { error } = await db.from('weekly_puzzles').insert({
      band: 'middle',
      puzzle_type: 'soldle',
      title: p.title,
      content: p.content,
      solution: p.solution,
      status: 'pending',
    })
    if (error) console.error(`FAILED (${p.title}): ${error.message}`)
    else console.log(`  ✓ ${p.title}`)
  }

  console.log('\nDone. Review pending rows in weekly_puzzles, set week_start_date, and flip status to approved.')
}

main()
