/**
 * Apple/Google Wallet pass generation is gated on the tenant owner's own
 * Apple Developer / Google Cloud credentials — JanaGana never supplies or
 * generates these. Buttons stay hidden until an operator configures them.
 */

export function appleWalletConfigured(): boolean {
  return Boolean(
    process.env.APPLE_WALLET_CERT_BASE64?.trim() &&
      process.env.APPLE_WALLET_KEY_BASE64?.trim() &&
      process.env.APPLE_WALLET_WWDR_BASE64?.trim() &&
      process.env.APPLE_WALLET_PASS_TYPE_ID?.trim() &&
      process.env.APPLE_WALLET_TEAM_ID?.trim(),
  );
}

export function googleWalletConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_WALLET_ISSUER_ID?.trim() && process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_JSON?.trim(),
  );
}
