import * as React from 'react';
import { Body } from '@react-email/body';
import { Container } from '@react-email/container';
import { Head } from '@react-email/head';
import { Html } from '@react-email/html';
import { Preview } from '@react-email/preview';
import { Section } from '@react-email/section';
import { Text } from '@react-email/text';
import { Button } from '@react-email/button';
import { Link } from '@react-email/link';

interface MembershipExpiryEmailProps {
  firstName?: string;
  tenant: { name: string; brandColor?: string | null };
  daysLeft?: number;
  isExpired?: boolean;
  unsubscribeUrl: string;
}

export function MembershipExpiryEmail({ firstName = 'Member', tenant, daysLeft, isExpired, unsubscribeUrl }: MembershipExpiryEmailProps) {
  const message = isExpired
    ? "Your membership has expired. Renew now to regain access to your benefits."
    : `Your membership expires in ${daysLeft ?? 0} days. Renew soon to avoid interruptions.`;

  return (
    <Html>
      <Head />
      <Preview>{isExpired ? 'Membership expired' : 'Membership expiring soon'}</Preview>
      <Body style={{ backgroundColor: '#f4f6fb', fontFamily: 'Inter, Arial, sans-serif' }}>
        <Container style={{ backgroundColor: '#ffffff', borderRadius: 24, padding: 32, maxWidth: 580 }}>
          <Section style={{ textAlign: 'center', paddingBottom: 24 }}>
            <Text style={{ fontSize: 24, fontWeight: 700 }}>{isExpired ? 'Membership expired' : 'Membership expiring soon'}</Text>
            <Text style={{ color: '#6b7280', marginTop: 10 }}>{message}</Text>
          </Section>
          <Section style={{ textAlign: 'center', marginBottom: 24 }}>
            <Button style={{ backgroundColor: tenant.brandColor ?? '#2563eb', borderRadius: 10, color: '#fff', fontWeight: 600, padding: '12px 20px' }} href="https://app.orgflow.app">Manage membership</Button>
          </Section>
          <Section style={{ borderTop: '1px solid #e5e7eb', paddingTop: 24 }}>
            <Text style={{ color: '#9ca3af', fontSize: 12 }}>If you no longer want these reminders, <Link href={unsubscribeUrl}>unsubscribe</Link>.</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
