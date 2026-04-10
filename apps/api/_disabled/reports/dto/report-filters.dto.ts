import { IsEnum, IsOptional, IsString, IsISO8601, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export enum ReportFormat {
  CSV = 'csv',
  PDF = 'pdf',
  XLSX = 'xlsx',
}

export class ReportQueryDto {
  @IsOptional()
  @IsEnum(ReportFormat)
  format?: ReportFormat = ReportFormat.CSV;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  tierId?: string;

  @IsOptional()
  @IsString()
  eventId?: string;

  @IsOptional()
  @IsString()
  memberId?: string;

  @IsOptional()
  @IsString()
  opportunityId?: string;

  @IsOptional()
  @IsISO8601()
  fromDate?: string;

  @IsOptional()
  @IsISO8601()
  toDate?: string;
}

export class DateRangeDto {
  @IsOptional()
  @IsISO8601()
  fromDate?: string;

  @IsOptional()
  @IsISO8601()
  toDate?: string;
}

export class TemplateTypeDto {
  @IsEnum(['members', 'events', 'volunteers', 'financial', 'clubs'], { message: 'Template type must be one of members, events, volunteers, financial, clubs' })
  type!: string;
}

export class ReportCertificateDto {
  @IsUUID()
  memberId!: string;
}

export class ImportOptionsDto {
  @IsOptional()
  @IsEnum(['skip', 'overwrite'], { message: 'duplicateStrategy must be skip or overwrite' })
  duplicateStrategy?: 'skip' | 'overwrite' = 'skip';
}
