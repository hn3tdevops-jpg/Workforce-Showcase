import { test, expect } from '@playwright/test';

test('homepage serves index', async ({ request }) => {
  // Ensure the built SPA index.html is present under dist/
  const fs = await import('fs');
  const path = 'dist/index.html';
  const exists = fs.existsSync(path);
  expect(exists).toBeTruthy();
});
