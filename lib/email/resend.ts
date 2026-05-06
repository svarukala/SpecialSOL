import { Resend } from 'resend'

export const FROM_ADDRESS = 'SolPrep <hello@solprep.app>'
export const REPLY_TO = 'admin@t20squares.com'

let _resend: Resend | null = null

export function getResend(): Resend {
  if (!_resend) {
    if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY is not set')
    _resend = new Resend(process.env.RESEND_API_KEY)
  }
  return _resend
}
