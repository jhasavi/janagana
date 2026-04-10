import { IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class DirectoryFilterDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Search members by name or bio' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by membership tier' })
  @IsOptional()
  @IsUUID()
  membershipTierId?: string;

  @ApiPropertyOptional({ description: 'Filter by club ID' })
  @IsOptional()
  @IsUUID()
  clubId?: string;
}
