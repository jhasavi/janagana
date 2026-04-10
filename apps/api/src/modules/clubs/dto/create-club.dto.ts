import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsInt,
  IsArray,
  ValidateNested,
  MaxLength,
  Min,
  Max,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { ClubRoleType } from '@prisma/client';
import { PaginationDto } from '../../../common/dto/pagination.dto';

// ─── App-layer enums ──────────────────────────────────────────────────────────

export enum ClubCategory {
  INTEREST = 'INTEREST',
  PROFESSIONAL = 'PROFESSIONAL',
  SOCIAL = 'SOCIAL',
  SPORTS = 'SPORTS',
  OTHER = 'OTHER',
}

// ─── Nested: Social Links ────────────────────────────────────────────────────

export class SocialLinksDto {
  @ApiPropertyOptional({ example: 'https://example.com' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  website?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  facebook?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  instagram?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  twitter?: string;
}

// ─── Create Club ─────────────────────────────────────────────────────────────

export class CreateClubDto {
  @ApiProperty({ example: 'Photography Club' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'A club for photography enthusiasts.' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({ enum: ClubCategory })
  @IsOptional()
  @IsEnum(ClubCategory)
  category?: ClubCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  coverImageUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoUrl?: string;

  @ApiPropertyOptional({ default: true, description: 'Visible to all members' })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ default: false, description: 'Joining requires approval' })
  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  maxMembers?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ type: () => SocialLinksDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SocialLinksDto)
  socialLinks?: SocialLinksDto;

  @ApiPropertyOptional({ example: 'Every Tuesday at 7pm' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  meetingSchedule?: string;
}

export class UpdateClubDto extends PartialType(CreateClubDto) {}

// ─── Filter Clubs ────────────────────────────────────────────────────────────

export class FilterClubsDto extends PaginationDto {
  @ApiPropertyOptional({ enum: ClubCategory })
  @IsOptional()
  @IsEnum(ClubCategory)
  category?: ClubCategory;

  @ApiPropertyOptional({ description: 'Filter by active/inactive' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Show only clubs where current member is a member' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  myClubs?: boolean;
}

// ─── Filter Members ───────────────────────────────────────────────────────────

export class FilterClubMembersDto extends PaginationDto {
  @ApiPropertyOptional({ enum: ClubRoleType })
  @IsOptional()
  @IsEnum(ClubRoleType)
  role?: ClubRoleType;
}

// ─── Update Member Role ───────────────────────────────────────────────────────

export class UpdateClubMemberRoleDto {
  @ApiProperty({ enum: ClubRoleType })
  @IsEnum(ClubRoleType)
  role: ClubRoleType;
}

// ─── Invite Member ────────────────────────────────────────────────────────────

export class InviteMemberDto {
  @ApiProperty({ example: 'member@example.com' })
  @IsString()
  @MaxLength(255)
  email: string;
}

// ─── Transfer Leadership ──────────────────────────────────────────────────────

export class TransferLeadershipDto {
  @ApiProperty({ description: 'New leader member ID' })
  @IsString()
  newLeaderId: string;
}

// ─── Link Event ───────────────────────────────────────────────────────────────

export class LinkEventDto {
  @ApiProperty({ description: 'Event UUID to link' })
  @IsString()
  eventId: string;
}

// ─── Approve / Reject ─────────────────────────────────────────────────────────

export class RejectMemberDto {
  @ApiPropertyOptional({ example: 'Not eligible at this time.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
