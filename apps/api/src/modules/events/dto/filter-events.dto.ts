import { IsOptional, IsString, IsEnum, IsUUID, IsBoolean, IsDateString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EventStatus, EventFormat } from '@prisma/client';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class FilterEventsDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Search by title or description' })
  @IsOptional()
  @IsString()
  declare search?: string;

  @ApiPropertyOptional({ description: 'Filter by category UUID' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ enum: EventStatus, description: 'Filter by event status' })
  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;

  @ApiPropertyOptional({ enum: EventFormat, description: 'Filter by event format (IN_PERSON | VIRTUAL | HYBRID)' })
  @IsOptional()
  @IsEnum(EventFormat)
  format?: EventFormat;

  @ApiPropertyOptional({ description: 'Events starting on or after this ISO 8601 date' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Events starting on or before this ISO 8601 date' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Filter by public/private visibility' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ description: 'Only return member-only events' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isMembersOnly?: boolean;

  @ApiPropertyOptional({ description: 'Calendar month (1–12)', minimum: 1, maximum: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @ApiPropertyOptional({ description: 'Calendar year', minimum: 2020, maximum: 2100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2020)
  @Max(2100)
  year?: number;
}
