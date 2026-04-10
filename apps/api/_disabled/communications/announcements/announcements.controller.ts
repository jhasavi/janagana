import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { RequestTenant, RequestUser } from '../../../common/types/request.types';

@ApiTags('Announcements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('communications/announcements')
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Get()
  @Roles('staff', 'admin', 'owner')
  @ApiOperation({ summary: 'List announcements' })
  findAll(@CurrentTenant() tenant: RequestTenant) {
    return this.announcementsService.findAll(tenant.id);
  }

  @Get(':id')
  @Roles('staff', 'admin', 'owner')
  @ApiParam({ name: 'id', description: 'Announcement UUID' })
  @ApiOperation({ summary: 'Get a single announcement' })
  findOne(@Param('id') id: string, @CurrentTenant() tenant: RequestTenant) {
    return this.announcementsService.findOne(tenant.id, id);
  }

  @Post()
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'Create an announcement' })
  create(@Body() dto: CreateAnnouncementDto, @CurrentTenant() tenant: RequestTenant, @CurrentUser() user: RequestUser) {
    return this.announcementsService.create(tenant.id, user.clerkId, dto);
  }

  @Patch(':id')
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'Update an announcement' })
  update(@Param('id') id: string, @Body() dto: UpdateAnnouncementDto, @CurrentTenant() tenant: RequestTenant) {
    return this.announcementsService.update(tenant.id, id, dto);
  }

  @Delete(':id')
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'Delete an announcement' })
  delete(@Param('id') id: string, @CurrentTenant() tenant: RequestTenant) {
    return this.announcementsService.delete(tenant.id, id);
  }

  @Post(':id/pin')
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'Pin an announcement' })
  pin(@Param('id') id: string, @CurrentTenant() tenant: RequestTenant) {
    return this.announcementsService.pin(tenant.id, id);
  }

  @Get('member/:memberId')
  @ApiOperation({ summary: 'Get announcements for a member' })
  getForMember(@Param('memberId') memberId: string, @CurrentTenant() tenant: RequestTenant) {
    return this.announcementsService.getForMember(tenant.id, memberId);
  }
}
