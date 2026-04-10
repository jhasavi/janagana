import { SetMetadata } from '@nestjs/common';
import { API_KEY_SCOPE_KEY } from './api-key.guard';

export const ApiKeyScope = (scope: 'READ' | 'WRITE' | 'ADMIN') =>
  SetMetadata(API_KEY_SCOPE_KEY, scope);
