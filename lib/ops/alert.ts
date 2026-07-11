type OpsAlertPayload = {
  kind: string;
  message: string;
  metadata?: Record<string, unknown>;
};

/** Fire-and-forget webhook when OPS_ALERT_WEBHOOK_URL is set (Slack-compatible JSON). */
export async function emitOpsAlert(payload: OpsAlertPayload): Promise<void> {
  const url = process.env.OPS_ALERT_WEBHOOK_URL?.trim();
  if (!url) return;

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `[janagana] ${payload.kind}: ${payload.message}`,
        ...payload,
        at: new Date().toISOString(),
        app: "janagana",
      }),
    });
  } catch {
    // Never block request paths on alert delivery
  }
}
