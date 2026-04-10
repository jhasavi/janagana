import {
  Controller, Get, Query, UseGuards,
} from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation,
} from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { DateRangeDto } from './dto/date-range.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import type { RequestTenant } from '../../common/types/request.types';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Roles('admin', 'owner')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Main dashboard KPI stats' })
  overview(@CurrentTenant() tenant: RequestTenant) {
    return this.analyticsService.getDashboardStats(tenant.id);
  }

  @Get('activity-feed')
  @ApiOperation({ summary: 'Recent activity feed (last 20 items)' })
  activityFeed(@CurrentTenant() tenant: RequestTenant) {
    return this.analyticsService.getActivityFeed(tenant.id);
  }

  @Get('upcoming-events')
  @ApiOperation({ summary: 'Next 5 upcoming events' })
  upcomingEvents(@CurrentTenant() tenant: RequestTenant) {
    return this.analyticsService.getUpcomingEvents(tenant.id);
  }

  @Get('members')
  @ApiOperation({ summary: 'Member growth and distribution analytics' })
  memberAnalytics(@Query() dto: DateRangeDto, @CurrentTenant() tenant: RequestTenant) {
    return this.analyticsService.getMemberAnalytics(tenant.id, dto);
  }

  @Get('events')
  @ApiOperation({ summary: 'Event and registration analytics' })
  eventAnalytics(@Query() dto: DateRangeDto, @CurrentTenant() tenant: RequestTenant) {
    return this.analyticsService.getEventAnalytics(tenant.id, dto);
  }

  @Get('volunteers')
  @ApiOperation({ summary: 'Volunteer hours and participation analytics' })
  volunteerAnalytics(@Query() dto: DateRangeDto, @CurrentTenant() tenant: RequestTenant) {
    return this.analyticsService.getVolunteerAnalytics(tenant.id, dto);
  }

  @Get('clubs')
  @ApiOperation({ summary: 'Club growth and activity analytics' })
  clubAnalytics(@Query() dto: DateRangeDto, @CurrentTenant() tenant: RequestTenant) {
    return this.analyticsService.getClubAnalytics(tenant.id, dto);
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Revenue and payment analytics' })
  revenueAnalytics(@Query() dto: DateRangeDto, @CurrentTenant() tenant: RequestTenant) {
    return this.analyticsService.getRevenueAnalytics(tenant.id, dto);
  }
}
