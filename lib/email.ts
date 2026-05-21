import { Resend } from 'resend'

const FROM = process.env.EMAIL_FROM?.trim()
const FROM_NAME = process.env.EMAIL_FROM_NAME ?? process.env.PLATFORM_BRAND_NAME ?? process.env.TENANT_BRAND_NAME ?? 'Janagana'
const fromAddress = FROM ? `${FROM_NAME} <${FROM}>` : null

function escapeHtml(value: string | null | undefined) {
  return (value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}

function formatDateTime(date: Date | string | null | undefined) {
  if (!date) return 'To be announced'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(date))
}

function getResendClient() {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  return new Resend(key)
}

export async function sendEmail(opts: {
  to: string
  subject: string
  html: string
}): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY not set — skipping email to', opts.to)
    return false
  }
  if (!fromAddress) {
    console.warn('[email] EMAIL_FROM not set — skipping email to', opts.to)
    return false
  }

  const resend = getResendClient()
  if (!resend) {
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

export async function sendMembershipRenewalReminderEmail(opts: {
  to: string
  firstName: string
  orgName: string
  renewalDate: Date | string
  portalUrl: string
}) {
  return sendEmail({
    to: opts.to,
    subject: `Membership renewal reminder from ${opts.orgName}`,
    html: `
<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; color: #1a1a1a;">
  <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 8px;">Membership renewal reminder</h1>
  <p style="color: #555; margin-bottom: 24px;">Hi ${escapeHtml(opts.firstName)}, your membership with ${escapeHtml(opts.orgName)} is due to renew on <strong>${escapeHtml(formatDateTime(opts.renewalDate))}</strong>.</p>
  <p style="color: #555; margin-bottom: 24px;">If you haven't already, please visit the member portal to review your plan and payment details.</p>
  <a href="${escapeHtml(opts.portalUrl)}"
     style="display: inline-block; background: #4f46e5; color: white; text-decoration: none;
            padding: 12px 24px; border-radius: 8px; font-weight: 600; margin-bottom: 24px;">
    Review Membership
  </a>
  <p style="font-size: 13px; color: #888;">If you've already renewed, thank you!</p>
</body>
</html>`,
  })
}

export async function sendEventRegistrationConfirmationEmail(opts: {
  to: string
  firstName: string
  orgName: string
  eventTitle: string
  eventDate: Date | string | null
  eventLocation?: string | null
  portalUrl: string
  paidAmountCents?: number
  status?: 'CONFIRMED' | 'WAITLISTED'
  ticketCode?: string
}) {
  const isWaitlisted = opts.status === 'WAITLISTED'
  const amountLine = typeof opts.paidAmountCents === 'number' && opts.paidAmountCents > 0
    ? `<p><strong>Amount paid:</strong> ${formatCurrency(opts.paidAmountCents)}</p>`
    : ''
  const ticketLine = opts.ticketCode
    ? `<p><strong>Ticket code:</strong> <code style="background: #f8fafc; padding: 4px 8px; border-radius: 6px;">${escapeHtml(opts.ticketCode)}</code></p>
       <p style="color: #555; margin-top: 8px;">Show this code at the event entrance for check-in.</p>`
    : ''

  return sendEmail({
    to: opts.to,
    subject: `${isWaitlisted ? 'Waitlist confirmation' : 'Registration confirmed'}: ${opts.eventTitle}`,
    html: `
<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; color: #1a1a1a;">
  <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 8px;">${isWaitlisted ? 'You are on the waitlist' : 'You are registered'}</h1>
  <p style="color: #555; margin-bottom: 24px;">Hi ${escapeHtml(opts.firstName)}, your ${isWaitlisted ? 'waitlist spot' : 'registration'} for <strong>${escapeHtml(opts.eventTitle)}</strong> with ${escapeHtml(opts.orgName)} is confirmed.</p>
  <div style="border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
    <p><strong>Date:</strong> ${escapeHtml(formatDateTime(opts.eventDate))}</p>
    ${opts.eventLocation ? `<p><strong>Location:</strong> ${escapeHtml(opts.eventLocation)}</p>` : ''}
    ${amountLine}
    ${ticketLine}
  </div>
  <a href="${escapeHtml(opts.portalUrl)}"
     style="display: inline-block; background: #4f46e5; color: white; text-decoration: none;
            padding: 12px 24px; border-radius: 8px; font-weight: 600; margin-bottom: 24px;">
    View in Member Portal
  </a>
  <p style="font-size: 13px; color: #888;">You can manage your events and support requests from your member portal.</p>
</body>
</html>`,
  })
}

export async function sendWaitlistPromotionEmail(opts: {
  to: string
  firstName: string
  orgName: string
  eventTitle: string
  eventDate: Date | string | null
  eventLocation?: string | null
  ticketCode: string
  portalUrl: string
}) {
  return sendEmail({
    to: opts.to,
    subject: `You have a spot for ${opts.eventTitle}`,
    html: `
<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; color: #1a1a1a;">
  <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 8px;">You're off the waitlist!</h1>
  <p style="color: #555; margin-bottom: 24px;">Hi ${escapeHtml(opts.firstName)}, great news — your waitlisted registration for <strong>${escapeHtml(opts.eventTitle)}</strong> with ${escapeHtml(opts.orgName)} is now confirmed.</p>
  <div style="border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
    <p><strong>Date:</strong> ${escapeHtml(formatDateTime(opts.eventDate))}</p>
    ${opts.eventLocation ? `<p><strong>Location:</strong> ${escapeHtml(opts.eventLocation)}</p>` : ''}
    <p><strong>Ticket code:</strong> <code style="background: #f8fafc; padding: 4px 8px; border-radius: 6px;">${escapeHtml(opts.ticketCode)}</code></p>
    <p style="color: #555; margin-top: 8px;">Bring this code to the event for check-in.</p>
  </div>
  <a href="${escapeHtml(opts.portalUrl)}"
     style="display: inline-block; background: #4f46e5; color: white; text-decoration: none;
            padding: 12px 24px; border-radius: 8px; font-weight: 600; margin-bottom: 24px;">
    View your registration
  </a>
  <p style="font-size: 13px; color: #888;">We look forward to seeing you there.</p>
</body>
</html>`,
  })
}

export async function sendEventCancellationRequestEmail(opts: {
  to: string
  firstName: string
  orgName: string
  eventTitle: string
  portalUrl: string
}) {
  return sendEmail({
    to: opts.to,
    subject: `Cancellation request received: ${opts.eventTitle}`,
    html: `
<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; color: #1a1a1a;">
  <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 8px;">Cancellation request received</h1>
  <p style="color: #555; margin-bottom: 24px;">Hi ${escapeHtml(opts.firstName)}, your paid cancellation request for <strong>${escapeHtml(opts.eventTitle)}</strong> has been sent to ${escapeHtml(opts.orgName)} for review.</p>
  <a href="${escapeHtml(opts.portalUrl)}"
     style="display: inline-block; background: #4f46e5; color: white; text-decoration: none;
            padding: 12px 24px; border-radius: 8px; font-weight: 600;">
    View Request Status
  </a>
</body>
</html>`,
  })
}

export async function sendSupportResponseEmail(opts: {
  to: string
  requesterName?: string | null
  orgName: string
  response: string
  portalUrl?: string
}) {
  return sendEmail({
    to: opts.to,
    subject: `New support response from ${opts.orgName}`,
    html: `
<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; color: #1a1a1a;">
  <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 8px;">Support response</h1>
  <p style="color: #555; margin-bottom: 16px;">Hi ${escapeHtml(opts.requesterName || 'there')}, ${escapeHtml(opts.orgName)} replied to your support request.</p>
  <div style="white-space: pre-wrap; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin-bottom: 24px;">${escapeHtml(opts.response)}</div>
  ${opts.portalUrl ? `<a href="${escapeHtml(opts.portalUrl)}" style="display: inline-block; background: #4f46e5; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600;">Open Support</a>` : ''}
</body>
</html>`,
  })
}

export async function sendDonationReceiptEmail(opts: {
  to: string
  donorName: string
  orgName: string
  campaignTitle?: string | null
  amountCents: number
  footer?: string | null
  disclaimer?: string | null
}) {
  return sendEmail({
    to: opts.to,
    subject: `Donation receipt from ${opts.orgName}`,
    html: `
<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; color: #1a1a1a;">
  <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 8px;">Thank you for your donation</h1>
  <p style="color: #555; margin-bottom: 24px;">Hi ${escapeHtml(opts.donorName)}, thank you for supporting ${escapeHtml(opts.orgName)}.</p>
  <div style="border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
    <p><strong>Amount:</strong> ${formatCurrency(opts.amountCents)}</p>
    ${opts.campaignTitle ? `<p><strong>Campaign:</strong> ${escapeHtml(opts.campaignTitle)}</p>` : ''}
  </div>
  ${opts.footer ? `<div style="border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 16px; color: #555;">${escapeHtml(opts.footer)}</div>` : ''}
  ${opts.disclaimer ? `<p style="font-size: 13px; color: #888; margin-top: 16px;">${escapeHtml(opts.disclaimer)}</p>` : '<p style="font-size: 13px; color: #888;">Please keep this receipt for your records.</p>'}
</body>
</html>`,
  })
}
