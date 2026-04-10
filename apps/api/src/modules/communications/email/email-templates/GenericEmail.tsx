import * as React from 'react';
import { Body } from '@react-email/body';
import { Container } from '@react-email/container';
import { Head } from '@react-email/head';
import { Html } from '@react-email/html';
import { Preview } from '@react-email/preview';
import { Section } from '@react-email/section';
import { Text } from '@react-email/text';
import { Link } from '@react-email/link';

interface GenericEmailProps {
  firstName?: string;
  tenant: { name: string; brandColor?: string | null };
  subject?: string;
  body: string;
  unsubscribeUrl: string;
}

export function GenericEmail({ firstName = 'Friend', tenant, subject = 'Update from your organization', body, unsubscribeUrl }: GenericEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{subject}</Preview>
      <Body style={{ backgroundColor: '#f4f6fb', fontFamily: 'Inter, Arial, sans-serif' }}>
        <Container style={{ backgroundColor: '#ffffff', borderRadius: 24, padding: 32, maxWidth: 580 }}>
          <Section style={{ paddingBottom: 24 }}>
            <Text style={{ fontSize: 24, fontWeight: 700 }}>Hello {firstName},</Text>
            <Text style={{ color: '#6b7280', marginTop: 10 }}>{body}</Text>
          </Section>

          <Section style={{ borderTop: '1px solid #e5e7eb', paddingTop: 24 }}>
            <Text style={{ color: '#9ca3af', fontSize: 12 }}>If you no longer wish to receive these emails, you can <Link href={unsubscribeUrl}>unsubscribe</Link>.</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
