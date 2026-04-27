/**
 * Twilio SMS helper.
 * Used by server actions to send transactional SMS messages.
 *
 * Required env vars:
 *   TWILIO_ACCOUNT_SID
 *   TWILIO_AUTH_TOKEN
 *   TWILIO_PHONE_NUMBER
 *
 * If Twilio is not configured, all calls log a warning and return null
 * so the app works without SMS enabled.
 */
import twilio from 'twilio'

function getClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  if (!sid || !token) return null
  return twilio(sid, token)
}

const fromNumber = process.env.TWILIO_PHONE_NUMBER
// If true ("true" or "1"), skip sending SMS. Useful for local/dev/staging.
const SMS_DISABLED = process.env.SMS_DISABLED === 'true' || process.env.SMS_DISABLED === '1'

/**
 * Send an SMS to a phone number.
 * Returns the Twilio message SID or null if Twilio is not configured.
 */
export async function sendSMS(to: string, message: string): Promise<string | null> {
  if (SMS_DISABLED) {
    console.info('[sendSMS] SMS_DISABLED=true — not sending SMS', { to })
    return null
  }

  const client = getClient()
  if (!client || !fromNumber) {
    console.warn('[sendSMS] Twilio not configured — SMS skipped')
    return null
  }

  try {
    const result = await client.messages.create({ body: message, from: fromNumber, to })
    console.log('[sendSMS] sent', result.sid)
    return result.sid
  } catch (error) {
    console.error('[sendSMS] Failed to send SMS', error)
    throw error
  }
}

/**
 * Notify a member that their membership is expiring soon.
 */
export async function sendMembershipRenewalReminder(params: {
  phone: string
  firstName: string
  orgName: string
}) {
  const { phone, firstName, orgName } = params
  if (!phone) return null
  const message = `Hi ${firstName}, your ${orgName} membership is expiring soon. Please renew to continue enjoying member benefits.`
  return sendSMS(phone, message)
}

/**
 * Remind a member of an upcoming event.
 */
export async function sendEventReminder(params: {
  phone: string
  firstName: string
  eventTitle: string
  eventDate: Date
}) {
  const { phone, firstName, eventTitle, eventDate } = params
  if (!phone) return null
  const dateStr = eventDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const message = `Hi ${firstName}, reminder: ${eventTitle} is on ${dateStr}. See you there!`
  return sendSMS(phone, message)
}

/**
 * Remind a volunteer of an upcoming shift.
 */
export async function sendVolunteerShiftReminder(params: {
  phone: string
  firstName: string
  shiftTitle: string
  shiftStart: Date
}) {
  const { phone, firstName, shiftTitle, shiftStart } = params
  if (!phone) return null
  const dateStr = shiftStart.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  const message = `Hi ${firstName}, reminder: volunteer shift "${shiftTitle}" is on ${dateStr}. Thank you!`
  return sendSMS(phone, message)
}
