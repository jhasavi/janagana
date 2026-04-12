import * as React from 'react';
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';

interface MembershipCertificateProps {
  member: {
    firstName: string;
    lastName: string;
  };
  tier: string;
  expiry: Date | null;
  qrCode: string;
}

export function MembershipCertificateDocument({ member, tier, expiry, qrCode }: MembershipCertificateProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.container}>
          <Text style={styles.title}>Membership Certificate</Text>
          <Text style={styles.subtitle}>Awarded to</Text>
          <Text style={styles.memberName}>{member.firstName} {member.lastName}</Text>
          <Text style={styles.body}>This certificate confirms that the holder is a valued member of the organization and is recognized for their membership tier of {tier}.</Text>
          {expiry && <Text style={styles.body}>Membership expires on {expiry.toLocaleDateString()}</Text>}
          <View style={styles.signatureSection}>
            <Text style={styles.signature}>Authorized by Jana Gana</Text>
          </View>
          <Image style={styles.qrCode} src={qrCode} />
          <Text style={styles.small}>Verify membership at your portal using the QR code above.</Text>
        </View>
      </Page>
    </Document>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
  },
  container: {
    border: '2px solid #0f172a',
    borderRadius: 16,
    padding: 36,
    flexDirection: 'column',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 4,
  },
  memberName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  body: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 1.6,
    marginBottom: 12,
  },
  signatureSection: {
    marginTop: 24,
    marginBottom: 24,
  },
  signature: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  qrCode: {
    width: 120,
    height: 120,
    marginBottom: 8,
  },
  small: {
    fontSize: 9,
    color: '#6b7280',
  },
});
