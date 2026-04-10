import {
  IsString,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsUUID,
  IsEnum,
  IsNumber,
  IsPositive,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VolunteerApplicationStatus } from '@prisma/client';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { VolunteerCategory } from './create-opportunity.dto';

// ─── Log Hours ────────────────────────────────────────────────────────────────

export class LogHoursDto {
  @ApiProperty({ description: 'UUID of the member whose hours to log' })
  @IsUUID()
  memberId: string;

  @ApiProperty({ description: 'UUID of the volunteer opportunity' })
  @IsUUID()
  opportunityId: string;

  @ApiPropertyOptional({ description: 'UUID of the specific shift (if applicable)' })
  @IsOptional()
  @IsUUID()
  shiftId?: string;

  @ApiProperty({ description: 'ISO 8601 date the hours were worked', example: '2026-06-15' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: 4.5, description: 'Number of hours worked' })
  @IsNumber()
  @IsPositive()
  hoursWorked: number;

  @ApiPropertyOptional({ example: 'Helped sort donations and pack boxes.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ description: 'UUID of the admin pre-approving this log entry' })
  @IsOptional()
  @IsUUID()
  approvedByUserId?: string;
}

// ─── Reject Hours ─────────────────────────────────────────────────────────────

export class RejectHoursDto {
  @ApiProperty({ example: 'Hours do not match shift schedule on record.' })
  @IsString()
  @MaxLength(500)
  reason: string;
}

// ─── Filter: Opportunities ───────────────────────────────────────────────────

export class FilterOpportunitiesDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Search by title or description' })
  @IsOptional()
  declare search?: string;

  @ApiPropertyOptional({ enum: VolunteerCategory, description: 'Filter by category' })
  @IsOptional()
  @IsEnum(VolunteerCategory)
  category?: VolunteerCategory;

  @ApiPropertyOptional({ description: 'Filter by virtual/in-person' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isVirtual?: boolean;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Opportunities starting on or after this date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Opportunities starting on or before this date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

// ─── Filter: Applications ────────────────────────────────────────────────────

export class FilterApplicationsDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filter by opportunity UUID' })
  @IsOptional()
  @IsUUID()
  opportunityId?: string;

  @ApiPropertyOptional({ description: 'Filter by member UUID' })
  @IsOptional()
  @IsUUID()
  memberId?: string;

  @ApiPropertyOptional({ enum: VolunteerApplicationStatus })
  @IsOptional()
  @IsEnum(VolunteerApplicationStatus)
  status?: VolunteerApplicationStatus;

  @ApiPropertyOptional({ description: 'Applications submitted on or after this date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Applications submitted on or before this date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

// ─── Filter: Hours ────────────────────────────────────────────────────────────

export class FilterHoursDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filter by member UUID' })
  @IsOptional()
  @IsUUID()
  memberId?: string;

  @ApiPropertyOptional({ description: 'Filter by opportunity UUID' })
  @IsOptional()
  @IsUUID()
  opportunityId?: string;

  @ApiPropertyOptional({ description: 'Filter by approval status' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isApproved?: boolean;

  @ApiPropertyOptional({ description: 'Filter hours worked on or after this date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Filter hours worked on or before this date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
