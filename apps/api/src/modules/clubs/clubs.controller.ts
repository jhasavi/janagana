import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiQuery,
} from '@nestjs/swagger';
import { ClubsService } from './clubs.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { RequestTenant, RequestUser } from '../../common/types/request.types';
import { PaginationDto } from '../../common/dto/pagination.dto';
import {
  CreateClubDto,
  UpdateClubDto,
  FilterClubsDto,
  FilterClubMembersDto,
  UpdateClubMemberRoleDto,
  InviteMemberDto,
  LinkEventDto,
  TransferLeadershipDto,
} from './dto/create-club.dto';
import { CreateClubPostDto, UpdateClubPostDto, CreateClubCommentDto } from './dto/create-club-post.dto';

@ApiTags('Clubs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('clubs')
export class ClubsController {
  constructor(private readonly clubsService: ClubsService) {}

  // ═══════════════════════════════════════════════════════
  //  COLLECTION ROUTES  (no :id)
  // ═══════════════════════════════════════════════════════

  @Get()
  @Roles('member', 'staff', 'admin', 'owner')
  @ApiOperation({ summary: 'List clubs with optional search/filter' })
  @ApiResponse({ status: 200, description: 'Paginated club list.' })
  findAll(
    @Query() filters: FilterClubsDto,
    @CurrentTenant() tenant: RequestTenant,
  ) {
    return this.clubsService.findAll(tenant.id, filters);
  }

  @Post()
  @Roles('member', 'staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Create a club (creator becomes LEADER)' })
  @ApiQuery({ name: 'memberId', required: true, description: 'UUID of the creating member' })
  @ApiResponse({ status: 201, description: 'Club created.' })
  create(
    @Body() dto: CreateClubDto,
    @Query('memberId') memberId: string,
    @CurrentTenant() tenant: RequestTenant,
  ) {
    return this.clubsService.create(tenant.id, memberId, dto);
  }

  @Get('stats')
  @Roles('staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Organisation-level club stats' })
  getStats(@CurrentTenant() tenant: RequestTenant) {
    return this.clubsService.getStats(tenant.id);
  }

  // ═══════════════════════════════════════════════════════
  //  SINGLE CLUB  /:id
  // ═══════════════════════════════════════════════════════

  @Get(':id')
  @Roles('member', 'staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Get a club by ID' })
  @ApiParam({ name: 'id', description: 'Club UUID' })
  findOne(
    @Param('id') id: string,
    @CurrentTenant() tenant: RequestTenant,
  ) {
    return this.clubsService.findOne(tenant.id, id);
  }

  @Patch(':id')
  @Roles('staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Update a club' })
  @ApiParam({ name: 'id', description: 'Club UUID' })
  @ApiQuery({ name: 'memberId', required: true, description: 'UUID of the requesting member' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateClubDto,
    @Query('memberId') memberId: string,
    @CurrentTenant() tenant: RequestTenant,
  ) {
    return this.clubsService.update(tenant.id, id, dto, memberId);
  }

  @Delete(':id')
  @Roles('admin', 'owner')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a club (admin only)' })
  @ApiParam({ name: 'id', description: 'Club UUID' })
  remove(
    @Param('id') id: string,
    @CurrentTenant() tenant: RequestTenant,
  ) {
    return this.clubsService.remove(tenant.id, id);
  }

  @Get(':id/stats')
  @Roles('member', 'staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Stats for a single club' })
  @ApiParam({ name: 'id', description: 'Club UUID' })
  getClubStats(
    @Param('id') id: string,
    @CurrentTenant() tenant: RequestTenant,
  ) {
    return this.clubsService.getClubStats(tenant.id, id);
  }

  // ═══════════════════════════════════════════════════════
  //  MEMBERSHIP  /:id/members
  // ═══════════════════════════════════════════════════════

  @Get(':id/members')
  @Roles('member', 'staff', 'admin', 'owner')
  @ApiOperation({ summary: 'List club members' })
  @ApiParam({ name: 'id', description: 'Club UUID' })
  getMembers(
    @Param('id') id: string,
    @Query() filters: FilterClubMembersDto,
    @CurrentTenant() tenant: RequestTenant,
  ) {
    return this.clubsService.getMembers(tenant.id, id, filters);
  }

  @Post(':id/join')
  @Roles('member', 'staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Join a club' })
  @ApiParam({ name: 'id', description: 'Club UUID' })
  @ApiQuery({ name: 'memberId', required: true, description: 'UUID of the joining member' })
  joinClub(
    @Param('id') id: string,
    @Query('memberId') memberId: string,
    @CurrentTenant() tenant: RequestTenant,
  ) {
    return this.clubsService.joinClub(tenant.id, memberId, id);
  }

  @Delete(':id/leave')
  @Roles('member', 'staff', 'admin', 'owner')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Leave a club' })
  @ApiParam({ name: 'id', description: 'Club UUID' })
  @ApiQuery({ name: 'memberId', required: true, description: 'UUID of the leaving member' })
  leaveClub(
    @Param('id') id: string,
    @Query('memberId') memberId: string,
    @CurrentTenant() tenant: RequestTenant,
  ) {
    return this.clubsService.leaveClub(tenant.id, memberId, id);
  }

  @Post(':id/invite')
  @Roles('member', 'staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Invite a member to the club by email' })
  @ApiParam({ name: 'id', description: 'Club UUID' })
  @ApiQuery({ name: 'memberId', required: true, description: 'UUID of the inviting member' })
  inviteMember(
    @Param('id') id: string,
    @Body() dto: InviteMemberDto,
    @Query('memberId') invitedByMemberId: string,
    @CurrentTenant() tenant: RequestTenant,
  ) {
    return this.clubsService.inviteMember(tenant.id, id, invitedByMemberId, dto);
  }

  @Patch(':id/members/:memberId/role')
  @Roles('member', 'staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Update a member role in the club' })
  @ApiParam({ name: 'id', description: 'Club UUID' })
  @ApiParam({ name: 'memberId', description: 'Member UUID' })
  @ApiQuery({ name: 'requestingMemberId', required: true })
  updateMemberRole(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateClubMemberRoleDto,
    @Query('requestingMemberId') requestingMemberId: string,
    @CurrentTenant() tenant: RequestTenant,
    @CurrentUser() user: RequestUser,
  ) {
    return this.clubsService.updateMemberRole(
      tenant.id, id, memberId, dto, requestingMemberId, user.role,
    );
  }

  @Delete(':id/members/:memberId')
  @Roles('member', 'staff', 'admin', 'owner')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a member from the club' })
  @ApiParam({ name: 'id', description: 'Club UUID' })
  @ApiParam({ name: 'memberId', description: 'Member UUID' })
  @ApiQuery({ name: 'requestingMemberId', required: true })
  removeMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Query('requestingMemberId') requestingMemberId: string,
    @CurrentTenant() tenant: RequestTenant,
    @CurrentUser() user: RequestUser,
  ) {
    return this.clubsService.removeMember(
      tenant.id, id, memberId, requestingMemberId, user.role,
    );
  }

  @Post(':id/transfer-leadership')
  @Roles('member', 'staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Transfer club leadership' })
  @ApiParam({ name: 'id', description: 'Club UUID' })
  @ApiQuery({ name: 'currentLeaderId', required: true })
  transferLeadership(
    @Param('id') id: string,
    @Body() dto: TransferLeadershipDto,
    @Query('currentLeaderId') currentLeaderId: string,
    @CurrentTenant() tenant: RequestTenant,
  ) {
    return this.clubsService.transferLeadership(
      tenant.id, id, currentLeaderId, dto.newLeaderId,
    );
  }

  @Get(':id/my-membership')
  @Roles('member', 'staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Get current user membership in club' })
  @ApiParam({ name: 'id', description: 'Club UUID' })
  @ApiQuery({ name: 'memberId', required: true })
  getMyMembership(
    @Param('id') id: string,
    @Query('memberId') memberId: string,
    @CurrentTenant() tenant: RequestTenant,
  ) {
    return this.clubsService.getMyMembership(tenant.id, id, memberId);
  }

  // ═══════════════════════════════════════════════════════
  //  POSTS  /:id/posts
  // ═══════════════════════════════════════════════════════

  @Get(':id/posts')
  @Roles('member', 'staff', 'admin', 'owner')
  @ApiOperation({ summary: 'List posts in a club' })
  @ApiParam({ name: 'id', description: 'Club UUID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getPosts(
    @Param('id') id: string,
    @Query() pagination: PaginationDto,
    @CurrentTenant() tenant: RequestTenant,
  ) {
    return this.clubsService.getPosts(tenant.id, id, pagination.page, pagination.limit);
  }

  @Post(':id/posts')
  @Roles('member', 'staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Create a post in a club' })
  @ApiParam({ name: 'id', description: 'Club UUID' })
  @ApiQuery({ name: 'memberId', required: true })
  createPost(
    @Param('id') id: string,
    @Body() dto: CreateClubPostDto,
    @Query('memberId') memberId: string,
    @CurrentTenant() tenant: RequestTenant,
  ) {
    return this.clubsService.createPost(tenant.id, id, memberId, dto);
  }

  @Patch(':id/posts/:postId')
  @Roles('member', 'staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Update a club post' })
  @ApiParam({ name: 'id', description: 'Club UUID' })
  @ApiParam({ name: 'postId', description: 'Post UUID' })
  @ApiQuery({ name: 'memberId', required: true })
  updatePost(
    @Param('postId') postId: string,
    @Body() dto: UpdateClubPostDto,
    @Query('memberId') memberId: string,
    @CurrentTenant() tenant: RequestTenant,
  ) {
    return this.clubsService.updatePost(tenant.id, postId, memberId, dto);
  }

  @Delete(':id/posts/:postId')
  @Roles('member', 'staff', 'admin', 'owner')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a club post' })
  @ApiParam({ name: 'id', description: 'Club UUID' })
  @ApiParam({ name: 'postId', description: 'Post UUID' })
  @ApiQuery({ name: 'memberId', required: true })
  deletePost(
    @Param('postId') postId: string,
    @Query('memberId') memberId: string,
    @CurrentTenant() tenant: RequestTenant,
  ) {
    return this.clubsService.deletePost(tenant.id, postId, memberId);
  }

  @Patch(':id/posts/:postId/pin')
  @Roles('member', 'staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Toggle pin/unpin a club post' })
  @ApiParam({ name: 'id', description: 'Club UUID' })
  @ApiParam({ name: 'postId', description: 'Post UUID' })
  @ApiQuery({ name: 'memberId', required: true })
  pinPost(
    @Param('postId') postId: string,
    @Query('memberId') memberId: string,
    @CurrentTenant() tenant: RequestTenant,
  ) {
    return this.clubsService.pinPost(tenant.id, postId, memberId);
  }

  // ═══════════════════════════════════════════════════════
  //  COMMENTS  /:id/posts/:postId/comments
  // ═══════════════════════════════════════════════════════

  @Get(':id/posts/:postId/comments')
  @Roles('member', 'staff', 'admin', 'owner')
  @ApiOperation({ summary: 'List comments on a post' })
  getComments(
    @Param('postId') postId: string,
    @CurrentTenant() tenant: RequestTenant,
  ) {
    return this.clubsService.getComments(tenant.id, postId);
  }

  @Post(':id/posts/:postId/comments')
  @Roles('member', 'staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Add a comment to a post' })
  @ApiQuery({ name: 'memberId', required: true })
  addComment(
    @Param('postId') postId: string,
    @Body() dto: CreateClubCommentDto,
    @Query('memberId') memberId: string,
    @CurrentTenant() tenant: RequestTenant,
  ) {
    return this.clubsService.addComment(tenant.id, postId, memberId, dto);
  }

  // ═══════════════════════════════════════════════════════
  //  EVENTS  /:id/events
  // ═══════════════════════════════════════════════════════

  @Get(':id/events')
  @Roles('member', 'staff', 'admin', 'owner')
  @ApiOperation({ summary: 'List events linked to a club' })
  @ApiParam({ name: 'id', description: 'Club UUID' })
  getClubEvents(
    @Param('id') id: string,
    @CurrentTenant() tenant: RequestTenant,
  ) {
    return this.clubsService.getClubEvents(tenant.id, id);
  }

  @Post(':id/events')
  @Roles('staff', 'admin', 'owner')
  @ApiOperation({ summary: 'Link an existing event to a club' })
  @ApiParam({ name: 'id', description: 'Club UUID' })
  linkEvent(
    @Param('id') id: string,
    @Body() dto: LinkEventDto,
    @CurrentTenant() tenant: RequestTenant,
  ) {
    return this.clubsService.linkEventToClub(tenant.id, id, dto);
  }
}
