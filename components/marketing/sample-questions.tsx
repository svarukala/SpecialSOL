import type { SampleQuestion } from '@/lib/supabase/marketing'

const SUBJECT_LABEL: Record<string, string> = {
  math: 'Math',
  reading: 'Reading',
  science: 'Science',
}

function titleCase(s: string) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase())
}

interface Props {
  questions: SampleQuestion[]
  /** Heading shown above the cards. */
  heading?: string
  /** Supporting line under the heading. */
  subheading?: string
}

/**
 * Renders real VDOE released questions as static, non-interactive cards with the
 * correct answer marked — used on the homepage and per-grade landing pages to show
 * the quality of the question bank before signup.
 */
export function SampleQuestions({ questions, heading, subheading }: Props) {
  if (questions.length === 0) return null

  return (
    <div>
      {heading && (
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">{heading}</h2>
          {subheading && (
            <p className="text-muted-foreground max-w-lg mx-auto text-sm leading-relaxed">
              {subheading}
            </p>
          )}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {questions.map((q) => (
          <div key={q.id} className="rounded-xl border bg-card p-5 flex flex-col">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase tracking-wide">
                Grade {q.grade} · {SUBJECT_LABEL[q.subject] ?? titleCase(q.subject)}
              </span>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                ✓ Real VDOE released
              </span>
            </div>

            <p className="font-medium text-sm mb-4 leading-relaxed">{q.question_text}</p>

            <ul className="space-y-2 mt-auto">
              {q.choices.map((c) => (
                <li
                  key={c.id}
                  className={`flex items-center gap-2 text-sm rounded-lg border px-3 py-2 ${
                    c.is_correct
                      ? 'border-emerald-500/40 bg-emerald-500/5 font-medium text-foreground'
                      : 'border-border text-muted-foreground'
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] ${
                      c.is_correct ? 'bg-emerald-500 text-white' : 'border border-muted-foreground/40'
                    }`}
                    aria-hidden
                  >
                    {c.is_correct ? '✓' : ''}
                  </span>
                  <span>{c.text}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
