import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DonationsService } from './donations.service';
import { CreateCampaignDto, UpdateCampaignDto } from './dto/create-campaign.dto';
import { CreateDonationDto, ProcessDonationDto } from './dto/create-donation.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';

@ApiTags('donations')
@Controller('donations')
@UseGuards(JwtAuthGuard, TenantGuard)
@ApiBearerAuth()
export class DonationsController {
  constructor(private readonly donationsService: DonationsService) {}

  // === CAMPAIGNS ===

  @Post('campaigns')
  @ApiOperation({ summary: 'Create a new donation campaign' })
  async createCampaign(@Req() req, @Body() dto: CreateCampaignDto) {
    return this.donationsService.createCampaign(req.tenant.id, req.user.id, dto);
  }

  @Get('campaigns')
  @ApiOperation({ summary: 'Get all donation campaigns' })
  async getCampaigns(@Req() req, @Query('status') status?: string, @Query('isPublic') isPublic?: string) {
    return this.donationsService.getCampaigns(req.tenant.id, {
      status,
      isPublic: isPublic === 'true',
    });
  }

  @Get('campaigns/:id')
  @ApiOperation({ summary: 'Get a specific campaign' })
  async getCampaign(@Req() req, @Param('id') id: string) {
    return this.donationsService.getCampaign(req.tenant.id, id);
  }

  @Get('campaigns/:id/stats')
  @ApiOperation({ summary: 'Get campaign statistics' })
  async getCampaignStats(@Req() req, @Param('id') id: string) {
    return this.donationsService.getCampaignStats(req.tenant.id, id);
  }

  @Put('campaigns/:id')
  @ApiOperation({ summary: 'Update a campaign' })
  async updateCampaign(@Req() req, @Param('id') id: string, @Body() dto: UpdateCampaignDto) {
    return this.donationsService.updateCampaign(req.tenant.id, id, dto);
  }

  @Delete('campaigns/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a campaign' })
  async deleteCampaign(@Req() req, @Param('id') id: string) {
    return this.donationsService.deleteCampaign(req.tenant.id, id);
  }

  // === DONATIONS ===

  @Post('checkout')
  @ApiOperation({ summary: 'Create a donation checkout session' })
  async createDonationCheckout(@Req() req, @Body() dto: CreateDonationDto) {
    return this.donationsService.createDonationCheckout(req.tenant.id, dto);
  }

  @Post('process')
  @ApiOperation({ summary: 'Process a donation (called from webhook)' })
  async processDonation(@Req() req, @Body() dto: ProcessDonationDto) {
    return this.donationsService.processDonation(req.tenant.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all donations' })
  async getDonations(
    @Req() req,
    @Query('campaignId') campaignId?: string,
    @Query('status') status?: string,
  ) {
    return this.donationsService.getDonations(req.tenant.id, { campaignId, status });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific donation' })
  async getDonation(@Req() req, @Param('id') id: string) {
    return this.donationsService.getDonation(req.tenant.id, id);
  }

  @Get('export/donors')
  @ApiOperation({ summary: 'Export donors as CSV' })
  async exportDonors(@Req() req, @Query('campaignId') campaignId?: string) {
    const csv = await this.donationsService.exportDonors(req.tenant.id, campaignId);
    return csv;
  }

  @Post(':id/tax-receipt')
  @ApiOperation({ summary: 'Generate tax receipt for a donation' })
  async generateTaxReceipt(@Req() req, @Param('id') id: string) {
    return this.donationsService.generateTaxReceipt(req.tenant.id, id);
  }
}
