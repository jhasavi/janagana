import * as React from 'react';
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';

interface EventTicketProps {
  eventTitle: string;
  attendeeName: string;
  eventDate: string;
  location: string;
  ticketCode: string;
  qrCode: string;
}

export function EventTicketDocument({ eventTitle, attendeeName, eventDate, location, ticketCode, qrCode }: EventTicketProps) {
  return (
    <Document>
      <Page size="A6" style={styles.page}>
        <View style={styles.card}>
          <Text style={styles.title}>{eventTitle}</Text>
          <Text style={styles.subtitle}>{eventDate}</Text>
          <Text style={styles.body}>Attendee: {attendeeName}</Text>
          <Text style={styles.body}>Location: {location}</Text>
          <Text style={styles.body}>Ticket: {ticketCode}</Text>
          <Image style={styles.qrCode} src={qrCode} />
        </View>
      </Page>
    </Document>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: 16,
    backgroundColor: '#f8fafc',
    fontFamily: 'Helvetica',
  },
  card: {
    border: '2px solid #0f172a',
    borderRadius: 14,
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 12,
    color: '#475569',
    marginBottom: 12,
  },
  body: {
    fontSize: 11,
    marginBottom: 6,
  },
  qrCode: {
    width: 110,
    height: 110,
    marginTop: 10,
  },
});
