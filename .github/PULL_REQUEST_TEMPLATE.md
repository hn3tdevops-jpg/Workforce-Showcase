# Pull Request

Short description of the change and why it was made.

## Checklist
- [ ] Ran `pnpm install` (from repo root)
- [ ] Run Playwright OS deps: `pnpm exec playwright install-deps` (CI runners / Ubuntu hosts)
- [ ] Install Playwright browsers: `pnpm exec playwright install --with-deps` (or `pnpm exec playwright install` if privileged install fails)
- [ ] Run Playwright tests locally: `pnpm exec playwright test` and confirm all tests pass
- [ ] Include or update Playwright/End-to-end tests when appropriate

Notes for reviewers: the repo has a Playwright CI workflow at `.github/workflows/playwright-ci.yml` that runs on push and pull_request. If Playwright tests are flaky, include relevant logs or traces with the PR.
