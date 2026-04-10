import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation,
  ApiParam, ApiResponse,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Permissions } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import type { RequestUser, RequestTenant } from '../../common/types/request.types';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Permissions('users:read')
  @ApiOperation({ summary: 'List users within the current tenant' })
  @ApiResponse({ status: 200, description: 'Paginated list of users.' })
  findAll(
    @Query() pagination: PaginationDto,
    @CurrentTenant() tenant: RequestTenant,
  ) {
    return this.usersService.findAll(tenant.id, pagination);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get the current authenticated user' })
  @ApiResponse({ status: 200, description: 'Current user profile.' })
  getMe(@CurrentUser() user: RequestUser) {
    return this.usersService.findByClerkId(user.clerkId);
  }

  @Get(':id')
  @Permissions('users:read')
  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User detail.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  findOne(@Param('id') id: string, @CurrentTenant() tenant: RequestTenant) {
    return this.usersService.findOne(id, tenant.id);
  }

  @Patch(':id')
  @Permissions('users:write')
  @ApiOperation({ summary: 'Update a user' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'Updated user.' })
  update(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @CurrentTenant() tenant: RequestTenant,
  ) {
    return this.usersService.update(id, body, tenant.id);
  }

  @Delete(':id')
  @Permissions('users:write')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a user from the tenant' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 204, description: 'User removed.' })
  remove(@Param('id') id: string, @CurrentTenant() tenant: RequestTenant) {
    return this.usersService.remove(id, tenant.id);
  }
}
