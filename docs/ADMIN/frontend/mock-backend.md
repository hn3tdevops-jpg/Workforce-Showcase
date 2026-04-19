Mock backend options for local integration testing

1) Quick JSON mock with json-server (recommended for REST)
- Install: npm install -g json-server
- Create db.json with sample endpoints, e.g.:
  {
    "api": { "v1": { "workforce": [] } }
  }
- Run: json-server --routes routes.json --port 8080 --watch db.json
- Then preview with: VITE_API_PROXY_TARGET=http://localhost:8080 PORT=5173 BASE_PATH=/ pnpm --filter "./artifacts/workforce-console" -w run serve

2) Minimal Express mock (node)
- Example one-file server:
  const express = require('express');
  const app = express();
  app.use(express.json());
  app.get('/api/v1/workforce', (req,res)=>res.json({items:[]}));
  app.listen(8080);
- Run: node mock-server.js

3) Use the real backend or a dedicated staging instance
- Point VITE_API_PROXY_TARGET to the backend URL if available.

Notes
- Ensure CORS and TLS settings are compatible with the preview proxy. For local testing use http:// targets and set VITE_API_PROXY_TARGET accordingly.
- When backend responses are required for Playwright tests, run the mock server before invoking tests.
