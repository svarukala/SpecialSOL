// scripts/generate-weekly-challenge-6month-batch.ts
/**
 * Authors 26 weeks (~6 months) of weekly challenge puzzles for both bands
 * (Mystery Code for elementary, SOLdle for middle) and inserts them into
 * weekly_puzzles as status='approved' with week_start_date already set,
 * matching what the approve endpoint would do. All content is hand-authored
 * via parameterized templates computed in code (no AI API call), per the
 * project's zero-runtime-AI-cost approach for this feature.
 *
 * Run:
 *   set -a && source .env.prod && npx tsx scripts/generate-weekly-challenge-6month-batch.ts [--dry-run]
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
const DRY_RUN = process.argv.includes('--dry-run')
const WEEKS = 26
const FIRST_WEEK = '2026-09-21' // first Monday after existing approved weeks

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

const weeks = Array.from({ length: WEEKS }, (_, i) => addDays(FIRST_WEEK, i * 7))

// ---------- Elementary: Mystery Code ----------

type MCQuestion = MysteryCodeContent['questions'][number]

function mcQuestion(prompt: string, correctValue: string | number, wrong1: string | number, wrong2: string | number, correctPos: number, digit: string): MCQuestion {
  const opts = [String(wrong1), String(wrong2)]
  const arr: string[] = []
  let oi = 0
  for (let i = 0; i < 3; i++) {
    if (i === correctPos) arr.push(String(correctValue))
    else arr.push(opts[oi++])
  }
  return { prompt, choices: arr, correctIndex: correctPos, revealsDigit: digit }
}

function lastDigit(n: number): string {
  return String(Math.abs(n) % 10)
}

function mathTemplate(kind: number, seed: number, pos: number): MCQuestion {
  switch (kind) {
    case 0: {
      const a = 2 + (seed % 10)
      const b = 3 + ((seed * 3) % 9)
      const correct = a * b
      return mcQuestion(`What is ${a} x ${b}?`, correct, correct - 4, correct + 5, pos, lastDigit(correct))
    }
    case 1: {
      const b = 2 + (seed % 8)
      const q = 3 + ((seed * 2) % 9)
      const a = b * q
      return mcQuestion(`What is ${a} divided by ${b}?`, q, q + 2, Math.max(1, q - 2), pos, lastDigit(q))
    }
    case 2: {
      const a = 100 + (seed * 17) % 800
      const b = 20 + (seed * 11) % 300
      const correct = a - b
      return mcQuestion(`What is ${a} - ${b}?`, correct, correct + 10, correct - 10, pos, lastDigit(correct))
    }
    case 3: {
      const a = 50 + (seed * 13) % 400
      const b = 20 + (seed * 7) % 300
      const correct = a + b
      return mcQuestion(`What is ${a} + ${b}?`, correct, correct + 10, correct - 10, pos, lastDigit(correct))
    }
    case 4: {
      const base = 100 + seed * 7
      const n = base + (seed % 50)
      const rounded = Math.round(n / 100) * 100
      const wrong1 = rounded + 100
      const wrong2 = Math.max(0, rounded - 100)
      return mcQuestion(`Round ${n} to the nearest hundred.`, rounded, wrong1, wrong2, pos, lastDigit(rounded / 100))
    }
    case 5: {
      const side = 3 + (seed % 9)
      const correct = side * 4
      return mcQuestion(`What is the perimeter of a square with sides of ${side} cm?`, `${correct} cm`, `${correct + 8} cm`, `${correct - 4} cm`, pos, lastDigit(correct))
    }
    case 6: {
      const percents = [10, 20, 25, 50]
      const p = percents[seed % percents.length]
      const base = 20 * (2 + (seed % 8))
      const correct = (base * p) / 100
      return mcQuestion(`What is ${p}% of ${base}?`, correct, correct + 5, Math.max(1, correct - 5), pos, lastDigit(correct))
    }
    default: {
      const denom = 3 + (seed % 5)
      const num = 1 + (seed % (denom - 1))
      return mcQuestion(`If ${num} of ${denom} equal parts of a shape are shaded, what fraction is shaded?`, `${num}/${denom}`, `${denom}/${num}`, `${num}/${denom + 1}`, pos, String((num + denom) % 10))
    }
  }
}

const languageItems: MCQuestion[] = [
  // synonyms
  mcQuestion('Which word is a synonym for "happy"?', 'joyful', 'sad', 'angry', 1, '1'),
  mcQuestion('Which word is a synonym for "huge"?', 'enormous', 'tiny', 'average', 0, '2'),
  mcQuestion('Which word is a synonym for "quick"?', 'rapid', 'slow', 'lazy', 0, '3'),
  mcQuestion('Which word is a synonym for "smart"?', 'intelligent', 'silly', 'careless', 2, '4'),
  mcQuestion('Which word is a synonym for "tired"?', 'exhausted', 'energetic', 'calm', 1, '5'),
  mcQuestion('Which word is a synonym for "angry"?', 'furious', 'pleased', 'relaxed', 0, '6'),
  mcQuestion('Which word is a synonym for "tiny"?', 'minuscule', 'giant', 'average', 2, '7'),
  // antonyms
  mcQuestion('Which word is the opposite of "ancient"?', 'modern', 'old', 'historic', 1, '8'),
  mcQuestion('Which word is the opposite of "generous"?', 'stingy', 'kind', 'giving', 0, '9'),
  mcQuestion('Which word is the opposite of "arrive"?', 'depart', 'come', 'stay', 0, '0'),
  mcQuestion('Which word is the opposite of "increase"?', 'decrease', 'grow', 'expand', 2, '1'),
  mcQuestion('Which word is the opposite of "brave"?', 'cowardly', 'bold', 'fearless', 1, '2'),
  mcQuestion('Which word is the opposite of "victory"?', 'defeat', 'win', 'triumph', 0, '3'),
  mcQuestion('Which word is the opposite of "begin"?', 'end', 'start', 'commence', 2, '4'),
  // spelling
  mcQuestion('Which word is spelled correctly?', 'receive', 'recieve', 'receve', 0, '5'),
  mcQuestion('Which word is spelled correctly?', 'definitely', 'definately', 'definitly', 1, '6'),
  mcQuestion('Which word is spelled correctly?', 'separate', 'seperate', 'separrate', 2, '7'),
  mcQuestion('Which word is spelled correctly?', 'necessary', 'neccessary', 'necesary', 0, '8'),
  mcQuestion('Which word is spelled correctly?', 'embarrass', 'embarass', 'embarras', 1, '9'),
  mcQuestion('Which word is spelled correctly?', 'occurred', 'occured', 'ocurred', 2, '0'),
  mcQuestion('Which word is spelled correctly?', 'rhythm', 'rythm', 'rhythem', 0, '1'),
  // punctuation
  mcQuestion('Which sentence uses correct punctuation?', 'Watch out for that car!', 'Watch out for that car', 'Watch out for that car.', 0, '2'),
  mcQuestion('Which sentence uses correct punctuation?', "It's raining outside.", 'Its raining outside.', "Its' raining outside.", 0, '3'),
  mcQuestion('Which sentence uses correct punctuation?', 'I have two dogs, a cat, and a fish.', 'I have two dogs a cat and a fish.', 'I have, two dogs a cat and a fish.', 0, '4'),
  mcQuestion('Which sentence uses correct punctuation?', 'Can you help me?', 'Can you help me', 'Can you help me.', 0, '5'),
  mcQuestion('Which sentence uses correct punctuation?', "They're going to the store.", 'Their going to the store.', "Their're going to the store.", 0, '6'),
  mcQuestion('Which sentence uses correct punctuation?', "Let's go to the park.", 'Lets go to the park.', "Lets' go to the park.", 0, '7'),
]

const elementaryTitles = [
  "The Pirate's Treasure Chest",
  "The Spy's Briefcase",
  "The Dragon's Den",
  'The Moon Base Airlock',
  'The Museum Vault',
  "The Wizard's Tower Door",
  'The Submarine Hatch',
  'The Arcade Machine',
  'The Greenhouse Door',
  'The Observatory Dome',
  'The Lighthouse Lamp Room',
  'The Subway Turnstile',
  'The Bakery Safe',
  'The Aquarium Tank Lock',
  'The Campsite Lockbox',
  'The Planetarium Projector',
  'The Toy Workshop Door',
  'The Ice Cream Truck Freezer',
  'The Kite Festival Booth',
  'The Comic Book Vault',
  'The Skate Park Locker',
  'The Snow Fort Gate',
  'The Carnival Ticket Booth',
  'The Treehouse Hideout',
  'The Science Lab Cabinet',
  'The Rocket Launch Panel',
]

function buildElementaryPuzzle(i: number): { title: string; content: MysteryCodeContent; solution: MysteryCodeSolution } {
  const q1 = mathTemplate(i % 8, i, i % 3)
  const q2 = languageItems[i % languageItems.length]
  const q3 = mathTemplate((i + 4) % 8, i + 11, (i + 1) % 3)
  const questions = [q1, q2, q3]
  const code = questions.map(q => q.revealsDigit).join('')
  return {
    title: elementaryTitles[i % elementaryTitles.length],
    content: { codeLabel: '3-digit code', questions },
    solution: { code },
  }
}

// ---------- Middle: SOLdle ----------

function soldleTemplate(kind: number, seed: number, weekStr: string): { title: string; content: SoldleContent; solution: SoldleSolution } {
  switch (kind) {
    case 0: {
      const ratios: [number, number][] = [[3, 2], [5, 3], [7, 4], [4, 3], [5, 2]]
      const [ra, rb] = ratios[seed % ratios.length]
      const scale = 2 + (seed % 6)
      const countB = rb * scale
      const target = ra * scale
      return {
        title: `Ratio Riddle — ${weekStr}`,
        content: { concept: 'ratio', clue: `In a bag of marbles, the ratio of red to blue is ${ra}:${rb}. If there are ${countB} blue marbles, guess the number of red marbles.`, min: 1, max: 200, maxGuesses: 6 },
        solution: { target },
      }
    }
    case 1: {
      const percents = [10, 15, 20, 25, 30, 40, 50]
      const p = percents[seed % percents.length]
      const price = 20 * (2 + (seed % 8))
      const discounted = price - (price * p) / 100
      return {
        title: `Percent Puzzle — ${weekStr}`,
        content: { concept: 'percent', clue: `A shirt originally costs $${price}. After a discount, it costs $${discounted}. Guess the discount percentage.`, min: 1, max: 100, maxGuesses: 6 },
        solution: { target: p },
      }
    }
    case 2: {
      const a = 1 + (seed % 12)
      const b = 1 + ((seed * 3) % 12)
      const overX = seed % 2 === 0
      const target = overX ? -b : -a
      const clue = overX
        ? `A point is reflected over the x-axis from (${a}, ${b}). Guess the y-coordinate of the reflected point.`
        : `A point is reflected over the y-axis from (${a}, ${b}). Guess the x-coordinate of the reflected point.`
      return {
        title: `Coordinate Clue — ${weekStr}`,
        content: { concept: 'coordinate plane', clue, min: -50, max: 50, maxGuesses: 6 },
        solution: { target },
      }
    }
    case 3: {
      const sectionOptions = [8, 10, 12, 20]
      const total = sectionOptions[seed % sectionOptions.length]
      const favorable = 1 + (seed % (total / 2))
      const spins = total * (2 + (seed % 5))
      const target = (favorable * spins) / total
      return {
        title: `Probability Puzzle — ${weekStr}`,
        content: { concept: 'probability', clue: `A spinner has ${total} equal sections, ${favorable} of which are red. If you spin ${spins} times, guess about how many times you would expect red.`, min: 1, max: spins, maxGuesses: 6 },
        solution: { target },
      }
    }
    case 4: {
      const known = [4, 5, 6, 7].map(n => n + (seed % 5))
      const mean = 6 + (seed % 10)
      const target = mean * 5 - known.reduce((s, n) => s + n, 0)
      return {
        title: `Mean Machine — ${weekStr}`,
        content: { concept: 'mean', clue: `The mean of 5 numbers is ${mean}. Four of the numbers are ${known.join(', ')}. Guess the fifth number.`, min: -50, max: 100, maxGuesses: 6 },
        solution: { target },
      }
    }
    case 5: {
      const serves = 4 + (seed % 4)
      const cups = 2 + (seed % 4)
      const newServes = serves * (2 + (seed % 3))
      const target = (cups * newServes) / serves
      return {
        title: `Recipe Ratio — ${weekStr}`,
        content: { concept: 'proportion', clue: `A recipe serves ${serves} people using ${cups} cups of flour. Guess how many cups of flour are needed to serve ${newServes} people.`, min: 1, max: 100, maxGuesses: 6 },
        solution: { target },
      }
    }
    case 6: {
      const length = 4 + (seed % 10)
      const width = 3 + ((seed * 2) % 8)
      const target = length * width
      return {
        title: `Area Adventure — ${weekStr}`,
        content: { concept: 'area', clue: `A rectangle has a length of ${length} cm and a width of ${width} cm. Guess its area in square centimeters.`, min: 1, max: 300, maxGuesses: 6 },
        solution: { target },
      }
    }
    case 7: {
      const principal = 100 * (2 + (seed % 8))
      const rate = [2, 4, 5, 8, 10][seed % 5]
      const time = 1 + (seed % 4)
      const target = (principal * rate * time) / 100
      return {
        title: `Interest Investigator — ${weekStr}`,
        content: { concept: 'simple interest', clue: `You invest $${principal} at a simple interest rate of ${rate}% per year for ${time} years. Guess the total interest earned.`, min: 1, max: 1000, maxGuesses: 6 },
        solution: { target },
      }
    }
    case 8: {
      const speed = 20 + (seed % 8) * 5
      const time = 2 + (seed % 5)
      const target = speed * time
      return {
        title: `Speed Solver — ${weekStr}`,
        content: { concept: 'rate', clue: `A car travels at ${speed} miles per hour for ${time} hours. Guess the total distance traveled in miles.`, min: 1, max: 500, maxGuesses: 6 },
        solution: { target },
      }
    }
    default: {
      const base = 2 + (seed % 5)
      const exp = 2 + (seed % 2)
      const target = Math.pow(base, exp)
      return {
        title: `Power Play — ${weekStr}`,
        content: { concept: 'exponents', clue: `Guess the value of ${base} to the power of ${exp} (${base}^${exp}).`, min: 1, max: 300, maxGuesses: 6 },
        solution: { target },
      }
    }
  }
}

function buildMiddlePuzzle(i: number, weekStr: string): { title: string; content: SoldleContent; solution: SoldleSolution } {
  return soldleTemplate(i % 10, i, weekStr)
}

async function main() {
  const { data: admin, error: adminErr } = await db.from('parents').select('id').eq('is_admin', true).limit(1).single()
  if (adminErr || !admin) {
    console.error('Could not find an admin parent to attribute review to:', adminErr?.message)
    process.exit(1)
  }
  const reviewedBy = admin.id
  const reviewedAt = new Date().toISOString()

  console.log(`Generating ${WEEKS} weeks (${weeks[0]} .. ${weeks[weeks.length - 1]}) for both bands. Dry run: ${DRY_RUN}`)

  for (let i = 0; i < weeks.length; i++) {
    const weekStr = weeks[i]
    const elem = buildElementaryPuzzle(i)
    const mid = buildMiddlePuzzle(i, weekStr)

    console.log(`\nWeek ${weekStr}`)
    console.log(`  [elementary] ${elem.title} -> code ${elem.solution.code}`)
    elem.content.questions.forEach(q => {
      console.log(`      Q: ${q.prompt} | choices=${q.choices.join(' / ')} | correct=${q.choices[q.correctIndex]}`)
      if (new Set(q.choices).size !== q.choices.length) {
        console.error(`      !! DUPLICATE CHOICES in: ${q.prompt}`)
      }
    })
    console.log(`  [middle]     ${mid.title} -> target ${mid.solution.target}`)
    console.log(`      clue: ${mid.content.clue}`)
    if (mid.solution.target < mid.content.min || mid.solution.target > mid.content.max) {
      console.error(`      !! TARGET OUT OF RANGE: ${mid.solution.target} not in [${mid.content.min}, ${mid.content.max}]`)
    }

    if (!DRY_RUN) {
      const { error: e1 } = await db.from('weekly_puzzles').insert({
        band: 'elementary',
        puzzle_type: 'mystery_code',
        title: elem.title,
        content: elem.content,
        solution: elem.solution,
        week_start_date: weekStr,
        status: 'approved',
        reviewed_at: reviewedAt,
        reviewed_by: reviewedBy,
      })
      if (e1) console.error(`  FAILED elementary ${weekStr}: ${e1.message}`)

      const { error: e2 } = await db.from('weekly_puzzles').insert({
        band: 'middle',
        puzzle_type: 'soldle',
        title: mid.title,
        content: mid.content,
        solution: mid.solution,
        week_start_date: weekStr,
        status: 'approved',
        reviewed_at: reviewedAt,
        reviewed_by: reviewedBy,
      })
      if (e2) console.error(`  FAILED middle ${weekStr}: ${e2.message}`)
    }
  }

  console.log('\nDone.')
}

main()
