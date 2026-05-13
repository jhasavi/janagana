import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = process.env.EMAIL_FROM ?? 'noreply@janagana.com'
const FROM_NAME = process.env.EMAIL_FROM_NAME ?? 'JanaGana'
const fromAddress = `${FROM_NAME} <${FROM}>`

export async function sendEmail(opts: {
  to: string
  subject: string
  html: string
}): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY not set — skipping email to', opts.to)
    return false
  }
  try {
    const { error } = await resend.emails.send({
      from: fromAddress,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    })
    if (error) {
      console.error('[email] Resend error', error)
      return false
    }
    return true
  } catch (err) {
    console.error('[email] sendEmail failed', err)
    return false
  }
}

export async function sendMemberWelcomeEmail(opts: {
  to: string
  firstName: string
  orgName: string
  portalUrl: string
}) {
  return sendEmail({
    to: opts.to,
    subject: `Welcome to ${opts.orgName}!`,
    html: `
<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; color: #1a1a1a;">
  <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 8px;">Welcome, ${opts.firstName}! 🎉</h1>
  <p style="color: #555; margin-bottom: 24px;">
    You've been added as a member of <strong>${opts.orgName}</strong>.
    Use the link below to access your member portal — view events, manage your membership, and more.
  </p>
  <a href="${opts.portalUrl}"
     style="display: inline-block; background: #4f46e5; color: white; text-decoration: none;
            padding: 12px 24px; border-radius: 8px; font-weight: 600; margin-bottom: 24px;">
    Access Your Member Portal
  </a>
  <p style="font-size: 13px; color: #888;">
    If you didn't expect this email, you can safely ignore it.
  </p>
</body>
</html>`,
  })
}

export async function sendMemberJoinConfirmationEmail(opts: {
  to: string
  firstName: string
  orgName: string
  portalUrl: string
  isPending: boolean
}) {
  const subject = opts.isPending
    ? `Your membership request is under review — ${opts.orgName}`
    : `Welcome to ${opts.orgName}!`

  const bodyMessage = opts.isPending
    ? `Your membership request for <strong>${opts.orgName}</strong> has been received and is pending approval by the admin. You'll receive another email once your account is approved.`
    : `You've been added as a member of <strong>${opts.orgName}</strong>. Access your member portal below.`

  return sendEmail({
    to: opts.to,
    subject,
    html: `
<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; color: #1a1a1a;">
  <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 8px;">Hi ${opts.firstName}!</h1>
  <p style="color: #555; margin-bottom: 24px;">${bodyMessage}</p>
  ${!opts.isPending ? `
  <a href="${opts.portalUrl}"
     style="display: inline-block; background: #4f46e5; color: white; text-decoration: none;
            padding: 12px 24px; border-radius: 8px; font-weight: 600; margin-bottom: 24px;">
    Open Member Portal
  </a>` : ''}
  <p style="font-size: 13px; color: #888;">
    If you didn't request this, you can safely ignore it.
  </p>
</body>
</html>`,
  })
}
