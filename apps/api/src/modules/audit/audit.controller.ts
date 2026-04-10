import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { AuditLogFilterDto } from './dto/audit-filter.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import type { RequestTenant } from '../../common/types/request.types';

@ApiTags('Audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Roles('admin', 'owner')
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  @ApiOperation({ summary: 'List audit log entries with optional filtering' })
  getLogs(@Query() filter: AuditLogFilterDto, @CurrentTenant() tenant: RequestTenant) {
    return this.auditService.getLogs(tenant.id, filter);
  }
}
