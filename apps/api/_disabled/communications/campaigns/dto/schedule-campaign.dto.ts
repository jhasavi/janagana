import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsDateString } from 'class-validator';

export class ScheduleCampaignDto {
  @ApiProperty({ type: String, format: 'date-time' })
  @IsDateString()
  scheduledAt: string;
}
