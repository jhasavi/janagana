// Webhook Event Definitions
// These are the events that tenants can subscribe to receive webhooks for

export enum WebhookEventType {
  // Member events
  MEMBER_CREATED = 'member.created',
  MEMBER_UPDATED = 'member.updated',
  MEMBER_DELETED = 'member.deleted',
  MEMBER_STATUS_CHANGED = 'member.status_changed',
  
  // Event events
  EVENT_CREATED = 'event.created',
  EVENT_UPDATED = 'event.updated',
  EVENT_DELETED = 'event.deleted',
  EVENT_PUBLISHED = 'event.published',
  EVENT_REGISTRATION_CREATED = 'event.registration.created',
  EVENT_REGISTRATION_UPDATED = 'event.registration.updated',
  EVENT_REGISTRATION_CANCELLED = 'event.registration.cancelled',
  
  // Payment events
  PAYMENT_RECEIVED = 'payment.received',
  PAYMENT_REFUNDED = 'payment.refunded',
  PAYMENT_FAILED = 'payment.failed',
  PAYMENT_PARTIALLY_REFUNDED = 'payment.partially_refunded',
  
  // Volunteer events
  VOLUNTEER_APPLICATION_APPROVED = 'volunteer.application.approved',
  VOLUNTEER_APPLICATION_REJECTED = 'volunteer.application.rejected',
  VOLUNTEER_APPLICATION_WITHDRAWN = 'volunteer.application.withdrawn',
  VOLUNTEER_APPLICATION_CREATED = 'volunteer.application.created',
  
  // Club events
  CLUB_MEMBER_JOINED = 'club.member.joined',
  CLUB_MEMBER_LEFT = 'club.member.left',
  CLUB_CREATED = 'club.created',
  CLUB_UPDATED = 'club.updated',
  CLUB_DELETED = 'club.deleted',
}

export const WEBHOOK_EVENT_DESCRIPTIONS: Record<WebhookEventType, string> = {
  [WebhookEventType.MEMBER_CREATED]: 'Triggered when a new member is created',
  [WebhookEventType.MEMBER_UPDATED]: 'Triggered when a member is updated',
  [WebhookEventType.MEMBER_DELETED]: 'Triggered when a member is deleted',
  [WebhookEventType.MEMBER_STATUS_CHANGED]: 'Triggered when a member status changes',
  
  [WebhookEventType.EVENT_CREATED]: 'Triggered when a new event is created',
  [WebhookEventType.EVENT_UPDATED]: 'Triggered when an event is updated',
  [WebhookEventType.EVENT_DELETED]: 'Triggered when an event is deleted',
  [WebhookEventType.EVENT_PUBLISHED]: 'Triggered when an event is published',
  [WebhookEventType.EVENT_REGISTRATION_CREATED]: 'Triggered when someone registers for an event',
  [WebhookEventType.EVENT_REGISTRATION_UPDATED]: 'Triggered when an event registration is updated',
  [WebhookEventType.EVENT_REGISTRATION_CANCELLED]: 'Triggered when an event registration is cancelled',
  
  [WebhookEventType.PAYMENT_RECEIVED]: 'Triggered when a payment is successfully received',
  [WebhookEventType.PAYMENT_REFUNDED]: 'Triggered when a payment is refunded',
  [WebhookEventType.PAYMENT_FAILED]: 'Triggered when a payment fails',
  [WebhookEventType.PAYMENT_PARTIALLY_REFUNDED]: 'Triggered when a payment is partially refunded',
  
  [WebhookEventType.VOLUNTEER_APPLICATION_APPROVED]: 'Triggered when a volunteer application is approved',
  [WebhookEventType.VOLUNTEER_APPLICATION_REJECTED]: 'Triggered when a volunteer application is rejected',
  [WebhookEventType.VOLUNTEER_APPLICATION_WITHDRAWN]: 'Triggered when a volunteer application is withdrawn',
  [WebhookEventType.VOLUNTEER_APPLICATION_CREATED]: 'Triggered when a volunteer application is created',
  
  [WebhookEventType.CLUB_MEMBER_JOINED]: 'Triggered when a member joins a club',
  [WebhookEventType.CLUB_MEMBER_LEFT]: 'Triggered when a member leaves a club',
  [WebhookEventType.CLUB_CREATED]: 'Triggered when a new club is created',
  [WebhookEventType.CLUB_UPDATED]: 'Triggered when a club is updated',
  [WebhookEventType.CLUB_DELETED]: 'Triggered when a club is deleted',
};

export const WEBHOOK_EVENT_CATEGORIES = {
  MEMBERS: [
    WebhookEventType.MEMBER_CREATED,
    WebhookEventType.MEMBER_UPDATED,
    WebhookEventType.MEMBER_DELETED,
    WebhookEventType.MEMBER_STATUS_CHANGED,
  ],
  EVENTS: [
    WebhookEventType.EVENT_CREATED,
    WebhookEventType.EVENT_UPDATED,
    WebhookEventType.EVENT_DELETED,
    WebhookEventType.EVENT_PUBLISHED,
    WebhookEventType.EVENT_REGISTRATION_CREATED,
    WebhookEventType.EVENT_REGISTRATION_UPDATED,
    WebhookEventType.EVENT_REGISTRATION_CANCELLED,
  ],
  PAYMENTS: [
    WebhookEventType.PAYMENT_RECEIVED,
    WebhookEventType.PAYMENT_REFUNDED,
    WebhookEventType.PAYMENT_FAILED,
    WebhookEventType.PAYMENT_PARTIALLY_REFUNDED,
  ],
  VOLUNTEERS: [
    WebhookEventType.VOLUNTEER_APPLICATION_CREATED,
    WebhookEventType.VOLUNTEER_APPLICATION_APPROVED,
    WebhookEventType.VOLUNTEER_APPLICATION_REJECTED,
    WebhookEventType.VOLUNTEER_APPLICATION_WITHDRAWN,
  ],
  CLUBS: [
    WebhookEventType.CLUB_CREATED,
    WebhookEventType.CLUB_UPDATED,
    WebhookEventType.CLUB_DELETED,
    WebhookEventType.CLUB_MEMBER_JOINED,
    WebhookEventType.CLUB_MEMBER_LEFT,
  ],
};

export const ALL_WEBHOOK_EVENTS = Object.values(WebhookEventType);

export interface WebhookPayload {
  id: string;
  event: WebhookEventType;
  data: unknown;
  timestamp: string;
  tenantId: string;
}

export interface WebhookSignature {
  signature: string;
  timestamp: string;
}
