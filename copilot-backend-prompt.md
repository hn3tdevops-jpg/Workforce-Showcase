# Workforce Operations Console — PythonAnywhere Backend

## Context

I'm building a Workforce Operations Console for **Silver Sands Motel** (50 rooms, 2 buildings, 4 floors). The frontend is a React/TypeScript app that currently proxies all `/api/v1/*` requests to `https://hn3t.pythonanywhere.com`. The frontend is already built and expects the API contract below exactly.

## Tech Stack

- **Framework**: Flask (hosted on PythonAnywhere)
- **Database**: MySQL (PythonAnywhere free tier uses MySQL)
- **Auth**: JWT Bearer tokens (header: `Authorization: Bearer <token>`)
- **Response format**: JSON. All errors return `{ "detail": "<message>" }` with appropriate HTTP status codes.

---

## Business Model

- **Business**: `biz-silver-sands`
- **Locations**: Two properties — `loc-001` (Main Building) and `loc-002` (Pool Wing)
- **Roles**: `owner`, `supervisor`, `staff`, `concierge`

---

## API Endpoints Required

All routes are prefixed with `/api/v1`.

### Auth

```
POST   /api/v1/auth/login          { email, password } → { token, user }
POST   /api/v1/auth/logout
GET    /api/v1/auth/me             → { id, email, first_name, last_name, job_title, role, memberships[] }
POST   /api/v1/auth/refresh        { token } → { token }
```

`/me` must return a `memberships` array — each item describes which business/location the user belongs to and with what role:

```json
{
  "id": "user-001",
  "email": "manager@silversands.com",
  "first_name": "Sarah",
  "last_name": "Okonkwo",
  "job_title": "General Manager",
  "memberships": [
    {
      "business_id": "biz-silver-sands",
      "business_name": "Silver Sands Motel",
      "role": "owner",
      "scope": "business"
    }
  ]
}
```

---

### Locations

```
GET    /api/v1/locations/                          → Location[]
GET    /api/v1/locations/:locationId               → Location
PATCH  /api/v1/locations/:locationId               { name?, address?, timezone? }
```

```ts
type Location = {
  id: string;
  business_id: string;
  name: string;
  address: string;
  timezone: string;      // e.g. "America/New_York"
  is_active: boolean;
}
```

Seed data:
- `loc-001`, "Silver Sands Motel", "12 Ocean Drive", `America/New_York`
- `loc-002`, "Silver Sands Pool Wing", "12 Ocean Drive (West)", `America/New_York`

---

### Users / Staff

```
GET    /api/v1/users/              → User[]   (all staff for the business)
GET    /api/v1/users/:userId       → User
POST   /api/v1/users/             { email, first_name, last_name, job_title?, role?, phone? }
PATCH  /api/v1/users/:userId      { first_name?, last_name?, email?, job_title?, role?, phone?, is_active? }
DELETE /api/v1/users/:userId       → soft-delete (set is_active = false)
```

```ts
type User = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  job_title: string | null;
  role: "owner" | "supervisor" | "staff" | "concierge";
  phone: string | null;
  hire_date: string | null;   // ISO date "2024-03-15"
  is_active: boolean;
}
```

```
GET    /api/v1/roles/              → Role[]
```

```ts
type Role = { id: string; name: string; permissions: string[] }
```

---

### Roles (static)

Return these four roles:
```json
[
  { "id": "owner",      "name": "Owner",      "permissions": ["*"] },
  { "id": "supervisor", "name": "Supervisor", "permissions": ["rooms:write", "tasks:write", "staff:read"] },
  { "id": "staff",      "name": "Staff",      "permissions": ["tasks:read", "tasks:write:own"] },
  { "id": "concierge",  "name": "Concierge",  "permissions": ["rooms:read"] }
]
```

---

### Shifts

```
GET    /api/v1/shifts/             ?location_id=&week_start=YYYY-MM-DD  → Shift[]
POST   /api/v1/shifts/             { location_id, title, role, date, start_time, end_time, capacity?, notes? }
PATCH  /api/v1/shifts/:shiftId     { title?, role?, date?, start_time?, end_time?, capacity?, status?, notes? }
DELETE /api/v1/shifts/:shiftId     → sets status = "cancelled"
```

```
POST   /api/v1/shifts/:shiftId/assignees           { user_id }         → Shift
DELETE /api/v1/shifts/:shiftId/assignees/:userId                       → Shift
```

```ts
type Shift = {
  id: string;
  location_id: string;
  title: string;
  role: "housekeeping" | "front_desk" | "maintenance" | "supervisor" | "concierge";
  date: string;           // "YYYY-MM-DD"
  start_time: string;     // "HH:MM"
  end_time: string;       // "HH:MM"
  capacity: number;
  status: "open" | "partial" | "filled" | "draft" | "cancelled" | "in_progress" | "completed";
  notes: string | null;
  assignee_ids: string[]; // derived from shift_assignees join
  created_at: string;
  updated_at: string;
}
```

Auto-compute `status` on assignee add/remove:
- 0 assignees → `"open"`
- 0 < assignees < capacity → `"partial"`
- assignees >= capacity → `"filled"`

---

### Shift Swap Requests

```
GET    /api/v1/shifts/swaps/                           → SwapRequest[]
POST   /api/v1/shifts/swaps/        { shift_id, requester_id, target_user_id?, message? }
POST   /api/v1/shifts/swaps/:swapId/approved           → SwapRequest  (also swaps assignees)
POST   /api/v1/shifts/swaps/:swapId/denied             → SwapRequest
POST   /api/v1/shifts/swaps/:swapId/accepted           → SwapRequest
POST   /api/v1/shifts/swaps/:swapId/withdrawn          → SwapRequest
```

```ts
type SwapRequest = {
  id: string;
  shift_id: string;
  requester_id: string;
  target_user_id: string | null;
  status: "pending" | "accepted" | "approved" | "denied" | "withdrawn";
  message: string | null;
  created_at: string;
  resolved_at: string | null;
}
```

When `approved`: remove `requester_id` from shift assignees, add `target_user_id`, recalculate shift status.

---

### Shift Marketplace

```
GET    /api/v1/shifts/marketplace/                     → Listing[]
POST   /api/v1/shifts/marketplace/  { shift_id, posted_by_user_id, bonus_usd?, note? }
POST   /api/v1/shifts/marketplace/:listingId/claim     { user_id }  → Listing
POST   /api/v1/shifts/marketplace/:listingId/cancel                 → Listing
```

```ts
type Listing = {
  id: string;
  shift_id: string;
  posted_by_user_id: string;
  status: "open" | "claimed" | "cancelled";
  bonus_usd: number | null;
  note: string | null;
  claimed_by_user_id: string | null;
  posted_at: string;
  claimed_at: string | null;
}
```

When claimed: add `user_id` to shift assignees and recalculate shift status.

---

### Rooms (existing — may already be partially implemented)

```
GET    /api/v1/hospitable/rooms                        ?location_id=   → Room[]
PATCH  /api/v1/hospitable/rooms/:roomId                { room_number?, room_label?, room_type?, ... }
PATCH  /api/v1/hospitable/rooms/:roomId/status         { housekeeping_status }
POST   /api/v1/hospitable/rooms/bulk-status            { room_ids[], status }
GET    /api/v1/hospitable/rooms/:roomId/assets         → Asset[]
GET    /api/v1/hospitable/rooms/:roomId/supply-pars    → SupplyPar[]
```

### Tasks

```
GET    /api/v1/hospitable/tasks                        ?location_id=   → Task[]
POST   /api/v1/hospitable/tasks                        { location_id, room_id?, task_type, title, priority?, ... }
PATCH  /api/v1/hospitable/tasks/:taskId/status         { status }
POST   /api/v1/hospitable/tasks/:taskId/assign         { user_id }
POST   /api/v1/hospitable/tasks/:taskId/complete
GET    /api/v1/hospitable/tasks/:taskId/events         → TaskEvent[]
```

### Dashboard

```
GET    /api/v1/hospitable/dashboard/room-board-summary ?location_id=
GET    /api/v1/hospitable/dashboard/housekeeping-board ?location_id=
GET    /api/v1/hospitable/dashboard/maintenance-board  ?location_id=
```

---

## MySQL Schema

```sql
CREATE TABLE locations (
  id          VARCHAR(50)  PRIMARY KEY,
  business_id VARCHAR(50)  NOT NULL,
  name        VARCHAR(100) NOT NULL,
  address     VARCHAR(200),
  timezone    VARCHAR(50)  NOT NULL DEFAULT 'America/New_York',
  is_active   TINYINT(1)   NOT NULL DEFAULT 1,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE users (
  id          VARCHAR(50)  PRIMARY KEY,
  email       VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  first_name  VARCHAR(80)  NOT NULL,
  last_name   VARCHAR(80)  NOT NULL,
  job_title   VARCHAR(100),
  role        VARCHAR(30)  NOT NULL DEFAULT 'staff',
  phone       VARCHAR(30),
  hire_date   DATE,
  is_active   TINYINT(1)   NOT NULL DEFAULT 1,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE user_memberships (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id      VARCHAR(50) NOT NULL REFERENCES users(id),
  business_id  VARCHAR(50) NOT NULL,
  location_id  VARCHAR(50),
  role         VARCHAR(30) NOT NULL DEFAULT 'staff',
  scope        VARCHAR(20) NOT NULL DEFAULT 'location',  -- 'business' or 'location'
  job_title_label VARCHAR(100),
  INDEX (user_id)
);

CREATE TABLE shifts (
  id          VARCHAR(50)  PRIMARY KEY,
  location_id VARCHAR(50)  NOT NULL,
  title       VARCHAR(150) NOT NULL,
  role        VARCHAR(30)  NOT NULL DEFAULT 'housekeeping',
  date        DATE         NOT NULL,
  start_time  VARCHAR(5)   NOT NULL,
  end_time    VARCHAR(5)   NOT NULL,
  capacity    INT          NOT NULL DEFAULT 1,
  status      VARCHAR(20)  NOT NULL DEFAULT 'open',
  notes       TEXT,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX (location_id, date)
);

CREATE TABLE shift_assignees (
  shift_id    VARCHAR(50) NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  user_id     VARCHAR(50) NOT NULL,
  assigned_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (shift_id, user_id)
);

CREATE TABLE swap_requests (
  id               VARCHAR(50) PRIMARY KEY,
  shift_id         VARCHAR(50) NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  requester_id     VARCHAR(50) NOT NULL,
  target_user_id   VARCHAR(50),
  status           VARCHAR(20) NOT NULL DEFAULT 'pending',
  message          TEXT,
  created_at       DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at      DATETIME
);

CREATE TABLE marketplace_listings (
  id                  VARCHAR(50)  PRIMARY KEY,
  shift_id            VARCHAR(50)  NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  posted_by_user_id   VARCHAR(50)  NOT NULL,
  status              VARCHAR(20)  NOT NULL DEFAULT 'open',
  bonus_usd           DECIMAL(8,2),
  note                TEXT,
  claimed_by_user_id  VARCHAR(50),
  posted_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  claimed_at          DATETIME
);

-- Rooms, tasks, maintenance (may already exist)
CREATE TABLE IF NOT EXISTS rooms (
  id                  VARCHAR(50)  PRIMARY KEY,
  location_id         VARCHAR(50)  NOT NULL,
  room_number         VARCHAR(10)  NOT NULL,
  room_label          VARCHAR(100),
  room_type           VARCHAR(50),
  bed_count           INT,
  bed_type_summary    VARCHAR(50),
  housekeeping_status VARCHAR(30)  NOT NULL DEFAULT 'dirty',
  occupancy_status    VARCHAR(30)  NOT NULL DEFAULT 'vacant',
  inspection_status   VARCHAR(30)  NOT NULL DEFAULT 'not_required',
  maintenance_status  VARCHAR(30)  NOT NULL DEFAULT 'ok',
  pet_policy          VARCHAR(30)  NOT NULL DEFAULT 'standard',
  smoking_status      VARCHAR(30)  NOT NULL DEFAULT 'non_smoking',
  notes               TEXT,
  is_active           TINYINT(1)   NOT NULL DEFAULT 1,
  created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE (location_id, room_number)
);
```

---

## Seed Users

Password for all seed users: `SilverSands2025!`

| id       | email                          | first_name | last_name | job_title                 | role       |
|----------|-------------------------------|------------|-----------|---------------------------|------------|
| user-001 | manager@silversands.com       | Sarah      | Okonkwo   | General Manager           | owner      |
| user-002 | front.desk@silversands.com    | Marcus     | Yee       | Front Desk Supervisor     | supervisor |
| user-003 | hk.lead@silversands.com       | Amara      | Singh     | Housekeeping Lead         | supervisor |
| user-004 | hk.01@silversands.com         | James      | Boateng   | Housekeeper               | staff      |
| user-005 | hk.02@silversands.com         | Priya      | Nair      | Housekeeper               | staff      |
| user-006 | maintenance@silversands.com   | Derek      | Walsh     | Maintenance Technician    | staff      |

---

## Notes

- The frontend currently uses a local Express/SQLite server for rooms, tasks, auth, locations, users, and shifts. You are building the PythonAnywhere counterpart that mirrors the same API contract so the frontend can be switched to point directly at PythonAnywhere.
- All JWT tokens should expire after 8 hours and be refreshable.
- All list endpoints should accept optional `?page=&page_size=` for pagination (default page_size=100).
- CORS: allow all origins during development (`Access-Control-Allow-Origin: *`).
- The frontend sends `Authorization: Bearer <token>` on all requests after login.
