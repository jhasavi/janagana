import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import type { RequestUser } from '../../common/types/request.types';

@Injectable()
export class AuthService {
  constructor(private readonly db: DatabaseService) {}

  async syncUser(_user: RequestUser) { return null; }
  async getProfile(_clerkId: string) { return null; }
  async handleClerkWebhook(_body: Record<string, unknown>) { return { ok: true }; }
}
