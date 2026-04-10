import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { MemberAuthGuard } from '../../common/guards/member-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MembersService } from './members.service';
import type { RequestTenant, RequestUser } from '../../common/types/request.types';
import type { DirectoryFilterDto } from './dto/directory-filter.dto';

@ApiTags('Member Portal')
@ApiBearerAuth()
@UseGuards(MemberAuthGuard, TenantGuard, RolesGuard)
@Controller('portal')
export class PortalController {
  constructor(private readonly membersService: MembersService) {}

  @Get('directory')
  @Roles('member')
  @ApiOperation({ summary: 'Get public member directory for portal users' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'membershipTierId', required: false })
  @ApiQuery({ name: 'clubId', required: false })
  @ApiResponse({ status: 200, description: 'Member directory returned.' })
  findDirectory(
    @Query() query: DirectoryFilterDto,
    @CurrentTenant() tenant: RequestTenant,
    @CurrentUser() user: RequestUser,
  ) {
    return this.membersService.getPublicDirectory(tenant.id, user.clerkId, query);
  }

  @Get('directory/:id')
  @Roles('member')
  @ApiOperation({ summary: 'Get a public member profile' })
  @ApiParam({ name: 'id', description: 'Member UUID' })
  @ApiResponse({ status: 200, description: 'Public profile returned.' })
  getProfile(
    @Param('id') id: string,
    @CurrentTenant() tenant: RequestTenant,
    @CurrentUser() user: RequestUser,
  ) {
    return this.membersService.getPublicMemberProfile(tenant.id, user.clerkId, id);
  }
}
