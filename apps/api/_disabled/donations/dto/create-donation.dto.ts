import { IsString, IsNumber, IsBoolean, IsOptional, IsEnum, Min, MaxLength, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDonationDto {
  @ApiProperty({ description: 'Campaign ID (optional for general donation)', required: false })
  @IsOptional()
  @IsString()
  campaignId?: string;

  @ApiProperty({ description: 'Donation amount in cents' })
  @IsNumber()
  @Min(100)
  amountCents: number;

  @ApiProperty({ description: 'Currency code', default: 'USD' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({ description: 'Donor name (for non-members)', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  donorName?: string;

  @ApiProperty({ description: 'Donor email (for non-members)', required: false })
  @IsOptional()
  @IsEmail()
  donorEmail?: string;

  @ApiProperty({ description: 'Member ID (if member is donating)', required: false })
  @IsOptional()
  @IsString()
  memberId?: string;

  @ApiProperty({ description: 'Donor message', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  message?: string;

  @ApiProperty({ description: 'Is anonymous donation', default: false })
  @IsBoolean()
  @IsOptional()
  isAnonymous?: boolean;

  @ApiProperty({ description: 'Is recurring donation', default: false })
  @IsBoolean()
  @IsOptional()
  isRecurring?: boolean;

  @ApiProperty({ description: 'Recurring interval', required: false, enum: ['MONTHLY', 'QUARTERLY', 'YEARLY'] })
  @IsOptional()
  @IsString()
  recurringInterval?: string;

  @ApiProperty({ description: 'Dedicated to (in memory/honor of)', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  dedicatedTo?: string;
}

export class ProcessDonationDto {
  @ApiProperty({ description: 'Stripe session ID' })
  @IsString()
  stripeSessionId: string;
}
