import { Module } from '@nestjs/common';
import { CommunicationsController } from './communications.controller';
import { OnboardingSequenceService } from './onboarding-sequence.service';

@Module({
  controllers: [CommunicationsController],
  providers: [OnboardingSequenceService],
  exports: [OnboardingSequenceService],
})
export class CommunicationsModule {}
