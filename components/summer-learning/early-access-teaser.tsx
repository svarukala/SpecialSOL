import Link from 'next/link'

const FEATURES = [
  { icon: '🐝', title: 'Spelling Bee', desc: 'Hear a word, spell it correctly.', href: '/spelling-bee' },
  { icon: '✖️', title: 'Times Tables', desc: 'Master multiplication with speed drills.', href: '/times-tables' },
  { icon: '📚', title: 'Summer Reading', desc: 'Explore age-appropriate stories.', href: '/summer-reading' },
  { icon: '🎯', title: 'Question Quest', desc: 'Master What, Where, Who, When, Why, How.', href: '/question-quest' },
  { icon: '🐊', title: 'Numbers', desc: 'Compare numbers with >, <, and =.', href: '/crocodile-numbers' },
  { icon: '🕐', title: 'Learn Clock', desc: 'Read analog clocks at every difficulty.', href: '/learn-clock' },
  { icon: '💰', title: 'Money Match', desc: 'Identify coins, count money, make change.', href: '/money-match' },
  { icon: '🍕', title: 'Fractions', desc: 'Name, compare, and find equivalent fractions.', href: '/fraction-frenzy' },
]

export function EarlyAccessTeaser({
  hasAccess: _hasAccess,
  hasRequested: _hasRequested,
}: {
  hasAccess: boolean
  hasRequested: boolean
}) {
  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-lg">☀️</span>
        <h2 className="font-semibold text-primary">Summer Learning</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Keep skills sharp with fun activities — no SOL prep required!
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:grid-rows-2">
        {FEATURES.map(({ icon, title, desc, href }) => (
          <Link
            key={title}
            href={href}
            className="rounded-lg bg-background border border-border/60 px-4 py-3 space-y-1 hover:border-primary/40 hover:bg-primary/5 transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <span>{icon}</span>
              <span className="font-medium text-sm">{title}</span>
            </div>
            <p className="text-xs text-muted-foreground">{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
