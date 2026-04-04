// scripts/extract-align-sol-questions.ts
// Extracts questions from downloaded VA SOL released-test PDFs and simultaneously
// aligns them to current VA SOL standards using the Claude API.
//
// Usage:
//   npx tsx scripts/extract-align-sol-questions.ts [--grades=3,4,5] [--subject=math|reading] [--year=2014] [--dry-run]
//
// Reads PDFs from:  data/sol-pdfs/grade-{G}/{subject}/{year}.pdf
// Writes JSON to:   data/sol-extracted/grade-{G}/{subject}/{year}.json
//
// Idempotent — already-extracted files are skipped unless --force is passed.
//
// Each output JSON file contains:
//   { grade, subject, year, extractedAt, questions: ExtractedQuestion[] }
//
// Four-tier classification:
//   green    — aligned to current standards, import as-is
//   yellow   — remediable (AI-rewritten to match current standards language)
//   regraded — topic exists in VA SOL but at a different grade; import with correct_grade
//   red      — topic removed from VA SOL entirely; skip

import Anthropic from '@anthropic-ai/sdk'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'
import { getTopicsForGradeSubject, type SolTopic } from '../lib/curriculum/sol-curriculum'

dotenv.config({ path: '.env.local' })

// ── Types ──────────────────────────────────────────────────────────────────

interface ExtractedChoice {
  id: string          // 'A' | 'B' | 'C' | 'D'
  text: string
  is_correct: boolean
}

interface ExtractedQuestion {
  // Extraction
  question_number: number
  question_text: string
  choices: ExtractedChoice[]
  has_diagram: boolean
  diagram_description: string | null
  calculator_allowed: boolean
  reading_passage_index: number | null  // null = standalone; 0-based index into passages[]

  // Standards alignment
  tier: 'green' | 'yellow' | 'regraded' | 'red'
  matched_topic: string | null          // topic name from sol-curriculum.ts
  matched_standard: string | null       // current standard code
  alignment_reason: string
  rewritten_question_text: string | null  // only for yellow tier
  correct_grade: number | null           // only for regraded tier (3–8)
}

interface ExtractedPassage {
  index: number
  title: string | null
  text: string
}

interface ExtractedFile {
  grade: number
  subject: 'math' | 'reading'
  year: number
  extractedAt: string
  passages: ExtractedPassage[]
  questions: ExtractedQuestion[]
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function getArg(flag: string) {
  return process.argv.find(a => a.startsWith(`--${flag}=`))?.split('=')[1]
}

function localPdfPath(grade: number, subject: 'math' | 'reading', year: number): string {
  return path.join('data', 'sol-pdfs', `grade-${grade}`, subject, `${year}.pdf`)
}

function outputPath(grade: number, subject: 'math' | 'reading', year: number): string {
  return path.join('data', 'sol-extracted', `grade-${grade}`, subject, `${year}.json`)
}

function buildTopicList(topics: SolTopic[]): string {
  return topics
    .map(t => `  - "${t.name}" (${t.solStandard}): ${t.description}`)
    .join('\n')
}

// ── Prompt ──────────────────────────────────────────────────────────────────

function buildExtractionPrompt(
  grade: number,
  subject: 'math' | 'reading',
  year: number,
  topics: SolTopic[],
): string {
  const topicList = buildTopicList(topics)
  const isReading = subject === 'reading'

  return `You are processing a Virginia SOL (Standards of Learning) released test PDF for Grade ${grade} ${subject === 'math' ? 'Mathematics' : 'Reading'}, year ${year}.

Your task has two parts:
1. Extract every multiple-choice question from the PDF.
2. Align each question to the CURRENT Virginia SOL curriculum.

## Current Grade ${grade} ${subject === 'math' ? 'Math' : 'Reading'} Topics
These are the ONLY valid topics for this grade. Use the exact topic name when matching:
${topicList}

## Extraction Rules
- Extract ALL multiple-choice questions (they have 4 labeled choices: A, B, C, D or F, G, H, J).
- Identify the correct answer from the answer key (usually at the end or embedded).
- If there is no answer key, mark is_correct: false for all choices and note it.
${isReading ? '- Identify reading passages: extract the full passage text and associate questions with their passage by index (0-based).' : ''}
- For diagrams/figures/graphs: set has_diagram: true and describe what the diagram shows.
- For calculator sections: set calculator_allowed: true for those questions.
- Do NOT extract non-question content (instructions, headers, sample questions marked "Example").

## Standards Alignment Rules
For each question, classify it into one of four tiers:

**green** — The concept tested exists in the current curriculum topics above AND the question's framing, vocabulary, and expectations match current standards. Import as-is.

**yellow** — The concept exists in the current curriculum BUT:
  - The standard number changed (e.g., old "5.14" is now "5.4"), OR
  - The question uses outdated terminology or framing that can be updated without changing the core skill being tested.
  For yellow questions: rewrite the question_text (and choices if needed) to match current SOL language. Preserve the correct answer and difficulty. Do NOT change the mathematical concept or reading skill being tested.

**regraded** — The topic is NOT in the grade ${grade} curriculum above, but it IS a valid topic in the current VA SOL curriculum for a DIFFERENT grade (3–8). Set correct_grade to the grade where this topic now belongs. The question will be imported under that correct grade instead of being discarded.

**red** — The topic has been removed from the VA SOL entirely (not taught at any grade 3–8), or the question tests a concept outside the grades 3–8 SOL scope altogether. Skip these only.

## Output Format
Respond with ONLY a valid JSON object matching this exact structure (no markdown, no explanation):
{
  "passages": [
    { "index": 0, "title": "Title or null", "text": "Full passage text..." }
  ],
  "questions": [
    {
      "question_number": 1,
      "question_text": "What is 3 × 4?",
      "choices": [
        { "id": "A", "text": "7", "is_correct": false },
        { "id": "B", "text": "12", "is_correct": true },
        { "id": "C", "text": "34", "is_correct": false },
        { "id": "D", "text": "43", "is_correct": false }
      ],
      "has_diagram": false,
      "diagram_description": null,
      "calculator_allowed": false,
      "reading_passage_index": null,
      "tier": "green",
      "matched_topic": "multiplication",
      "matched_standard": "3.4",
      "alignment_reason": "Tests multiplication facts, directly aligned to standard 3.4.",
      "rewritten_question_text": null,
      "correct_grade": null
    }
  ]
}

For math tests, "passages" should be an empty array [].
For red-tier questions, set matched_topic, matched_standard, and correct_grade to null.
For yellow-tier questions, rewritten_question_text must be the complete rewritten question text; correct_grade is null.
For regraded-tier questions, set correct_grade to the integer grade (3–8) where this topic belongs; matched_topic and matched_standard should reflect the topic/standard at that correct grade.`
}

// ── Claude call ──────────────────────────────────────────────────────────────

async function extractFromPdf(
  client: Anthropic,
  pdfPath: string,
  grade: number,
  subject: 'math' | 'reading',
  year: number,
): Promise<{ passages: ExtractedPassage[]; questions: ExtractedQuestion[] }> {
  const pdfData = fs.readFileSync(pdfPath)
  const base64Pdf = pdfData.toString('base64')
  const topics = getTopicsForGradeSubject(grade, subject)
  const prompt = buildExtractionPrompt(grade, subject, year, topics)

  const response = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 16000,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: base64Pdf,
            },
          },
          {
            type: 'text',
            text: prompt,
          },
        ],
      },
    ],
  })

  const rawText = response.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('')
    .trim()

  // Strip markdown code fences if the model wrapped the JSON
  const jsonText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')

  const parsed = JSON.parse(jsonText) as {
    passages: ExtractedPassage[]
    questions: ExtractedQuestion[]
  }

  return parsed
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const force = process.argv.includes('--force')
  const gradesArg = getArg('grades')
  const subjectFilter = getArg('subject') as 'math' | 'reading' | undefined
  const yearFilter = getArg('year') ? Number(getArg('year')) : undefined

  const grades = gradesArg ? gradesArg.split(',').map(Number) : [3, 4, 5, 6, 7, 8]
  const subjects: Array<'math' | 'reading'> = subjectFilter ? [subjectFilter] : ['math', 'reading']

  // Build work list from available PDFs
  const queue: Array<{ grade: number; subject: 'math' | 'reading'; year: number }> = []
  for (const grade of grades.sort()) {
    for (const subject of subjects) {
      const dir = path.join('data', 'sol-pdfs', `grade-${grade}`, subject)
      if (!fs.existsSync(dir)) continue
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.pdf'))
      for (const file of files) {
        const year = parseInt(file.replace('.pdf', ''), 10)
        if (isNaN(year)) continue
        if (yearFilter && year !== yearFilter) continue
        queue.push({ grade, subject, year })
      }
    }
  }

  if (queue.length === 0) {
    console.log('No PDFs found. Run download-sol-tests.ts first.')
    return
  }

  console.log(`Found ${queue.length} PDFs to process\n`)
  if (dryRun) console.log('[dry-run] No API calls will be made.\n')

  const client = new Anthropic()
  let done = 0, skipped = 0, failed = 0

  for (const { grade, subject, year } of queue) {
    const pdfPath = localPdfPath(grade, subject, year)
    const outPath = outputPath(grade, subject, year)

    if (!force && fs.existsSync(outPath)) {
      console.log(`  ⏭️  Skip  grade-${grade}/${subject}/${year} (already extracted)`)
      skipped++
      continue
    }

    if (dryRun) {
      console.log(`  📄 Would extract: grade-${grade}/${subject}/${year}`)
      done++
      continue
    }

    process.stdout.write(`  📄 Extracting grade-${grade}/${subject}/${year} ... `)

    try {
      const result = await extractFromPdf(client, pdfPath, grade, subject, year)

      const green = result.questions.filter(q => q.tier === 'green').length
      const yellow = result.questions.filter(q => q.tier === 'yellow').length
      const regraded = result.questions.filter(q => q.tier === 'regraded').length
      const red = result.questions.filter(q => q.tier === 'red').length

      const output: ExtractedFile = {
        grade,
        subject,
        year,
        extractedAt: new Date().toISOString(),
        passages: result.passages,
        questions: result.questions,
      }

      fs.mkdirSync(path.dirname(outPath), { recursive: true })
      fs.writeFileSync(outPath, JSON.stringify(output, null, 2))

      console.log(`done — ${result.questions.length} questions (🟢 ${green} 🟡 ${yellow} 🔄 ${regraded} 🔴 ${red})`)

      if (red > 0) {
        // Write rejection log
        const rejectedPath = outPath.replace('.json', '-rejected.json')
        const rejected = result.questions
          .filter(q => q.tier === 'red')
          .map(q => ({
            question_number: q.question_number,
            question_text: q.question_text,
            reason: q.alignment_reason,
          }))
        fs.writeFileSync(rejectedPath, JSON.stringify(rejected, null, 2))
        console.log(`     ❌ ${red} rejected → ${rejectedPath}`)
      }

      done++
    } catch (err) {
      console.log(`FAILED — ${(err as Error).message}`)
      failed++
    }

    // Brief pause between API calls
    await new Promise(r => setTimeout(r, 1000))
  }

  console.log(`\n✅ Done — ${done} extracted, ${skipped} skipped, ${failed} failed`)
}

main().catch((e) => { console.error(e); process.exit(1) })
