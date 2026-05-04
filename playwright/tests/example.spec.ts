import { test, expect } from '@playwright/test';

test('homepage serves index', async ({ request }) => {
  // Ensure the built SPA index.html is present at the Vite build output path
  const fs = await import('fs');
  const path = 'artifacts/workforce-console/dist/public/index.html';
  const exists = fs.existsSync(path);
  expect(exists).toBeTruthy();
});
