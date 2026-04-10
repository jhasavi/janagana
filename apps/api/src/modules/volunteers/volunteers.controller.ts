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
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { VolunteersService } from './volunteers.service';
import {
  CreateOpportunityDto,
  UpdateOpportunityDto,
  AddShiftDto,
  UpdateShiftDto,
} from './dto/create-opportunity.dto';
import {
  CreateApplicationDto,
  ReviewApplicationDto,
  BulkReviewApplicationsDto,
} from './dto/create-application.dto';
import {
  LogHoursDto,
  RejectHoursDto,
  FilterOpportunitiesDto,
  FilterApplicationsDto,
  FilterHoursDto,
} from './dto/log-hours.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { RequestTenant, RequestUser } from '../../common/types/request.types';

@ApiTags('Volunteers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('volunteers')
export class VolunteersController {
  constructor(private readonly volunteersService: VolunteersService) {}

  // ═══════════════════════════════════════════════════════
  //  OPPORTUNITIES — collection routes (before /:id)
  // ═══════════════════════════════════════════════════════

  @Get('opportunities')
  @Roles('member', 'staff', 'admin', 'owner')
  @ApiOperation({ summary: 'List volunteer opportunities with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated opportunity list.' })
  findAllOpportunities(
    @Query() filterDto: FilterOpportunitiesDto,
    @CurrentTenant() tenant: RequestTenant,
  ) {
    return this.volunteersService.findAllOpportunities(tenant.id, filterDto);
  }

  @Post('opportunities')
  @Roles('staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Create a new volunteer opportunity' })
  @ApiResponse({ status: 201, description: 'Opportunity created.' })
  createOpportunity(
    @Body() dto: CreateOpportunityDto,
    @CurrentTenant() tenant: RequestTenant,
    @CurrentUser() user: RequestUser,
  ) {
    return this.volunteersService.createOpportunity(tenant.id, user.clerkId, dto);
  }

  @Get('opportunities/stats')
  @Roles('staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Get volunteer statistics for the tenant' })
  @ApiResponse({ status: 200, description: 'Volunteer stats.' })
  getStats(@CurrentTenant() tenant: RequestTenant) {
    return this.volunteersService.getStats(tenant.id);
  }

  @Get('opportunities/public')
  @ApiOperation({ summary: 'Get all active (public) volunteer opportunities — no auth required' })
  @ApiResponse({ status: 200, description: 'Active opportunities list.' })
  getPublicOpportunities(@CurrentTenant() tenant: RequestTenant) {
    return this.volunteersService.getPublicOpportunities(tenant.id);
  }

  // ═══════════════════════════════════════════════════════
  //  OPPORTUNITIES — single-resource routes
  // ═══════════════════════════════════════════════════════

  @Get('opportunities/:id')
  @Roles('member', 'staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Get a volunteer opportunity by ID' })
  @ApiParam({ name: 'id', description: 'Opportunity UUID' })
  @ApiResponse({ status: 200, description: 'Opportunity detail.' })
  @ApiResponse({ status: 404, description: 'Not found.' })
  findOpportunity(@Param('id') id: string, @CurrentTenant() tenant: RequestTenant) {
    return this.volunteersService.findOpportunity(tenant.id, id);
  }

  @Patch('opportunities/:id')
  @Roles('staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Update a volunteer opportunity' })
  @ApiParam({ name: 'id', description: 'Opportunity UUID' })
  @ApiResponse({ status: 200, description: 'Updated opportunity.' })
  updateOpportunity(
    @Param('id') id: string,
    @Body() dto: UpdateOpportunityDto,
    @CurrentTenant() tenant: RequestTenant,
  ) {
    return this.volunteersService.updateOpportunity(tenant.id, id, dto);
  }

  @Delete('opportunities/:id')
  @Roles('admin', 'owner')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a volunteer opportunity' })
  @ApiParam({ name: 'id', description: 'Opportunity UUID' })
  @ApiResponse({ status: 204, description: 'Deleted.' })
  deleteOpportunity(@Param('id') id: string, @CurrentTenant() tenant: RequestTenant) {
    return this.volunteersService.deleteOpportunity(tenant.id, id);
  }

  @Patch('opportunities/:id/publish')
  @Roles('staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Publish (activate) a volunteer opportunity' })
  @ApiParam({ name: 'id', description: 'Opportunity UUID' })
  @ApiResponse({ status: 200, description: 'Opportunity published.' })
  publishOpportunity(@Param('id') id: string, @CurrentTenant() tenant: RequestTenant) {
    return this.volunteersService.publishOpportunity(tenant.id, id);
  }

  @Patch('opportunities/:id/close')
  @Roles('staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Close (deactivate) a volunteer opportunity' })
  @ApiParam({ name: 'id', description: 'Opportunity UUID' })
  @ApiResponse({ status: 200, description: 'Opportunity closed.' })
  closeOpportunity(@Param('id') id: string, @CurrentTenant() tenant: RequestTenant) {
    return this.volunteersService.closeOpportunity(tenant.id, id);
  }

  @Post('opportunities/:id/duplicate')
  @Roles('staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Duplicate a volunteer opportunity (creates a draft copy)' })
  @ApiParam({ name: 'id', description: 'Opportunity UUID to duplicate' })
  @ApiResponse({ status: 201, description: 'Duplicated opportunity.' })
  duplicateOpportunity(@Param('id') id: string, @CurrentTenant() tenant: RequestTenant) {
    return this.volunteersService.duplicateOpportunity(tenant.id, id);
  }

  // ─── Applications attached to an opportunity ──────────────────────────────

  @Get('opportunities/:id/applications')
  @Roles('staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Get all applications for a specific opportunity' })
  @ApiParam({ name: 'id', description: 'Opportunity UUID' })
  @ApiResponse({ status: 200, description: 'Applications list.' })
  getOpportunityApplications(@Param('id') id: string, @CurrentTenant() tenant: RequestTenant) {
    return this.volunteersService.getOpportunityApplications(tenant.id, id);
  }

  // ─── Shifts attached to an opportunity ───────────────────────────────────

  @Get('opportunities/:id/shifts')
  @Roles('member', 'staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Get all shifts for a volunteer opportunity' })
  @ApiParam({ name: 'id', description: 'Opportunity UUID' })
  @ApiResponse({ status: 200, description: 'Shifts list.' })
  getShifts(@Param('id') id: string, @CurrentTenant() tenant: RequestTenant) {
    return this.volunteersService.getShifts(tenant.id, id);
  }

  @Post('opportunities/:id/shifts')
  @Roles('staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Add a shift to a volunteer opportunity' })
  @ApiParam({ name: 'id', description: 'Opportunity UUID' })
  @ApiResponse({ status: 201, description: 'Shift added.' })
  addShift(
    @Param('id') id: string,
    @Body() dto: AddShiftDto,
    @CurrentTenant() tenant: RequestTenant,
  ) {
    return this.volunteersService.addShift(tenant.id, id, dto);
  }

  @Patch('opportunities/:id/shifts/:shiftId')
  @Roles('staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Update a specific shift' })
  @ApiParam({ name: 'id', description: 'Opportunity UUID' })
  @ApiParam({ name: 'shiftId', description: 'Shift UUID' })
  @ApiResponse({ status: 200, description: 'Shift updated.' })
  updateShift(
    @Param('shiftId') shiftId: string,
    @Body() dto: UpdateShiftDto,
    @CurrentTenant() tenant: RequestTenant,
  ) {
    return this.volunteersService.updateShift(tenant.id, shiftId, dto);
  }

  @Get('opportunities/:id/shifts/:shiftId/roster')
  @Roles('staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Get the signup roster for a specific shift' })
  @ApiParam({ name: 'id', description: 'Opportunity UUID' })
  @ApiParam({ name: 'shiftId', description: 'Shift UUID' })
  @ApiResponse({ status: 200, description: 'Shift roster.' })
  getShiftRoster(@Param('shiftId') shiftId: string, @CurrentTenant() tenant: RequestTenant) {
    return this.volunteersService.getShiftRoster(tenant.id, shiftId);
  }

  // ═══════════════════════════════════════════════════════
  //  APPLICATIONS
  // ═══════════════════════════════════════════════════════

  @Get('applications')
  @Roles('staff', 'admin', 'owner')
  @ApiOperation({ summary: 'List all volunteer applications with optional filters' })
  @ApiResponse({ status: 200, description: 'Paginated applications list.' })
  getApplications(@Query() filterDto: FilterApplicationsDto, @CurrentTenant() tenant: RequestTenant) {
    return this.volunteersService.getApplications(tenant.id, filterDto);
  }

  @Post('applications')
  @Roles('member', 'staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Submit a volunteer application' })
  @ApiResponse({ status: 201, description: 'Application submitted.' })
  @ApiResponse({ status: 409, description: 'Already applied.' })
  submitApplication(@Body() dto: CreateApplicationDto, @CurrentTenant() tenant: RequestTenant) {
    return this.volunteersService.submitApplication(tenant.id, dto);
  }

  @Post('applications/bulk-review')
  @Roles('staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Bulk approve/reject/waitlist multiple applications' })
  @ApiResponse({ status: 200, description: 'Applications updated.' })
  bulkReviewApplications(
    @Body() dto: BulkReviewApplicationsDto,
    @CurrentTenant() tenant: RequestTenant,
  ) {
    return this.volunteersService.bulkReviewApplications(tenant.id, dto);
  }

  @Patch('applications/:id/review')
  @Roles('staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Approve, reject, or waitlist an application' })
  @ApiParam({ name: 'id', description: 'Application UUID' })
  @ApiResponse({ status: 200, description: 'Application reviewed.' })
  reviewApplication(
    @Param('id') id: string,
    @Body() dto: ReviewApplicationDto,
    @CurrentTenant() tenant: RequestTenant,
  ) {
    return this.volunteersService.reviewApplication(tenant.id, id, dto);
  }

  @Post('applications/:id/withdraw')
  @Roles('member', 'staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Withdraw a volunteer application' })
  @ApiParam({ name: 'id', description: 'Application UUID' })
  @ApiQuery({ name: 'memberId', description: 'UUID of the member withdrawing their application' })
  @ApiResponse({ status: 200, description: 'Application withdrawn.' })
  withdrawApplication(
    @Param('id') id: string,
    @Query('memberId') memberId: string,
    @CurrentTenant() tenant: RequestTenant,
  ) {
    return this.volunteersService.withdrawApplication(tenant.id, id, memberId);
  }

  // ═══════════════════════════════════════════════════════
  //  SHIFTS — direct shift resources
  // ═══════════════════════════════════════════════════════

  @Post('shifts/:id/signup')
  @Roles('member', 'staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Sign up for a volunteer shift' })
  @ApiParam({ name: 'id', description: 'Shift UUID' })
  @ApiQuery({ name: 'memberId', required: true, description: 'UUID of the member signing up' })
  @ApiResponse({ status: 201, description: 'Signed up successfully.' })
  @ApiResponse({ status: 409, description: 'Already signed up.' })
  signUpForShift(
    @Param('id') shiftId: string,
    @Query('memberId') memberId: string,
    @CurrentTenant() tenant: RequestTenant,
  ) {
    return this.volunteersService.signUpForShift(tenant.id, memberId, shiftId);
  }

  @Delete('shifts/:id/signup')
  @Roles('member', 'staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Cancel a shift signup' })
  @ApiParam({ name: 'id', description: 'Shift UUID' })
  @ApiQuery({ name: 'memberId', required: true, description: 'UUID of the member canceling' })
  @ApiResponse({ status: 200, description: 'Signup canceled.' })
  cancelShiftSignup(
    @Param('id') shiftId: string,
    @Query('memberId') memberId: string,
    @CurrentTenant() tenant: RequestTenant,
  ) {
    return this.volunteersService.cancelShiftSignup(tenant.id, memberId, shiftId);
  }

  @Patch('shifts/:id/complete')
  @Roles('staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Mark a shift as completed' })
  @ApiParam({ name: 'id', description: 'Shift UUID' })
  @ApiResponse({ status: 200, description: 'Shift marked complete.' })
  markShiftComplete(@Param('id') shiftId: string, @CurrentTenant() tenant: RequestTenant) {
    return this.volunteersService.markShiftComplete(tenant.id, shiftId);
  }

  // ═══════════════════════════════════════════════════════
  //  HOURS
  // ═══════════════════════════════════════════════════════

  @Post('hours')
  @Roles('staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Log volunteer hours for a member' })
  @ApiResponse({ status: 201, description: 'Hours logged.' })
  logHours(@Body() dto: LogHoursDto, @CurrentTenant() tenant: RequestTenant) {
    return this.volunteersService.logHours(tenant.id, dto);
  }

  @Patch('hours/:id/approve')
  @Roles('staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Approve a volunteer hour log entry' })
  @ApiParam({ name: 'id', description: 'Hour log UUID' })
  @ApiResponse({ status: 200, description: 'Hours approved.' })
  approveHours(
    @Param('id') id: string,
    @CurrentTenant() tenant: RequestTenant,
    @CurrentUser() user: RequestUser,
  ) {
    return this.volunteersService.approveHours(tenant.id, id, user.clerkId);
  }

  @Patch('hours/:id/reject')
  @Roles('staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Reject (delete) a volunteer hour log entry' })
  @ApiParam({ name: 'id', description: 'Hour log UUID' })
  @ApiResponse({ status: 200, description: 'Hours rejected.' })
  rejectHours(
    @Param('id') id: string,
    @Body() dto: RejectHoursDto,
    @CurrentTenant() tenant: RequestTenant,
  ) {
    return this.volunteersService.rejectHours(tenant.id, id, dto);
  }

  @Get('hours/report')
  @Roles('staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Get organization-wide volunteer hours report (paginated + aggregated)' })
  @ApiResponse({ status: 200, description: 'Hours report.' })
  getOrganizationHours(@Query() filterDto: FilterHoursDto, @CurrentTenant() tenant: RequestTenant) {
    return this.volunteersService.getOrganizationHours(tenant.id, filterDto);
  }

  @Get('hours/export')
  @Roles('staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Export volunteer hours report as CSV' })
  @ApiResponse({ status: 200, description: 'CSV file download.' })
  async exportReport(
    @Query() filterDto: FilterHoursDto,
    @CurrentTenant() tenant: RequestTenant,
    @Res() res: Response,
  ) {
    const buffer = await this.volunteersService.exportVolunteerReport(tenant.id, filterDto);
    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="volunteer-hours-${tenant.slug}.csv"`,
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  }

  // ═══════════════════════════════════════════════════════
  //  MEMBERS — volunteer profile endpoints
  // ═══════════════════════════════════════════════════════

  @Get('members/:memberId/profile')
  @Roles('member', 'staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Get a member\'s full volunteer profile (applications, hours, skills)' })
  @ApiParam({ name: 'memberId', description: 'Member UUID' })
  @ApiResponse({ status: 200, description: 'Volunteer profile.' })
  getMemberVolunteerProfile(
    @Param('memberId') memberId: string,
    @CurrentTenant() tenant: RequestTenant,
  ) {
    return this.volunteersService.getMemberVolunteerProfile(tenant.id, memberId);
  }

  @Get('members/:memberId/hours')
  @Roles('member', 'staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Get all hours logged by a member' })
  @ApiParam({ name: 'memberId', description: 'Member UUID' })
  @ApiResponse({ status: 200, description: 'Member hours breakdown.' })
  getMemberHours(@Param('memberId') memberId: string, @CurrentTenant() tenant: RequestTenant) {
    return this.volunteersService.getMemberHours(tenant.id, memberId);
  }

  @Get('members/:memberId/certificate')
  @Roles('member', 'staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Download volunteer service certificate for a member (HTML/printable)' })
  @ApiParam({ name: 'memberId', description: 'Member UUID' })
  @ApiResponse({ status: 200, description: 'HTML certificate file.' })
  async generateCertificate(
    @Param('memberId') memberId: string,
    @CurrentTenant() tenant: RequestTenant,
    @Res() res: Response,
  ) {
    const buffer = await this.volunteersService.generateVolunteerCertificate(tenant.id, memberId);
    res.set({
      'Content-Type': 'text/html',
      'Content-Disposition': `attachment; filename="volunteer-certificate-${memberId}.html"`,
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  }

  // ═══════════════════════════════════════════════════════
  //  ADMIN UTILITIES
  // ═══════════════════════════════════════════════════════

  @Post('reminders/send')
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'Trigger shift reminder emails for all shifts starting within 24 hours' })
  @ApiResponse({ status: 200, description: 'Reminders sent count.' })
  sendShiftReminders(@CurrentTenant() tenant: RequestTenant) {
    return this.volunteersService.sendShiftReminders(tenant.id);
  }
}
