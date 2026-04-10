import { IsString, IsEmail, IsOptional, IsBoolean, IsEnum, IsObject, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterMemberDto {
  @ApiProperty({ description: 'First name' })
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty({ description: 'Last name' })
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiProperty({ description: 'Email address' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Address line' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'City' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'State / region' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ description: 'Postal code' })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({ description: 'Country code' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ description: 'Short bio or introduction' })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiProperty({ description: 'Selected membership tier UUID' })
  @IsString()
  @IsNotEmpty()
  tierId!: string;

  @ApiPropertyOptional({ description: 'Password to use for member account' })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional({ description: 'Billing interval for paid tiers', enum: ['MONTHLY', 'ANNUAL'] })
  @IsOptional()
  @IsEnum(['MONTHLY', 'ANNUAL'])
  billingInterval?: 'MONTHLY' | 'ANNUAL';

  @ApiPropertyOptional({ description: 'Custom field values keyed by slug' })
  @IsOptional()
  @IsObject()
  customFields?: Record<string, string>;
}
