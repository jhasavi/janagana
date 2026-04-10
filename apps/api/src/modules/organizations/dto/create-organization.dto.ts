import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateOrganizationDto {
  @ApiProperty({ example: 'Community Builders Club' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: 'community-builders' })
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must be a valid lowercase kebab-case value'
  })
  @Transform(({ value }) => String(value).trim().toLowerCase())
  slug!: string;

  @ApiProperty({ required: false, example: 'A local chapter focused on education' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;
}
