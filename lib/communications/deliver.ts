import { prisma } from "@/lib/prisma";
import { emitOpsAlert } from "@/lib/ops/alert";

const ZEPTOMAIL_ENDPOINT = "https://api.zeptomail.com/v1.1/email";

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

  const token = process.env.ZEPTOMAIL_TOKEN?.trim();
  const fromAddress = process.env.ZEPTOMAIL_FROM?.trim();
  if (!token || !fromAddress) {
    return { ok: true as const, skipped: true, reason: "ZEPTOMAIL_TOKEN/ZEPTOMAIL_FROM not configured" };
  }

  const response = await fetch(ZEPTOMAIL_ENDPOINT, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: token,
    },
    body: JSON.stringify({
      from: {
        address: fromAddress,
        name: process.env.ZEPTOMAIL_FROM_NAME?.trim() || "JanaGana",
      },
      to: [{ email_address: { address: message.recipientEmail } }],
      subject: message.subject,
      htmlbody: textToHtml(message.body),
      textbody: message.body,
    }),
  });

  const responseText = await response.text();
  let parsed: { request_id?: string; message?: string; error?: { message?: string } } = {};
  try {
    parsed = responseText ? JSON.parse(responseText) : {};
  } catch {
    parsed = {};
  }

  if (!response.ok) {
    const errorMessage = parsed.error?.message || parsed.message || responseText.slice(0, 500) || `HTTP ${response.status}`;
    await prisma.communicationMessage.update({
      where: { id: message.id },
      data: {
        status: "FAILED",
        error: `ZeptoMail ${response.status}: ${errorMessage}`,
      },
    });
    await emitOpsAlert({
      kind: "email-delivery",
      message: `ZeptoMail ${response.status} for message ${message.id}`,
      metadata: { messageId: message.id, recipient: message.recipientEmail },
    });
    return { ok: false as const, error: errorMessage };
  }

  await prisma.communicationMessage.update({
    where: { id: message.id },
    data: {
      status: "SENT",
      sentAt: new Date(),
      provider: "zeptomail",
      providerRef: parsed.request_id ?? null,
      error: null,
    },
  });

  return { ok: true as const, sent: true, providerRef: parsed.request_id ?? null };
}
