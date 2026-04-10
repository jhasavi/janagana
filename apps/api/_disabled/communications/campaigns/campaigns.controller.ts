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
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { ScheduleCampaignDto } from './dto/schedule-campaign.dto';
import { CreateTemplateDto, UpdateTemplateDto } from './dto/template.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { RequestTenant, RequestUser } from '../../../common/types/request.types';

@ApiTags('Campaigns')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('communications/campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Get()
  @Roles('staff', 'admin', 'owner')
  @ApiOperation({ summary: 'List email campaigns' })
  findAll(@CurrentTenant() tenant: RequestTenant) {
    return this.campaignsService.findAll(tenant.id);
  }

  @Get(':id')
  @Roles('staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Get details for a campaign' })
  @ApiParam({ name: 'id', description: 'Campaign UUID' })
  findOne(@Param('id') id: string, @CurrentTenant() tenant: RequestTenant) {
    return this.campaignsService.findOne(tenant.id, id);
  }

  @Post()
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'Create an email campaign' })
  create(@Body() dto: CreateCampaignDto, @CurrentTenant() tenant: RequestTenant, @CurrentUser() user: RequestUser) {
    return this.campaignsService.create(tenant.id, user.clerkId, dto);
  }

  @Post(':id/send')
  @Roles('admin', 'owner')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Send a campaign immediately' })
  send(@Param('id') id: string, @CurrentTenant() tenant: RequestTenant) {
    return this.campaignsService.sendCampaign(tenant.id, id);
  }

  @Post(':id/schedule')
  @Roles('admin', 'owner')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Schedule a campaign to send later' })
  schedule(@Param('id') id: string, @Body() dto: ScheduleCampaignDto, @CurrentTenant() tenant: RequestTenant) {
    return this.campaignsService.scheduleCampaign(tenant.id, id, new Date(dto.scheduledAt));
  }

  @Post(':id/cancel')
  @Roles('admin', 'owner')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Cancel a scheduled campaign' })
  cancel(@Param('id') id: string, @CurrentTenant() tenant: RequestTenant) {
    return this.campaignsService.cancelScheduledCampaign(tenant.id, id);
  }

  @Post(':id/duplicate')
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'Duplicate an existing campaign' })
  duplicate(@Param('id') id: string, @CurrentTenant() tenant: RequestTenant) {
    return this.campaignsService.duplicateCampaign(tenant.id, id);
  }

  @Get(':id/stats')
  @Roles('staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Campaign statistics' })
  stats(@Param('id') id: string, @CurrentTenant() tenant: RequestTenant) {
    return this.campaignsService.getCampaignStats(tenant.id, id);
  }

  @Get('templates')
  @Roles('staff', 'admin', 'owner')
  @ApiOperation({ summary: 'List email templates' })
  getTemplates(@CurrentTenant() tenant: RequestTenant) {
    return this.campaignsService.getTemplates(tenant.id);
  }

  @Post('templates')
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'Create a template' })
  createTemplate(@Body() dto: CreateTemplateDto, @CurrentTenant() tenant: RequestTenant) {
    return this.campaignsService.createTemplate(tenant.id, dto.name, dto.subject, dto.bodyHtml);
  }

  @Patch('templates/:id')
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'Update an email template' })
  updateTemplate(
    @Param('id') id: string,
    @Body() dto: UpdateTemplateDto,
    @CurrentTenant() tenant: RequestTenant,
  ) {
    return this.campaignsService.updateTemplate(tenant.id, id, dto);
  }

  @Delete('templates/:id')
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'Delete an email template' })
  deleteTemplate(@Param('id') id: string, @CurrentTenant() tenant: RequestTenant) {
    return this.campaignsService.deleteTemplate(tenant.id, id);
  }

  @Post('preview')
  @Roles('staff', 'admin', 'owner')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Preview recipients for a filter' })
  getPreview(@Body() filter: { recipientFilter: Record<string, unknown> }, @CurrentTenant() tenant: RequestTenant) {
    return this.campaignsService.getRecipientPreview(tenant.id, filter.recipientFilter as any);
  }
}
