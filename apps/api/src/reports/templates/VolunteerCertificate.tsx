import * as React from 'react';
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';

interface VolunteerCertificateProps {
  member: {
    firstName: string;
    lastName: string;
  };
  totalHours: number;
  qrCode: string;
}

export function VolunteerCertificateDocument({ member, totalHours, qrCode }: VolunteerCertificateProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.container}>
          <Text style={styles.title}>Volunteer Service Certificate</Text>
          <Text style={styles.subtitle}>Presented to</Text>
          <Text style={styles.memberName}>{member.firstName} {member.lastName}</Text>
          <Text style={styles.body}>In recognition of your volunteer contribution and commitment to community service totaling {totalHours} hours.</Text>
          <View style={styles.signatureSection}>
            <Text style={styles.signature}>Thank you for your service.</Text>
          </View>
          <Image style={styles.qrCode} src={qrCode} />
          <Text style={styles.small}>Scan to verify volunteer credentials.</Text>
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
    border: '2px solid #111827',
    borderRadius: 16,
    padding: 36,
    flexDirection: 'column',
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
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
    marginBottom: 20,
  },
  signatureSection: {
    marginTop: 20,
    marginBottom: 22,
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
