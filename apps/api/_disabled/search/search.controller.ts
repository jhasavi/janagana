import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { SearchQueryDto } from './dto/search-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { RequestTenant, RequestUser } from '../../common/types/request.types';
import { AuditService } from '../audit/audit.service';

@ApiTags('Search')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('search')
export class SearchController {
  constructor(
    private readonly searchService: SearchService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Global tenant search across events, members, clubs, volunteers and announcements' })
  async search(
    @Query() dto: SearchQueryDto,
    @CurrentTenant() tenant: RequestTenant,
    @CurrentUser() user: RequestUser,
  ) {
    const results = await this.searchService.search(tenant.id, dto.q, user.role);
    await this.auditService.log(tenant.id, user.clerkId, 'search.query', `Search for '${dto.q}'`, {
      userRole: user.role,
      query: dto.q,
    });
    return results;
  }
}
