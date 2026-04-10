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
import { MembershipTiersService } from './membership-tiers.service';
import {
  CreateMembershipTierDto,
  UpdateMembershipTierDto,
} from './dto/membership-tier.dto';
import { FilterMembersDto } from './dto/filter-members.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import type { RequestTenant } from '../../common/types/request.types';

@ApiTags('Membership Tiers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('membership-tiers')
export class MembershipTiersController {
  constructor(private readonly tiersService: MembershipTiersService) {}

  @Get()
  @Roles('staff', 'admin', 'owner')
  @ApiOperation({ summary: 'List all membership tiers for the tenant' })
  @ApiResponse({ status: 200, description: 'Tier list.' })
  findAll(@CurrentTenant() tenant: RequestTenant) {
    return this.tiersService.findAll(tenant.id);
  }

  @Post()
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'Create a membership tier' })
  @ApiResponse({ status: 201, description: 'Tier created.' })
  create(@Body() dto: CreateMembershipTierDto, @CurrentTenant() tenant: RequestTenant) {
    return this.tiersService.create(tenant.id, dto);
  }

  @Get(':id')
  @Roles('staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Get a membership tier by ID' })
  @ApiParam({ name: 'id', description: 'Tier UUID' })
  @ApiResponse({ status: 200, description: 'Tier detail.' })
  @ApiResponse({ status: 404, description: 'Tier not found.' })
  findOne(@Param('id') id: string, @CurrentTenant() tenant: RequestTenant) {
    return this.tiersService.findOne(tenant.id, id);
  }

  @Patch(':id')
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'Update a membership tier' })
  @ApiParam({ name: 'id', description: 'Tier UUID' })
  @ApiResponse({ status: 200, description: 'Tier updated.' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateMembershipTierDto,
    @CurrentTenant() tenant: RequestTenant,
  ) {
    return this.tiersService.update(tenant.id, id, dto);
  }

  @Delete(':id')
  @Roles('admin', 'owner')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a membership tier' })
  @ApiParam({ name: 'id', description: 'Tier UUID' })
  @ApiResponse({ status: 204, description: 'Tier deleted.' })
  @ApiResponse({ status: 400, description: 'Active subscriptions exist.' })
  delete(@Param('id') id: string, @CurrentTenant() tenant: RequestTenant) {
    return this.tiersService.delete(tenant.id, id);
  }

  @Get(':id/members')
  @Roles('staff', 'admin', 'owner')
  @ApiOperation({ summary: 'List members subscribed to this tier' })
  @ApiParam({ name: 'id', description: 'Tier UUID' })
  @ApiResponse({ status: 200, description: 'Paginated member list.' })
  getMembers(
    @Param('id') id: string,
    @Query() pagination: FilterMembersDto,
    @CurrentTenant() tenant: RequestTenant,
  ) {
    return this.tiersService.getMembers(tenant.id, id, pagination);
  }
}
