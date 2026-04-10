import { Controller, Get, Post, Patch, Query, Param, Body, UseGuards, HttpCode, HttpStatus, BadRequestException, Req, Res } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { RequestTenant, RequestUser } from '../../../common/types/request.types';
import type { Request, Response } from 'express';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('communications/notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @Roles('staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Get notifications for a tenant member' })
  findForMember(@Query('memberId') memberId: string, @CurrentTenant() tenant: RequestTenant) {
    return this.notificationsService.getForMember(tenant.id, memberId, {});
  }

  @Get('stream')
  @ApiOperation({ summary: 'Stream live notifications for a tenant member' })
  @ApiQuery({ name: 'memberId', required: true, description: 'Member UUID for the notification stream' })
  async stream(
    @Query('memberId') memberId: string,
    @CurrentTenant() tenant: RequestTenant,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    if (!memberId) {
      throw new BadRequestException('memberId is required');
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    let lastTimestamp = new Date(0);
    let interval: NodeJS.Timeout;
    let isClosed = false;

    const cleanup = (): void => {
      if (isClosed) return;
      isClosed = true;
      clearInterval(interval);
      res.end();
    };

    const sendEvents = async () => {
      const notifications = await this.notificationsService.getNewForMember(tenant.id, memberId, lastTimestamp);
      if (notifications.length) {
        notifications.forEach((notification) => {
          res.write(`data: ${JSON.stringify(notification)}\n\n`);
          lastTimestamp = new Date(notification.createdAt);
        });
      } else {
        res.write(': keep-alive\n\n');
      }
    };

    req.on('close', cleanup);
    interval = setInterval(sendEvents, 5000);

    await sendEvents();
  }

  @Post()
  @Roles('staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Create a notification for a member' })
  create(@Body() dto: CreateNotificationDto, @CurrentTenant() tenant: RequestTenant) {
    return this.notificationsService.create(tenant.id, dto.memberId, dto.type, dto.title, dto.body, dto.actionUrl);
  }

  @Post('bulk')
  @Roles('staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Create a bulk notification to multiple members' })
  createBulk(@Body() dto: { memberIds: string[]; type: string; title: string; body: string; actionUrl?: string }, @CurrentTenant() tenant: RequestTenant) {
    return this.notificationsService.createBulk(tenant.id, dto.memberIds, dto.type, dto.title, dto.body, dto.actionUrl);
  }

  @Patch(':id/read')
  @Roles('staff', 'admin', 'owner')
  @ApiParam({ name: 'id', description: 'Notification UUID' })
  @ApiOperation({ summary: 'Mark a notification as read' })
  markRead(@Param('id') id: string, @Query('memberId') memberId: string) {
    return this.notificationsService.markRead(memberId, id);
  }

  @Patch('read-all')
  @Roles('staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Mark all notifications as read for a member' })
  markAllRead(@Body() body: { memberId: string }, @CurrentTenant() tenant: RequestTenant) {
    return this.notificationsService.markAllRead(body.memberId, tenant.id);
  }

  @Get('unread-count')
  @Roles('staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Get unread notification count' })
  getUnreadCount(@Query('memberId') memberId: string, @CurrentTenant() tenant: RequestTenant) {
    return this.notificationsService.getUnreadCount(memberId, tenant.id);
  }
}
