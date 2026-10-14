import { prisma } from "@/lib/prisma";
import { emitOpsAlert } from "@/lib/ops/alert";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function textToHtml(body: string): string {
  return escapeHtml(body).replace(/\n/g, "<br>");
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
  const fromAddress = process.env.EMAIL_FROM?.trim();
  if (!apiKey || !fromAddress) {
    return { ok: true as const, skipped: true, reason: "RESEND_API_KEY/EMAIL_FROM not configured" };
  }

  const fromName = process.env.EMAIL_FROM_NAME?.trim() || "JanaGana";
  const from = fromAddress.includes("<") ? fromAddress : `${fromName} <${fromAddress}>`;

  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from,
      to: [message.recipientEmail],
      subject: message.subject,
      html: textToHtml(message.body),
      text: message.body,
    }),
  });

  const responseText = await response.text();
  let parsed: { id?: string; message?: string } = {};
  try {
    parsed = responseText ? JSON.parse(responseText) : {};
  } catch {
    parsed = {};
  }

  if (!response.ok) {
    const errorMessage = parsed.message || responseText.slice(0, 500) || `HTTP ${response.status}`;
    await prisma.communicationMessage.update({
      where: { id: message.id },
      data: {
        status: "FAILED",
        error: `Resend ${response.status}: ${errorMessage}`,
      },
    });
    await emitOpsAlert({
      kind: "email-delivery",
      message: `Resend ${response.status} for message ${message.id}`,
      metadata: { messageId: message.id, recipient: message.recipientEmail },
    });
    return { ok: false as const, error: errorMessage };
  }

  await prisma.communicationMessage.update({
    where: { id: message.id },
    data: {
      status: "SENT",
      sentAt: new Date(),
      provider: "resend",
      providerRef: parsed.id ?? null,
      error: null,
    },
  });

  return { ok: true as const, sent: true, providerRef: parsed.id ?? null };
}
