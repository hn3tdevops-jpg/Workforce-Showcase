# Project Manager Backend Contract

## Docs

### GET `/api/v1/project-manager/docs`
Returns tracked project docs.

```json
[
  {
    "id": "doc_1",
    "title": "HN3T_MASTER_PLAN.md",
    "module": "platform",
    "type": "Master Plan",
    "status": "Canonical",
    "owner": "Project Core",
    "updated": "2026-04-04",
    "summary": "Primary roadmap and execution order for the full Workforce platform.",
    "path": "/docs/HN3T_MASTER_PLAN.md"
  }
]
```

## Tasks

### GET `/api/v1/project-manager/tasks`
Returns task records.

## Sources

### GET `/api/v1/project-manager/sources`
Returns project source files or ingested text items.

## Progress

### GET `/api/v1/project-manager/progress`
Returns timeline entries.

## AI Brief

### POST `/api/v1/project-manager/ai/brief`
Accepts context and returns a generated summary.

Suggested request:

```json
{
  "focus": "platform",
  "instruction": "Summarize drift from the master plan and recommend next tasks.",
  "docs": [],
  "tasks": [],
  "sources": [],
  "progress": []
}
```

Suggested response:

```json
{
  "summary": "...",
  "risks": ["..."],
  "next_tasks": ["..."],
  "progress_entry": "..."
}
```
