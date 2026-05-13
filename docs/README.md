# JanaGana Documentation

JanaGana is a multi-tenant SaaS platform for Membership, Event, and CRM management — built for nonprofits and associations.

**Production:** https://janagana.namasteneedham.com  
**Help Center:** https://janagana.namasteneedham.com/help

---

## Quick Start

| I want to… | Go to |
|------------|-------|
| Run JanaGana locally | [SETUP.md](./SETUP.md) |
| Deploy to production | [DEPLOYMENT.md](./DEPLOYMENT.md) + [VERCEL-ENV-VARS.md](./VERCEL-ENV-VARS.md) |
| Integrate my website | **[INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)** |
| Understand the architecture | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| Configure environment variables | [REQUIRED_ENV.md](./REQUIRED_ENV.md) |

---

## Documentation Index

### For External Integrators (Start Here)

| Document | Description |
|----------|-------------|
| [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) | **Complete guide** — API auth, events, CRM, embed widgets, Next.js/WordPress/Wix/Squarespace examples |
| [WEBHOOK_API_IMPLEMENTATION.md](./WEBHOOK_API_IMPLEMENTATION.md) | Incoming webhook configuration and signature verification |
| [STRIPE-WEBHOOKS.md](./STRIPE-WEBHOOKS.md) | Stripe payment webhook setup |

### Setup & Deployment

| Document | Description |
|----------|-------------|
| [SETUP.md](./SETUP.md) | Local development setup and environment variables |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Vercel deployment guide |
| [VERCEL-ENV-VARS.md](./VERCEL-ENV-VARS.md) | Full Vercel environment variable reference |
| [REQUIRED_ENV.md](./REQUIRED_ENV.md) | Minimum required environment variables |
| [PRODUCTION_DEPLOYMENT_GUIDE.md](./PRODUCTION_DEPLOYMENT_GUIDE.md) | Production deployment checklist |
| [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md) | Pre-launch verification checklist |

### Platform Reference

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture, data models, design decisions |
| [USER_TYPES_GUIDE.md](./USER_TYPES_GUIDE.md) | Admin, member, volunteer, and portal user types |
| [TENANT_CONFIGURATION_PROFILE.md](./TENANT_CONFIGURATION_PROFILE.md) | Tenant profile configuration reference |
| [DATA_MODEL_MIGRATION_PLAN.md](./DATA_MODEL_MIGRATION_PLAN.md) | Contact-first data model reference |

### Operations

| Document | Description |
|----------|-------------|
| [MONITORING.md](./MONITORING.md) | Monitoring, logging, and alerting |
| [SMOKE-TEST.md](./SMOKE-TEST.md) | Smoke test procedures |
| [PRE_PUSH_HOOKS.md](./PRE_PUSH_HOOKS.md) | Git pre-push validation hooks |

### Development

| Document | Description |
|----------|-------------|
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Contribution guidelines and code standards |
| [PRODUCTIZATION_PLAN.md](./PRODUCTIZATION_PLAN.md) | Multi-tenant hardening and productization roadmap |
| [HELP_CONTENT.md](./HELP_CONTENT.md) | Help Center content source |

## Help Center

The JanaGana Help Center is available at https://janagana.namasteneedham.com/help and includes:

- Getting Started guides
- CRM documentation
- Events management
- Volunteer coordination
- Fundraising campaigns
- Member management
- Integration guides (WordPress, Shopify, Wix, Squarespace, Next.js)
- API documentation
- Settings and configuration

## Production URLs

- **JanaGana**: https://janagana.namasteneedham.com
- **Help Center**: https://janagana.namasteneedham.com/help

## Tech Stack

- **Framework**: Next.js 15 (App Router) + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Auth**: Clerk v6
- **Database**: Prisma 6 + PostgreSQL (Neon)
- **Payments**: Stripe
- **Email**: Resend
- **SMS**: Twilio
- **File Upload**: Cloudinary
- **Error Tracking**: Sentry

## Support

For issues or questions:
1. Check the [Help Center](https://janagana.namasteneedham.com/help)
2. Review relevant documentation above
3. Check GitHub issues

## Documentation Maintenance

When updating features:
1. Update HELP_CONTENT.md for user-facing changes
2. Update relevant integration guides for API changes
3. Update DEPLOYMENT.md for deployment process changes
4. Update this README if adding new documentation
