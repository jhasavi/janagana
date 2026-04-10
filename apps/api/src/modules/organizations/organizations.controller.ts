import { randomUUID } from 'crypto';
import { Body, Controller, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { CreateOrganizationDto } from './dto/create-organization.dto';

@ApiTags('organizations')
@Controller('organizations')
export class OrganizationsController {
  @Post()
  @ApiCreatedResponse({
    description: 'Organization created'
  })
  create(@Body() dto: CreateOrganizationDto) {
    return {
      id: randomUUID(),
      ...dto,
      createdAt: new Date().toISOString()
    };
  }
}
