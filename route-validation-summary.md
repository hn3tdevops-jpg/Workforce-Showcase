# Route validation summary

Playwright browser-level validation did not complete successfully. See playwright-or-browser-test-log.txt for details.

Summary:

- dist-staging used as the static server root.
- Static server started (python http.server on port 5000).
- Playwright installation completed and Chromium was downloaded.
- Attempt to launch Chromium failed with a process-level error (SIGTRAP) and the Playwright process exited.

Artifacts produced:

- playwright-or-browser-test-log.txt — full run log (contains the browser launch error).
- browser-console-errors.txt — empty array (run failed before page loads).
- failed-network-requests.txt — empty array (run failed before network activity).
- screenshots/ — directory created; screenshots may be missing if pages were not navigated.

Next steps:

1. Inspect playwright-or-browser-test-log.txt for the exact failure (likely environment sandbox or missing dependencies).
2. If running in a container, try launching Chromium with '--no-sandbox' (the script already attempted this) or provide required sandbox helpers.
3. Re-run validation after addressing the environment-specific Chromium launch issue.
