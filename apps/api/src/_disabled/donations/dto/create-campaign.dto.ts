import { IsString, IsNumber, IsDate, IsBoolean, IsArray, IsOptional, IsEnum, Min, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCampaignDto {
  @ApiProperty({ description: 'Campaign title' })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiProperty({ description: 'Campaign description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Cover image URL', required: false })
  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @ApiProperty({ description: 'Goal amount in cents' })
  @IsNumber()
  @Min(100)
  goalAmountCents: number;

  @ApiProperty({ description: 'Currency code', default: 'USD' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({ description: 'Campaign start date' })
  @IsDate()
  startDate: Date;

  @ApiProperty({ description: 'Campaign end date', required: false })
  @IsOptional()
  @IsDate()
  endDate?: Date;

  @ApiProperty({ description: 'Is campaign public', default: true })
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @ApiProperty({ description: 'Show progress bar', default: true })
  @IsBoolean()
  @IsOptional()
  showProgressBar?: boolean;

  @ApiProperty({ description: 'Show donor list', default: false })
  @IsBoolean()
  @IsOptional()
  showDonorList?: boolean;

  @ApiProperty({ description: 'Allow recurring donations', default: false })
  @IsBoolean()
  @IsOptional()
  allowRecurring?: boolean;

  @ApiProperty({ description: 'Default donation amounts in cents', default: [1000, 2500, 5000, 10000] })
  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  defaultAmounts?: number[];

  @ApiProperty({ description: 'Thank you message', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  thankYouMessage?: string;
}

export class UpdateCampaignDto {
  @ApiProperty({ description: 'Campaign title', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiProperty({ description: 'Campaign description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Cover image URL', required: false })
  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @ApiProperty({ description: 'Goal amount in cents', required: false })
  @IsOptional()
  @IsNumber()
  @Min(100)
  goalAmountCents?: number;

  @ApiProperty({ description: 'Campaign end date', required: false })
  @IsOptional()
  @IsDate()
  endDate?: Date;

  @ApiProperty({ description: 'Is campaign public', required: false })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiProperty({ description: 'Show progress bar', required: false })
  @IsOptional()
  @IsBoolean()
  showProgressBar?: boolean;

  @ApiProperty({ description: 'Show donor list', required: false })
  @IsOptional()
  @IsBoolean()
  showDonorList?: boolean;

  @ApiProperty({ description: 'Allow recurring donations', required: false })
  @IsOptional()
  @IsBoolean()
  allowRecurring?: boolean;

  @ApiProperty({ description: 'Default donation amounts in cents', required: false })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  defaultAmounts?: number[];

  @ApiProperty({ description: 'Thank you message', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  thankYouMessage?: string;

  @ApiProperty({ description: 'Campaign status', required: false })
  @IsOptional()
  @IsString()
  status?: string;
}
