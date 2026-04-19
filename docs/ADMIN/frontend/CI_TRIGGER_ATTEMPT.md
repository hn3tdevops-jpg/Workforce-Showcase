CI trigger attempt details

Summary

A local attempt was made to commit and push the prepared GitHub Actions workflow (.github/workflows/playwright-browser-validation.yml) and helper scripts, then trigger the workflow using the GitHub CLI. The attempt could not complete due to permission/authentication restrictions.

Observed errors

- git push was rejected by the remote with:
  "refusing to allow a Personal Access Token to create or update workflow `.github/workflows/playwright-browser-validation.yml` without `workflow` scope"

- gh CLI failed to run the workflow with HTTP 404: Not Found (the workflow file was not present on the remote or the CLI was not authenticated).

Actionable remediation

1. Grant a Personal Access Token with `workflow` scope or use a GitHub account with permission to push workflow files. Then push the branch containing the workflow file.
2. Trigger the workflow via the GitHub Actions UI or `gh workflow run playwright-browser-validation.yml` once the workflow exists on the remote.
3. If you prefer not to update the repository, run the validation locally or on a CI runner using the runbook: docs/ADMIN/frontend/OFF_HOST_PLAYWRIGHT_RUNBOOK.md

Relevant local logs

- docs/ADMIN/frontend/artifact-diffs/playwright-or-browser-test-log.txt contains the last Playwright run log produced locally (earlier attempt).

If you want, provide a PAT with workflow scope or grant push permission and I can re-attempt pushing and triggering the workflow. Alternatively, run the workflow from the GitHub UI or a runner with Playwright support and upload artifacts to docs/ADMIN/frontend/artifact-diffs/ for review.
