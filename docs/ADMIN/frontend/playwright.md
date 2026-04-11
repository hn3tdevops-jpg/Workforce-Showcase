Running Playwright tests (developer guide)

Setup
- Ensure dependencies are installed at workspace root:
  pnpm install -w
- Install Playwright browsers (if needed):
  npx playwright install

Common commands
- Run all Playwright tests:
  npx playwright test
- Run tests with reporter and output:
  npx playwright test --reporter=list --output=playwright-results
- Run a single test file:
  npx playwright test tests/path/to/file.spec.ts
- Run headful (see what happens):
  PWDEBUG=1 npx playwright test

Troubleshooting
- If tests time out or fail due to missing API responses, point the frontend to a local mock backend (see mock-backend.md) or set VITE_API_PROXY_TARGET.
- For CI, ensure browsers are installed with npx playwright install --with-deps or use Playwright Docker images.

Tips
- Use --grep to run tests matching a title: npx playwright test --grep "login"
- Use --workers=1 for serial test runs when debugging.
