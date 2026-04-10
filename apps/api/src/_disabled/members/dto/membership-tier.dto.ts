import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsBoolean,
  Min,
  MaxLength,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CustomFieldType } from '@prisma/client';

export class CreateMembershipTierDto {
  @ApiProperty({ example: 'Gold Member' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'gold-member' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  slug?: string;

  @ApiPropertyOptional({ example: 'Premium membership with full benefits' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 1500, description: 'Monthly price in cents' })
  @IsOptional()
  @IsInt()
  @Min(0)
  monthlyPriceCents?: number;

  @ApiPropertyOptional({ example: 15000, description: 'Annual price in cents' })
  @IsOptional()
  @IsInt()
  @Min(0)
  annualPriceCents?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isFree?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdateMembershipTierDto extends CreateMembershipTierDto {}

export class CreateCustomFieldDto {
  @ApiProperty({ example: 'Emergency Contact' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'emergency-contact' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  slug?: string;

  @ApiPropertyOptional({ enum: CustomFieldType, default: CustomFieldType.TEXT })
  @IsOptional()
  @IsEnum(CustomFieldType)
  fieldType?: CustomFieldType;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  placeholder?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  helpText?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class AddNoteDto {
  @ApiProperty({ example: 'Member requested address change.' })
  @IsString()
  body: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;
}

export class SendEmailDto {
  @ApiProperty({ example: 'Welcome to OrgFlow!' })
  @IsString()
  subject: string;

  @ApiProperty({ example: '<p>Hi {{firstName}},...</p>' })
  @IsString()
  body: string;
}

export class RenewMembershipDto {
  @ApiProperty({ description: 'UUID of the membership tier to renew with' })
  @IsString()
  tierId: string;
}
