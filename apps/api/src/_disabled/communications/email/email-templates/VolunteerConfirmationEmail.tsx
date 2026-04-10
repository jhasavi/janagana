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

interface VolunteerConfirmationEmailProps {
  firstName?: string;
  tenant: { name: string; brandColor?: string | null };
  opportunity: { title: string };
  shift?: { name: string; startsAt?: string };
  status: 'received' | 'approved' | 'shift-reminder';
  unsubscribeUrl: string;
}

export function VolunteerConfirmationEmail({ firstName = 'Volunteer', tenant, opportunity, shift, status, unsubscribeUrl }: VolunteerConfirmationEmailProps) {
  const title = status === 'approved' ? 'Volunteer application approved' : status === 'shift-reminder' ? 'Upcoming volunteer shift' : 'Application received';
  const message = status === 'approved'
    ? `Your application to volunteer for ${opportunity.title} has been approved.`
    : status === 'shift-reminder'
      ? `Your upcoming shift for ${opportunity.title}${shift?.name ? ` — ${shift.name}` : ''} starts soon.`
      : `We received your application to volunteer for ${opportunity.title}. We'll follow up shortly.`;

  return (
    <Html>
      <Head />
      <Preview>{title}</Preview>
      <Body style={{ backgroundColor: '#f4f6fb', fontFamily: 'Inter, Arial, sans-serif' }}>
        <Container style={{ backgroundColor: '#ffffff', borderRadius: 24, padding: 32, maxWidth: 580 }}>
          <Section style={{ textAlign: 'center', paddingBottom: 24 }}>
            <Text style={{ fontSize: 24, fontWeight: 700 }}>{title}</Text>
            <Text style={{ color: '#6b7280', marginTop: 10 }}>{message}</Text>
          </Section>
          <Section style={{ marginBottom: 24, textAlign: 'center' }}>
            <Button style={{ backgroundColor: tenant.brandColor ?? '#2563eb', borderRadius: 10, color: '#fff', fontWeight: 600, padding: '12px 20px' }} href="https://app.orgflow.app">View your volunteer schedule</Button>
          </Section>
          <Section style={{ borderTop: '1px solid #e5e7eb', paddingTop: 24 }}>
            <Text style={{ color: '#9ca3af', fontSize: 12 }}>To stop receiving volunteer emails, <Link href={unsubscribeUrl}>unsubscribe</Link>.</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
