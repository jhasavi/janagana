import { Controller, Post, Body, Get, Headers, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { MemberAuthService } from './member-auth.service';
import { SendMagicLinkDto, VerifyMagicLinkDto, PasswordLoginDto } from './dto/member-auth.dto';

@ApiTags('Member Auth')
@Controller('auth/members')
export class MemberAuthController {
  constructor(private readonly memberAuthService: MemberAuthService) {}

  @Post('magic-link')
  @Public()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Send a magic login link to a member email' })
  @ApiResponse({ status: 202, description: 'Magic link sent.' })
  sendMagicLink(@Body() body: SendMagicLinkDto) {
    return this.memberAuthService.sendMagicLink(body.email, body.tenantSlug);
  }

  @Post('magic-link/verify')
  @Public()
  @ApiOperation({ summary: 'Verify a magic link token and return a member JWT' })
  @ApiResponse({ status: 200, description: 'Member authenticated.' })
  verifyMagicLink(@Body() body: VerifyMagicLinkDto) {
    return this.memberAuthService.verifyMagicLink(body.token);
  }

  @Get('me')
  @Public()
  @ApiOperation({ summary: 'Verify an existing member JWT and return member information' })
  @ApiResponse({ status: 200, description: 'Member information returned.' })
  getCurrentMember(@Headers('authorization') authorization?: string) {
    return this.memberAuthService.getMemberFromToken(authorization ?? '');
  }

  @Post('password-login')
  @Public()
  @ApiOperation({ summary: 'Authenticate a member via password' })
  @ApiResponse({ status: 200, description: 'Member authenticated.' })
  passwordLogin(@Body() body: PasswordLoginDto) {
    return this.memberAuthService.loginWithPassword(body.email, body.password, body.tenantSlug);
  }
}
