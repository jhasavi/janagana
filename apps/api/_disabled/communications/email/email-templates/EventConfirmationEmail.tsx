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

interface EventConfirmationEmailProps {
  firstName?: string;
  tenant: { name: string; brandColor?: string | null };
  event: { title: string; startsAt: string; location?: string };
  registration: { confirmationCode: string; ticketName?: string; amountCents?: number };
  unsubscribeUrl: string;
}

export function EventConfirmationEmail({ firstName = 'Member', tenant, event, registration, unsubscribeUrl }: EventConfirmationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your event registration is confirmed</Preview>
      <Body style={{ backgroundColor: '#f4f6fb', fontFamily: 'Inter, Arial, sans-serif' }}>
        <Container style={{ backgroundColor: '#ffffff', borderRadius: 24, padding: 32, maxWidth: 580 }}>
          <Section style={{ textAlign: 'center', paddingBottom: 24 }}>
            <Text style={{ fontSize: 24, fontWeight: 700 }}>You're confirmed for {event.title}</Text>
            <Text style={{ color: '#6b7280', marginTop: 10 }}>Thanks for registering. Here are the details for your upcoming event.</Text>
          </Section>

          <Section style={{ backgroundColor: '#f3f4f6', borderRadius: 16, padding: 24, marginBottom: 24 }}>
            <Text style={{ color: '#374151', marginBottom: 8 }}>Date: {event.startsAt}</Text>
            {event.location ? <Text style={{ color: '#374151', marginBottom: 8 }}>Location: {event.location}</Text> : null}
            <Text style={{ color: '#374151', marginBottom: 8 }}>Confirmation code: {registration.confirmationCode}</Text>
            {registration.ticketName ? <Text style={{ color: '#374151' }}>Ticket: {registration.ticketName}</Text> : null}
            {registration.amountCents ? <Text style={{ color: '#374151' }}>Amount: ${(registration.amountCents / 100).toFixed(2)}</Text> : null}
          </Section>

          <Section style={{ textAlign: 'center' }}>
            <Button style={{ backgroundColor: tenant.brandColor ?? '#2563eb', borderRadius: 10, color: '#fff', fontWeight: 600, padding: '12px 20px' }} href="https://app.orgflow.app">View event</Button>
          </Section>

          <Section style={{ borderTop: '1px solid #e5e7eb', paddingTop: 24 }}>
            <Text style={{ color: '#9ca3af', fontSize: 12 }}>If you need help, reply to this message. To opt out of future emails, <Link href={unsubscribeUrl}>unsubscribe</Link>.</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
