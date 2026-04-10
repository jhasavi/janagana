import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class UsersService {
  constructor(private readonly db: DatabaseService) {}

  async findAll(_tenantId: string, _pagination: PaginationDto) { return []; }
  async findByClerkId(_clerkId: string) { return null; }
  async findOne(_id: string, _tenantId: string) { return null; }
  async update(_id: string, _data: Record<string, unknown>, _tenantId: string) { return null; }
  async remove(_id: string, _tenantId: string) { return; }
}
