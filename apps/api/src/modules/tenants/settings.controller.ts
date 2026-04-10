import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, UseGuards,
  HttpCode, HttpStatus,
} from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation, ApiQuery,
} from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { UpdateBrandingDto } from './dto/update-branding.dto';
import { UpdatePortalSettingsDto } from './dto/update-portal-settings.dto';
import { UpsertCustomFieldDto } from './dto/upsert-custom-field.dto';
import { InviteTeamMemberDto } from './dto/invite-team-member.dto';
import { UpdateTeamMemberDto } from './dto/update-team-member.dto';
import { ReorderCustomFieldsDto } from './dto/reorder-custom-fields.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Permissions } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import type { RequestTenant } from '../../common/types/request.types';

@ApiTags('Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Permissions('settings:read')
@Controller('settings')
export class SettingsController {
  constructor(private readonly tenantsService: TenantsService) {}

  // ─── Full settings ────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'Get full tenant settings' })
  getSettings(@CurrentTenant() tenant: RequestTenant) {
    return this.tenantsService.getFullSettings(tenant.id);
  }

  // ─── Organisation profile ─────────────────────────────────────────────────

  @Patch('organization')
  @Permissions('settings:write')
  @ApiOperation({ summary: 'Update organisation profile' })
  updateOrganization(
    @Body() dto: UpdateOrganizationDto,
    @CurrentTenant() tenant: RequestTenant,
  ) {
    return this.tenantsService.updateOrganizationProfile(tenant.id, dto);
  }

  @Get('slug-check')
  @ApiOperation({ summary: 'Check slug availability' })
  @ApiQuery({ name: 'slug', required: true })
  checkSlug(
    @Query('slug') slug: string,
    @CurrentTenant() tenant: RequestTenant,
  ) {
    return this.tenantsService.validateSlug(slug, tenant.id);
  }

  // ─── Branding ─────────────────────────────────────────────────────────────

  @Patch('branding')
  @Permissions('settings:write')
  @ApiOperation({ summary: 'Update branding settings' })
  updateBranding(
    @Body() dto: UpdateBrandingDto,
    @CurrentTenant() tenant: RequestTenant,
  ) {
    return this.tenantsService.updateBranding(tenant.id, dto);
  }

  // ─── Portal settings ──────────────────────────────────────────────────────

  @Patch('portal')
  @Permissions('settings:write')
  @ApiOperation({ summary: 'Update member portal settings' })
  updatePortal(
    @Body() dto: UpdatePortalSettingsDto,
    @CurrentTenant() tenant: RequestTenant,
  ) {
    return this.tenantsService.updatePortalSettings(tenant.id, dto);
  }

  // ─── Custom fields ────────────────────────────────────────────────────────

  @Get('custom-fields')
  @Permissions('settings:read')
  @ApiOperation({ summary: 'List custom fields' })
  getCustomFields(@CurrentTenant() tenant: RequestTenant) {
    return this.tenantsService.getCustomFields(tenant.id);
  }

  @Post('custom-fields')
  @Permissions('settings:write')
  @ApiOperation({ summary: 'Create a custom field' })
  createCustomField(
    @Body() dto: UpsertCustomFieldDto,
    @CurrentTenant() tenant: RequestTenant,
  ) {
    return this.tenantsService.createCustomField(tenant.id, dto);
  }

  @Patch('custom-fields/reorder')
  @Permissions('settings:write')
  @ApiOperation({ summary: 'Reorder custom fields' })
  reorderCustomFields(
    @Body() dto: ReorderCustomFieldsDto,
    @CurrentTenant() tenant: RequestTenant,
  ) {
    return this.tenantsService.reorderCustomFields(tenant.id, dto);
  }

  @Patch('custom-fields/:id')
  @Permissions('settings:write')
  @ApiOperation({ summary: 'Update a custom field' })
  updateCustomField(
    @Param('id') id: string,
    @Body() dto: UpsertCustomFieldDto,
    @CurrentTenant() tenant: RequestTenant,
  ) {
    return this.tenantsService.updateCustomField(tenant.id, id, dto);
  }

  @Delete('custom-fields/:id')
  @Permissions('settings:write')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a custom field' })
  deleteCustomField(
    @Param('id') id: string,
    @CurrentTenant() tenant: RequestTenant,
  ) {
    return this.tenantsService.deleteCustomField(tenant.id, id);
  }

  // ─── Team members ─────────────────────────────────────────────────────────

  @Get('team')
  @Permissions('users:read')
  @ApiOperation({ summary: 'List team members' })
  getTeam(@CurrentTenant() tenant: RequestTenant) {
    return this.tenantsService.getTeamMembers(tenant.id);
  }

  @Post('team/invite')
  @Permissions('users:write')
  @ApiOperation({ summary: 'Invite a new team member' })
  invite(
    @Body() dto: InviteTeamMemberDto,
    @CurrentTenant() tenant: RequestTenant,
  ) {
    return this.tenantsService.inviteTeamMember(tenant.id, dto);
  }

  @Patch('team/:userId')
  @Permissions('users:write')
  @ApiOperation({ summary: 'Update a team member role or status' })
  updateMember(
    @Param('userId') userId: string,
    @Body() dto: UpdateTeamMemberDto,
    @CurrentTenant() tenant: RequestTenant,
  ) {
    return this.tenantsService.updateTeamMember(tenant.id, userId, dto);
  }

  @Delete('team/:userId')
  @Permissions('users:write')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a team member' })
  removeMember(
    @Param('userId') userId: string,
    @CurrentTenant() tenant: RequestTenant,
  ) {
    return this.tenantsService.removeTeamMember(tenant.id, userId);
  }

  // ─── Usage & billing ──────────────────────────────────────────────────────

  @Get('usage')
  @ApiOperation({ summary: 'Get usage stats for billing page' })
  getUsage(@CurrentTenant() tenant: RequestTenant) {
    return this.tenantsService.getUsageStats(tenant.id);
  }

  @Get('billing-history')
  @ApiOperation({ summary: 'Get invoice history' })
  getBillingHistory(@CurrentTenant() tenant: RequestTenant) {
    return this.tenantsService.getBillingHistory(tenant.id);
  }
}
