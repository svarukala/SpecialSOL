// scripts/download-sol-tests.ts
// Downloads VA SOL released test PDFs from SOLPass for grades 3-8 (math & reading).
//
// Usage:
//   npx tsx scripts/download-sol-tests.ts [--grades=3,4,5] [--subject=math|reading] [--dry-run]
//
// PDFs are saved to: data/sol-pdfs/grade-{G}/{subject}/{year}.pdf
// Idempotent — already-downloaded files are skipped.

import * as fs from 'fs'
import * as path from 'path'
import * as https from 'https'

const BASE_URL = 'https://www.solpass.org/released_sol_tests'

// All known released tests from SOLPass index (grades 3-8 only)
const CATALOG: Record<number, { math: number[]; reading: number[] }> = {
  3: { math: [2014, 2010, 2009, 2008, 2007, 2005, 2004, 2003],       reading: [2015, 2011, 2010, 2009, 2008, 2007, 2005, 2004] },
  4: { math: [2014, 2010, 2009, 2008, 2007],                          reading: [2015, 2011, 2010, 2009, 2008, 2007] },
  5: { math: [2014, 2010, 2009, 2008, 2007, 2005, 2004, 2003],        reading: [2015, 2011, 2010, 2008, 2007, 2005, 2004, 2003] },
  6: { math: [2014, 2010, 2009, 2008, 2007, 2006],                    reading: [2015, 2011, 2010, 2008, 2007] },
  7: { math: [2014, 2010, 2008, 2007, 2006],                          reading: [2015, 2011, 2010, 2008, 2007] },
  8: { math: [2014, 2010, 2009, 2008, 2007, 2004, 2003],              reading: [2015, 2010, 2009, 2008, 2007, 2004, 2003] },
}

// Newest tests are closest to current standards — download these first
const PREFERRED_YEARS = [2015, 2014, 2011, 2010]

function getArg(flag: string) {
  return process.argv.find(a => a.startsWith(`--${flag}=`))?.split('=')[1]
}

function pdfFilename(grade: number, subject: 'math' | 'reading', year: number): string {
  const subjectLabel = subject === 'math' ? 'Math' : 'Reading'
  return `${grade}${subjectLabel}SOL${year}.pdf`
}

function pdfUrl(grade: number, subject: 'math' | 'reading', year: number): string {
  return `${BASE_URL}/${pdfFilename(grade, subject, year)}`
}

function localPath(grade: number, subject: 'math' | 'reading', year: number): string {
  return path.join('data', 'sol-pdfs', `grade-${grade}`, subject, `${year}.pdf`)
}

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest)
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close()
        fs.unlinkSync(dest)
        const redirectUrl = res.headers.location!
        downloadFile(redirectUrl, dest).then(resolve).catch(reject)
        return
      }
      if (res.statusCode !== 200) {
        file.close()
        fs.unlinkSync(dest)
        reject(new Error(`HTTP ${res.statusCode}`))
        return
      }
      res.pipe(file)
      file.on('finish', () => file.close(() => resolve()))
    }).on('error', (err) => {
      fs.unlinkSync(dest)
      reject(err)
    })
  })
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const gradesArg = getArg('grades')
  const subjectFilter = getArg('subject') as 'math' | 'reading' | undefined

  const grades = gradesArg ? gradesArg.split(',').map(Number) : Object.keys(CATALOG).map(Number)
  const subjects: Array<'math' | 'reading'> = subjectFilter ? [subjectFilter] : ['math', 'reading']

  if (dryRun) console.log('[dry-run] No files will be downloaded.\n')

  // Build download list — preferred years first
  const queue: Array<{ grade: number; subject: 'math' | 'reading'; year: number }> = []
  for (const grade of grades.sort()) {
    for (const subject of subjects) {
      const years = [...CATALOG[grade][subject]].sort((a, b) => b - a) // newest first
      for (const year of years) queue.push({ grade, subject, year })
    }
  }

  console.log(`Planning to download ${queue.length} PDFs for grades ${grades.join(', ')}\n`)

  let downloaded = 0, skipped = 0, failed = 0

  for (const { grade, subject, year } of queue) {
    const dest = localPath(grade, subject, year)
    const url = pdfUrl(grade, subject, year)

    if (fs.existsSync(dest)) {
      console.log(`  ⏭️  Skip  grade-${grade}/${subject}/${year}.pdf (already exists)`)
      skipped++
      continue
    }

    if (dryRun) {
      console.log(`  📥 Would download: ${url}`)
      downloaded++
      continue
    }

    fs.mkdirSync(path.dirname(dest), { recursive: true })
    process.stdout.write(`  📥 Downloading grade-${grade}/${subject}/${year}.pdf ... `)

    try {
      await downloadFile(url, dest)
      const sizeMb = (fs.statSync(dest).size / 1024 / 1024).toFixed(1)
      console.log(`done (${sizeMb} MB)`)
      downloaded++
    } catch (err) {
      console.log(`FAILED — ${(err as Error).message}`)
      failed++
    }

    // Brief pause between downloads to be respectful
    await new Promise(r => setTimeout(r, 500))
  }

  console.log(`\n✅ Done — ${downloaded} downloaded, ${skipped} skipped, ${failed} failed`)
  if (failed > 0) console.log('   Failed PDFs may not exist at that URL — check catalog.')
}

main().catch((e) => { console.error(e); process.exit(1) })
