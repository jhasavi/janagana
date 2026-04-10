import { IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ImportDuplicateStrategy {
  SKIP = 'skip',
  UPDATE = 'update',
}

export class ImportMembersDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'CSV file. Required columns: firstName, lastName, email. Optional: phone, dateOfBirth, status, membershipTierSlug.',
  })
  file: Express.Multer.File;

  @ApiPropertyOptional({
    enum: ImportDuplicateStrategy,
    default: ImportDuplicateStrategy.SKIP,
    description: 'What to do when an email already exists in this tenant.',
  })
  @IsOptional()
  @IsEnum(ImportDuplicateStrategy)
  duplicateStrategy?: ImportDuplicateStrategy = ImportDuplicateStrategy.SKIP;
}

export interface ImportSummary {
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ row: number; email: string; reason: string }>;
}
