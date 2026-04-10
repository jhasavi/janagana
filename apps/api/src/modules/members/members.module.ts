import { Module } from '@nestjs/common';
import { CommunicationsModule } from '../communications/communications.module';
import { PaymentsModule } from '../payments/payments.module';
import { AuthModule } from '../auth/auth.module';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';
import { MembershipTiersController } from './membership-tiers.controller';
import { MembershipTiersService } from './membership-tiers.service';
import { PortalController } from './portal.controller';
import { PublicMembersController } from './public-members.controller';

@Module({
  imports: [CommunicationsModule, PaymentsModule, AuthModule],
  controllers: [MembersController, MembershipTiersController, PortalController, PublicMembersController],
  providers: [MembersService, MembershipTiersService],
  exports: [MembersService, MembershipTiersService],
})
export class MembersModule {}
