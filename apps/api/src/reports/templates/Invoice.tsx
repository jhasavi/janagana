import * as React from 'react';
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';

interface InvoiceProps {
  invoiceNumber: string;
  issueDate: string;
  dueDate?: string;
  billTo: string;
  lineItems: Array<{ description: string; quantity: number; unitPrice: string; total: string }>;
  subtotal: string;
  tax: string;
  total: string;
}

export function InvoiceDocument({ invoiceNumber, issueDate, dueDate, billTo, lineItems, subtotal, tax, total }: InvoiceProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Invoice</Text>
          <Text style={styles.meta}>Invoice #{invoiceNumber}</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.subtitle}>Bill To</Text>
          <Text>{billTo}</Text>
          <Text style={styles.meta}>Issue Date: {issueDate}</Text>
          {dueDate && <Text style={styles.meta}>Due Date: {dueDate}</Text>}
        </View>
        <View style={styles.tableHeader}>
          <Text style={styles.column}>Description</Text>
          <Text style={styles.columnSmall}>Qty</Text>
          <Text style={styles.columnSmall}>Price</Text>
          <Text style={styles.columnSmall}>Total</Text>
        </View>
        {lineItems.map((item, index) => (
          <View key={index} style={styles.tableRow}>
            <Text style={styles.column}>{item.description}</Text>
            <Text style={styles.columnSmall}>{item.quantity}</Text>
            <Text style={styles.columnSmall}>{item.unitPrice}</Text>
            <Text style={styles.columnSmall}>{item.total}</Text>
          </View>
        ))}
        <View style={styles.totals}>
          <Text>Subtotal: {subtotal}</Text>
          <Text>Tax: {tax}</Text>
          <Text style={styles.total}>Total: {total}</Text>
        </View>
      </Page>
    </Document>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontFamily: 'Helvetica',
    fontSize: 11,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  meta: {
    fontSize: 10,
    marginTop: 4,
    color: '#4b5563',
  },
  section: {
    marginBottom: 18,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    paddingBottom: 6,
    marginBottom: 6,
  },
  tableRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  column: {
    width: '55%',
  },
  columnSmall: {
    width: '15%',
  },
  totals: {
    marginTop: 20,
    alignItems: 'flex-end',
  },
  total: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 4,
  },
});
