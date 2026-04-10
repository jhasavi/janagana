import {
  Controller, Post, Get, Body, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation, ApiResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { RequestUser } from '../../common/types/request.types';

@ApiTags('Auth')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sync Clerk user with the local database' })
  @ApiResponse({ status: 200, description: 'User synced.' })
  sync(@CurrentUser() user: RequestUser) {
    return this.authService.syncUser(user);
  }

  @Get('me')
  @ApiOperation({ summary: 'Return current user profile from DB' })
  @ApiResponse({ status: 200, description: 'User profile.' })
  me(@CurrentUser() user: RequestUser) {
    return this.authService.getProfile(user.clerkId);
  }

  @Post('webhooks/clerk')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clerk webhook (user created/updated/deleted)' })
  @ApiResponse({ status: 200, description: 'Webhook handled.' })
  clerkWebhook(@Body() body: Record<string, unknown>) {
    return this.authService.handleClerkWebhook(body);
  }
}
