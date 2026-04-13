import twilio from 'twilio'

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const fromNumber = process.env.TWILIO_PHONE_NUMBER

const client = accountSid && authToken ? twilio(accountSid, authToken) : null

export async function sendSMS(to: string, message: string) {
  if (!client || !fromNumber) {
    console.warn('Twilio not configured. SMS sending skipped.')
    return null
  }

  try {
    const result = await client.messages.create({
      body: message,
      from: fromNumber,
      to: to,
    })
    return result
  } catch (error) {
    console.error('Failed to send SMS:', error)
    throw error
  }
}

export async function sendMembershipRenewalReminder(member: any, organization: any) {
  const message = `Hi ${member.firstName}, your ${organization.name} membership is expiring soon. Please renew to continue enjoying member benefits.`
  return await sendSMS(member.phone, message)
}

export async function sendEventReminder(member: any, event: any) {
  const message = `Hi ${member.firstName}, reminder: ${event.title} is coming up on ${new Date(event.startDate).toLocaleDateString()}. Don't miss it!`
  return await sendSMS(member.phone, message)
}

export async function sendVolunteerShiftReminder(member: any, shift: any) {
  const message = `Hi ${member.firstName}, reminder: Your volunteer shift "${shift.name}" is scheduled for ${new Date(shift.startTime).toLocaleString()}.`
  return await sendSMS(member.phone, message)
}
