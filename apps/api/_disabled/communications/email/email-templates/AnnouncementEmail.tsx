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

interface AnnouncementEmailProps {
  firstName?: string;
  tenant: { name: string; brandColor?: string | null };
  announcement: { title: string; body: string };
  unsubscribeUrl: string;
}

export function AnnouncementEmail({ firstName = 'Member', tenant, announcement, unsubscribeUrl }: AnnouncementEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{announcement.title}</Preview>
      <Body style={{ backgroundColor: '#f4f6fb', fontFamily: 'Inter, Arial, sans-serif' }}>
        <Container style={{ backgroundColor: '#ffffff', borderRadius: 24, padding: 32, maxWidth: 580 }}>
          <Section style={{ textAlign: 'center', paddingBottom: 24 }}>
            <Text style={{ fontSize: 24, fontWeight: 700 }}>{announcement.title}</Text>
            <Text style={{ color: '#6b7280', marginTop: 10 }}>Dear {firstName}, here is an important update from {tenant.name}.</Text>
          </Section>

          <Section style={{ backgroundColor: '#f3f4f6', borderRadius: 16, padding: 24, marginBottom: 24 }}>
            <Text style={{ color: '#374151', lineHeight: 1.7 }}>{announcement.body}</Text>
          </Section>

          <Section style={{ textAlign: 'center' }}>
            <Button style={{ backgroundColor: tenant.brandColor ?? '#2563eb', borderRadius: 10, color: '#fff', fontWeight: 600, padding: '12px 20px' }} href="https://app.orgflow.app">View announcement</Button>
          </Section>

          <Section style={{ borderTop: '1px solid #e5e7eb', paddingTop: 24 }}>
            <Text style={{ color: '#9ca3af', fontSize: 12 }}>To stop receiving announcements, click <Link href={unsubscribeUrl}>unsubscribe</Link>.</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
