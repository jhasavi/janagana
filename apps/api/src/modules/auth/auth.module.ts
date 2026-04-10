import { Module } from '@nestjs/common';
import { CommunicationsModule } from '../communications/communications.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { MemberAuthController } from './member-auth.controller';
import { MemberAuthService } from './member-auth.service';

@Module({
  imports: [CommunicationsModule],
  controllers: [AuthController, MemberAuthController],
  providers: [AuthService, MemberAuthService],
  exports: [AuthService, MemberAuthService],
})
export class AuthModule {}
