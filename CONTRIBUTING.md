# Contributing to Janagana

Thank you for your interest in contributing to Janagana! This document provides guidelines for contributing to the project.

## Getting Started

### Prerequisites
- Node.js 20+
- npm 10+
- Docker + Docker Compose
- Git

### Setting Up Local Environment

1. **Fork and clone the repository**
```bash
git clone https://github.com/your-username/janagana.git
cd janagana
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
```bash
cp .env.example .env.local
# Fill in the required environment variables (see docs/SETUP.md)
```

4. **Start local infrastructure**
```bash
docker compose up -d
```

5. **Generate Prisma client**
```bash
npm run db:generate
```

6. **Run development servers**
```bash
npm run dev
```

Access:
- Web app: http://localhost:3000
- API: http://localhost:4000
- API docs: http://localhost:4000/api/docs

## Branch Naming Convention

We use a structured branch naming convention to organize development work:

- `feature/` - New features
  - `feature/membership-tiers`
  - `feature/volunteer-scheduling`
  
- `fix/` - Bug fixes
  - `fix/stripe-webhook-error`
  - `fix/registration-overflow`

- `chore/` - Maintenance tasks
  - `chore/update-dependencies`
  - `chore/refactor-auth-module`

- `docs/` - Documentation updates
  - `docs/api-endpoints`
  - `docs/setup-guide`

- `refactor/` - Code refactoring
  - `refactor/prisma-schema`
  - `refactor/middleware`

- `test/` - Test additions or fixes
  - `test/registration-flow`
  - `test/payment-processing`

## Commit Message Format

We follow conventional commits format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements
- `ci`: CI/CD changes

### Examples

```
feat(auth): add magic link authentication for member portal

- Implemented magic link flow using Resend
- Added email verification step
- Updated member portal login UI

Closes #123
```

```
fix(stripe): resolve webhook signature validation error

- Updated webhook signature verification logic
- Added proper timestamp validation
- Fixed test coverage for webhook handlers

Fixes #456
```

```
chore(deps): upgrade NestJS to version 10.3.0

- Updated core dependencies
- Resolved breaking changes in middleware
- Updated type definitions
```

## Development Workflow

1. **Create a branch** from `main`
```bash
git checkout -b feature/your-feature-name
```

2. **Make your changes** following the code style guidelines

3. **Test your changes**
```bash
npm run lint
npm run typecheck
npm run test
```

4. **Commit your changes** with conventional commit messages

5. **Push to your fork**
```bash
git push origin feature/your-feature-name
```

6. **Create a Pull Request** with:
   - Clear description of changes
   - Reference to related issues
   - Screenshots for UI changes
   - Testing instructions

## Pull Request Process

### PR Checklist
- [ ] Code follows project style guidelines
- [ ] Self-reviewed the code
- [ ] Added tests for new functionality
- [ ] All tests pass locally
- [ ] No linting errors
- [ ] No TypeScript errors
- [ ] Updated documentation if needed
- [ ] Added comments for complex logic

### PR Review Process
1. Automated checks (lint, typecheck, tests) must pass
2. At least one maintainer approval required
3. Address all review comments
4. Squash commits if requested
5. Merge after approval

## Code Style Guidelines

### TypeScript
- Use strict type checking
- Avoid `any` type when possible
- Use interfaces for object shapes
- Use type aliases for unions/intersections
- Add JSDoc comments for public APIs

### NestJS
- Use dependency injection
- Follow SOLID principles
- Use DTOs with class-validator
- Implement proper error handling
- Add Swagger documentation for all endpoints

### Next.js
- Use App Router (app directory)
- Use Server Components when possible
- Optimize images with next/image
- Use proper SEO metadata
- Follow component composition patterns

### General
- Write clear, descriptive variable names
- Keep functions small and focused
- Add comments for complex logic
- Remove commented-out code
- Format code with Prettier

## Security Guidelines

### Never Commit
- `.env` files with real values
- API keys or secrets
- Passwords or tokens
- Certificates or private keys
- Personal information

### Environment Variables
- Use `.env.example` for template
- Reference environment variables in code
- Never hardcode secrets
- Use different keys for dev/staging/prod

### Dependencies
- Review dependencies before adding
- Keep dependencies up to date
- Use `npm audit` regularly
- Report security vulnerabilities

## Testing Guidelines

### Unit Tests
- Test individual functions and classes
- Mock external dependencies
- Aim for high code coverage
- Test edge cases and error conditions

### Integration Tests
- Test module interactions
- Test API endpoints
- Test database operations
- Test webhook handlers

### E2E Tests
- Test critical user flows
- Test payment flows (with test keys)
- Test authentication flows
- Test multi-tenant isolation

## Questions or Issues?

- Open an issue for bugs or feature requests
- Join discussions for questions
- Check existing issues before creating new ones
- Be respectful and constructive in all communications

## License

By contributing to Janagana, you agree that your contributions will be licensed under the MIT License.
