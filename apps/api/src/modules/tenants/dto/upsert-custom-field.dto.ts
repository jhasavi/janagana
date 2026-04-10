import {
  IsString, IsEnum, IsOptional, IsBoolean,
  IsArray, MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CustomFieldType } from '@prisma/client';

export class UpsertCustomFieldDto {
  @ApiProperty() @IsString() @MaxLength(100)
  name: string = '';

  @ApiProperty({ enum: CustomFieldType })
  @IsEnum(CustomFieldType)
  fieldType: CustomFieldType = CustomFieldType.TEXT;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isRequired?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPublic?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200)
  placeholder?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300)
  helpText?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  showInMemberList?: boolean;
}
