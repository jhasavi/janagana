import { prisma } from "@/lib/prisma";

function emailFromAddress() {
  const from = process.env.EMAIL_FROM?.trim();
  if (from) return from;
  const name = process.env.EMAIL_FROM_NAME?.trim();
  if (name) return `${name} <onboarding@resend.dev>`;
  return "JanaGana <onboarding@resend.dev>";
}

export async function deliverCommunicationMessage(messageId: string) {
  const message = await prisma.communicationMessage.findUnique({
    where: { id: messageId },
    select: {
      id: true,
      status: true,
      recipientEmail: true,
      subject: true,
      body: true,
    },
  });

  if (!message || message.status === "SENT") {
    return { ok: true as const, skipped: true };
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { ok: true as const, skipped: true, reason: "RESEND_API_KEY not configured" };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: emailFromAddress(),
      to: [message.recipientEmail],
      subject: message.subject,
      text: message.body,
    }),
  });

  if (!response.ok) {
    const errorText = (await response.text()).slice(0, 500);
    await prisma.communicationMessage.update({
      where: { id: message.id },
      data: {
        status: "FAILED",
        error: `Resend ${response.status}: ${errorText}`,
      },
    });
    return { ok: false as const, error: errorText };
  }

  const payload = (await response.json()) as { id?: string };
  await prisma.communicationMessage.update({
    where: { id: message.id },
    data: {
      status: "SENT",
      sentAt: new Date(),
      provider: "resend",
      providerRef: payload.id ?? null,
      error: null,
    },
  });

  return { ok: true as const, sent: true, providerRef: payload.id ?? null };
}
