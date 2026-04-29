# JanaGana Documentation

Comprehensive documentation for the JanaGana multi-tenant SaaS platform.

## Quick Start

- **New to JanaGana?** Start with [SETUP.md](./SETUP.md) for local development
- **Deploying to production?** See [DEPLOYMENT.md](./DEPLOYMENT.md) for Vercel deployment
- **Need help?** Visit the [Help Center](https://janagana.namasteneedham.com/help)

## Documentation Index

### Getting Started

| Document | Description |
|----------|-------------|
| [SETUP.md](./SETUP.md) | Local development setup, environment variables, and quick start guide |
| [COMPLETE_GUIDE.md](./COMPLETE_GUIDE.md) | Comprehensive setup, development, and deployment guide |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture, data models, and design decisions |

### Deployment

| Document | Description |
|----------|-------------|
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Vercel deployment guide with environment variables checklist |
| [PRODUCTION_DEPLOYMENT_GUIDE.md](./PRODUCTION_DEPLOYMENT_GUIDE.md) | Production deployment for TPW integration (specific use case) |
| [VERCEL-ENV-VARS.md](./VERCEL-ENV-VARS.md) | Vercel environment variables reference |
| [RENDER-ENV-VARS.md](./RENDER-ENV-VARS.md) | Render deployment environment variables (deprecated) |

### Integration Guides

| Document | Description |
|----------|-------------|
| [WEBSITE_EMBED_GUIDE.md](./WEBSITE_EMBED_GUIDE.md) | General website integration guide |
| [FRAMEWORK_INTEGRATION_GUIDES.md](./FRAMEWORK_INTEGRATION_GUIDES.md) | Framework-specific integration guides |
| [NEXTJS_INTEGRATION.md](./NEXTJS_INTEGRATION.md) | Next.js integration guide |
| [WORDPRESS_INTEGRATION.md](./WORDPRESS_INTEGRATION.md) | WordPress integration guide |
| [SHOPIFY_INTEGRATION.md](./SHOPIFY_INTEGRATION.md) | Shopify integration guide |
| [WIX_INTEGRATION.md](./WIX_INTEGRATION.md) | Wix integration guide |
| [SQUARESPACE_INTEGRATION.md](./SQUARESPACE_INTEGRATION.md) | Squarespace integration guide |

### CRM & Plugin Integration

| Document | Description |
|----------|-------------|
| [CRM_INTEGRATIONS.md](./CRM_INTEGRATIONS.md) | CRM integration documentation |
| [CRM_PLUGIN_INTEGRATION.md](./CRM_PLUGIN_INTEGRATION.md) | CRM plugin integration guide |
| [PURPLE_WINGS_INTEGRATION_GUIDE.md](./PURPLE_WINGS_INTEGRATION_GUIDE.md) | TPW (Purple Wings) integration guide |
| [TPW_INTEGRATION_GUIDE.md](./TPW_INTEGRATION_GUIDE.md) | TPW integration guide (duplicate, see above) |

### API & Webhooks

| Document | Description |
|----------|-------------|
| [WEBHOOK_API_IMPLEMENTATION.md](./WEBHOOK_API_IMPLEMENTATION.md) | Webhook API implementation guide |
| [STRIPE-WEBHOOKS.md](./STRIPE-WEBHOOKS.md) | Stripe webhook configuration |

### User Guides

| Document | Description |
|----------|-------------|
| [USER_TYPES_GUIDE.md](./USER_TYPES_GUIDE.md) | User types and permissions guide |
| [HELP_CONTENT.md](./HELP_CONTENT.md) | Help Center content source (markdown) |

### Operations & Monitoring

| Document | Description |
|----------|-------------|
| [MONITORING.md](./MONITORING.md) | Monitoring, logging, and alerting setup |
| [SMOKE-TEST.md](./SMOKE-TEST.md) | Smoke testing procedures |

### Development

| Document | Description |
|----------|-------------|
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Contribution guidelines and code standards |
| [ASSESSMENT.md](./ASSESSMENT.md) | Project assessment and technical debt |
| [AUDIT_REPORT.md](./AUDIT_REPORT.md) | Security and performance audit report |

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
