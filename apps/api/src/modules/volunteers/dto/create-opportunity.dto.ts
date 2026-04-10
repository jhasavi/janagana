import {
  IsString,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsArray,
  ValidateNested,
  MaxLength,
  Min,
  IsNumber,
  IsPositive,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

// ─── Enums (not in Prisma schema — app-layer only) ───────────────────────────

export enum VolunteerCategory {
  FUNDRAISING = 'FUNDRAISING',
  EVENTS = 'EVENTS',
  ADMIN = 'ADMIN',
  OUTREACH = 'OUTREACH',
  EDUCATION = 'EDUCATION',
  OTHER = 'OTHER',
}

export enum VolunteerCommitment {
  ONE_TIME = 'ONE_TIME',
  RECURRING = 'RECURRING',
  ONGOING = 'ONGOING',
}

// ─── Nested: Location ─────────────────────────────────────────────────────────

export class OpportunityLocationDto {
  @ApiPropertyOptional({ example: 'Community Center' })
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

// ─── Nested: Application Question ────────────────────────────────────────────

export class ApplicationQuestionDto {
  @ApiProperty({ example: 'Why do you want to volunteer with us?' })
  @IsString()
  @MaxLength(500)
  question: string;

  @ApiProperty({ enum: ['text', 'textarea', 'select', 'checkbox'], description: 'Input type' })
  @IsIn(['text', 'textarea', 'select', 'checkbox'])
  type: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiPropertyOptional({ type: [String], description: 'Options for select/checkbox types' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  options?: string[];
}

// ─── Nested: Shift (for creation) ────────────────────────────────────────────

export class ShiftDto {
  @ApiProperty({ example: 'Morning Shift' })
  @IsString()
  @MaxLength(200)
  shiftName: string;

  @ApiProperty({ description: 'ISO 8601 date (YYYY-MM-DD)', example: '2026-06-15' })
  @IsDateString()
  date: string;

  @ApiProperty({ description: 'ISO 8601 datetime when shift starts', example: '2026-06-15T09:00:00Z' })
  @IsDateString()
  startTime: string;

  @ApiProperty({ description: 'ISO 8601 datetime when shift ends', example: '2026-06-15T13:00:00Z' })
  @IsDateString()
  endTime: string;

  @ApiPropertyOptional({ example: 5, description: 'Number of volunteers needed for this shift' })
  @IsOptional()
  @IsInt()
  @Min(1)
  volunteersNeeded?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: 'Shift-specific location (overrides main location)' })
  @IsOptional()
  @ValidateNested()
  @Type(() => OpportunityLocationDto)
  location?: OpportunityLocationDto;
}

// ─── Create ───────────────────────────────────────────────────────────────────

export class CreateOpportunityDto {
  @ApiProperty({ example: 'Annual Food Drive' })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiProperty({ example: 'Help sort and distribute food to families in need.' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ enum: VolunteerCategory, description: 'Opportunity category' })
  @IsOptional()
  @IsEnum(VolunteerCategory)
  category?: VolunteerCategory;

  @ApiPropertyOptional({ description: 'ISO 8601 date when opportunity begins', example: '2026-06-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'ISO 8601 date when opportunity ends', example: '2026-06-30' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ type: () => OpportunityLocationDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => OpportunityLocationDto)
  location?: OpportunityLocationDto;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isVirtual?: boolean;

  @ApiPropertyOptional({ example: 20, description: 'Maximum total volunteers needed' })
  @IsOptional()
  @IsInt()
  @Min(1)
  totalVolunteersNeeded?: number;

  @ApiPropertyOptional({ example: 18, description: 'Minimum volunteer age (years)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  minimumAge?: number;

  @ApiPropertyOptional({ type: [String], description: 'Required skills' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  requiredSkills?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Preferred (but not required) skills' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  preferredSkills?: string[];

  @ApiPropertyOptional({ enum: VolunteerCommitment, description: 'Type of time commitment' })
  @IsOptional()
  @IsEnum(VolunteerCommitment)
  commitment?: VolunteerCommitment;

  @ApiPropertyOptional({ example: 4, description: 'Expected hours per shift' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  hoursPerShift?: number;

  @ApiPropertyOptional({ default: false, description: 'Restrict applications to members only' })
  @IsOptional()
  @IsBoolean()
  isMembersOnly?: boolean;

  @ApiPropertyOptional({ description: 'ISO 8601 deadline for submitting applications', example: '2026-05-31' })
  @IsOptional()
  @IsDateString()
  applicationDeadline?: string;

  @ApiPropertyOptional({ type: [ApplicationQuestionDto], description: 'Custom application form questions' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApplicationQuestionDto)
  applicationQuestions?: ApplicationQuestionDto[];

  @ApiPropertyOptional({ type: [ShiftDto], description: 'Initial shifts for this opportunity' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ShiftDto)
  shifts?: ShiftDto[];
}

// ─── Update ───────────────────────────────────────────────────────────────────

export class UpdateOpportunityDto extends PartialType(CreateOpportunityDto) {}

// ─── Add Shift (standalone) ───────────────────────────────────────────────────

export class AddShiftDto {
  @ApiProperty({ example: 'Afternoon Shift' })
  @IsString()
  @MaxLength(200)
  shiftName: string;

  @ApiProperty({ description: 'ISO 8601 datetime when shift starts', example: '2026-06-15T13:00:00Z' })
  @IsDateString()
  startTime: string;

  @ApiProperty({ description: 'ISO 8601 datetime when shift ends', example: '2026-06-15T17:00:00Z' })
  @IsDateString()
  endTime: string;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: 'Location string or JSON' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  location?: string;
}

export class UpdateShiftDto extends PartialType(AddShiftDto) {}
