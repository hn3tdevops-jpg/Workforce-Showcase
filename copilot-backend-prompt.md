# Workforce — PythonAnywhere Backend Implementation Guide

## What this is

The existing frontend at `https://hn3t.pythonanywhere.com` is the live deployment target for the Workforce operations platform. The frontend expects a **FastAPI + SQLAlchemy + SQLite** backend at `/api/v1`.

This document describes the full expected API contract so the backend can be completed or extended to cover the endpoints the frontend depends on.

---

## Tech Stack

- **Framework**: FastAPI
- **ORM**: SQLAlchemy (with Alembic for migrations)
- **Database**: SQLite (PythonAnywhere free tier)
- **Auth**: JWT Bearer tokens — `Authorization: Bearer <token>`
- **Response format**: JSON. All error bodies return `{ "detail": "<message>" }` with appropriate HTTP status codes.

---

## Business model

- **Business**: `biz-silver-sands`
- **Locations**: `loc-001` (Main Building), `loc-002` (Pool Wing)
- **Roles**: `Owner`, `Supervisor`, `Staff`, `Concierge` (role names are capitalized when returned by the API)

---

## Auth

### `POST /api/v1/auth/login`

Request:
```json
{ "email": "...", "password": "..." }
```

Response:
```json
{
  "access_token": "<jwt>",
  "token_type": "bearer",
  "business_id": "biz-silver-sands",
  "user": { "id": "user-001", "email": "manager@silversands.com", "is_active": true }
}
```

### `GET /api/v1/auth/me`

Response:
```json
{
  "user": { "id": "user-001", "email": "manager@silversands.com", "is_active": true },
  "business_id": "biz-silver-sands",
  "memberships": [
    { "business_id": "biz-silver-sands", "status": "active", "is_owner": true }
  ],
  "roles": ["Owner"],
  "permissions": ["*"]
}
```

> Note: `memberships` items have `business_id`, `status`, `is_owner`. The frontend maps this shape internally. `roles` is a string array. `permissions` is a string array.

### `POST /api/v1/auth/switch-business`

Request: `{ "business_id": "..." }`

Response:
```json
{
  "access_token": "<jwt>",
  "token_type": "bearer",
  "business_id": "biz-silver-sands",
  "roles": ["Owner"],
  "permissions": ["*"]
}
```

### `POST /api/v1/auth/logout`

Response: `200 OK`

Tokens expire after 8 hours. Include a `POST /api/v1/auth/refresh` endpoint that accepts `{ "token": "..." }` and returns a new `{ "access_token": "..." }`.

---

## Locations

```
GET    /api/v1/locations/                   → Location[]
GET    /api/v1/locations/{location_id}      → Location
PATCH  /api/v1/locations/{location_id}      body: { name?, address?, timezone? }
```

```python
# SQLAlchemy model sketch
class Location(Base):
    __tablename__ = "locations"
    id          = Column(String, primary_key=True)
    business_id = Column(String, nullable=False)
    name        = Column(String, nullable=False)
    address     = Column(String)
    timezone    = Column(String, default="America/New_York")
    is_active   = Column(Boolean, default=True)
    created_at  = Column(DateTime, default=func.now())
    updated_at  = Column(DateTime, default=func.now(), onupdate=func.now())
```

Seed:
- `loc-001`, `biz-silver-sands`, "Silver Sands Motel", "12 Ocean Drive", `America/New_York`
- `loc-002`, `biz-silver-sands`, "Silver Sands Pool Wing", "12 Ocean Drive (West)", `America/New_York`

---

## Users / Staff

```
GET    /api/v1/users/              → User[]
GET    /api/v1/users/{user_id}     → User
POST   /api/v1/users/              body: { email, first_name, last_name, job_title?, role?, phone? }
PATCH  /api/v1/users/{user_id}     body: { first_name?, last_name?, email?, job_title?, role?, phone?, hire_date?, is_active? }
DELETE /api/v1/users/{user_id}     → soft-delete (is_active = False)
```

```python
class User(Base):
    __tablename__ = "users"
    id            = Column(String, primary_key=True)
    email         = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    first_name    = Column(String, nullable=False)
    last_name     = Column(String, nullable=False)
    job_title     = Column(String)
    role          = Column(String, default="Staff")   # "Owner" | "Supervisor" | "Staff" | "Concierge"
    phone         = Column(String)
    hire_date     = Column(Date)
    is_active     = Column(Boolean, default=True)
    created_at    = Column(DateTime, default=func.now())
    updated_at    = Column(DateTime, default=func.now(), onupdate=func.now())
```

---

## Roles (static)

```
GET /api/v1/roles/   → Role[]
```

Return:
```json
[
  { "id": "owner",      "name": "Owner",      "permissions": ["*"] },
  { "id": "supervisor", "name": "Supervisor", "permissions": ["rooms:write", "tasks:write", "staff:read"] },
  { "id": "staff",      "name": "Staff",      "permissions": ["tasks:read", "tasks:write:own"] },
  { "id": "concierge",  "name": "Concierge",  "permissions": ["rooms:read"] }
]
```

---

## Shifts

```
GET    /api/v1/shifts/                       ?location_id=&week_start=YYYY-MM-DD → Shift[]
POST   /api/v1/shifts/                       body: { location_id, title, role, date, start_time, end_time, capacity?, notes? }
PATCH  /api/v1/shifts/{shift_id}             body: { title?, role?, date?, start_time?, end_time?, capacity?, status?, notes? }
DELETE /api/v1/shifts/{shift_id}             → sets status = "cancelled"
```

**Assignees:**
```
POST   /api/v1/shifts/{shift_id}/assignees            body: { user_id }  → Shift
DELETE /api/v1/shifts/{shift_id}/assignees/{user_id}                     → Shift
```

```python
class Shift(Base):
    __tablename__ = "shifts"
    id          = Column(String, primary_key=True)
    location_id = Column(String, nullable=False)
    title       = Column(String, nullable=False)
    role        = Column(String, default="housekeeping")
    date        = Column(Date, nullable=False)
    start_time  = Column(String, nullable=False)  # "HH:MM"
    end_time    = Column(String, nullable=False)
    capacity    = Column(Integer, default=1)
    status      = Column(String, default="open")  # open | partial | filled | draft | cancelled | in_progress | completed
    notes       = Column(Text)
    created_at  = Column(DateTime, default=func.now())
    updated_at  = Column(DateTime, default=func.now(), onupdate=func.now())

class ShiftAssignee(Base):
    __tablename__ = "shift_assignees"
    shift_id    = Column(String, ForeignKey("shifts.id", ondelete="CASCADE"), primary_key=True)
    user_id     = Column(String, primary_key=True)
    assigned_at = Column(DateTime, default=func.now())
```

Each Shift response should include `"assignee_ids": [...]` derived from ShiftAssignee rows.

Auto-compute `status` on assignee add/remove:
- 0 assignees → `"open"`
- 0 < assignees < capacity → `"partial"`
- assignees >= capacity → `"filled"`

---

## Shift Swap Requests

```
GET  /api/v1/shifts/swaps/                           → SwapRequest[]
POST /api/v1/shifts/swaps/                           body: { shift_id, requester_id, target_user_id?, message? }
POST /api/v1/shifts/swaps/{swap_id}/approved         → SwapRequest  (swaps assignees)
POST /api/v1/shifts/swaps/{swap_id}/denied           → SwapRequest
POST /api/v1/shifts/swaps/{swap_id}/accepted         → SwapRequest
POST /api/v1/shifts/swaps/{swap_id}/withdrawn        → SwapRequest
```

```python
class SwapRequest(Base):
    __tablename__ = "swap_requests"
    id              = Column(String, primary_key=True)
    shift_id        = Column(String, ForeignKey("shifts.id", ondelete="CASCADE"), nullable=False)
    requester_id    = Column(String, nullable=False)
    target_user_id  = Column(String)
    status          = Column(String, default="pending")  # pending | accepted | approved | denied | withdrawn
    message         = Column(Text)
    created_at      = Column(DateTime, default=func.now())
    resolved_at     = Column(DateTime)
```

When `approved`: remove `requester_id` from shift assignees, add `target_user_id`, recalculate shift status.

---

## Shift Marketplace

```
GET  /api/v1/shifts/marketplace/                          → Listing[]
POST /api/v1/shifts/marketplace/                          body: { shift_id, posted_by_user_id, bonus_usd?, note? }
POST /api/v1/shifts/marketplace/{listing_id}/claim        body: { user_id } → Listing
POST /api/v1/shifts/marketplace/{listing_id}/cancel                         → Listing
```

```python
class MarketplaceListing(Base):
    __tablename__ = "marketplace_listings"
    id                  = Column(String, primary_key=True)
    shift_id            = Column(String, ForeignKey("shifts.id", ondelete="CASCADE"), nullable=False)
    posted_by_user_id   = Column(String, nullable=False)
    status              = Column(String, default="open")   # open | claimed | cancelled
    bonus_usd           = Column(Numeric(8, 2))
    note                = Column(Text)
    claimed_by_user_id  = Column(String)
    posted_at           = Column(DateTime, default=func.now())
    claimed_at          = Column(DateTime)
```

When claimed: add `user_id` to shift assignees and recalculate shift status.

---

## Rooms (Hospitable module)

```
GET    /api/v1/hospitable/rooms                    ?location_id=  → Room[]
GET    /api/v1/hospitable/rooms/{room_id}                         → Room
POST   /api/v1/hospitable/rooms                    body: { location_id, room_number, room_type?, bed_count?, ... }
PATCH  /api/v1/hospitable/rooms/{room_id}/status   body: { housekeeping_status?, occupancy_status?, inspection_status? }
POST   /api/v1/hospitable/rooms/bulk-status        body: { room_ids: [], status: "...", status_type: "housekeeping|occupancy" }
GET    /api/v1/hospitable/rooms/{room_id}/assets   → Asset[]
GET    /api/v1/hospitable/rooms/{room_id}/supply-pars → SupplyPar[]
```

Room status enums:
- `housekeeping_status`: `dirty | clean | ready_for_inspection | inspected | stay_over | do_not_disturb | laundry_only | maintenance_hold`
- `occupancy_status`: `vacant | occupied | checkout | due_in | blocked`
- `inspection_status`: `not_required | pending | passed | failed`

---

## Tasks (Hospitable module)

```
GET    /api/v1/hospitable/tasks                    ?location_id=&status=&room_id=&assignee_id= → Task[]
POST   /api/v1/hospitable/tasks                    body: { location_id, room_id?, task_type, title, priority?, description? }
PATCH  /api/v1/hospitable/tasks/{task_id}/status   body: { status }
POST   /api/v1/hospitable/tasks/{task_id}/assign   body: { user_id }
POST   /api/v1/hospitable/tasks/{task_id}/complete
GET    /api/v1/hospitable/tasks/{task_id}/events   → TaskEvent[]
```

Task statuses: `pending | in_progress | completed | cancelled | blocked`
Task types: `housekeeping | maintenance | inspection | linen | amenity | other`

---

## Dashboard (Hospitable module)

```
GET /api/v1/hospitable/dashboard/room-board-summary     ?location_id=
GET /api/v1/hospitable/dashboard/housekeeping-board     ?location_id=
GET /api/v1/hospitable/dashboard/maintenance-board      ?location_id=
```

`room-board-summary` returns counts per housekeeping status:
```json
{
  "dirty": 8,
  "clean": 12,
  "ready_for_inspection": 3,
  "inspected": 5,
  "maintenance_hold": 2,
  "total": 30
}
```

---

## Seed users

Password for all: `SilverSands2025!`

| id       | email                        | first_name | last_name | job_title              | role       |
|----------|------------------------------|------------|-----------|------------------------|------------|
| user-001 | manager@silversands.com      | Sarah      | Okonkwo   | General Manager        | Owner      |
| user-002 | front.desk@silversands.com   | Marcus     | Yee       | Front Desk Supervisor  | Supervisor |
| user-003 | hk.lead@silversands.com      | Amara      | Singh     | Housekeeping Lead      | Supervisor |
| user-004 | hk.01@silversands.com        | James      | Boateng   | Housekeeper            | Staff      |
| user-005 | hk.02@silversands.com        | Priya      | Nair      | Housekeeper            | Staff      |
| user-006 | maintenance@silversands.com  | Derek      | Walsh     | Maintenance Tech       | Staff      |

---

## General rules

- All list endpoints should support `?page=&page_size=` (default `page_size=100`).
- All JWT tokens expire after 8 hours.
- CORS: allow all origins during development.
- IDs are short UUIDs or slug strings (`"shift-abc12345"`, `"user-001"`, etc.).
- Timestamps are ISO-8601 UTC strings.
- The frontend sends `Authorization: Bearer <token>` on every authenticated request.
- Soft-delete users (set `is_active = False`); never hard-delete.
- Role names are capitalized in API responses (`"Owner"`, not `"owner"`). The frontend does case-insensitive comparisons for guards like `isOwner()` and `hasRole()`.

---

## Notes on existing backend

The endpoint at `https://hn3t.pythonanywhere.com` already handles auth. The frontend proxies there for anything not handled locally. The goal of completing this backend is to:

1. Add `/locations/`, `/users/`, `/roles/` so the frontend's staff management features work without local Express fallback.
2. Add `/shifts/*`, `/shifts/swaps/*`, `/shifts/marketplace/*` for full scheduling support.
3. Ensure the hospitable module (`/hospitable/rooms`, `/hospitable/tasks`, `/hospitable/dashboard/*`) is complete and consistent with the room/task status enums above.
