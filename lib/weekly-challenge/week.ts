/** Returns YYYY-MM-DD for the Monday of `now`'s America/New_York calendar week. */
export function getCurrentWeekStartDate(now: Date = new Date()): string {
  const nyDateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now) // 'YYYY-MM-DD'

  const nyDate = new Date(`${nyDateStr}T00:00:00Z`)
  const dayOfWeek = nyDate.getUTCDay() // 0=Sun, 1=Mon, ... 6=Sat
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  nyDate.setUTCDate(nyDate.getUTCDate() - diffToMonday)
  return nyDate.toISOString().slice(0, 10)
}
