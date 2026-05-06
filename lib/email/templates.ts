export type TemplateType =
  | 'no_children'
  | 'no_sessions'
  | 'never_completed'
  | 'single_session'
  | 'inactive_14d'
  | 'inactive_30d'
  | 'paused_session'

interface TemplateData {
  childNames?: string[]
  lastSessionDate?: string
}

interface EmailContent {
  subject: string
  html: string
}

function layout(body: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="font-family: Georgia, serif; background: #f9f9f9; margin: 0; padding: 0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #f9f9f9; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 8px; padding: 40px; max-width: 560px;">
          <tr>
            <td style="font-size: 22px; font-weight: bold; color: #111; padding-bottom: 24px;">
              SolPrep
            </td>
          </tr>
          <tr>
            <td style="font-size: 15px; line-height: 1.7; color: #333;">
              ${body}
            </td>
          </tr>
          <tr>
            <td style="padding-top: 32px; font-size: 12px; color: #999; border-top: 1px solid #eee; margin-top: 32px;">
              SolPrep · Free Virginia SOL practice for grades 3–8<br/>
              <a href="https://solprep.app" style="color: #999;">solprep.app</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function childList(names: string[]): string {
  if (names.length === 0) return 'your child'
  if (names.length === 1) return `<strong>${names[0]}</strong>`
  const last = names[names.length - 1]
  return names.slice(0, -1).map(n => `<strong>${n}</strong>`).join(', ') + ` and <strong>${last}</strong>`
}

export function buildEmail(template: TemplateType, data: TemplateData): EmailContent {
  const names = data.childNames ?? []
  const child = childList(names)
  const signupUrl = 'https://solprep.app/login'
  const dashboardUrl = 'https://solprep.app/dashboard'

  switch (template) {
    case 'no_children':
      return {
        subject: 'One last step to get started on SolPrep',
        html: layout(`
          <p>Hi,</p>
          <p>You signed up for SolPrep a few days ago — welcome! There's one small step left: adding your child's profile so they can start practicing.</p>
          <p>It takes about two minutes. You'll set their grade, choose a starting level, and optionally configure any accommodations (text-to-speech, dyslexia font, extended time, etc.).</p>
          <p style="margin: 28px 0;">
            <a href="${dashboardUrl}" style="background: #1a1a1a; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-size: 14px;">Set up a child profile →</a>
          </p>
          <p>SOL testing season runs through early June — there's still plenty of time to build a solid practice routine.</p>
          <p style="margin-top: 24px;">— Sri<br/><span style="color: #999; font-size: 13px;">Built this as a Virginia parent. Happy to answer any questions — just reply to this email.</span></p>
        `),
      }

    case 'no_sessions':
      return {
        subject: `Ready when you are — starting ${names[0] ?? 'your child'}'s first session`,
        html: layout(`
          <p>Hi,</p>
          <p>You've set up a profile for ${child} on SolPrep — great first step. The next one is actually starting a practice session together.</p>
          <p>The first session takes about 10–15 minutes. ${names.length === 1 ? names[0] : 'Each child'} can try either Math or Reading, and you can choose between relaxed Practice mode (with hints) or a timed Test mode that simulates real SOL conditions.</p>
          <p style="margin: 28px 0;">
            <a href="${dashboardUrl}" style="background: #1a1a1a; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-size: 14px;">Start a practice session →</a>
          </p>
          <p>A heads-up from personal experience: kids who practice in short sessions a few times a week improve noticeably more than those who cram. Starting now beats starting next week.</p>
          <p style="margin-top: 24px;">— Sri</p>
        `),
      }

    case 'never_completed':
      return {
        subject: 'A quick tip for your first full practice session',
        html: layout(`
          <p>Hi,</p>
          <p>${child} started a practice session on SolPrep but it looks like it didn't get all the way through. That's totally fine — the first session is always a little exploratory.</p>
          <p>A few things that help: Practice mode (not Test mode) is a better starting point for most kids — there's no time pressure, hints are available, and wrong answers don't count against them. Test mode is great once they're comfortable.</p>
          <p style="margin: 28px 0;">
            <a href="${dashboardUrl}" style="background: #1a1a1a; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-size: 14px;">Pick up where you left off →</a>
          </p>
          <p>All questions are from real VDOE released tests, so completing a session is genuinely good prep — not just busywork.</p>
          <p style="margin-top: 24px;">— Sri</p>
        `),
      }

    case 'single_session':
      return {
        subject: `One session down — here's what comes next for ${names[0] ?? 'your child'}`,
        html: layout(`
          <p>Hi,</p>
          <p>${child} completed their first SolPrep session — nice work getting through it.</p>
          <p>The first session is mostly a baseline. The real value shows up after a few sessions, when the topic breakdown in your dashboard starts revealing which areas are strong and which need more work. That's when practice becomes targeted instead of general.</p>
          <p>Research on SOL prep is pretty consistent: kids who practice 15–20 minutes three or four times a week improve significantly more than those who do one long session before the test. ${names[0] ?? 'Your child'} is already ahead of most just by having done one.</p>
          <p style="margin: 28px 0;">
            <a href="${dashboardUrl}" style="background: #1a1a1a; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-size: 14px;">Start session two →</a>
          </p>
          <p style="margin-top: 24px;">— Sri</p>
        `),
      }

    case 'inactive_14d': {
      const since = data.lastSessionDate
        ? `since ${new Date(data.lastSessionDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`
        : 'in a little while'
      return {
        subject: `Checking in — ${names[0] ?? 'your child'}'s streak is still alive`,
        html: layout(`
          <p>Hi,</p>
          <p>${child} hasn't had a practice session ${since}. Just a gentle check-in — SOL testing season is still going, and consistent short sessions make a real difference.</p>
          <p>Even one 10-minute session this week would help keep the material fresh. The dashboard shows exactly where ${names.length === 1 ? names[0] : 'each child'} left off.</p>
          <p style="margin: 28px 0;">
            <a href="${dashboardUrl}" style="background: #1a1a1a; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-size: 14px;">Jump back in →</a>
          </p>
          <p style="margin-top: 24px;">— Sri</p>
        `),
      }
    }

    case 'inactive_30d': {
      const since = data.lastSessionDate
        ? `since ${new Date(data.lastSessionDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`
        : 'in about a month'
      return {
        subject: 'SOL season is here — a head start is still possible',
        html: layout(`
          <p>Hi,</p>
          <p>It's been a while ${since} since ${child} practiced on SolPrep. Virginia SOL testing runs through early June, so there's still time to make a meaningful difference — especially if there are specific topics they've been struggling with.</p>
          <p>If life got busy (it always does), no judgment. The account and all the progress are still there whenever you're ready.</p>
          <p style="margin: 28px 0;">
            <a href="${dashboardUrl}" style="background: #1a1a1a; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-size: 14px;">See where they left off →</a>
          </p>
          <p>If anything about the platform isn't working well for your family, I'd genuinely like to know — just reply here.</p>
          <p style="margin-top: 24px;">— Sri</p>
        `),
      }
    }

    case 'paused_session':
      return {
        subject: `${names[0] ?? 'Your child'} has a paused session ready to resume`,
        html: layout(`
          <p>Hi,</p>
          <p>${child} paused a practice session on SolPrep. Their progress is saved and they can pick up right where they left off — no need to start over.</p>
          <p>You'll see a "Resume" button next to the session in the Recent Sessions list on your dashboard.</p>
          <p style="margin: 28px 0;">
            <a href="${dashboardUrl}" style="background: #1a1a1a; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-size: 14px;">Resume the session →</a>
          </p>
          <p style="margin-top: 24px;">— Sri</p>
        `),
      }

    default:
      throw new Error(`Unknown template: ${template}`)
  }
}
