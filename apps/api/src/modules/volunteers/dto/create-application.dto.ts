import {
  IsString,
  IsOptional,
  IsArray,
  IsUUID,
  ValidateNested,
  MaxLength,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VolunteerApplicationStatus } from '@prisma/client';

// ─── Nested: Emergency Contact ────────────────────────────────────────────────

export class EmergencyContactDto {
  @ApiProperty({ example: 'Jane Smith' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: '+1-555-555-0100' })
  @IsString()
  @MaxLength(30)
  phone: string;
}

// ─── Nested: Application Answer ───────────────────────────────────────────────

export class ApplicationAnswerDto {
  @ApiProperty({ description: 'The question text (from applicationQuestions)' })
  @IsString()
  @MaxLength(500)
  question: string;

  @ApiProperty({ description: 'Applicant answer' })
  @IsString()
  @MaxLength(2000)
  answer: string;
}

// ─── Create Application ───────────────────────────────────────────────────────

export class CreateApplicationDto {
  @ApiProperty({ description: 'UUID of the volunteer opportunity' })
  @IsUUID()
  opportunityId: string;

  @ApiProperty({ description: 'UUID of the member applying' })
  @IsUUID()
  memberId: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'UUIDs of specific shifts the member is applying for',
  })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  shiftIds?: string[];

  @ApiPropertyOptional({
    example: 'I am passionate about community food security and have experience working food banks.',
    description: 'Motivation statement',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  motivation?: string;

  @ApiPropertyOptional({
    example: '3 years volunteering at Feeding America chapter.',
    description: 'Relevant prior experience',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  experience?: string;

  @ApiPropertyOptional({
    example: 'Available weekends and Monday evenings.',
    description: 'Volunteer availability',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  availability?: string;

  @ApiPropertyOptional({
    type: [ApplicationAnswerDto],
    description: 'Answers to opportunity-specific questions',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApplicationAnswerDto)
  answers?: ApplicationAnswerDto[];

  @ApiPropertyOptional({ description: 'Emergency contact information' })
  @IsOptional()
  @ValidateNested()
  @Type(() => EmergencyContactDto)
  emergencyContact?: EmergencyContactDto;
}

// ─── Review Application ───────────────────────────────────────────────────────

export class ReviewApplicationDto {
  @ApiProperty({
    enum: VolunteerApplicationStatus,
    description: 'New status for the application',
  })
  @IsEnum(VolunteerApplicationStatus)
  status: VolunteerApplicationStatus;

  @ApiPropertyOptional({ example: 'Great experience — welcome aboard!' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

// ─── Bulk Review ──────────────────────────────────────────────────────────────

export class BulkReviewApplicationsDto {
  @ApiProperty({ type: [String], description: 'Array of application UUIDs to update' })
  @IsArray()
  @IsUUID(undefined, { each: true })
  applicationIds: string[];

  @ApiProperty({ enum: VolunteerApplicationStatus })
  @IsEnum(VolunteerApplicationStatus)
  status: VolunteerApplicationStatus;
}
