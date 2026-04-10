import { IsArray, IsBoolean, IsOptional, IsString, IsUrl, MaxLength, ArrayNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WebhookEventType } from '../webhook-events';

export class CreateWebhookSubscriptionDto {
  @ApiProperty({
    description: 'The URL where webhooks will be sent',
    example: 'https://your-domain.com/webhooks/orgflow',
  })
  @IsUrl()
  @IsString()
  url: string;

  @ApiProperty({
    description: 'Array of event types to subscribe to',
    enum: WebhookEventType,
    isArray: true,
    example: ['member.created', 'event.published', 'payment.received'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  events: WebhookEventType[];

  @ApiPropertyOptional({
    description: 'Optional description for this webhook subscription',
    example: 'Integration with CRM system',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @ApiPropertyOptional({
    description: 'Custom secret for HMAC signature verification (auto-generated if not provided)',
    example: 'my_custom_secret_123',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  secret?: string;
}

export class UpdateWebhookSubscriptionDto {
  @ApiPropertyOptional({
    description: 'The URL where webhooks will be sent',
    example: 'https://your-domain.com/webhooks/orgflow',
  })
  @IsOptional()
  @IsUrl()
  @IsString()
  url?: string;

  @ApiPropertyOptional({
    description: 'Array of event types to subscribe to',
    enum: WebhookEventType,
    isArray: true,
    example: ['member.created', 'event.published', 'payment.received'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  events?: WebhookEventType[];

  @ApiPropertyOptional({
    description: 'Optional description for this webhook subscription',
    example: 'Integration with CRM system',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @ApiPropertyOptional({
    description: 'Custom secret for HMAC signature verification',
    example: 'my_custom_secret_123',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  secret?: string;

  @ApiPropertyOptional({
    description: 'Whether the webhook subscription is active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class TestWebhookDto {
  @ApiProperty({
    description: 'Subscription ID to test',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  subscriptionId: string;

  @ApiPropertyOptional({
    description: 'Event type to test (defaults to member.created)',
    enum: WebhookEventType,
    example: 'member.created',
  })
  @IsOptional()
  @IsString()
  eventType?: WebhookEventType;
}

export class WebhookSubscriptionResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the subscription',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'The URL where webhooks will be sent',
    example: 'https://your-domain.com/webhooks/orgflow',
  })
  url: string;

  @ApiProperty({
    description: 'Array of event types this subscription listens to',
    enum: WebhookEventType,
    isArray: true,
    example: ['member.created', 'event.published', 'payment.received'],
  })
  events: WebhookEventType[];

  @ApiProperty({
    description: 'HMAC secret for signature verification (only shown on creation)',
    example: 'whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  })
  secret: string;

  @ApiProperty({
    description: 'Whether the webhook subscription is active',
    example: true,
  })
  isActive: boolean;

  @ApiPropertyOptional({
    description: 'Optional description for this webhook subscription',
    example: 'Integration with CRM system',
  })
  description?: string;

  @ApiProperty({
    description: 'Timestamp when the webhook was last triggered',
    example: '2024-01-15T10:30:00Z',
  })
  lastTriggeredAt?: string;

  @ApiProperty({
    description: 'Timestamp when the subscription was created',
    example: '2024-01-01T00:00:00Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Timestamp when the subscription was last updated',
    example: '2024-01-15T10:30:00Z',
  })
  updatedAt: string;
}
