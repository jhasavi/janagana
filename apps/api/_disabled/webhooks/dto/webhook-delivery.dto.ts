import { ApiProperty } from '@nestjs/swagger';
import { WebhookEventType } from '../webhook-events';

export class WebhookDeliveryLogResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the delivery log',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'ID of the webhook subscription',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  subscriptionId: string;

  @ApiProperty({
    description: 'Event type that was sent',
    enum: WebhookEventType,
    example: 'member.created',
  })
  eventType: WebhookEventType;

  @ApiProperty({
    description: 'The payload that was sent',
    example: {
      id: '123',
      event: 'member.created',
      data: { memberId: 'abc123', name: 'John Doe' },
      timestamp: '2024-01-15T10:30:00Z',
      tenantId: 'tenant-123',
    },
  })
  payload: Record<string, unknown>;

  @ApiProperty({
    description: 'HTTP status code of the webhook delivery',
    example: 200,
    required: false,
  })
  statusCode?: number;

  @ApiProperty({
    description: 'Response body from the webhook endpoint',
    example: 'OK',
    required: false,
  })
  response?: string;

  @ApiProperty({
    description: 'Status of the delivery attempt',
    enum: ['PENDING', 'SUCCEEDED', 'FAILED', 'RETRYING'],
    example: 'SUCCEEDED',
  })
  status: string;

  @ApiProperty({
    description: 'Attempt number (starts at 1, increments on retry)',
    example: 1,
  })
  attemptNumber: number;

  @ApiProperty({
    description: 'Timestamp when the next retry is scheduled',
    example: '2024-01-15T10:35:00Z',
    required: false,
  })
  nextRetryAt?: string;

  @ApiProperty({
    description: 'Timestamp when the webhook was successfully delivered',
    example: '2024-01-15T10:30:05Z',
    required: false,
  })
  deliveredAt?: string;

  @ApiProperty({
    description: 'Timestamp when the delivery log was created',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Timestamp when the delivery log was last updated',
    example: '2024-01-15T10:30:05Z',
  })
  updatedAt: string;
}

export class ListDeliveryLogsDto {
  @ApiProperty({
    description: 'Subscription ID to filter logs',
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  subscriptionId?: string;

  @ApiProperty({
    description: 'Event type to filter logs',
    enum: WebhookEventType,
    required: false,
  })
  eventType?: WebhookEventType;

  @ApiProperty({
    description: 'Status to filter logs',
    enum: ['PENDING', 'SUCCEEDED', 'FAILED', 'RETRYING'],
    required: false,
  })
  status?: string;

  @ApiProperty({
    description: 'Page number',
    example: 1,
    required: false,
    default: 1,
  })
  page?: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 20,
    required: false,
    default: 20,
  })
  limit?: number;
}
