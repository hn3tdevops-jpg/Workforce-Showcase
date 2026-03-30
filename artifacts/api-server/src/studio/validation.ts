import Database from "better-sqlite3";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ValidationIssue {
  rule_id:      string;
  severity:     "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  category:     "MODEL" | "REQUIREMENT" | "QUESTION" | "WORKFLOW" | "COVERAGE";
  title:        string;
  detail?:      string;
  subject_id?:  string;
  subject_type?: "ENTITY" | "WORKFLOW" | "VIEW" | "CONCEPT" | "RELATIONSHIP" | "REQUIREMENT" | "QUESTION";
}

// ── Individual rules ──────────────────────────────────────────────────────────

function ruleNoDuplicateEntities(db: Database.Database, pid: string): ValidationIssue[] {
  const entities = db.prepare("SELECT id, name FROM studio_entities WHERE project_id = ?").all(pid) as any[];
  const seen = new Map<string, string>();
  const issues: ValidationIssue[] = [];
  for (const e of entities) {
    const key = e.name.toLowerCase().trim();
    if (seen.has(key)) {
      issues.push({
        rule_id:      "DUPLICATE_ENTITY",
        severity:     "HIGH",
        category:     "MODEL",
        title:        `Duplicate entity: "${e.name}"`,
        detail:       `Another entity with the same name (case-insensitive) already exists. Merge or rename one.`,
        subject_id:   e.id,
        subject_type: "ENTITY",
      });
    } else {
      seen.set(key, e.id);
    }
  }
  return issues;
}

function ruleEntityHasAttributes(db: Database.Database, pid: string): ValidationIssue[] {
  const entities = db.prepare("SELECT id, name, attributes FROM studio_entities WHERE project_id = ?").all(pid) as any[];
  return entities
    .filter(e => {
      try { const a = JSON.parse(e.attributes); return Array.isArray(a) && a.length === 0; } catch { return false; }
    })
    .map(e => ({
      rule_id:      "ENTITY_NO_ATTRIBUTES",
      severity:     "LOW" as const,
      category:     "MODEL" as const,
      title:        `Entity "${e.name}" has no attributes`,
      detail:       "Add at least one attribute so the entity is meaningful in a schema.",
      subject_id:   e.id,
      subject_type: "ENTITY" as const,
    }));
}

function ruleWorkflowMinSteps(db: Database.Database, pid: string): ValidationIssue[] {
  const workflows = db.prepare("SELECT id, name, steps FROM studio_workflows WHERE project_id = ?").all(pid) as any[];
  return workflows
    .filter(w => {
      try { const s = JSON.parse(w.steps); return Array.isArray(s) && s.length < 2; } catch { return true; }
    })
    .map(w => ({
      rule_id:      "WORKFLOW_TOO_SHORT",
      severity:     "MEDIUM" as const,
      category:     "WORKFLOW" as const,
      title:        `Workflow "${w.name}" has fewer than 2 steps`,
      detail:       "A workflow with 0 or 1 steps is likely incomplete. Describe the process in more detail in chat.",
      subject_id:   w.id,
      subject_type: "WORKFLOW" as const,
    }));
}

function ruleBrokenRelationships(db: Database.Database, pid: string): ValidationIssue[] {
  const rels      = db.prepare("SELECT id, from_name, to_name FROM studio_relationships WHERE project_id = ?").all(pid) as any[];
  const entities  = new Set((db.prepare("SELECT name FROM studio_entities  WHERE project_id = ?").all(pid) as any[]).map(r => r.name.toLowerCase()));
  const workflows = new Set((db.prepare("SELECT name FROM studio_workflows WHERE project_id = ?").all(pid) as any[]).map(r => r.name.toLowerCase()));
  const views     = new Set((db.prepare("SELECT name FROM studio_views     WHERE project_id = ?").all(pid) as any[]).map(r => r.name.toLowerCase()));
  const concepts  = new Set((db.prepare("SELECT name FROM studio_concepts  WHERE project_id = ?").all(pid) as any[]).map(r => r.name.toLowerCase()));
  const allNames  = new Set([...entities, ...workflows, ...views, ...concepts]);

  return rels
    .filter(r => !allNames.has(r.from_name.toLowerCase()) || !allNames.has(r.to_name.toLowerCase()))
    .map(r => ({
      rule_id:      "BROKEN_RELATIONSHIP",
      severity:     "MEDIUM" as const,
      category:     "MODEL" as const,
      title:        `Broken link: "${r.from_name}" → "${r.to_name}"`,
      detail:       `One or both sides of this relationship have no matching entity, workflow, view, or concept.`,
      subject_id:   r.id,
      subject_type: "RELATIONSHIP" as const,
    }));
}

function ruleUnconfirmedCriticalReqs(db: Database.Database, pid: string): ValidationIssue[] {
  const reqs = db.prepare(`
    SELECT id, statement FROM studio_requirements
    WHERE project_id = ? AND priority = 'CRITICAL' AND status != 'CONFIRMED'
  `).all(pid) as any[];
  return reqs.map(r => ({
    rule_id:      "UNCONFIRMED_CRITICAL_REQ",
    severity:     "HIGH" as const,
    category:     "REQUIREMENT" as const,
    title:        `CRITICAL requirement not confirmed`,
    detail:       r.statement.slice(0, 120),
    subject_id:   r.id,
    subject_type: "REQUIREMENT" as const,
  }));
}

function ruleUnresolvedHighQuestions(db: Database.Database, pid: string): ValidationIssue[] {
  const questions = db.prepare(`
    SELECT id, question, severity FROM studio_open_questions
    WHERE project_id = ? AND resolved_at IS NULL AND severity IN ('HIGH','CRITICAL')
  `).all(pid) as any[];
  return questions.map(q => ({
    rule_id:      "UNRESOLVED_HIGH_QUESTION",
    severity:     q.severity as "HIGH" | "CRITICAL",
    category:     "QUESTION" as const,
    title:        `Unresolved ${q.severity} question`,
    detail:       q.question.slice(0, 120),
    subject_id:   q.id,
    subject_type: "QUESTION" as const,
  }));
}

function ruleMissingDescriptions(db: Database.Database, pid: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const tables: Array<{ table: string; type: "ENTITY" | "WORKFLOW" | "VIEW" | "CONCEPT"; descCol: string }> = [
    { table: "studio_entities",  type: "ENTITY",  descCol: "description" },
    { table: "studio_workflows", type: "WORKFLOW", descCol: "description" },
    { table: "studio_views",     type: "VIEW",     descCol: "description" },
    { table: "studio_concepts",  type: "CONCEPT",  descCol: "definition"  },
  ];

  for (const { table, type, descCol } of tables) {
    const rows = db.prepare(`SELECT id, name, ${descCol} as val FROM ${table} WHERE project_id = ?`).all(pid) as any[];
    for (const row of rows) {
      if (!row.val || row.val.trim().length < 5) {
        issues.push({
          rule_id:      "MISSING_DESCRIPTION",
          severity:     "LOW",
          category:     "MODEL",
          title:        `${type} "${row.name}" has no meaningful description`,
          detail:       "Add a description by discussing this in the chat so the AI can extract context.",
          subject_id:   row.id,
          subject_type: type,
        });
      }
    }
  }
  return issues;
}

function ruleCoverageCheck(db: Database.Database, pid: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const messageCount = (db.prepare(`
    SELECT COUNT(*) as cnt FROM studio_messages m
    JOIN studio_sessions s ON s.id = m.session_id
    WHERE s.project_id = ?
  `).get(pid) as any).cnt;

  if (messageCount >= 5) {
    const entityCount   = (db.prepare("SELECT COUNT(*) as cnt FROM studio_entities  WHERE project_id = ?").get(pid) as any).cnt;
    const workflowCount = (db.prepare("SELECT COUNT(*) as cnt FROM studio_workflows WHERE project_id = ?").get(pid) as any).cnt;
    const reqCount      = (db.prepare("SELECT COUNT(*) as cnt FROM studio_requirements WHERE project_id = ?").get(pid) as any).cnt;

    if (entityCount === 0) {
      issues.push({
        rule_id:  "NO_ENTITIES",
        severity: "MEDIUM",
        category: "COVERAGE",
        title:    "No entities derived yet",
        detail:   "After several messages no entities were found. Try clicking 'Derive from Conversation' or describe your data model more explicitly.",
      });
    }
    if (workflowCount === 0 && entityCount > 0) {
      issues.push({
        rule_id:  "NO_WORKFLOWS",
        severity: "LOW",
        category: "COVERAGE",
        title:    "No workflows derived yet",
        detail:   "Describe processes, steps, or user journeys in the chat to derive workflows.",
      });
    }
    if (reqCount === 0) {
      issues.push({
        rule_id:  "NO_REQUIREMENTS",
        severity: "MEDIUM",
        category: "COVERAGE",
        title:    "No requirements captured yet",
        detail:   "Use phrases like 'must', 'should', 'required', or 'needs to' when describing features so requirements are extracted.",
      });
    }
  }
  return issues;
}

// ── Main runner ───────────────────────────────────────────────────────────────

export function runValidation(db: Database.Database, projectId: string): ValidationIssue[] {
  const all: ValidationIssue[] = [
    ...ruleNoDuplicateEntities(db, projectId),
    ...ruleEntityHasAttributes(db, projectId),
    ...ruleWorkflowMinSteps(db, projectId),
    ...ruleBrokenRelationships(db, projectId),
    ...ruleUnconfirmedCriticalReqs(db, projectId),
    ...ruleUnresolvedHighQuestions(db, projectId),
    ...ruleMissingDescriptions(db, projectId),
    ...ruleCoverageCheck(db, projectId),
  ];
  return all;
}
