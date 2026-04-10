import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, IsArray } from 'class-validator';

export class RecipientFilterDto {
  @ApiPropertyOptional({ description: 'Filter members by status', example: ['ACTIVE'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  memberStatus?: string[];

  @ApiPropertyOptional({ description: 'Target membership tier IDs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tierIds?: string[];

  @ApiPropertyOptional({ description: 'Target club IDs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  clubIds?: string[];

  @ApiPropertyOptional({ description: 'Only members who have volunteered before', type: Boolean })
  @IsOptional()
  @IsBoolean()
  hasVolunteered?: boolean;

  @ApiPropertyOptional({ description: 'Custom field filters for member attributes', type: [Object] })
  @IsOptional()
  @IsArray()
  customFieldFilters?: Array<Record<string, unknown>>;
}
