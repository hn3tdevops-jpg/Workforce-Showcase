import Database from "better-sqlite3";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ArtifactType =
  | "SUMMARY"
  | "DESIGN_DOC"
  | "SCHEMA_DRAFT"
  | "API_SPEC"
  | "ROADMAP"
  | "COPILOT_PACK";

export const ARTIFACT_META: Record<ArtifactType, { label: string; emoji: string; description: string }> = {
  SUMMARY:     { label: "Executive Summary",     emoji: "📋", description: "High-level project overview and stats" },
  DESIGN_DOC:  { label: "Design Document",       emoji: "📐", description: "Full structured design spec in Markdown" },
  SCHEMA_DRAFT:{ label: "Schema Draft",          emoji: "🗄️",  description: "SQL table definitions for all entities" },
  API_SPEC:    { label: "API Spec",              emoji: "🔌", description: "REST endpoint blueprint derived from models" },
  ROADMAP:     { label: "Roadmap",               emoji: "🗺️",  description: "Phased delivery plan from requirements" },
  COPILOT_PACK:{ label: "Copilot Handoff Pack",  emoji: "🤖", description: "AI-ready context bundle for developers" },
};

// ── Data loaders ──────────────────────────────────────────────────────────────

function loadProject(db: Database.Database, pid: string) {
  return db.prepare("SELECT * FROM studio_projects WHERE id = ?").get(pid) as any;
}
function loadEntities(db: Database.Database, pid: string): any[] {
  return db.prepare("SELECT * FROM studio_entities WHERE project_id = ? ORDER BY name").all(pid) as any[];
}
function loadWorkflows(db: Database.Database, pid: string): any[] {
  return db.prepare("SELECT * FROM studio_workflows WHERE project_id = ? ORDER BY name").all(pid) as any[];
}
function loadViews(db: Database.Database, pid: string): any[] {
  return db.prepare("SELECT * FROM studio_views WHERE project_id = ? ORDER BY name").all(pid) as any[];
}
function loadConcepts(db: Database.Database, pid: string): any[] {
  return db.prepare("SELECT * FROM studio_concepts WHERE project_id = ? ORDER BY name").all(pid) as any[];
}
function loadRelationships(db: Database.Database, pid: string): any[] {
  return db.prepare("SELECT * FROM studio_relationships WHERE project_id = ? ORDER BY from_name").all(pid) as any[];
}
function loadRequirements(db: Database.Database, pid: string): any[] {
  return db.prepare("SELECT * FROM studio_requirements WHERE project_id = ? ORDER BY priority DESC, created_at").all(pid) as any[];
}
function loadDecisions(db: Database.Database, pid: string): any[] {
  return db.prepare("SELECT * FROM studio_decisions WHERE project_id = ? ORDER BY created_at").all(pid) as any[];
}
function loadQuestions(db: Database.Database, pid: string): any[] {
  return db.prepare("SELECT * FROM studio_open_questions WHERE project_id = ? AND resolved_at IS NULL ORDER BY severity DESC").all(pid) as any[];
}
function loadNotes(db: Database.Database, pid: string): any[] {
  return db.prepare("SELECT * FROM studio_notes WHERE project_id = ? ORDER BY created_at DESC LIMIT 30").all(pid) as any[];
}
function msgCount(db: Database.Database, pid: string): number {
  return ((db.prepare(`
    SELECT COUNT(*) as cnt FROM studio_messages m
    JOIN studio_sessions s ON s.id = m.session_id WHERE s.project_id = ?
  `).get(pid) as any).cnt as number);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseJson(s: string, fallback: unknown[] = []): unknown[] {
  try { return JSON.parse(s); } catch { return fallback; }
}

function hr(char = "─", len = 60) { return char.repeat(len); }

function mdTable(headers: string[], rows: string[][]): string {
  const head = `| ${headers.join(" | ")} |`;
  const sep  = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows.map(r => `| ${r.join(" | ")} |`).join("\n");
  return [head, sep, body].join("\n");
}

function priorityOrder(p: string): number {
  return { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }[p] ?? 4;
}

// ── SUMMARY generator ─────────────────────────────────────────────────────────

function genSummary(db: Database.Database, pid: string): string {
  const project   = loadProject(db, pid);
  const entities  = loadEntities(db, pid);
  const workflows = loadWorkflows(db, pid);
  const views     = loadViews(db, pid);
  const concepts  = loadConcepts(db, pid);
  const reqs      = loadRequirements(db, pid);
  const decisions = loadDecisions(db, pid);
  const questions = loadQuestions(db, pid);
  const msgs      = msgCount(db, pid);

  const confirmedReqs  = reqs.filter(r => r.status === "CONFIRMED");
  const criticalReqs   = reqs.filter(r => r.priority === "CRITICAL");

  const lines: string[] = [
    `EXECUTIVE SUMMARY — ${project.title.toUpperCase()}`,
    hr(),
    ``,
    `Project:    ${project.title}`,
    `Scope:      ${project.scope_type}`,
    `Domain:     ${project.domain_type || "General"}`,
    `Status:     ${project.status}`,
    `Generated:  ${new Date().toISOString().split("T")[0]}`,
    ``,
    `CONVERSATION HISTORY`,
    hr("─", 30),
    `Messages exchanged:  ${msgs}`,
    ``,
    `MODEL OVERVIEW`,
    hr("─", 30),
    `Entities:      ${entities.length}  (${entities.filter(e => e.status === "CONFIRMED").length} confirmed)`,
    `Workflows:     ${workflows.length}  (${workflows.filter(w => w.status === "CONFIRMED").length} confirmed)`,
    `UI Views:      ${views.length}`,
    `Concepts:      ${concepts.length}`,
    ``,
    `REQUIREMENTS OVERVIEW`,
    hr("─", 30),
    `Total:         ${reqs.length}`,
    `Critical:      ${criticalReqs.length}`,
    `Confirmed:     ${confirmedReqs.length}`,
    ``,
  ];

  if (criticalReqs.length) {
    lines.push(`CRITICAL REQUIREMENTS`);
    lines.push(hr("─", 30));
    criticalReqs.slice(0, 8).forEach(r => {
      lines.push(`  • [${r.requirement_type}] ${r.statement}`);
    });
    lines.push("");
  }

  if (decisions.length) {
    lines.push(`KEY DECISIONS`);
    lines.push(hr("─", 30));
    decisions.slice(0, 6).forEach(d => {
      lines.push(`  ✓ ${d.title}`);
      if (d.decision_text) lines.push(`    ${d.decision_text}`);
    });
    lines.push("");
  }

  if (questions.length) {
    lines.push(`OPEN QUESTIONS (${questions.length})`);
    lines.push(hr("─", 30));
    questions.slice(0, 5).forEach(q => {
      lines.push(`  ? [${q.severity}] ${q.question}`);
    });
    lines.push("");
  }

  if (project.summary) {
    lines.push(`PROJECT DESCRIPTION`);
    lines.push(hr("─", 30));
    lines.push(project.summary);
    lines.push("");
  }

  return lines.join("\n");
}

// ── DESIGN_DOC generator ──────────────────────────────────────────────────────

function genDesignDoc(db: Database.Database, pid: string): string {
  const project   = loadProject(db, pid);
  const entities  = loadEntities(db, pid);
  const workflows = loadWorkflows(db, pid);
  const views     = loadViews(db, pid);
  const concepts  = loadConcepts(db, pid);
  const rels      = loadRelationships(db, pid);
  const reqs      = loadRequirements(db, pid);
  const decisions = loadDecisions(db, pid);
  const questions = loadQuestions(db, pid);

  const sections: string[] = [];

  sections.push(`# ${project.title} — Design Document`);
  sections.push(`\n> **Scope:** ${project.scope_type} | **Domain:** ${project.domain_type || "General"} | **Generated:** ${new Date().toISOString().split("T")[0]}\n`);

  if (project.summary) {
    sections.push(`## Overview\n\n${project.summary}\n`);
  }

  // Entities
  if (entities.length) {
    sections.push(`## Data Model — Entities\n`);
    entities.forEach(e => {
      const attrs = parseJson(e.attributes) as string[];
      sections.push(`### ${e.name}`);
      sections.push(`**Status:** ${e.status}`);
      if (e.description) sections.push(`\n${e.description}\n`);
      if (attrs.length) {
        sections.push(`\n**Attributes:**`);
        attrs.forEach(a => sections.push(`- \`${a}\``));
      }
      sections.push("");
    });
  }

  // Workflows
  if (workflows.length) {
    sections.push(`## Process Flows\n`);
    workflows.forEach(w => {
      const steps = parseJson(w.steps) as string[];
      sections.push(`### ${w.name}`);
      sections.push(`**Status:** ${w.status}`);
      if (w.description) sections.push(`\n${w.description}\n`);
      if (steps.length) {
        sections.push(`\n**Steps:**`);
        steps.forEach((s, i) => sections.push(`${i + 1}. ${s}`));
      }
      sections.push("");
    });
  }

  // UI Views
  if (views.length) {
    sections.push(`## UI Views\n`);
    sections.push(mdTable(
      ["View Name", "Type", "Description"],
      views.map(v => [v.name, v.view_type, v.description || "—"])
    ));
    sections.push("");
  }

  // Concepts
  if (concepts.length) {
    sections.push(`## Domain Concepts / Glossary\n`);
    concepts.forEach(c => {
      sections.push(`**${c.name}**`);
      sections.push(`${c.definition || "—"}\n`);
    });
  }

  // Relationships
  if (rels.length) {
    sections.push(`## Relationships\n`);
    sections.push(mdTable(
      ["From", "Type", "Relation", "To", "Type"],
      rels.map(r => [r.from_name, r.from_type, r.relation, r.to_name, r.to_type])
    ));
    sections.push("");
  }

  // Requirements
  if (reqs.length) {
    sections.push(`## Requirements\n`);
    const byPriority: Record<string, any[]> = {};
    reqs.forEach(r => {
      if (!byPriority[r.priority]) byPriority[r.priority] = [];
      byPriority[r.priority].push(r);
    });
    for (const priority of ["CRITICAL", "HIGH", "MEDIUM", "LOW"]) {
      if (!byPriority[priority]?.length) continue;
      sections.push(`### ${priority}\n`);
      byPriority[priority].forEach(r => {
        sections.push(`- **[${r.requirement_type}]** ${r.statement} *(${r.status})*`);
      });
      sections.push("");
    }
  }

  // Decisions
  if (decisions.length) {
    sections.push(`## Decisions Log\n`);
    decisions.forEach(d => {
      sections.push(`### ✓ ${d.title}`);
      sections.push(`${d.decision_text}`);
      if (d.rationale) sections.push(`\n*Rationale:* ${d.rationale}`);
      sections.push("");
    });
  }

  // Open questions
  if (questions.length) {
    sections.push(`## Open Questions\n`);
    questions.forEach(q => {
      sections.push(`- **[${q.severity}]** ${q.question}`);
      if (q.why_it_matters) sections.push(`  *Why it matters:* ${q.why_it_matters}`);
    });
    sections.push("");
  }

  return sections.join("\n");
}

// ── SCHEMA_DRAFT generator ────────────────────────────────────────────────────

function genSchemaDraft(db: Database.Database, pid: string): string {
  const project  = loadProject(db, pid);
  const entities = loadEntities(db, pid);

  const lines: string[] = [
    `-- Schema Draft: ${project.title}`,
    `-- Generated: ${new Date().toISOString().split("T")[0]}`,
    `-- Status: DRAFT — review and adjust types/constraints before production use`,
    ``,
  ];

  if (!entities.length) {
    lines.push("-- No entities derived yet. Run 'Derive from Conversation' first.");
    return lines.join("\n");
  }

  entities.forEach(e => {
    const attrs = parseJson(e.attributes) as string[];
    lines.push(`-- ${e.description || e.name}`);
    lines.push(`CREATE TABLE IF NOT EXISTS ${snakeCase(e.name)} (`);
    lines.push(`  id         TEXT    PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),`);

    attrs.forEach(attr => {
      const col = snakeCase(attr);
      const type = guessColType(attr);
      lines.push(`  ${col.padEnd(20)} ${type},`);
    });

    lines.push(`  created_at TEXT    NOT NULL DEFAULT (datetime('now')),`);
    lines.push(`  updated_at TEXT    NOT NULL DEFAULT (datetime('now'))`);
    lines.push(`);`);
    lines.push(``);
  });

  return lines.join("\n");
}

function snakeCase(s: string): string {
  return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
}

function guessColType(attr: string): string {
  const a = attr.toLowerCase();
  if (/date|_at|time|day/.test(a))   return "TEXT";
  if (/count|qty|amount|num|hours|price|cost|rate/.test(a)) return "REAL";
  if (/is_|has_|flag|active|enabled/.test(a)) return "INTEGER NOT NULL DEFAULT 0";
  if (/id$/.test(a)) return "TEXT";
  return "TEXT";
}

// ── API_SPEC generator ────────────────────────────────────────────────────────

function genApiSpec(db: Database.Database, pid: string): string {
  const project   = loadProject(db, pid);
  const entities  = loadEntities(db, pid);
  const workflows = loadWorkflows(db, pid);

  const lines: string[] = [
    `# API Spec — ${project.title}`,
    `> Generated: ${new Date().toISOString().split("T")[0]} | Format: REST/JSON`,
    ``,
    `## Base URL`,
    `\`\`\``,
    `https://<your-domain>/api/v1`,
    `\`\`\``,
    ``,
    `## Authentication`,
    `All endpoints require a valid session token in the \`Authorization: Bearer <token>\` header.`,
    ``,
  ];

  if (!entities.length) {
    lines.push("> No entities derived yet. Run 'Derive from Conversation' to generate entity-based endpoints.");
    return lines.join("\n");
  }

  // CRUD per entity
  lines.push(`## Resource Endpoints\n`);
  entities.forEach(e => {
    const resource   = snakeCase(e.name);
    const attrs      = parseJson(e.attributes) as string[];
    const bodyFields = attrs.map(a => `"${snakeCase(a)}": <${guessColType(a).split(" ")[0].toLowerCase()}>`).join(", ");

    lines.push(`### ${e.name}\n`);
    lines.push(mdTable(
      ["Method", "Path", "Description"],
      [
        ["GET",    `/${resource}`,      `List all ${e.name} records`],
        ["POST",   `/${resource}`,      `Create a new ${e.name}`],
        ["GET",    `/${resource}/:id`,  `Get a single ${e.name} by ID`],
        ["PATCH",  `/${resource}/:id`,  `Update a ${e.name}`],
        ["DELETE", `/${resource}/:id`,  `Delete a ${e.name}`],
      ]
    ));

    if (attrs.length) {
      lines.push(`\n**Request body (POST/PATCH):**\n\`\`\`json\n{ ${bodyFields} }\n\`\`\``);
    }
    lines.push("");
  });

  // Workflow action endpoints
  if (workflows.length) {
    lines.push(`## Workflow Action Endpoints\n`);
    workflows.forEach(w => {
      const steps = parseJson(w.steps) as string[];
      const resource = snakeCase(w.name);
      lines.push(`### ${w.name}\n`);
      lines.push(mdTable(
        ["Method", "Path", "Description"],
        [
          ["POST", `/${resource}/start`,  `Initiate the ${w.name} workflow`],
          ["GET",  `/${resource}/:id`,    `Get current state`],
          ...steps.map((s, i) => ["POST" as string, `/${resource}/:id/step-${i + 1}`, s.slice(0, 60)]),
          ["POST", `/${resource}/:id/complete`, `Mark workflow complete`],
        ]
      ));
      lines.push("");
    });
  }

  return lines.join("\n");
}

// ── ROADMAP generator ─────────────────────────────────────────────────────────

function genRoadmap(db: Database.Database, pid: string): string {
  const project   = loadProject(db, pid);
  const reqs      = loadRequirements(db, pid);
  const entities  = loadEntities(db, pid);
  const workflows = loadWorkflows(db, pid);
  const views     = loadViews(db, pid);

  const lines: string[] = [
    `# Roadmap — ${project.title}`,
    `> Generated: ${new Date().toISOString().split("T")[0]} | Status: DRAFT`,
    ``,
    `## Delivery Phases\n`,
  ];

  const phases: Array<{ name: string; priority: string; description: string; items: string[] }> = [
    {
      name: "Phase 1 — Foundation",
      priority: "CRITICAL",
      description: "Core infrastructure, data models, and blocking requirements",
      items: [
        ...reqs.filter(r => r.priority === "CRITICAL").map(r => `☐ [REQUIREMENT] ${r.statement}`),
        ...entities.filter(e => e.status === "CONFIRMED").map(e => `☐ [DATA MODEL] Implement ${e.name} table and CRUD API`),
      ],
    },
    {
      name: "Phase 2 — Core Features",
      priority: "HIGH",
      description: "High-priority workflows and user-facing features",
      items: [
        ...reqs.filter(r => r.priority === "HIGH").map(r => `☐ [REQUIREMENT] ${r.statement}`),
        ...workflows.filter(w => w.status === "CONFIRMED").map(w => `☐ [WORKFLOW] Implement ${w.name}`),
      ],
    },
    {
      name: "Phase 3 — UI & Experience",
      priority: "MEDIUM",
      description: "User interface views and medium-priority enhancements",
      items: [
        ...reqs.filter(r => r.priority === "MEDIUM").map(r => `☐ [REQUIREMENT] ${r.statement}`),
        ...views.map(v => `☐ [UI] Build ${v.name} (${v.view_type})`),
      ],
    },
    {
      name: "Phase 4 — Polish & Hardening",
      priority: "LOW",
      description: "Low-priority improvements, edge cases, and non-critical features",
      items: [
        ...reqs.filter(r => r.priority === "LOW").map(r => `☐ [REQUIREMENT] ${r.statement}`),
      ],
    },
  ];

  phases.forEach(phase => {
    lines.push(`### ${phase.name}`);
    lines.push(`*${phase.description}*\n`);
    if (phase.items.length === 0) {
      lines.push(`*No ${phase.priority} priority items yet.*`);
    } else {
      phase.items.forEach(item => lines.push(item));
    }
    lines.push("");
  });

  lines.push(`## Open Questions to Resolve\n`);
  const questions = loadQuestions(db, pid);
  if (questions.length === 0) {
    lines.push("*No open questions.*");
  } else {
    questions.forEach(q => lines.push(`- [${q.severity}] ${q.question}`));
  }
  lines.push("");

  return lines.join("\n");
}

// ── COPILOT_PACK generator ────────────────────────────────────────────────────

function genCopilotPack(db: Database.Database, pid: string): string {
  const project   = loadProject(db, pid);
  const entities  = loadEntities(db, pid);
  const workflows = loadWorkflows(db, pid);
  const views     = loadViews(db, pid);
  const concepts  = loadConcepts(db, pid);
  const reqs      = loadRequirements(db, pid);
  const decisions = loadDecisions(db, pid);
  const notes     = loadNotes(db, pid);

  const lines: string[] = [
    `COPILOT HANDOFF PACK — ${project.title.toUpperCase()}`,
    `${"=".repeat(60)}`,
    `Generated: ${new Date().toISOString()}`,
    ``,
    `## CONTEXT`,
    `You are helping build a ${project.scope_type.toLowerCase()} project in the ${project.domain_type || "General"} domain.`,
    `Project: "${project.title}"`,
    project.summary ? `Summary: ${project.summary}` : "",
    ``,
    `## ENTITIES (Data Model)`,
    hr("─", 40),
  ];

  if (entities.length === 0) {
    lines.push("(none yet — run Derive from Conversation)");
  } else {
    entities.forEach(e => {
      const attrs = parseJson(e.attributes) as string[];
      lines.push(`${e.name} [${e.status}]`);
      if (e.description) lines.push(`  Description: ${e.description}`);
      if (attrs.length) lines.push(`  Fields: ${attrs.join(", ")}`);
    });
  }
  lines.push("");

  lines.push(`## WORKFLOWS`);
  lines.push(hr("─", 40));
  if (workflows.length === 0) {
    lines.push("(none yet)");
  } else {
    workflows.forEach(w => {
      const steps = parseJson(w.steps) as string[];
      lines.push(`${w.name} [${w.status}]`);
      if (w.description) lines.push(`  Description: ${w.description}`);
      steps.forEach((s, i) => lines.push(`  Step ${i + 1}: ${s}`));
    });
  }
  lines.push("");

  if (views.length) {
    lines.push(`## UI VIEWS`);
    lines.push(hr("─", 40));
    views.forEach(v => {
      lines.push(`${v.name} (${v.view_type}): ${v.description || "—"}`);
    });
    lines.push("");
  }

  if (concepts.length) {
    lines.push(`## GLOSSARY`);
    lines.push(hr("─", 40));
    concepts.forEach(c => {
      lines.push(`${c.name}: ${c.definition || "—"}`);
    });
    lines.push("");
  }

  lines.push(`## REQUIREMENTS (sorted by priority)`);
  lines.push(hr("─", 40));
  if (reqs.length === 0) {
    lines.push("(none yet)");
  } else {
    [...reqs].sort((a, b) => priorityOrder(a.priority) - priorityOrder(b.priority)).forEach(r => {
      lines.push(`[${r.priority}][${r.requirement_type}] ${r.statement}`);
    });
  }
  lines.push("");

  if (decisions.length) {
    lines.push(`## DECIDED`);
    lines.push(hr("─", 40));
    decisions.forEach(d => {
      lines.push(`✓ ${d.title}: ${d.decision_text}`);
    });
    lines.push("");
  }

  if (notes.length) {
    lines.push(`## NOTES (recent)`);
    lines.push(hr("─", 40));
    notes.slice(0, 15).forEach(n => {
      lines.push(`[${n.note_type}] ${n.body}`);
    });
    lines.push("");
  }

  lines.push(`${"=".repeat(60)}`);
  lines.push(`END OF COPILOT PACK`);

  return lines.filter(Boolean).join("\n");
}

// ── Main entry ────────────────────────────────────────────────────────────────

export function generateArtifact(db: Database.Database, projectId: string, type: ArtifactType): string {
  switch (type) {
    case "SUMMARY":      return genSummary(db, projectId);
    case "DESIGN_DOC":   return genDesignDoc(db, projectId);
    case "SCHEMA_DRAFT": return genSchemaDraft(db, projectId);
    case "API_SPEC":     return genApiSpec(db, projectId);
    case "ROADMAP":      return genRoadmap(db, projectId);
    case "COPILOT_PACK": return genCopilotPack(db, projectId);
    default:             throw new Error(`Unknown artifact type: ${type}`);
  }
}

export const ALL_ARTIFACT_TYPES: ArtifactType[] = [
  "SUMMARY", "DESIGN_DOC", "SCHEMA_DRAFT", "API_SPEC", "ROADMAP", "COPILOT_PACK",
];
