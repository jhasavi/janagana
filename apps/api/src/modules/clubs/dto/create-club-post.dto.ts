import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

// ─── Create Post ─────────────────────────────────────────────────────────────

export class CreateClubPostDto {
  @ApiPropertyOptional({ example: 'Welcome to Photography Club!' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiProperty({ example: 'This month we will be shooting landscapes...' })
  @IsString()
  @MinLength(1)
  @MaxLength(50000)
  content: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @ApiPropertyOptional({ type: [String], description: 'File/image URLs' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];

  @ApiPropertyOptional({ default: false, description: 'Send club notification to all members' })
  @IsOptional()
  @IsBoolean()
  notifyMembers?: boolean;
}

export class UpdateClubPostDto extends PartialType(CreateClubPostDto) {}

// ─── Create Comment ───────────────────────────────────────────────────────────

export class CreateClubCommentDto {
  @ApiProperty({ example: 'Great post! Looking forward to it.' })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content: string;
}
