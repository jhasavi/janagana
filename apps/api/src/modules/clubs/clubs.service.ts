import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ClubVisibility, ClubRoleType, Prisma } from '@prisma/client';
import { DatabaseService } from '../../database/database.service';
import { PaginationMetaDto } from '../../common/dto/base-response.dto';
import {
  CreateClubDto,
  UpdateClubDto,
  FilterClubsDto,
  FilterClubMembersDto,
  UpdateClubMemberRoleDto,
  InviteMemberDto,
  LinkEventDto,
} from './dto/create-club.dto';
import { CreateClubPostDto, UpdateClubPostDto, CreateClubCommentDto } from './dto/create-club-post.dto';

// ─── Select shapes ────────────────────────────────────────────────────────────

const CLUB_LIST_SELECT = {
  id: true,
  tenantId: true,
  name: true,
  slug: true,
  description: true,
  coverImageUrl: true,
  visibility: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { memberships: true, posts: true, events: true } },
} satisfies Prisma.ClubSelect;

const MEMBER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  avatarUrl: true,
} satisfies Prisma.MemberSelect;

const MEMBERSHIP_SELECT = {
  id: true,
  clubId: true,
  memberId: true,
  role: true,
  joinedAt: true,
  createdAt: true,
  member: { select: MEMBER_SELECT },
} satisfies Prisma.ClubMembershipSelect;

const POST_SELECT = {
  id: true,
  tenantId: true,
  clubId: true,
  authorId: true,
  title: true,
  body: true,
  isPinned: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { comments: true } },
} satisfies Prisma.ClubPostSelect;

const COMMENT_SELECT = {
  id: true,
  tenantId: true,
  postId: true,
  memberId: true,
  body: true,
  createdAt: true,
  updatedAt: true,
  member: { select: MEMBER_SELECT },
} satisfies Prisma.ClubPostCommentSelect;

@Injectable()
export class ClubsService {
  private readonly logger = new Logger(ClubsService.name);

  constructor(private readonly db: DatabaseService) {}

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 100);
  }

  private async buildUniqueSlug(tenantId: string, name: string, excludeId?: string): Promise<string> {
    const base = this.slugify(name);
    let slug = base;
    let attempt = 0;
    while (true) {
      const existing = await this.db.club.findFirst({
        where: { tenantId, slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
        select: { id: true },
      });
      if (!existing) return slug;
      slug = `${base}-${++attempt}`;
    }
  }

  private async assertClub(tenantId: string, clubId: string) {
    const club = await this.db.club.findFirst({
      where: { id: clubId, tenantId },
      select: { id: true, visibility: true, isActive: true, name: true },
    });
    if (!club) throw new NotFoundException(`Club ${clubId} not found.`);
    return club;
  }

  private async assertMembership(clubId: string, memberId: string) {
    const m = await this.db.clubMembership.findUnique({
      where: { clubId_memberId: { clubId, memberId } },
      select: { id: true, role: true },
    });
    if (!m) throw new NotFoundException(`Membership not found.`);
    return m;
  }

  private async requireLeaderOrAdmin(
    tenantId: string,
    clubId: string,
    requestingMemberId: string,
    orgRole?: string,
  ) {
    if (orgRole === 'admin' || orgRole === 'owner') return;
    const m = await this.db.clubMembership.findUnique({
      where: { clubId_memberId: { clubId, memberId: requestingMemberId } },
      select: { role: true },
    });
    if (!m || (m.role !== ClubRoleType.LEADER && m.role !== ClubRoleType.CO_LEADER)) {
      throw new ForbiddenException('Only club leaders or org admins can perform this action.');
    }
  }

  /** Map DTO flags → ClubVisibility enum */
  private resolveVisibility(dto: CreateClubDto | UpdateClubDto): ClubVisibility | undefined {
    if (dto.requiresApproval) return ClubVisibility.INVITE_ONLY;
    if (dto.isPublic === false) return ClubVisibility.PRIVATE;
    if (dto.isPublic === true) return ClubVisibility.PUBLIC;
    return undefined;
  }

  // ─── CLUB CRUD ─────────────────────────────────────────────────────────────

  async findAll(tenantId: string, filters: FilterClubsDto) {
    const { page = 1, limit = 20, search, isActive } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.ClubWhereInput = {
      tenantId,
      ...(isActive !== undefined ? { isActive } : {}),
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
    };

    const [data, total] = await Promise.all([
      this.db.club.findMany({
        where,
        select: CLUB_LIST_SELECT,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.club.count({ where }),
    ]);

    return { data, meta: new PaginationMetaDto(total, page, limit) };
  }

  async findOne(tenantId: string, clubId: string) {
    const club = await this.db.club.findFirst({
      where: { id: clubId, tenantId },
      select: {
        ...CLUB_LIST_SELECT,
        memberships: {
          select: MEMBERSHIP_SELECT,
          orderBy: { joinedAt: 'asc' },
          take: 50,
        },
      },
    });
    if (!club) throw new NotFoundException(`Club ${clubId} not found.`);
    return club;
  }

  async create(tenantId: string, createdByMemberId: string, dto: CreateClubDto) {
    const slug = await this.buildUniqueSlug(tenantId, dto.name);
    const visibility = this.resolveVisibility(dto) ?? ClubVisibility.PUBLIC;

    const club = await this.db.club.create({
      data: {
        tenantId,
        name: dto.name,
        slug,
        description: dto.description,
        coverImageUrl: dto.coverImageUrl,
        visibility,
        memberships: {
          create: {
            tenantId,
            memberId: createdByMemberId,
            role: ClubRoleType.LEADER,
          },
        },
      },
      select: CLUB_LIST_SELECT,
    });

    this.logger.log(`Club created: ${club.id} by member ${createdByMemberId}`);
    return club;
  }

  async update(tenantId: string, clubId: string, dto: UpdateClubDto, requestingMemberId: string) {
    await this.assertClub(tenantId, clubId);

    const visibility = this.resolveVisibility(dto);
    const slug = dto.name ? await this.buildUniqueSlug(tenantId, dto.name, clubId) : undefined;

    return this.db.club.update({
      where: { id: clubId },
      data: {
        ...(dto.name ? { name: dto.name, slug } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.coverImageUrl !== undefined ? { coverImageUrl: dto.coverImageUrl } : {}),
        ...(visibility ? { visibility } : {}),
      },
      select: CLUB_LIST_SELECT,
    });
  }

  async remove(tenantId: string, clubId: string) {
    await this.assertClub(tenantId, clubId);
    await this.db.club.delete({ where: { id: clubId } });
    this.logger.log(`Club deleted: ${clubId}`);
  }

  // ─── MEMBERSHIP ────────────────────────────────────────────────────────────

  async getMembers(tenantId: string, clubId: string, filters: FilterClubMembersDto) {
    await this.assertClub(tenantId, clubId);
    const { page = 1, limit = 20, role } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.ClubMembershipWhereInput = {
      clubId,
      tenantId,
      ...(role ? { role } : {}),
    };

    const [data, total] = await Promise.all([
      this.db.clubMembership.findMany({
        where,
        select: MEMBERSHIP_SELECT,
        skip,
        take: limit,
        orderBy: { joinedAt: 'asc' },
      }),
      this.db.clubMembership.count({ where }),
    ]);

    return { data, meta: new PaginationMetaDto(total, page, limit) };
  }

  async joinClub(tenantId: string, memberId: string, clubId: string) {
    const club = await this.assertClub(tenantId, clubId);
    if (!club.isActive) throw new BadRequestException('This club is not accepting new members.');

    if (club.visibility === ClubVisibility.PRIVATE) {
      throw new ForbiddenException('This club is private. Contact a leader to join.');
    }

    const existing = await this.db.clubMembership.findUnique({
      where: { clubId_memberId: { clubId, memberId } },
      select: { id: true },
    });
    if (existing) throw new ConflictException('You are already a member of this club.');

    return this.db.clubMembership.create({
      data: { tenantId, clubId, memberId, role: ClubRoleType.MEMBER },
      select: MEMBERSHIP_SELECT,
    });
  }

  async leaveClub(tenantId: string, memberId: string, clubId: string) {
    await this.assertClub(tenantId, clubId);
    const m = await this.assertMembership(clubId, memberId);

    if (m.role === ClubRoleType.LEADER) {
      const otherLeaders = await this.db.clubMembership.count({
        where: { clubId, role: ClubRoleType.LEADER, NOT: { memberId } },
      });
      if (otherLeaders === 0) {
        throw new BadRequestException(
          'You are the only leader. Transfer leadership before leaving.',
        );
      }
    }

    await this.db.clubMembership.delete({
      where: { clubId_memberId: { clubId, memberId } },
    });
  }

  async inviteMember(
    tenantId: string,
    clubId: string,
    invitedByMemberId: string,
    dto: InviteMemberDto,
  ) {
    await this.assertClub(tenantId, clubId);

    const member = await this.db.member.findFirst({
      where: { tenantId, email: dto.email },
      select: { id: true, firstName: true, lastName: true, email: true },
    });
    if (!member) throw new NotFoundException(`No member found with email "${dto.email}".`);

    const existing = await this.db.clubMembership.findUnique({
      where: { clubId_memberId: { clubId, memberId: member.id } },
      select: { id: true },
    });
    if (existing) throw new ConflictException('That member is already in this club.');

    await this.db.clubMembership.create({
      data: { tenantId, clubId, memberId: member.id, role: ClubRoleType.MEMBER },
    });

    this.logger.log(`Member ${member.id} invited to club ${clubId} by ${invitedByMemberId}`);
    return { success: true, message: `${member.firstName} ${member.lastName} added to club.` };
  }

  async updateMemberRole(
    tenantId: string,
    clubId: string,
    memberId: string,
    dto: UpdateClubMemberRoleDto,
    requestingMemberId: string,
    orgRole?: string,
  ) {
    await this.requireLeaderOrAdmin(tenantId, clubId, requestingMemberId, orgRole);
    await this.assertMembership(clubId, memberId);

    return this.db.clubMembership.update({
      where: { clubId_memberId: { clubId, memberId } },
      data: { role: dto.role },
      select: MEMBERSHIP_SELECT,
    });
  }

  async removeMember(
    tenantId: string,
    clubId: string,
    memberId: string,
    requestingMemberId: string,
    orgRole?: string,
  ) {
    await this.requireLeaderOrAdmin(tenantId, clubId, requestingMemberId, orgRole);
    await this.assertMembership(clubId, memberId);

    if (memberId === requestingMemberId) {
      throw new BadRequestException('Use the leave endpoint to remove yourself.');
    }

    await this.db.clubMembership.delete({
      where: { clubId_memberId: { clubId, memberId } },
    });
  }

  async transferLeadership(
    tenantId: string,
    clubId: string,
    currentLeaderId: string,
    newLeaderId: string,
  ) {
    await this.assertClub(tenantId, clubId);
    await this.assertMembership(clubId, newLeaderId);

    await this.db.$transaction([
      this.db.clubMembership.update({
        where: { clubId_memberId: { clubId, memberId: currentLeaderId } },
        data: { role: ClubRoleType.MEMBER },
      }),
      this.db.clubMembership.update({
        where: { clubId_memberId: { clubId, memberId: newLeaderId } },
        data: { role: ClubRoleType.LEADER },
      }),
    ]);

    this.logger.log(`Leadership of club ${clubId} transferred from ${currentLeaderId} to ${newLeaderId}`);
    return { success: true };
  }

  // ─── POSTS ────────────────────────────────────────────────────────────────

  async getPosts(tenantId: string, clubId: string, page = 1, limit = 20) {
    await this.assertClub(tenantId, clubId);
    const skip = (page - 1) * limit;

    const where: Prisma.ClubPostWhereInput = { clubId, tenantId };
    const [data, total] = await Promise.all([
      this.db.clubPost.findMany({
        where,
        select: POST_SELECT,
        skip,
        take: limit,
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      }),
      this.db.clubPost.count({ where }),
    ]);

    return { data, meta: new PaginationMetaDto(total, page, limit) };
  }

  async createPost(tenantId: string, clubId: string, authorId: string, dto: CreateClubPostDto) {
    await this.assertClub(tenantId, clubId);

    return this.db.clubPost.create({
      data: {
        tenantId,
        clubId,
        authorId,
        title: dto.title,
        body: dto.content,
        isPinned: dto.isPinned ?? false,
        publishedAt: new Date(),
      },
      select: POST_SELECT,
    });
  }

  async updatePost(tenantId: string, postId: string, authorId: string, dto: UpdateClubPostDto) {
    const post = await this.db.clubPost.findFirst({
      where: { id: postId, tenantId },
      select: { id: true, authorId: true, clubId: true },
    });
    if (!post) throw new NotFoundException(`Post ${postId} not found.`);

    if (post.authorId !== authorId) {
      const isLeader = await this.db.clubMembership.findFirst({
        where: {
          clubId: post.clubId,
          memberId: authorId,
          role: { in: [ClubRoleType.LEADER, ClubRoleType.CO_LEADER] },
        },
        select: { id: true },
      });
      if (!isLeader) throw new ForbiddenException('You cannot edit this post.');
    }

    return this.db.clubPost.update({
      where: { id: postId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.content !== undefined ? { body: dto.content } : {}),
        ...(dto.isPinned !== undefined ? { isPinned: dto.isPinned } : {}),
      },
      select: POST_SELECT,
    });
  }

  async deletePost(tenantId: string, postId: string, requestingMemberId: string) {
    const post = await this.db.clubPost.findFirst({
      where: { id: postId, tenantId },
      select: { id: true, authorId: true, clubId: true },
    });
    if (!post) throw new NotFoundException(`Post ${postId} not found.`);

    if (post.authorId !== requestingMemberId) {
      const isLeader = await this.db.clubMembership.findFirst({
        where: {
          clubId: post.clubId,
          memberId: requestingMemberId,
          role: { in: [ClubRoleType.LEADER, ClubRoleType.CO_LEADER] },
        },
        select: { id: true },
      });
      if (!isLeader) throw new ForbiddenException('You cannot delete this post.');
    }

    await this.db.clubPost.delete({ where: { id: postId } });
  }

  async pinPost(tenantId: string, postId: string, requestingMemberId: string) {
    const post = await this.db.clubPost.findFirst({
      where: { id: postId, tenantId },
      select: { id: true, isPinned: true, clubId: true },
    });
    if (!post) throw new NotFoundException(`Post ${postId} not found.`);

    return this.db.clubPost.update({
      where: { id: postId },
      data: { isPinned: !post.isPinned },
      select: POST_SELECT,
    });
  }

  // ─── COMMENTS ────────────────────────────────────────────────────────────

  async getComments(tenantId: string, postId: string) {
    return this.db.clubPostComment.findMany({
      where: { postId, tenantId },
      select: COMMENT_SELECT,
      orderBy: { createdAt: 'asc' },
    });
  }

  async addComment(
    tenantId: string,
    postId: string,
    memberId: string,
    dto: CreateClubCommentDto,
  ) {
    const post = await this.db.clubPost.findFirst({
      where: { id: postId, tenantId },
      select: { id: true },
    });
    if (!post) throw new NotFoundException(`Post ${postId} not found.`);

    return this.db.clubPostComment.create({
      data: { tenantId, postId, memberId, body: dto.content },
      select: COMMENT_SELECT,
    });
  }

  async deleteComment(tenantId: string, commentId: string, requestingMemberId: string) {
    const comment = await this.db.clubPostComment.findFirst({
      where: { id: commentId, tenantId },
      select: { id: true, memberId: true },
    });
    if (!comment) throw new NotFoundException(`Comment ${commentId} not found.`);

    if (comment.memberId !== requestingMemberId) {
      throw new ForbiddenException('You cannot delete this comment.');
    }

    await this.db.clubPostComment.delete({ where: { id: commentId } });
  }

  // ─── EVENTS ───────────────────────────────────────────────────────────────

  async getClubEvents(tenantId: string, clubId: string) {
    await this.assertClub(tenantId, clubId);
    return this.db.clubEvent.findMany({
      where: { clubId, tenantId },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            slug: true,
            startsAt: true,
            endsAt: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async linkEventToClub(tenantId: string, clubId: string, dto: LinkEventDto) {
    await this.assertClub(tenantId, clubId);

    const event = await this.db.event.findFirst({
      where: { id: dto.eventId, tenantId },
      select: { id: true },
    });
    if (!event) throw new NotFoundException(`Event ${dto.eventId} not found.`);

    const existing = await this.db.clubEvent.findUnique({
      where: { clubId_eventId: { clubId, eventId: dto.eventId } },
    });
    if (existing) throw new ConflictException('Event already linked to this club.');

    return this.db.clubEvent.create({
      data: { tenantId, clubId, eventId: dto.eventId },
    });
  }

  // ─── STATS ────────────────────────────────────────────────────────────────

  async getStats(tenantId: string) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalClubs, activeClubs, totalMembers, postsThisMonth] = await Promise.all([
      this.db.club.count({ where: { tenantId } }),
      this.db.club.count({ where: { tenantId, isActive: true } }),
      this.db.clubMembership.count({ where: { tenantId } }),
      this.db.clubPost.count({ where: { tenantId, createdAt: { gte: monthStart } } }),
    ]);

    return { totalClubs, activeClubs, totalMembers, postsThisMonth };
  }

  async getClubStats(tenantId: string, clubId: string) {
    await this.assertClub(tenantId, clubId);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [memberCount, postCount, eventCount, membersThisMonth] = await Promise.all([
      this.db.clubMembership.count({ where: { clubId, tenantId } }),
      this.db.clubPost.count({ where: { clubId, tenantId } }),
      this.db.clubEvent.count({ where: { clubId, tenantId } }),
      this.db.clubMembership.count({ where: { clubId, tenantId, joinedAt: { gte: monthStart } } }),
    ]);

    return { memberCount, postCount, eventCount, membersThisMonth };
  }

  async getMyMembership(tenantId: string, clubId: string, memberId: string) {
    return this.db.clubMembership.findUnique({
      where: { clubId_memberId: { clubId, memberId } },
      select: MEMBERSHIP_SELECT,
    });
  }
}
