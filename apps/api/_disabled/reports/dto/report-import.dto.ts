import { IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ImportOptionsDto } from './report-filters.dto';

export class ImportRowsDto {
  @IsArray()
  rows!: Record<string, unknown>[];

  @IsOptional()
  @ValidateNested()
  @Type(() => ImportOptionsDto)
  options?: ImportOptionsDto;
}
