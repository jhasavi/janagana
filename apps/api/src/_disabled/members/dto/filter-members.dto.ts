import { IsOptional, IsString, IsEnum, IsUUID, IsBoolean, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { MemberStatus } from '@prisma/client';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class FilterMembersDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Search by name, email or phone' })
  @IsOptional()
  @IsString()
  declare search?: string;

  @ApiPropertyOptional({ enum: MemberStatus, description: 'Filter by member status' })
  @IsOptional()
  @IsEnum(MemberStatus)
  status?: MemberStatus;

  @ApiPropertyOptional({ description: 'Filter by membership tier UUID' })
  @IsOptional()
  @IsUUID()
  membershipTierId?: string;

  @ApiPropertyOptional({ description: 'Return only members whose tier expires within 30 days' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  tierExpiring?: boolean;

  @ApiPropertyOptional({ description: 'Filter members who joined after this date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  joinedAfter?: string;

  @ApiPropertyOptional({ description: 'Filter members who joined before this date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  joinedBefore?: string;

  @ApiPropertyOptional({ description: 'Filter members who have at least one logged volunteer hour' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  hasVolunteered?: boolean;

  @ApiPropertyOptional({ description: 'Filter members belonging to a specific club UUID' })
  @IsOptional()
  @IsUUID()
  clubId?: string;
}
