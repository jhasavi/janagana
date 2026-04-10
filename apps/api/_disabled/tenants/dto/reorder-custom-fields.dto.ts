import { IsArray, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReorderCustomFieldsDto {
  @ApiProperty({ type: [String], description: 'Ordered field IDs' })
  @IsArray()
  @IsString({ each: true })
  ids: string[] = [];
}
