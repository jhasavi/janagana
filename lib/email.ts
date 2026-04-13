import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string | string[]
  subject: string
  html: string
  text?: string
}) {
  if (!resend) {
    console.warn('Resend is not configured. Email not sent.')
    return { success: false, error: 'Resend not configured' }
  }

  try {
    const from = process.env.EMAIL_FROM || 'noreply@janagana.app'
    const fromName = process.env.EMAIL_FROM_NAME || 'Janagana'

    await resend.emails.send({
      from: `${fromName} <${from}>`,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
    })

    return { success: true }
  } catch (error) {
    console.error('Failed to send email:', error)
    return { success: false, error }
  }
}

export async function sendWelcomeEmail(email: string, firstName: string, organizationName: string) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to ${organizationName}!</h1>
        </div>
        <div class="content">
          <p>Hi ${firstName},</p>
          <p>Welcome to ${organizationName}! We're excited to have you as part of our community.</p>
          <p>Your account has been successfully created. You can now access all features of our platform.</p>
          <p>If you have any questions, feel free to reach out to us.</p>
          <p>Best regards,<br>The ${organizationName} Team</p>
        </div>
      </div>
    </body>
    </html>
  `

  return sendEmail({
    to: email,
    subject: `Welcome to ${organizationName}!`,
    html,
    text: `Hi ${firstName},\n\nWelcome to ${organizationName}! We're excited to have you as part of our community.\n\nYour account has been successfully created.\n\nBest regards,\nThe ${organizationName} Team`,
  })
}

export async function sendEventConfirmationEmail(email: string, firstName: string, eventName: string, eventDate: Date) {
  const formattedDate = eventDate.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })
  const formattedTime = eventDate.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .event-details { background: white; padding: 20px; margin: 20px 0; border-radius: 6px; border-left: 4px solid #2563eb; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Event Registration Confirmed</h1>
        </div>
        <div class="content">
          <p>Hi ${firstName},</p>
          <p>You have successfully registered for the following event:</p>
          <div class="event-details">
            <h2>${eventName}</h2>
            <p><strong>Date:</strong> ${formattedDate}</p>
            <p><strong>Time:</strong> ${formattedTime}</p>
          </div>
          <p>We look forward to seeing you there!</p>
          <p>Best regards,<br>The Team</p>
        </div>
      </div>
    </body>
    </html>
  `

  return sendEmail({
    to: email,
    subject: `Registration Confirmed: ${eventName}`,
    html,
    text: `Hi ${firstName},\n\nYou have successfully registered for: ${eventName}\n\nDate: ${formattedDate}\nTime: ${formattedTime}\n\nWe look forward to seeing you there!\n\nBest regards,\nThe Team`,
  })
}

export async function sendVolunteerShiftConfirmationEmail(email: string, firstName: string, shiftName: string, shiftDate: Date) {
  const formattedDate = shiftDate.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })
  const formattedTime = shiftDate.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f97316; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .shift-details { background: white; padding: 20px; margin: 20px 0; border-radius: 6px; border-left: 4px solid #f97316; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Volunteer Shift Confirmed</h1>
        </div>
        <div class="content">
          <p>Hi ${firstName},</p>
          <p>Thank you for signing up for this volunteer shift:</p>
          <div class="shift-details">
            <h2>${shiftName}</h2>
            <p><strong>Date:</strong> ${formattedDate}</p>
            <p><strong>Time:</strong> ${formattedTime}</p>
          </div>
          <p>Your contribution makes a difference!</p>
          <p>Best regards,<br>The Team</p>
        </div>
      </div>
    </body>
    </html>
  `

  return sendEmail({
    to: email,
    subject: `Volunteer Shift Confirmed: ${shiftName}`,
    html,
    text: `Hi ${firstName},\n\nThank you for signing up for volunteer shift: ${shiftName}\n\nDate: ${formattedDate}\nTime: ${formattedTime}\n\nYour contribution makes a difference!\n\nBest regards,\nThe Team`,
  })
}
