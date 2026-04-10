import {
  IsString,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsUUID,
  IsEnum,
  IsUrl,
  IsInt,
  IsArray,
  ValidateNested,
  MaxLength,
  Min,
  IsNumber,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { EventFormat } from '@prisma/client';

// ─── Nested DTOs ──────────────────────────────────────────────────────────────

export class EventLocationDto {
  @ApiPropertyOptional({ example: 'City Hall' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ example: '123 Main St' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @ApiPropertyOptional({ example: 'Springfield' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ example: 'IL' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional({ example: 'US' })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  country?: string;

  @ApiPropertyOptional({ example: '62701' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  zipCode?: string;
}

export class EventTicketDto {
  @ApiProperty({ example: 'General Admission' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  /** Price in cents (0 = free). */
  @ApiPropertyOptional({ example: 1000, description: 'Price in cents' })
  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number = 0;

  @ApiPropertyOptional({ example: 200 })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional({ description: 'ISO 8601 date when ticket sales open' })
  @IsOptional()
  @IsDateString()
  availableFrom?: string;

  @ApiPropertyOptional({ description: 'ISO 8601 date when ticket sales close' })
  @IsOptional()
  @IsDateString()
  availableTo?: string;

  @ApiPropertyOptional({ example: 2, description: 'Max tickets per member purchase' })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxPerPerson?: number;
}

export class EventSpeakerDto {
  @ApiProperty({ example: 'Dr. Jane Smith' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'CEO' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @ApiPropertyOptional({ example: 'Acme Corp' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  company?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ description: 'Photo URL' })
  @IsOptional()
  @IsString()
  photoUrl?: string;

  @ApiPropertyOptional({ description: 'Presentation topic' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  topic?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  websiteUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  twitterUrl?: string;
}

export class EventSponsorDto {
  @ApiProperty({ example: 'Acme Corp' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'Gold', description: 'Sponsorship tier label' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  tier?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  websiteUrl?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number = 0;
}

export class EventRecurrenceDto {
  @ApiProperty({ enum: ['DAILY', 'WEEKLY', 'MONTHLY'] })
  @IsEnum(['DAILY', 'WEEKLY', 'MONTHLY'])
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';

  @ApiPropertyOptional({ example: 1, description: 'Repeat every N frequency units' })
  @IsOptional()
  @IsInt()
  @Min(1)
  interval?: number = 1;

  @ApiPropertyOptional({ description: 'ISO 8601 date when recurrence ends' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  /** 0=Sunday … 6=Saturday */
  @ApiPropertyOptional({ type: [Number], example: [1, 3], description: 'Days of week (0=Sun)' })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  daysOfWeek?: number[];
}

// ─── Main DTO ─────────────────────────────────────────────────────────────────

export class CreateEventDto {
  @ApiProperty({ example: 'Annual Members Gala' })
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({ example: 'Our flagship yearly event.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'UUID of the event category' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiProperty({ example: '2026-11-01T18:00:00Z', description: 'ISO 8601 start date/time' })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({ example: '2026-11-01T22:00:00Z' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ example: 'America/New_York', description: 'IANA timezone string' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;

  @ApiPropertyOptional({
    enum: EventFormat,
    description: 'IN_PERSON | VIRTUAL | HYBRID',
    default: EventFormat.IN_PERSON,
  })
  @IsOptional()
  @IsEnum(EventFormat)
  format?: EventFormat = EventFormat.IN_PERSON;

  @ApiPropertyOptional({ type: () => EventLocationDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => EventLocationDto)
  location?: EventLocationDto;

  @ApiPropertyOptional({ example: 'https://zoom.us/j/123456' })
  @IsOptional()
  @IsUrl()
  virtualLink?: string;

  @ApiPropertyOptional({ example: 'Zoom' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  virtualPlatform?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  coverImageUrl?: string;

  @ApiPropertyOptional({ example: 500, description: 'Maximum number of attendees' })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean = true;

  @ApiPropertyOptional({ default: false, description: 'Restrict to active members only' })
  @IsOptional()
  @IsBoolean()
  isMembersOnly?: boolean = false;

  @ApiPropertyOptional({ default: false, description: 'Registration requires staff approval' })
  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean = false;

  @ApiPropertyOptional({ description: 'Opens registration at this ISO 8601 datetime' })
  @IsOptional()
  @IsDateString()
  registrationOpensAt?: string;

  @ApiPropertyOptional({ description: 'Closes registration at this ISO 8601 datetime' })
  @IsOptional()
  @IsDateString()
  registrationClosesAt?: string;

  @ApiPropertyOptional({ type: [EventTicketDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EventTicketDto)
  tickets?: EventTicketDto[];

  @ApiPropertyOptional({ type: [EventSpeakerDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EventSpeakerDto)
  speakers?: EventSpeakerDto[];

  @ApiPropertyOptional({ type: [String], example: ['networking', 'annual'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ type: () => EventRecurrenceDto, description: 'Recurrence rule (creates event series)' })
  @IsOptional()
  @ValidateNested()
  @Type(() => EventRecurrenceDto)
  recurrence?: EventRecurrenceDto;
}

// ─── Update & action DTOs ─────────────────────────────────────────────────────

export class UpdateEventDto extends PartialType(CreateEventDto) {}

export class UpdateEventStatusDto {
  @ApiProperty({ enum: ['DRAFT', 'PUBLISHED', 'CANCELED', 'COMPLETED'] })
  @IsEnum(['DRAFT', 'PUBLISHED', 'CANCELED', 'COMPLETED'])
  status: 'DRAFT' | 'PUBLISHED' | 'CANCELED' | 'COMPLETED';
}

export class RegisterMemberDto {
  @ApiProperty({ description: 'UUID of the member to register' })
  @IsUUID()
  memberId: string;

  @ApiPropertyOptional({ description: 'UUID of the ticket type to register for' })
  @IsOptional()
  @IsUUID()
  ticketId?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number = 1;
}

export class CheckInDto {
  @ApiPropertyOptional({ description: 'Member UUID for direct check-in' })
  @IsOptional()
  @IsUUID()
  memberId?: string;

  @ApiPropertyOptional({ description: 'Confirmation code from registration QR' })
  @IsOptional()
  @IsString()
  qrCode?: string;
}

export class BulkCheckInDto {
  @ApiProperty({ type: [String], description: 'Array of member UUIDs to check in' })
  @IsArray()
  @IsUUID('4', { each: true })
  memberIds: string[];
}

export class SendRemindersDto {
  @ApiPropertyOptional({
    example: 24,
    description: 'Send to registrants whose event starts in this many hours',
    default: 24,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  hoursBeforeEvent?: number = 24;

  @ApiPropertyOptional({ example: 'Custom reminder message override' })
  @IsOptional()
  @IsString()
  customMessage?: string;
}

export class CreateEventCategoryDto {
  @ApiProperty({ example: 'Fundraisers' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: '#FF5733' })
  @IsOptional()
  @IsString()
  @MaxLength(7)
  color?: string;
}

export class UpdateEventCategoryDto extends PartialType(CreateEventCategoryDto) {}
