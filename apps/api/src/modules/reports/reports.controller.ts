import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  Body,
  Res,
  UseGuards,
  HttpStatus,
  Header,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery, ApiBody, ApiParam } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { ReportQueryDto, ReportFormat, DateRangeDto } from './dto/report-filters.dto';
import { ImportRowsDto } from './dto/report-import.dto';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import type { RequestTenant } from '../../common/types/request.types';
import type { Response } from 'express';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('members/export')
  @Roles('staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Export members report' })
  @ApiResponse({ status: 200, description: 'Report file download.' })
  async exportMembers(
    @Query() query: ReportQueryDto,
    @CurrentTenant() tenant: RequestTenant,
    @Res() res: Response,
  ) {
    const format = query.format ?? ReportFormat.CSV;
    const payload = await this.reportsService.generateMembersReport(tenant.id, query, format);

    return this.reportsService.sendReportResponse(res, 'members-report', format, payload);
  }

  @Get('events/export')
  @Roles('staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Export events report' })
  @ApiResponse({ status: 200, description: 'Report file download.' })
  async exportEvents(
    @Query() query: ReportQueryDto,
    @CurrentTenant() tenant: RequestTenant,
    @Res() res: Response,
  ) {
    const format = query.format ?? ReportFormat.CSV;
    const payload = await this.reportsService.generateEventsReport(tenant.id, query, format);
    return this.reportsService.sendReportResponse(res, 'events-report', format, payload);
  }

  @Get('volunteers/export')
  @Roles('staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Export volunteer report' })
  @ApiResponse({ status: 200, description: 'Report file download.' })
  async exportVolunteers(
    @Query() query: ReportQueryDto,
    @CurrentTenant() tenant: RequestTenant,
    @Res() res: Response,
  ) {
    const format = query.format ?? ReportFormat.CSV;
    const payload = await this.reportsService.generateVolunteerReport(tenant.id, query, format);
    return this.reportsService.sendReportResponse(res, 'volunteer-report', format, payload);
  }

  @Get('financial/export')
  @Roles('staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Export financial report' })
  @ApiResponse({ status: 200, description: 'Report file download.' })
  async exportFinancial(
    @Query() query: DateRangeDto,
    @CurrentTenant() tenant: RequestTenant,
    @Res() res: Response,
  ) {
    const format = ReportFormat.CSV;
    const payload = await this.reportsService.generateFinancialReport(tenant.id, query, format);
    return this.reportsService.sendReportResponse(res, 'financial-report', format, payload);
  }

  @Get('clubs/export')
  @Roles('staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Export club activity report' })
  @ApiResponse({ status: 200, description: 'Report file download.' })
  async exportClubs(
    @Query() query: ReportQueryDto,
    @CurrentTenant() tenant: RequestTenant,
    @Res() res: Response,
  ) {
    const format = query.format ?? ReportFormat.CSV;
    const payload = await this.reportsService.generateClubReport(tenant.id, format);
    return this.reportsService.sendReportResponse(res, 'club-report', format, payload);
  }

  @Get('templates/:type')
  @Roles('staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Download a CSV import template' })
  @ApiParam({ name: 'type', description: 'Template type to download' })
  async downloadTemplate(
    @Param('type') type: string,
    @Res() res: Response,
  ) {
    const payload = this.reportsService.downloadImportTemplate(type);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${type}-import-template.csv"`);
    res.send(payload);
  }

  @Post('import/members')
  @Roles('staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Import members from parsed CSV rows' })
  @ApiBody({ type: ImportRowsDto })
  async importMembers(
    @Body() dto: ImportRowsDto,
    @CurrentTenant() tenant: RequestTenant,
  ) {
    return this.reportsService.importMembers(tenant.id, dto.rows, dto.options);
  }

  @Post('import/events')
  @Roles('staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Import events from parsed CSV rows' })
  @ApiBody({ type: ImportRowsDto })
  async importEvents(
    @Body() dto: ImportRowsDto,
    @CurrentTenant() tenant: RequestTenant,
  ) {
    return this.reportsService.importEvents(tenant.id, dto.rows);
  }

  @Get('certificates/membership/:memberId')
  @Roles('staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Download a membership certificate PDF for a member' })
  @ApiResponse({ status: 200, description: 'PDF file download.' })
  async membershipCertificate(
    @Param('memberId') memberId: string,
    @CurrentTenant() tenant: RequestTenant,
    @Res() res: Response,
  ) {
    const buffer = await this.reportsService.generateMemberCertificate(tenant.id, memberId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="membership-certificate-${memberId}.pdf"`);
    res.send(buffer);
  }

  @Get('certificates/volunteer/:memberId')
  @Roles('staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Download a volunteer certificate PDF for a member' })
  @ApiResponse({ status: 200, description: 'PDF file download.' })
  async volunteerCertificate(
    @Param('memberId') memberId: string,
    @CurrentTenant() tenant: RequestTenant,
    @Res() res: Response,
  ) {
    const buffer = await this.reportsService.generateVolunteerCertificate(tenant.id, memberId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="volunteer-certificate-${memberId}.pdf"`);
    res.send(buffer);
  }
}
