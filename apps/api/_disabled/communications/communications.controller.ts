import {
  Controller, Get, Post,
  Param, Body, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiResponse,
} from '@nestjs/swagger';
import { CommunicationsService } from './communications.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import type { RequestTenant } from '../../common/types/request.types';

@ApiTags('Communications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('communications')
export class CommunicationsController {
  constructor(private readonly communicationsService: CommunicationsService) {}

  @Get('emails')
  @Roles('staff', 'admin', 'owner')
  @ApiOperation({ summary: 'List sent email campaigns' })
  @ApiResponse({ status: 200, description: 'Paginated email log.' })
  findEmails(@Query() pagination: PaginationDto, @CurrentTenant() tenant: RequestTenant) {
    return this.communicationsService.findEmails(tenant.id, pagination);
  }

  @Post('emails/send')
  @Roles('admin', 'owner')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Send a bulk email to members' })
  @ApiResponse({ status: 202, description: 'Email queued.' })
  sendEmail(@Body() body: Record<string, unknown>, @CurrentTenant() tenant: RequestTenant) {
    return this.communicationsService.sendEmail(body, tenant.id);
  }

  @Get('announcements')
  @ApiOperation({ summary: 'List announcements' })
  @ApiResponse({ status: 200, description: 'Paginated announcement list.' })
  findAnnouncements(@Query() pagination: PaginationDto, @CurrentTenant() tenant: RequestTenant) {
    return this.communicationsService.findAnnouncements(tenant.id, pagination);
  }

  @Post('announcements')
  @Roles('staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Create an announcement' })
  @ApiResponse({ status: 201, description: 'Announcement created.' })
  createAnnouncement(
    @Body() body: Record<string, unknown>,
    @CurrentTenant() tenant: RequestTenant,
  ) {
    return this.communicationsService.createAnnouncement(body, tenant.id);
  }

  @Get('announcements/:id')
  @ApiOperation({ summary: 'Get an announcement by ID' })
  @ApiParam({ name: 'id', description: 'Announcement UUID' })
  findAnnouncement(@Param('id') id: string, @CurrentTenant() tenant: RequestTenant) {
    return this.communicationsService.findAnnouncement(id, tenant.id);
  }
}
