import { IsOptional, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePortalSettingsDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enableMemberships?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enableEvents?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enableVolunteers?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enableClubs?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enablePayments?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() requireEmailVerification?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() allowPublicMemberDirectory?: boolean;
}
