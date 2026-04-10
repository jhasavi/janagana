import {
  IsOptional, IsString, IsEmail, IsUrl,
  MaxLength, Matches, Length,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateOrganizationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'Slug must be lowercase letters, numbers, or hyphens' })
  @MaxLength(50)
  slug?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60)
  timezone?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @Length(2, 2)
  countryCode?: string;

  @ApiPropertyOptional() @IsOptional() @IsEmail()
  supportEmail?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30)
  supportPhone?: string;

  @ApiPropertyOptional() @IsOptional() @IsUrl()
  websiteUrl?: string;

  @ApiPropertyOptional() @IsOptional() @IsUrl()
  facebookUrl?: string;

  @ApiPropertyOptional() @IsOptional() @IsUrl()
  twitterUrl?: string;

  @ApiPropertyOptional() @IsOptional() @IsUrl()
  linkedinUrl?: string;

  @ApiPropertyOptional() @IsOptional() @IsUrl()
  instagramUrl?: string;
}
