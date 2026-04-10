import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUrl, IsArray, ValidateNested, IsDateString, IsEmail } from 'class-validator';
import { Type } from 'class-transformer';
import { RecipientFilterDto } from './recipient-filter.dto';

export class CreateCampaignDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  subject: string;

  @ApiProperty()
  @IsString()
  bodyHtml: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bodyText?: string;

  @ApiProperty()
  @IsString()
  fromName: string;

  @ApiProperty()
  @IsEmail()
  fromEmail: string;

  @ApiProperty({ type: RecipientFilterDto })
  @ValidateNested()
  @Type(() => RecipientFilterDto)
  recipientFilter: RecipientFilterDto;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional({ description: 'Optional template ID to associate with this campaign' })
  @IsOptional()
  @IsString()
  templateId?: string;
}
