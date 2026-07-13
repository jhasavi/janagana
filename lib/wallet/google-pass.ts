import jwt from "jsonwebtoken";

/**
 * Requires the tenant owner's own Google Wallet issuer id + service account
 * (see googleWalletConfigured()). JanaGana never generates or holds these credentials.
 */
export function buildGoogleWalletSaveUrl(params: {
  membershipId: string;
  organizationName: string;
  tierName: string;
  memberName: string;
  verifyUrl: string;
}): string {
  const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID!;
  const serviceAccount = JSON.parse(process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_JSON!) as {
    client_email: string;
    private_key: string;
  };

  const classId = `${issuerId}.janagana_membership`;
  const objectId = `${issuerId}.membership_${params.membershipId}`;

  const genericObject = {
    id: objectId,
    classId,
    genericType: "GENERIC_TYPE_UNSPECIFIED",
    hexBackgroundColor: "#4338ca",
    cardTitle: { defaultValue: { language: "en", value: params.organizationName } },
    header: { defaultValue: { language: "en", value: params.memberName } },
    subheader: { defaultValue: { language: "en", value: params.tierName } },
    barcode: { type: "QR_CODE", value: params.verifyUrl },
  };

  const claims = {
    iss: serviceAccount.client_email,
    aud: "google",
    typ: "savetowallet",
    iat: Math.floor(Date.now() / 1000),
    payload: { genericObjects: [genericObject] },
  };

  const token = jwt.sign(claims, serviceAccount.private_key, { algorithm: "RS256" });
  return `https://pay.google.com/gp/v/save/${token}`;
}
