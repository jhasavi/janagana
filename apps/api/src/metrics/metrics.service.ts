import { Injectable } from '@nestjs/common';
import { CustomLogger } from '../logger/logger.service';

// Prometheus-compatible metrics
interface CounterMetric {
  name: string;
  value: number;
  labels: Record<string, string>;
  timestamp: number;
}

interface HistogramMetric {
  name: string;
  value: number;
  labels: Record<string, string>;
  timestamp: number;
}

interface GaugeMetric {
  name: string;
  value: number;
  labels: Record<string, string>;
  timestamp: number;
}

@Injectable()
export class MetricsService {
  private counters = new Map<string, number>();
  private histograms = new Map<string, number[]>();
  private gauges = new Map<string, number>();
  private logger = new CustomLogger();

  constructor() {
    this.logger.setContext('METRICS');
  }

  // Counter metrics (always increment)
  incrementCounter(name: string, value: number = 1, labels: Record<string, string> = {}) {
    const key = this.getMetricKey(name, labels);
    const currentValue = this.counters.get(key) || 0;
    this.counters.set(key, currentValue + value);

    this.logger.debug(`Counter incremented: ${name}`, {
      metric: name,
      value,
      labels,
      total: currentValue + value,
    });
  }

  // Histogram metrics (record values for distribution)
  recordHistogram(name: string, value: number, labels: Record<string, string> = {}) {
    const key = this.getMetricKey(name, labels);
    const values = this.histograms.get(key) || [];
    values.push(value);
    this.histograms.set(key, values);

    this.logger.debug(`Histogram recorded: ${name}`, {
      metric: name,
      value,
      labels,
      count: values.length,
    });
  }

  // Gauge metrics (set absolute value)
  setGauge(name: string, value: number, labels: Record<string, string> = {}) {
    const key = this.getMetricKey(name, labels);
    this.gauges.set(key, value);

    this.logger.debug(`Gauge set: ${name}`, {
      metric: name,
      value,
      labels,
    });
  }

  // Business-specific metrics
  trackMemberCreated(tenantId: string, tierId: string) {
    this.incrementCounter('new_member_created', 1, { tenantId, tierId });
  }

  trackMemberDeleted(tenantId: string, tierId: string) {
    this.incrementCounter('member_deleted', 1, { tenantId, tierId });
  }

  trackEventRegistration(tenantId: string, ticketType: string) {
    this.incrementCounter('event_registration', 1, { tenantId, ticketType });
  }

  trackEventCancellation(tenantId: string, ticketType: string) {
    this.incrementCounter('event_cancellation', 1, { tenantId, ticketType });
  }

  trackVolunteerHoursLogged(tenantId: string, hours: number) {
    this.recordHistogram('volunteer_hours_logged', hours, { tenantId });
  }

  trackApiResponseTime(endpoint: string, method: string, duration: number) {
    this.recordHistogram('api_response_time', duration, { endpoint, method });
  }

  trackEmailSent(tenantId: string, type: string) {
    this.incrementCounter('email_sent', 1, { tenantId, type });
  }

  trackEmailFailed(tenantId: string, type: string) {
    this.incrementCounter('email_failed', 1, { tenantId, type });
  }

  trackPaymentProcessed(tenantId: string, amount: number, currency: string) {
    this.incrementCounter('payment_processed', 1, { tenantId, currency });
    this.recordHistogram('payment_amount', amount, { tenantId, currency });
  }

  trackPaymentFailed(tenantId: string, reason: string) {
    this.incrementCounter('payment_failed', 1, { tenantId, reason });
  }

  trackStripeWebhookReceived(eventType: string) {
    this.incrementCounter('stripe_webhook_received', 1, { eventType });
  }

  trackClerkWebhookReceived(eventType: string) {
    this.incrementCounter('clerk_webhook_received', 1, { eventType });
  }

  trackClubCreated(tenantId: string, visibility: string) {
    this.incrementCounter('club_created', 1, { tenantId, visibility });
  }

  trackClubMemberJoined(tenantId: string, clubId: string) {
    this.incrementCounter('club_member_joined', 1, { tenantId, clubId });
  }

  trackClubMemberLeft(tenantId: string, clubId: string) {
    this.incrementCounter('club_member_left', 1, { tenantId, clubId });
  }

  trackDatabaseQuery(operation: string, table: string, duration: number) {
    this.recordHistogram('database_query_duration', duration, { operation, table });
  }

  trackCacheHit(key: string) {
    this.incrementCounter('cache_hit', 1, { key });
  }

  trackCacheMiss(key: string) {
    this.incrementCounter('cache_miss', 1, { key });
  }

  trackActiveUsers(tenantId: string, count: number) {
    this.setGauge('active_users', count, { tenantId });
  }

  // Get Prometheus-compatible format
  getMetrics(): string {
    const lines: string[] = [];

    // Counters
    for (const [key, value] of this.counters.entries()) {
      const { name, labels } = this.parseMetricKey(key);
      const labelString = this.formatLabels(labels);
      lines.push(`${name}${labelString} ${value}`);
    }

    // Histograms (p50, p95, p99)
    for (const [key, values] of this.histograms.entries()) {
      const { name, labels } = this.parseMetricKey(key);
      const sortedValues = [...values].sort((a, b) => a - b);
      const labelString = this.formatLabels(labels);

      lines.push(`${name}_count${labelString} ${sortedValues.length}`);
      lines.push(`${name}_sum${labelString} ${sortedValues.reduce((a, b) => a + b, 0)}`);

      if (sortedValues.length > 0) {
        lines.push(`${name}_p50${labelString} ${sortedValues[Math.floor(sortedValues.length * 0.5)]}`);
        lines.push(`${name}_p95${labelString} ${sortedValues[Math.floor(sortedValues.length * 0.95)]}`);
        lines.push(`${name}_p99${labelString} ${sortedValues[Math.floor(sortedValues.length * 0.99)]}`);
      }
    }

    // Gauges
    for (const [key, value] of this.gauges.entries()) {
      const { name, labels } = this.parseMetricKey(key);
      const labelString = this.formatLabels(labels);
      lines.push(`${name}${labelString} ${value}`);
    }

    return lines.join('\n');
  }

  // Reset metrics (useful for testing)
  reset() {
    this.counters.clear();
    this.histograms.clear();
    this.gauges.clear();
    this.logger.info('Metrics reset');
  }

  // Helper to generate unique key for labeled metrics
  private getMetricKey(name: string, labels: Record<string, string>): string {
    const labelString = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    return labelString ? `${name}{${labelString}}` : name;
  }

  // Helper to parse metric key back into name and labels
  private parseMetricKey(key: string): { name: string; labels: Record<string, string> } {
    const match = key.match(/^(.+?)\{(.*)\}$/);
    if (match) {
      const [, name, labelsString] = match;
      const labels: Record<string, string> = {};
      if (labelsString) {
        labelsString.split(',').forEach((pair) => {
          const [k, v] = pair.split('=');
          if (k && v) {
            labels[k] = v.replace(/"/g, '');
          }
        });
      }
      return { name, labels };
    }
    return { name: key, labels: {} };
  }

  // Helper to format labels for Prometheus
  private formatLabels(labels: Record<string, string>): string {
    if (Object.keys(labels).length === 0) return '';
    const labelString = Object.entries(labels)
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    return `{${labelString}}`;
  }
}
