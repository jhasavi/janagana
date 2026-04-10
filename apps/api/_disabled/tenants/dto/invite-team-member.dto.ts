import { IsEmail, IsString, IsEnum, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRoleType } from '@prisma/client';

export class InviteTeamMemberDto {
  @ApiProperty() @IsEmail()
  email: string = '';

  @ApiProperty() @IsString() @MaxLength(100)
  fullName: string = '';

  @ApiProperty({ enum: UserRoleType })
  @IsEnum(UserRoleType)
  role: UserRoleType = UserRoleType.STAFF;
}
