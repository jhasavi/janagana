# Pre-Push Git Hooks Setup

This guide enables automatic TypeScript checking and linting before pushing to prevent broken builds.

## Option A: Using Husky (Recommended)

### 1. Install Husky

```bash
npm install husky --save-dev
npx husky install
```

### 2. Create Pre-Push Hook

```bash
npx husky add .husky/pre-push "npm run typecheck && npm run lint"
```

This will create `.husky/pre-push` with:
```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npm run typecheck && npm run lint
```

### 3. Make Hook Executable

```bash
chmod +x .husky/pre-push
```

### 4. Test the Hook

```bash
git push origin main
# If there are TypeScript or lint errors, the push will be blocked
```

---

## Option B: Using Git Hooks Directly

### 1. Create Hook Script

Create `.git/hooks/pre-push`:

```bash
#!/bin/bash

echo "🔍 Running typecheck and lint before push..."

npm run typecheck
if [ $? -ne 0 ]; then
  echo "❌ TypeScript errors found. Fix them and try again."
  exit 1
fi

npm run lint
if [ $? -ne 0 ]; then
  echo "❌ Lint errors found. Fix them and try again."
  exit 1
fi

echo "✅ All checks passed. Proceeding with push..."
```

### 2. Make Executable

```bash
chmod +x .git/hooks/pre-push
```

---

## Bypass Hook (Emergency Only)

If you need to bypass the hook temporarily:

```bash
git push --no-verify
```

⚠️ **Do not use this regularly** — it defeats the purpose of the checks.

---

## CI Integration

The Vercel build command already includes validation:

```
npm run bootstrap:validate-env && npm run build
```

If the build fails on Vercel, the deployment is automatically blocked. This is your last line of defense if the pre-push hook didn't catch something.

---

## Recommended Package.json Scripts

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "lint": "next lint",
    "lint:fix": "next lint --fix",
    "pre-push": "npm run typecheck && npm run lint"
  }
}
```

---

## CI/CD Integration (GitHub Actions Example)

Add `.github/workflows/lint-on-push.yml`:

```yaml
name: Lint & Typecheck on Push

on: [pull_request]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
```

Then push code will automatically be checked by GitHub Actions even if the local hook is bypassed.
