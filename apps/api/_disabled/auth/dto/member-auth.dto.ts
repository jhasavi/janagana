import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendMagicLinkDto {
  @ApiProperty({ description: 'Member email address' })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'Tenant slug for the member' })
  @IsString()
  @IsNotEmpty()
  tenantSlug!: string;
}

export class VerifyMagicLinkDto {
  @ApiProperty({ description: 'Token sent in the magic link URL' })
  @IsString()
  @IsNotEmpty()
  token!: string;
}

export class PasswordLoginDto {
  @ApiProperty({ description: 'Member email address' })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'Member password' })
  @IsString()
  @IsNotEmpty()
  password!: string;

  @ApiProperty({ description: 'Tenant slug for the member' })
  @IsString()
  @IsNotEmpty()
  tenantSlug!: string;
}
