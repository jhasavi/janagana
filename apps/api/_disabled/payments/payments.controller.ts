import {
  Controller, Get, Post, Patch,
  Param, Body, Query, UseGuards,
} from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiResponse,
} from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CreateCheckoutDto, CreateInvoiceDto, RefundPaymentDto } from './dto/payments.dto';
import type { RequestTenant } from '../../common/types/request.types';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'List all payment transactions' })
  @ApiResponse({ status: 200, description: 'Paginated transactions.' })
  findAll(@Query() pagination: PaginationDto, @CurrentTenant() tenant: RequestTenant) {
    return this.paymentsService.findAll(tenant.id, pagination);
  }

  @Get('stats')
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'Get revenue stats for the tenant' })
  @ApiResponse({ status: 200, description: 'Revenue and payment stats.' })
  getStats(@Query('from') from: string, @Query('to') to: string, @CurrentTenant() tenant: RequestTenant) {
    return this.paymentsService.getStats(tenant.id, from, to);
  }

  @Get('invoices')
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'List invoices for the tenant' })
  @ApiResponse({ status: 200, description: 'Invoice list.' })
  findInvoices(@Query() pagination: PaginationDto, @CurrentTenant() tenant: RequestTenant) {
    return this.paymentsService.findInvoices(tenant.id, pagination);
  }

  @Get(':id')
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'Get a payment transaction by ID' })
  @ApiParam({ name: 'id', description: 'Transaction UUID' })
  findOne(@Param('id') id: string, @CurrentTenant() tenant: RequestTenant) {
    return this.paymentsService.findOne(id, tenant.id);
  }

  @Post('create-checkout')
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'Create a Stripe checkout session' })
  @ApiResponse({ status: 201, description: 'Checkout session URL.' })
  createCheckout(@Body() body: CreateCheckoutDto, @CurrentTenant() tenant: RequestTenant) {
    return this.paymentsService.createCheckout(body, tenant.id);
  }

  @Post('create-invoice')
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'Create a manual invoice for a member' })
  @ApiResponse({ status: 201, description: 'Invoice created.' })
  createInvoice(@Body() body: CreateInvoiceDto, @CurrentTenant() tenant: RequestTenant) {
    return this.paymentsService.createInvoice(body, tenant.id);
  }

  @Post('invoice/:id/send')
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'Send an invoice to the member' })
  @ApiParam({ name: 'id', description: 'Invoice UUID' })
  sendInvoice(@Param('id') id: string, @CurrentTenant() tenant: RequestTenant) {
    return this.paymentsService.sendInvoice(id, tenant.id);
  }

  @Post('invoice/:id/mark-paid')
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'Mark an invoice as paid' })
  @ApiParam({ name: 'id', description: 'Invoice UUID' })
  markInvoicePaid(@Param('id') id: string, @CurrentTenant() tenant: RequestTenant) {
    return this.paymentsService.markInvoicePaid(id, tenant.id);
  }

  @Post('refund/:id')
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'Refund a payment' })
  @ApiParam({ name: 'id', description: 'Transaction UUID' })
  refund(@Param('id') id: string, @Body() body: RefundPaymentDto, @CurrentTenant() tenant: RequestTenant) {
    return this.paymentsService.refund(id, tenant.id, body.amountCents, body.reason);
  }

  @Get('connect/onboard')
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'Get a Stripe Connect onboarding URL for the tenant' })
  getConnectOnboardingUrl(@CurrentTenant() tenant: RequestTenant) {
    return this.paymentsService.getConnectOnboardingUrl(tenant.id);
  }

  @Get('connect/status')
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'Get Stripe Connect status for the tenant' })
  getConnectAccountStatus(@CurrentTenant() tenant: RequestTenant) {
    return this.paymentsService.getConnectAccountStatus(tenant.id);
  }

  @Get('portal-url')
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'Get Stripe customer portal URL for the tenant SaaS subscription' })
  getBillingPortalUrl(@CurrentTenant() tenant: RequestTenant) {
    return this.paymentsService.getBillingPortalUrl(tenant.id);
  }
}
