import * as React from 'react';
import { Body } from '@react-email/body';
import { Container } from '@react-email/container';
import { Head } from '@react-email/head';
import { Html } from '@react-email/html';
import { Link } from '@react-email/link';
import { Preview } from '@react-email/preview';
import { Section } from '@react-email/section';
import { Text } from '@react-email/text';
import { Button } from '@react-email/button';

interface WelcomeEmailProps {
  firstName?: string;
  tenant: { name: string; logoUrl?: string | null; brandColor?: string | null };
  unsubscribeUrl: string;
}

export function WelcomeEmail({ firstName = 'there', tenant, unsubscribeUrl }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to {tenant.name}</Preview>
      <Body style={{ backgroundColor: '#f4f6fb', fontFamily: 'Inter, Arial, sans-serif' }}>
        <Container style={{ backgroundColor: '#ffffff', borderRadius: 24, padding: 32, maxWidth: 580 }}>
          <Section style={{ textAlign: 'center', paddingBottom: 24 }}>
            {tenant.logoUrl ? <img src={tenant.logoUrl} alt={tenant.name} width="88" style={{ margin: '0 auto' }} /> : null}
            <Text style={{ fontSize: 24, fontWeight: 700, margin: '24px 0 0' }}>Welcome to {tenant.name}, {firstName}.</Text>
            <Text style={{ color: '#6b7280', margin: '14px 0 0', fontSize: 16 }}>Your community hub is ready to help your organization grow, connect, and manage membership with ease.</Text>
          </Section>

          <Section style={{ padding: '0 0 24px' }}>
            <Button style={{ backgroundColor: tenant.brandColor ?? '#2563eb', borderRadius: 10, color: '#fff', fontWeight: 600, padding: '12px 20px' }} href="https://app.orgflow.app">Open your dashboard</Button>
          </Section>

          <Section style={{ borderTop: '1px solid #e5e7eb', paddingTop: 24 }}>
            <Text style={{ color: '#6b7280', fontSize: 14, lineHeight: 1.6 }}>If you have any questions, reply to this email and our support team will get back to you.</Text>
            <Text style={{ color: '#9ca3af', fontSize: 12, marginTop: 16 }}>If you no longer wish to receive messages from {tenant.name}, you may <Link href={unsubscribeUrl}>unsubscribe here</Link>.</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
