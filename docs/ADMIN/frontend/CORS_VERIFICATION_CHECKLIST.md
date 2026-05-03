# CORS & API Verification Checklist

**Purpose:** Verify CORS configuration and API reachability for all known deployment origins.  
**Last updated:** 2026-05-03  
**Status:** 🔴 UNVERIFIED — commands documented; live backend not reachable from this CI environment.

---

## Known Origins and Targets

| Origin | API Target | Purpose |
|---|---|---|
| `https://wf-hn3t.pythonanywhere.com` | `https://hn3t.pythonanywhere.com/api/v1/auth/login` | Frontend SPA → backend login |
| `https://devhub-hn3t.pythonanywhere.com` | `https://hn3t.pythonanywhere.com/api/v1/auth/login` | Dev hub → backend login |
| `http://localhost:5000` (dev) | `http://localhost:8080/api/v1/...` (local proxy) | Dev — no CORS needed (Vite proxy) |

---

## Verification Commands

### 1. Preflight (OPTIONS) check — wf-hn3t.pythonanywhere.com origin

```bash
curl -v -X OPTIONS \
  "https://hn3t.pythonanywhere.com/api/v1/auth/login" \
  -H "Origin: https://wf-hn3t.pythonanywhere.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type, Authorization" \
  2>&1 | grep -E "(< HTTP|< access-control|< Access-Control|< allow)"
```

**Expected:** HTTP 200 or 204 with:
```
< access-control-allow-origin: https://wf-hn3t.pythonanywhere.com
< access-control-allow-methods: POST, GET, OPTIONS
< access-control-allow-headers: Content-Type, Authorization
```

### 2. POST login — wf-hn3t.pythonanywhere.com origin

```bash
curl -v -X POST \
  "https://hn3t.pythonanywhere.com/api/v1/auth/login" \
  -H "Origin: https://wf-hn3t.pythonanywhere.com" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "wrongpassword"}' \
  2>&1 | grep -E "(< HTTP|< access-control|< Access-Control|{)"
```

**Expected:** HTTP 401 with CORS headers present in response.

### 3. Preflight (OPTIONS) check — devhub-hn3t.pythonanywhere.com origin

```bash
curl -v -X OPTIONS \
  "https://hn3t.pythonanywhere.com/api/v1/auth/login" \
  -H "Origin: https://devhub-hn3t.pythonanywhere.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type, Authorization" \
  2>&1 | grep -E "(< HTTP|< access-control|< Access-Control|< allow)"
```

### 4. POST login — devhub-hn3t.pythonanywhere.com origin

```bash
curl -v -X POST \
  "https://hn3t.pythonanywhere.com/api/v1/auth/login" \
  -H "Origin: https://devhub-hn3t.pythonanywhere.com" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "wrongpassword"}' \
  2>&1 | grep -E "(< HTTP|< access-control|< Access-Control|{)"
```

### 5. GET /auth/me with a valid token

```bash
TOKEN="<paste valid token here>"
curl -v \
  "https://hn3t.pythonanywhere.com/api/v1/auth/me" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Origin: https://wf-hn3t.pythonanywhere.com" \
  2>&1 | grep -E "(< HTTP|< access-control|< Access-Control|{)"
```

### 6. GET /auth/me/access-context (upstream support unverified)

```bash
TOKEN="<paste valid token here>"
curl -v \
  "https://hn3t.pythonanywhere.com/api/v1/auth/me/access-context" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Origin: https://wf-hn3t.pythonanywhere.com" \
  2>&1 | grep -E "(< HTTP|< access-control|< Access-Control|{)"
```

**Note:** If this returns 404, the upstream backend does not implement `/auth/me/access-context`.
The local API proxy provides this endpoint; it is not required to be in the upstream backend for
local development but IS required for production if employee scope data is needed.

---

## Results Log

| Date | Test | Origin | Result | Notes |
|---|---|---|---|---|
| 2026-05-03 | All | All | ⚠️ Not run | CI environment cannot reach live backend |

---

## Required Backend Configuration (for production)

The PythonAnywhere backend (`hn3t.pythonanywhere.com`) **must** have the following CORS settings
for production use:

```
Access-Control-Allow-Origin: https://wf-hn3t.pythonanywhere.com
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true  (if using cookies; not required for Bearer tokens)
```

If only Bearer tokens are used (no cookies), `Access-Control-Allow-Credentials` is not required.

---

## Remaining Blockers

1. Live backend not verified to be running (`/api/healthz` not confirmed)
2. CORS allow-list on backend not confirmed for any frontend origin
3. `/auth/me/access-context` upstream support unverified
