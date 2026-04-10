import { IsOptional, IsString, IsHexColor } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateBrandingDto {
  @ApiPropertyOptional({ example: '#2563EB' })
  @IsOptional()
  @IsHexColor()
  primaryColor?: string;

  @ApiPropertyOptional({ example: '#7C3AED' })
  @IsOptional()
  @IsHexColor()
  accentColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  faviconUrl?: string;

  /** Custom domain — stored on Tenant.domain */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  domain?: string;
}
