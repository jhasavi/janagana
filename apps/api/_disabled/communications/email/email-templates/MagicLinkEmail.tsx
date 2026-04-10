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

interface MagicLinkEmailProps {
  tenant: { name: string; brandColor?: string | null };
  link: string;
  unsubscribeUrl: string;
}

export function MagicLinkEmail({ tenant, link, unsubscribeUrl }: MagicLinkEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Sign in to {tenant.name}</Preview>
      <Body style={{ backgroundColor: '#f4f6fb', fontFamily: 'Inter, Arial, sans-serif' }}>
        <Container style={{ backgroundColor: '#ffffff', borderRadius: 24, padding: 32, maxWidth: 580 }}>
          <Section style={{ textAlign: 'center', paddingBottom: 24 }}>
            <Text style={{ fontSize: 24, fontWeight: 700, margin: '0 0 16px' }}>Sign in to {tenant.name}</Text>
            <Text style={{ color: '#6b7280', marginBottom: 24 }}>Use the link below to access your dashboard instantly. This link will expire in 15 minutes.</Text>
            <Button style={{ backgroundColor: tenant.brandColor ?? '#2563eb', borderRadius: 10, color: '#fff', fontWeight: 600, padding: '12px 20px' }} href={link}>Sign in now</Button>
          </Section>
          <Section style={{ borderTop: '1px solid #e5e7eb', paddingTop: 24 }}>
            <Text style={{ color: '#6b7280', fontSize: 14 }}>If you did not request this email, you can safely ignore it.</Text>
            <Text style={{ color: '#9ca3af', fontSize: 12, marginTop: 16 }}>Unsubscribe: <Link href={unsubscribeUrl}>{unsubscribeUrl}</Link></Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
