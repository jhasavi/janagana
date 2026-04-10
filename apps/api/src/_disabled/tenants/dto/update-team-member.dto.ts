import { IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRoleType } from '@prisma/client';

export class UpdateTeamMemberDto {
  @ApiPropertyOptional({ enum: UserRoleType }) @IsOptional() @IsEnum(UserRoleType)
  role?: UserRoleType;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  isActive?: boolean;
}
