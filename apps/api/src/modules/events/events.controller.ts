import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { EventsService } from './events.service';
import { EventCategoriesService } from './event-categories.service';
import {
  CreateEventDto,
  UpdateEventDto,
  RegisterMemberDto,
  CheckInDto,
  BulkCheckInDto,
  SendRemindersDto,
  EventSpeakerDto,
  EventSponsorDto,
  UpdateEventStatusDto,
  CreateEventCategoryDto,
  UpdateEventCategoryDto,
} from './dto/create-event.dto';
import { FilterEventsDto } from './dto/filter-events.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { RequestTenant, RequestUser } from '../../common/types/request.types';
import { EventStatus, RegistrationStatus } from '@prisma/client';

@ApiTags('Events')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('events')
export class EventsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly categoriesService: EventCategoriesService,
  ) {}

  // ─── Collection routes (must come before /:id) ────────────────────────────

  @Get()
  @Roles('staff', 'admin', 'owner')
  @ApiOperation({ summary: 'List events with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated event list.' })
  findAll(@Query() filterDto: FilterEventsDto, @CurrentTenant() tenant: RequestTenant) {
    return this.eventsService.findAll(tenant.id, filterDto);
  }

  @Post()
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'Create a new event' })
  @ApiResponse({ status: 201, description: 'Event created.' })
  create(
    @Body() dto: CreateEventDto,
    @CurrentTenant() tenant: RequestTenant,
    @CurrentUser() user: RequestUser,
  ) {
    return this.eventsService.create(tenant.id, user.clerkId, dto);
  }

  @Get('stats')
  @Roles('staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Get event statistics for the tenant' })
  @ApiResponse({ status: 200, description: 'Event stats.' })
  getStats(@CurrentTenant() tenant: RequestTenant) {
    return this.eventsService.getStats(tenant.id);
  }

  @Get('calendar')
  @Roles('staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Get events grouped by day for a calendar month' })
  @ApiQuery({ name: 'month', type: Number, description: '1–12' })
  @ApiQuery({ name: 'year', type: Number, description: 'e.g. 2026' })
  @ApiResponse({ status: 200, description: 'Calendar view.' })
  getCalendar(
    @Query('month') month: string,
    @Query('year') year: string,
    @CurrentTenant() tenant: RequestTenant,
  ) {
    return this.eventsService.getCalendarView(tenant.id, Number(month), Number(year));
  }

  @Get('categories')
  @Roles('staff', 'admin', 'owner')
  @ApiOperation({ summary: 'List event categories' })
  @ApiResponse({ status: 200, description: 'Paginated category list.' })
  listCategories(@Query() pagination: PaginationDto, @CurrentTenant() tenant: RequestTenant) {
    return this.categoriesService.findAll(tenant.id, pagination);
  }

  @Post('categories')
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'Create an event category' })
  @ApiResponse({ status: 201, description: 'Category created.' })
  createCategory(@Body() dto: CreateEventCategoryDto, @CurrentTenant() tenant: RequestTenant) {
    return this.categoriesService.create(tenant.id, dto);
  }

  @Patch('categories/:catId')
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'Update an event category' })
  @ApiParam({ name: 'catId', description: 'Category UUID' })
  updateCategory(
    @Param('catId') catId: string,
    @Body() dto: UpdateEventCategoryDto,
    @CurrentTenant() tenant: RequestTenant,
  ) {
    return this.categoriesService.update(tenant.id, catId, dto);
  }

  @Delete('categories/:catId')
  @Roles('admin', 'owner')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an event category' })
  @ApiParam({ name: 'catId', description: 'Category UUID' })
  deleteCategory(@Param('catId') catId: string, @CurrentTenant() tenant: RequestTenant) {
    return this.categoriesService.delete(tenant.id, catId);
  }

  // Public route — no guards needed (handled by @Public override at route level would require
  // a Public decorator; instead we expose this under /events/public/:tenantSlug and keep auth
  // guard at class level but override with the bypass route below).
  // NOTE: For true public access without a tenant header, this route is accessible because
  // the TenantGuard allows this path (or deploy this endpoint in a separate public controller).
  @Get('public/:tenantSlug')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List upcoming public events by tenant slug (no auth needed)' })
  @ApiParam({ name: 'tenantSlug', description: 'Tenant slug (subdomain)' })
  @ApiResponse({ status: 200, description: 'Public event list.' })
  getPublicEvents(@Param('tenantSlug') tenantSlug: string) {
    return this.eventsService.getPublicEvents(tenantSlug);
  }

  // ─── Item routes ──────────────────────────────────────────────────────────

  @Get(':id')
  @Roles('staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Get an event by ID' })
  @ApiParam({ name: 'id', description: 'Event UUID' })
  @ApiResponse({ status: 200, description: 'Event detail.' })
  @ApiResponse({ status: 404, description: 'Event not found.' })
  findOne(@Param('id') id: string, @CurrentTenant() tenant: RequestTenant) {
    return this.eventsService.findOne(tenant.id, id);
  }

  @Patch(':id')
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'Update an event' })
  @ApiParam({ name: 'id', description: 'Event UUID' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateEventDto,
    @CurrentTenant() tenant: RequestTenant,
  ) {
    return this.eventsService.update(tenant.id, id, dto);
  }

  @Delete(':id')
  @Roles('admin', 'owner')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an event' })
  @ApiParam({ name: 'id', description: 'Event UUID' })
  remove(@Param('id') id: string, @CurrentTenant() tenant: RequestTenant) {
    return this.eventsService.delete(tenant.id, id);
  }

  @Patch(':id/status')
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'Update event status (publish, cancel, complete)' })
  @ApiParam({ name: 'id', description: 'Event UUID' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateEventStatusDto,
    @CurrentTenant() tenant: RequestTenant,
  ) {
    return this.eventsService.updateStatus(tenant.id, id, dto.status as EventStatus);
  }

  @Post(':id/duplicate')
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'Duplicate an event (creates a draft copy with tickets)' })
  @ApiParam({ name: 'id', description: 'Event UUID' })
  duplicate(@Param('id') id: string, @CurrentTenant() tenant: RequestTenant) {
    return this.eventsService.duplicate(tenant.id, id);
  }

  // ─── Registrations ────────────────────────────────────────────────────────

  @Get(':id/registrations')
  @Roles('staff', 'admin', 'owner')
  @ApiOperation({ summary: 'List registrations for an event' })
  @ApiParam({ name: 'id', description: 'Event UUID' })
  @ApiQuery({ name: 'status', enum: RegistrationStatus, required: false })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  getRegistrations(
    @Param('id') id: string,
    @Query('status') status: RegistrationStatus | undefined,
    @Query('page') page: string | undefined,
    @Query('limit') limit: string | undefined,
    @CurrentTenant() tenant: RequestTenant,
  ) {
    return this.eventsService.getRegistrations(tenant.id, id, {
      status,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post(':id/register')
  @Roles('staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Register a member for this event' })
  @ApiParam({ name: 'id', description: 'Event UUID' })
  @ApiResponse({ status: 201, description: 'Registration created (or added to waitlist).' })
  registerMember(
    @Param('id') id: string,
    @Body() dto: RegisterMemberDto,
    @CurrentTenant() tenant: RequestTenant,
  ) {
    return this.eventsService.registerMember(tenant.id, id, dto);
  }

  @Delete(':id/registrations/:regId')
  @Roles('staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Cancel a registration' })
  @ApiParam({ name: 'id', description: 'Event UUID' })
  @ApiParam({ name: 'regId', description: 'Registration UUID' })
  cancelRegistration(
    @Param('id') _id: string,
    @Param('regId') regId: string,
    @Query('reason') reason: string | undefined,
    @CurrentTenant() tenant: RequestTenant,
  ) {
    return this.eventsService.cancelRegistration(tenant.id, regId, reason);
  }

  // ─── Attendance ───────────────────────────────────────────────────────────

  @Get(':id/attendance')
  @Roles('staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Get attendance report for an event' })
  @ApiParam({ name: 'id', description: 'Event UUID' })
  getAttendance(@Param('id') id: string, @CurrentTenant() tenant: RequestTenant) {
    return this.eventsService.getAttendance(tenant.id, id);
  }

  @Post(':id/check-in')
  @Roles('staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Check in a single attendee by memberId or QR code' })
  @ApiParam({ name: 'id', description: 'Event UUID' })
  checkIn(
    @Param('id') id: string,
    @Body() dto: CheckInDto,
    @CurrentTenant() tenant: RequestTenant,
  ) {
    return this.eventsService.checkIn(tenant.id, id, dto);
  }

  @Post(':id/bulk-check-in')
  @Roles('staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Bulk check-in multiple attendees by memberIds' })
  @ApiParam({ name: 'id', description: 'Event UUID' })
  bulkCheckIn(
    @Param('id') id: string,
    @Body() dto: BulkCheckInDto,
    @CurrentTenant() tenant: RequestTenant,
  ) {
    return this.eventsService.bulkCheckIn(tenant.id, id, dto);
  }

  // ─── Waitlist ─────────────────────────────────────────────────────────────

  @Get(':id/waitlist')
  @Roles('staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Get the event waitlist' })
  @ApiParam({ name: 'id', description: 'Event UUID' })
  getWaitlist(@Param('id') id: string, @CurrentTenant() tenant: RequestTenant) {
    return this.eventsService.getWaitlist(tenant.id, id);
  }

  @Post(':id/process-waitlist')
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'Promote the next waitlisted member to confirmed' })
  @ApiParam({ name: 'id', description: 'Event UUID' })
  processWaitlist(@Param('id') id: string, @CurrentTenant() tenant: RequestTenant) {
    return this.eventsService.processWaitlist(tenant.id, id);
  }

  // ─── Notifications & Export ────────────────────────────────────────────────

  @Post(':id/send-reminders')
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'Send reminder emails to confirmed registrants' })
  @ApiParam({ name: 'id', description: 'Event UUID' })
  sendReminders(
    @Param('id') id: string,
    @Body() dto: SendRemindersDto,
    @CurrentTenant() tenant: RequestTenant,
  ) {
    return this.eventsService.sendReminders(tenant.id, id, dto);
  }

  @Get(':id/export')
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'Export registrations as CSV' })
  @ApiParam({ name: 'id', description: 'Event UUID' })
  async exportRegistrations(
    @Param('id') id: string,
    @CurrentTenant() tenant: RequestTenant,
    @Res() res: Response,
  ) {
    const buffer = await this.eventsService.exportRegistrations(tenant.id, id);
    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="event-${id}-registrations.csv"`,
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  }

  // ─── Speakers & Sponsors ──────────────────────────────────────────────────

  @Post(':id/speakers')
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'Add a speaker to an event' })
  @ApiParam({ name: 'id', description: 'Event UUID' })
  addSpeaker(
    @Param('id') id: string,
    @Body() dto: EventSpeakerDto,
    @CurrentTenant() tenant: RequestTenant,
  ) {
    return this.eventsService.addSpeaker(tenant.id, id, dto);
  }

  @Post(':id/sponsors')
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'Add a sponsor to an event' })
  @ApiParam({ name: 'id', description: 'Event UUID' })
  addSponsor(
    @Param('id') id: string,
    @Body() dto: EventSponsorDto,
    @CurrentTenant() tenant: RequestTenant,
  ) {
    return this.eventsService.addSponsor(tenant.id, id, dto);
  }

  // ─── QR Code ──────────────────────────────────────────────────────────────

  @Get(':id/qr/:registrationId')
  @Roles('staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Get or generate QR code data for a registration' })
  @ApiParam({ name: 'id', description: 'Event UUID' })
  @ApiParam({ name: 'registrationId', description: 'Registration UUID' })
  generateQRCode(
    @Param('id') _id: string,
    @Param('registrationId') registrationId: string,
    @CurrentTenant() tenant: RequestTenant,
  ) {
    return this.eventsService.generateQRCode(tenant.id, registrationId);
  }
}

