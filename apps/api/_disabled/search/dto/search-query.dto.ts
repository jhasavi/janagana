import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class SearchQueryDto {
  @ApiProperty({ description: 'Search query text', example: 'yoga' })
  @IsString()
  @MinLength(1)
  q: string;
}
