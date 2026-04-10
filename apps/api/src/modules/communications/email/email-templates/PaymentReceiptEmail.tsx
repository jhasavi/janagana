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

interface PaymentReceiptEmailProps {
  firstName?: string;
  tenant: { name: string; brandColor?: string | null };
  payment: { amountCents: number; currency: string; description: string; date: string };
  unsubscribeUrl: string;
}

export function PaymentReceiptEmail({ firstName = 'Customer', tenant, payment, unsubscribeUrl }: PaymentReceiptEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your payment receipt from {tenant.name}</Preview>
      <Body style={{ backgroundColor: '#f4f6fb', fontFamily: 'Inter, Arial, sans-serif' }}>
        <Container style={{ backgroundColor: '#ffffff', borderRadius: 24, padding: 32, maxWidth: 580 }}>
          <Section style={{ textAlign: 'center', paddingBottom: 24 }}>
            <Text style={{ fontSize: 24, fontWeight: 700 }}>Payment receipt</Text>
            <Text style={{ color: '#6b7280', marginTop: 10 }}>Thanks for your payment, {firstName}. We received your transaction successfully.</Text>
          </Section>

          <Section style={{ borderRadius: 16, backgroundColor: '#f3f4f6', padding: 24, marginBottom: 24 }}>
            <Text style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Receipt details</Text>
            <Text style={{ color: '#374151', marginBottom: 4 }}>Amount: ${(payment.amountCents / 100).toFixed(2)} {payment.currency.toUpperCase()}</Text>
            <Text style={{ color: '#374151', marginBottom: 4 }}>Description: {payment.description}</Text>
            <Text style={{ color: '#374151' }}>Date: {payment.date}</Text>
          </Section>

          <Section style={{ textAlign: 'center' }}>
            <Button style={{ backgroundColor: tenant.brandColor ?? '#2563eb', borderRadius: 10, color: '#fff', fontWeight: 600, padding: '12px 20px' }} href="https://app.orgflow.app">View payment history</Button>
          </Section>

          <Section style={{ borderTop: '1px solid #e5e7eb', paddingTop: 24 }}>
            <Text style={{ color: '#9ca3af', fontSize: 12 }}>If you have questions about this payment, please contact support.</Text>
            <Text style={{ color: '#9ca3af', fontSize: 12, marginTop: 12 }}>Unsubscribe: <Link href={unsubscribeUrl}>{unsubscribeUrl}</Link></Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
