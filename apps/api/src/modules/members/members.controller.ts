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
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { MemberStatus } from '@prisma/client';
import { MembersService } from './members.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { FilterMembersDto } from './dto/filter-members.dto';
import { ImportDuplicateStrategy } from './dto/import-members.dto';
import {
  CreateCustomFieldDto,
  AddNoteDto,
  SendEmailDto,
  RenewMembershipDto,
} from './dto/membership-tier.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { RequestTenant, RequestUser } from '../../common/types/request.types';

@ApiTags('Members')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  // ─── Collection routes (must come before /:id) ───────────────────────────────

  @Get()
  @Roles('staff', 'admin', 'owner')
  @ApiOperation({ summary: 'List members with filtering, search and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated member list.' })
  findAll(@Query() filter: FilterMembersDto, @CurrentTenant() tenant: RequestTenant) {
    return this.membersService.findAll(tenant.id, filter);
  }

  @Post()
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'Create a new member' })
  @ApiResponse({ status: 201, description: 'Member created.' })
  create(@Body() dto: CreateMemberDto, @CurrentTenant() tenant: RequestTenant) {
    return this.membersService.create(tenant.id, dto);
  }

  @Get('stats')
  @Roles('staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Get member statistics for the tenant' })
  @ApiResponse({ status: 200, description: 'Member stats.' })
  getStats(@CurrentTenant() tenant: RequestTenant) {
    return this.membersService.getStats(tenant.id);
  }

  @Get('export')
  @Roles('staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Export members as CSV' })
  @ApiResponse({ status: 200, description: 'CSV file download.' })
  async exportToCSV(
    @Query() filter: FilterMembersDto,
    @CurrentTenant() tenant: RequestTenant,
    @Res() res: Response,
  ) {
    const csv = await this.membersService.exportToCSV(tenant.id, filter);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="members.csv"');
    res.send(csv);
  }

  @Post('import')
  @Roles('admin', 'owner')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Import members from a CSV file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        duplicateStrategy: { type: 'string', enum: Object.values(ImportDuplicateStrategy) },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Import summary.' })
  importFromCSV(
    @UploadedFile() file: Express.Multer.File,
    @Query('duplicateStrategy') duplicateStrategy: ImportDuplicateStrategy,
    @CurrentTenant() tenant: RequestTenant,
  ) {
    return this.membersService.importFromCSV(
      tenant.id,
      file.buffer,
      duplicateStrategy,
    );
  }

  @Get('custom-fields')
  @Roles('staff', 'admin', 'owner')
  @ApiOperation({ summary: 'List all custom fields for this tenant' })
  @ApiResponse({ status: 200, description: 'Custom field list.' })
  getCustomFields(@CurrentTenant() tenant: RequestTenant) {
    return this.membersService.getCustomFields(tenant.id);
  }

  @Post('custom-fields')
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'Create a new custom field' })
  @ApiResponse({ status: 201, description: 'Custom field created.' })
  createCustomField(
    @Body() dto: CreateCustomFieldDto,
    @CurrentTenant() tenant: RequestTenant,
  ) {
    return this.membersService.createCustomField(tenant.id, dto);
  }

  // ─── Single-member routes ────────────────────────────────────────────────────

  @Get(':id')
  @Roles('staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Get a member by ID' })
  @ApiParam({ name: 'id', description: 'Member UUID' })
  @ApiResponse({ status: 200, description: 'Member detail.' })
  @ApiResponse({ status: 404, description: 'Member not found.' })
  findOne(@Param('id') id: string, @CurrentTenant() tenant: RequestTenant) {
    return this.membersService.findOne(tenant.id, id);
  }

  @Patch(':id')
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'Update member profile' })
  @ApiParam({ name: 'id', description: 'Member UUID' })
  @ApiResponse({ status: 200, description: 'Updated member.' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateMemberDto,
    @CurrentTenant() tenant: RequestTenant,
  ) {
    return this.membersService.update(tenant.id, id, dto);
  }

  @Delete(':id')
  @Roles('admin', 'owner')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete (soft) a member' })
  @ApiParam({ name: 'id', description: 'Member UUID' })
  @ApiResponse({ status: 204, description: 'Member deleted.' })
  delete(@Param('id') id: string, @CurrentTenant() tenant: RequestTenant) {
    return this.membersService.delete(tenant.id, id);
  }

  @Patch(':id/status')
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'Update member status' })
  @ApiParam({ name: 'id', description: 'Member UUID' })
  @ApiResponse({ status: 200, description: 'Status updated.' })
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: MemberStatus,
    @CurrentTenant() tenant: RequestTenant,
  ) {
    return this.membersService.updateStatus(tenant.id, id, status);
  }

  @Get(':id/activity')
  @Roles('staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Get member activity timeline' })
  @ApiParam({ name: 'id', description: 'Member UUID' })
  @ApiResponse({ status: 200, description: 'Activity data.' })
  getMemberActivity(@Param('id') id: string, @CurrentTenant() tenant: RequestTenant) {
    return this.membersService.getMemberActivity(tenant.id, id);
  }

  @Post(':id/notes')
  @Roles('staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Add a note to a member' })
  @ApiParam({ name: 'id', description: 'Member UUID' })
  @ApiResponse({ status: 201, description: 'Note created.' })
  addNote(
    @Param('id') id: string,
    @Body() dto: AddNoteDto,
    @CurrentTenant() tenant: RequestTenant,
    @CurrentUser() user: RequestUser,
  ) {
    return this.membersService.addNote(tenant.id, id, user.email, dto);
  }

  @Get(':id/notes')
  @Roles('staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Get notes for a member' })
  @ApiParam({ name: 'id', description: 'Member UUID' })
  @ApiResponse({ status: 200, description: 'Notes list.' })
  getNotes(@Param('id') id: string, @CurrentTenant() tenant: RequestTenant) {
    return this.membersService.getNotes(tenant.id, id);
  }

  @Post(':id/documents')
  @Roles('staff', 'admin', 'owner')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a document for a member' })
  @ApiParam({ name: 'id', description: 'Member UUID' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        documentType: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Document uploaded.' })
  uploadDocument(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('documentType') documentType: string,
    @CurrentTenant() tenant: RequestTenant,
  ) {
    return this.membersService.uploadDocument(tenant.id, id, file, documentType);
  }

  @Get(':id/documents')
  @Roles('staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Get documents for a member' })
  @ApiParam({ name: 'id', description: 'Member UUID' })
  @ApiResponse({ status: 200, description: 'Documents list.' })
  getDocuments(@Param('id') id: string, @CurrentTenant() tenant: RequestTenant) {
    return this.membersService.getDocuments(tenant.id, id);
  }

  @Post(':id/send-email')
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'Send an email to a member' })
  @ApiParam({ name: 'id', description: 'Member UUID' })
  @ApiResponse({ status: 201, description: 'Email queued.' })
  sendEmail(
    @Param('id') id: string,
    @Body() dto: SendEmailDto,
    @CurrentTenant() tenant: RequestTenant,
  ) {
    return this.membersService.sendEmail(tenant.id, [id], dto);
  }

  @Post(':id/renew')
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'Renew or assign membership to a member' })
  @ApiParam({ name: 'id', description: 'Member UUID' })
  @ApiResponse({ status: 201, description: 'Membership renewed.' })
  renewMembership(
    @Param('id') id: string,
    @Body() dto: RenewMembershipDto,
    @CurrentTenant() tenant: RequestTenant,
  ) {
    return this.membersService.renewMembership(tenant.id, id, dto);
  }
}
