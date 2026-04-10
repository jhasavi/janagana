import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { MembersService } from './members.service';
import { DatabaseService } from '../../database/database.service';
import { EmailService } from '../communications/email/email.service';
import { NotificationsService } from '../communications/notifications/notifications.service';
import { StripeService } from '../../payments/stripe.service';
import { MemberAuthService } from '../auth/member-auth.service';
import { RegisterMemberDto } from './dto/register-member.dto';
import { GenericEmail } from '../communications/email/email-templates/GenericEmail';

@ApiTags('Public Registration')
@Controller('public')
export class PublicMembersController {
  constructor(
    private readonly membersService: MembersService,
    private readonly db: DatabaseService,
    private readonly emailService: EmailService,
    private readonly notificationsService: NotificationsService,
    private readonly stripeService: StripeService,
    private readonly memberAuthService: MemberAuthService,
  ) {}

  @Get('tenants/:slug/membership-tiers')
  @Public()
  @ApiOperation({ summary: 'List public membership tiers for a tenant' })
  @ApiResponse({ status: 200, description: 'Membership tiers returned.' })
  async getPublicMembershipTiers(@Param('slug') slug: string) {
    return this.membersService.getPublicMembershipTiers(slug);
  }

  @Post('tenants/:slug/register')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new member for a tenant' })
  @ApiResponse({ status: 201, description: 'Registration created.' })
  async registerMember(@Param('slug') slug: string, @Body() body: RegisterMemberDto) {
    const tenant = await this.db.tenant.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        domain: true,
        primaryColor: true,
        logoUrl: true,
        isActive: true,
        settings: { select: { requireEmailVerification: true } },
      },
    });

    if (!tenant || !tenant.isActive) {
      throw new NotFoundException('Tenant not found');
    }

    const tier = await this.db.membershipTier.findUnique({
      where: { id: body.tierId },
      select: { id: true, tenantId: true, name: true, monthlyPriceCents: true, annualPriceCents: true, isFree: true },
    });
    if (!tier || tier.tenantId !== tenant.id) {
      throw new BadRequestException('Selected membership tier is invalid');
    }

    const normalizedEmail = body.email.trim().toLowerCase();
    const existing = await this.db.member.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email: normalizedEmail } },
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException('A member already exists with that email address.');
    }

    const autoApprove = !tenant.settings?.requireEmailVerification;
    const memberStatus = autoApprove ? 'ACTIVE' : 'PENDING';
    const subscriptionStatus = tier.isFree && autoApprove ? 'ACTIVE' : 'PENDING';

    const member = await this.db.member.create({
      data: {
        tenantId: tenant.id,
        firstName: body.firstName,
        lastName: body.lastName,
        email: normalizedEmail,
        phone: body.phone,
        address: body.address,
        city: body.city,
        state: body.state,
        postalCode: body.postalCode,
        countryCode: body.country ?? 'US',
        bio: body.bio,
        status: memberStatus,
      },
      select: { id: true, email: true, firstName: true, lastName: true, tenantId: true },
    });

    if (body.customFields && Object.keys(body.customFields).length > 0) {
      await this.membersService.setCustomFieldValues(tenant.id, member.id, body.customFields);
    }

    await this.db.membershipSubscription.create({
      data: {
        tenantId: tenant.id,
        memberId: member.id,
        tierId: tier.id,
        status: subscriptionStatus,
        billingInterval: body.billingInterval ?? 'MONTHLY',
        startedAt: new Date(),
        endsAt: tier.isFree ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : null,
      },
    });

    if (body.password) {
      await this.memberAuthService.setMemberPassword(tenant.id, normalizedEmail, body.password);
    }

    await this.emailService.sendWelcomeMember(
      { id: member.id, email: member.email, firstName: member.firstName, lastName: member.lastName },
      { id: tenant.id, name: tenant.name, logoUrl: tenant.logoUrl, primaryColor: tenant.primaryColor, domain: tenant.domain },
    );

    if (!autoApprove) {
      const admins = await this.db.user.findMany({
        where: { tenantId: tenant.id, role: { in: ['OWNER', 'ADMIN'] } },
        select: { email: true, fullName: true },
      });
      const adminEmails = admins.map((u) => u.email);
      await Promise.all(
        adminEmails.map((to) =>
          this.emailService.sendEmail(
            { id: tenant.id, name: tenant.name, logoUrl: tenant.logoUrl, primaryColor: tenant.primaryColor, domain: tenant.domain },
            to,
            `Approval required for new member registration`,
            GenericEmail,
            {
              firstName: undefined,
              tenant: { id: tenant.id, name: tenant.name, logoUrl: tenant.logoUrl, primaryColor: tenant.primaryColor, domain: tenant.domain },
              subject: `Action required: approve ${member.firstName} ${member.lastName}`,
              body: `${member.firstName} ${member.lastName} registered for ${tier.name} and is awaiting approval.`,
            },
          ),
        ),
      );

      return {
        pendingApproval: true,
      };
    }

    const checkoutAmount = tier.monthlyPriceCents > 0 || tier.annualPriceCents > 0;
    if (checkoutAmount) {
      const checkout = await this.stripeService.createMembershipCheckout(
        tenant.id,
        member.id,
        tier.id,
        body.billingInterval ?? 'MONTHLY',
      );
      return {
        checkoutUrl: checkout.url,
      };
    }

    const token = this.memberAuthService.generateMemberJWT(member.id, tenant.id);
    return {
      token,
      member,
    };
  }
}
