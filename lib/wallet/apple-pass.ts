import { PKPass } from "passkit-generator";
import QRCode from "qrcode";

/**
 * Requires the tenant owner's own Apple Developer pass-type certificate,
 * signing key, and WWDR intermediate certificate (see appleWalletConfigured()).
 * JanaGana never generates or holds these credentials.
 */
async function passIconBuffer(): Promise<Buffer> {
  if (process.env.APPLE_WALLET_ICON_BASE64?.trim()) {
    return Buffer.from(process.env.APPLE_WALLET_ICON_BASE64.trim(), "base64");
  }
  // Placeholder icon until the operator supplies their own org logo via APPLE_WALLET_ICON_BASE64.
  return QRCode.toBuffer("JG", { width: 58, margin: 0 });
}

export async function buildApplePass(params: {
  serialNumber: string;
  organizationName: string;
  tierName: string;
  memberName: string;
  verifyUrl: string;
  expiresAt: Date | null;
}): Promise<Buffer> {
  const wwdr = Buffer.from(process.env.APPLE_WALLET_WWDR_BASE64!, "base64");
  const signerCert = Buffer.from(process.env.APPLE_WALLET_CERT_BASE64!, "base64");
  const signerKey = Buffer.from(process.env.APPLE_WALLET_KEY_BASE64!, "base64");
  const signerKeyPassphrase = process.env.APPLE_WALLET_KEY_PASSPHRASE?.trim() || undefined;

  const icon = await passIconBuffer();

  const passJson = {
    formatVersion: 1,
    passTypeIdentifier: process.env.APPLE_WALLET_PASS_TYPE_ID,
    teamIdentifier: process.env.APPLE_WALLET_TEAM_ID,
    organizationName: params.organizationName,
    description: `${params.organizationName} membership`,
    serialNumber: params.serialNumber,
    generic: {
      primaryFields: [{ key: "member", label: "Member", value: params.memberName }],
      secondaryFields: [{ key: "tier", label: "Plan", value: params.tierName }],
      ...(params.expiresAt
        ? {
            auxiliaryFields: [
              { key: "expires", label: "Valid through", value: params.expiresAt.toISOString().slice(0, 10) },
            ],
          }
        : {}),
    },
    barcodes: [
      {
        format: "PKBarcodeFormatQR",
        message: params.verifyUrl,
        messageEncoding: "iso-8859-1",
      },
    ],
  };

  const pass = new PKPass(
    {
      "pass.json": Buffer.from(JSON.stringify(passJson)),
      "icon.png": icon,
    },
    { wwdr, signerCert, signerKey, signerKeyPassphrase },
  );

  return pass.getAsBuffer();
}
