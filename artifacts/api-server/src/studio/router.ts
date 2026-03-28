import { Router, type Request, type Response } from "express";
import { getDb } from "../hospitable/db.js";
import { deriveModels } from "./modeling.js";
import { runValidation } from "./validation.js";

const router = Router();

function ok(res: Response, data: unknown, status = 200) {
  res.status(status).json(data);
}
function notFound(res: Response, msg = "Not found") {
  res.status(404).json({ detail: msg });
}
function badRequest(res: Response, msg: string) {
  res.status(400).json({ detail: msg });
}

// ── helpers ────────────────────────────────────────────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function now(): string {
  return new Date().toISOString();
}

// ── simple keyword extraction ──────────────────────────────────────────────────

interface ExtractResult {
  notes:        { note_type: string; title: string; body: string; status: string }[];
  requirements: { requirement_type: string; priority: string; statement: string; rationale: string }[];
  decisions:    { title: string; decision_text: string; rationale: string }[];
  questions:    { question: string; why_it_matters: string; severity: string }[];
}

function extractStructured(content: string, projectId: string, messageId: string): ExtractResult {
  const lower = content.toLowerCase();
  const sentences = content.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 10);
  const result: ExtractResult = { notes: [], requirements: [], decisions: [], questions: [] };

  for (const sentence of sentences) {
    const sl = sentence.toLowerCase();

    // Requirements: "need to", "must", "should", "require", "we will need"
    if (/\b(need to|must|should|require[sd]?|we('ll| will) need|has to|have to)\b/.test(sl)) {
      result.requirements.push({
        requirement_type: /ui|interface|screen|page|display|show/.test(sl) ? "UI" : "FUNCTIONAL",
        priority: /critical|urgent|immediately|asap|must/.test(sl) ? "HIGH" : "MEDIUM",
        statement: sentence,
        rationale: "",
      });
      continue;
    }

    // Decisions: "we decided", "decision is", "we'll go with", "we chose", "agreed on"
    if (/\b(decided|decision is|we('ll go| will go) with|we chose|agreed on|going with|will use)\b/.test(sl)) {
      result.decisions.push({
        title: sentence.slice(0, 60) + (sentence.length > 60 ? "…" : ""),
        decision_text: sentence,
        rationale: "",
      });
      continue;
    }

    // Questions: starts with question word or contains "?"
    if (/^(how|what|why|when|where|who|which|is there|are there|do we|should we|can we)\b/.test(sl) || sentence.includes("?") || /\b(not sure|unclear|question|wondering|concern)\b/.test(sl)) {
      result.questions.push({
        question: sentence.replace(/\?+$/, "") + "?",
        why_it_matters: "",
        severity: /critical|blocking|blocker|urgent/.test(sl) ? "HIGH" : "MEDIUM",
      });
      continue;
    }

    // Everything else with enough content → note
    if (sentence.length > 30) {
      result.notes.push({
        note_type: /goal|objective|aim|purpose/.test(sl) ? "GOAL" : /risk|concern|warning|issue/.test(sl) ? "RISK" : /assume|assumption/.test(sl) ? "ASSUMPTION" : "SUMMARY",
        title: sentence.slice(0, 70) + (sentence.length > 70 ? "…" : ""),
        body: sentence,
        status: "INFERRED",
      });
    }
  }

  return result;
}

// ── Projects ──────────────────────────────────────────────────────────────────

router.get("/projects", (req: Request, res: Response) => {
  const db = getDb();
  const rows = db.prepare(`
    SELECT p.*,
      (SELECT COUNT(*) FROM studio_sessions WHERE project_id = p.id) AS session_count,
      (SELECT COUNT(*) FROM studio_messages m JOIN studio_sessions s ON s.id = m.session_id WHERE s.project_id = p.id) AS message_count
    FROM studio_projects p
    WHERE p.status != 'ARCHIVED'
    ORDER BY p.updated_at DESC
  `).all() as any[];
  ok(res, rows);
});

router.post("/projects", (req: Request, res: Response) => {
  const { title, summary, scope_type, domain_type, created_by, business_id, location_id } = req.body;
  if (!title?.trim()) return badRequest(res, "title required");

  const db = getDb();
  const id = uid();
  const ts = now();

  db.prepare(`
    INSERT INTO studio_projects (id, business_id, location_id, scope_type, title, summary, domain_type, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, business_id ?? "biz-silver-sands", location_id ?? null, scope_type ?? "BUSINESS", title.trim(), summary ?? null, domain_type ?? null, created_by ?? null, ts, ts);

  const row = db.prepare("SELECT * FROM studio_projects WHERE id = ?").get(id);
  ok(res, row, 201);
});

router.get("/projects/:id", (req: Request, res: Response) => {
  const db = getDb();
  const row = db.prepare("SELECT * FROM studio_projects WHERE id = ?").get(req.params.id);
  if (!row) return notFound(res);
  ok(res, row);
});

router.patch("/projects/:id", (req: Request, res: Response) => {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM studio_projects WHERE id = ?").get(req.params.id) as any;
  if (!existing) return notFound(res);

  const { title, summary, status, domain_type } = req.body;
  const ts = now();

  db.prepare(`
    UPDATE studio_projects
    SET title = ?, summary = ?, status = ?, domain_type = ?, updated_at = ?
    WHERE id = ?
  `).run(
    title ?? existing.title,
    summary ?? existing.summary,
    status ?? existing.status,
    domain_type ?? existing.domain_type,
    ts,
    req.params.id,
  );

  ok(res, db.prepare("SELECT * FROM studio_projects WHERE id = ?").get(req.params.id));
});

// ── Sessions ──────────────────────────────────────────────────────────────────

router.get("/projects/:id/sessions", (req: Request, res: Response) => {
  const db = getDb();
  const project = db.prepare("SELECT id FROM studio_projects WHERE id = ?").get(req.params.id);
  if (!project) return notFound(res);

  const rows = db.prepare(`
    SELECT s.*,
      (SELECT COUNT(*) FROM studio_messages WHERE session_id = s.id) AS message_count
    FROM studio_sessions s
    WHERE project_id = ?
    ORDER BY created_at DESC
  `).all(req.params.id) as any[];
  ok(res, rows);
});

router.post("/projects/:id/sessions", (req: Request, res: Response) => {
  const db = getDb();
  const project = db.prepare("SELECT id FROM studio_projects WHERE id = ?").get(req.params.id);
  if (!project) return notFound(res);

  const { title, mode, started_by } = req.body;
  const id = uid();
  const ts = now();

  db.prepare(`
    INSERT INTO studio_sessions (id, project_id, title, mode, started_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.params.id, title ?? null, mode ?? "EXPLORE", started_by ?? null, ts, ts);

  ok(res, db.prepare("SELECT * FROM studio_sessions WHERE id = ?").get(id), 201);
});

router.get("/sessions/:id", (req: Request, res: Response) => {
  const db = getDb();
  const session = db.prepare("SELECT * FROM studio_sessions WHERE id = ?").get(req.params.id) as any;
  if (!session) return notFound(res);

  const messages = db.prepare("SELECT * FROM studio_messages WHERE session_id = ? ORDER BY created_at ASC").all(session.id) as any[];
  ok(res, { ...session, messages });
});

// ── Messages ──────────────────────────────────────────────────────────────────

router.get("/sessions/:id/messages", (req: Request, res: Response) => {
  const db = getDb();
  const session = db.prepare("SELECT id FROM studio_sessions WHERE id = ?").get(req.params.id);
  if (!session) return notFound(res);

  const rows = db.prepare("SELECT * FROM studio_messages WHERE session_id = ? ORDER BY created_at ASC").all(req.params.id);
  ok(res, rows);
});

router.post("/sessions/:id/messages", (req: Request, res: Response) => {
  const db = getDb();
  const session = db.prepare("SELECT * FROM studio_sessions WHERE id = ?").get(req.params.id) as any;
  if (!session) return notFound(res);

  const { content, role } = req.body;
  if (!content?.trim()) return badRequest(res, "content required");

  const msgId = uid();
  const ts = now();

  db.prepare(`
    INSERT INTO studio_messages (id, session_id, role, content, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(msgId, req.params.id, role ?? "USER", content.trim(), ts);

  // update session timestamp
  db.prepare("UPDATE studio_sessions SET updated_at = ? WHERE id = ?").run(ts, req.params.id);
  // update project timestamp
  db.prepare("UPDATE studio_projects SET updated_at = ? WHERE id = ?").run(ts, session.project_id);

  const message = db.prepare("SELECT * FROM studio_messages WHERE id = ?").get(msgId) as any;

  // run extraction only on user messages
  const extracted: ExtractResult = { notes: [], requirements: [], decisions: [], questions: [] };

  if ((role ?? "USER") === "USER") {
    const e = extractStructured(content, session.project_id, msgId);

    const insertNote = db.prepare(`INSERT INTO studio_notes (id, project_id, note_type, title, body, status, source_message_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const n of e.notes) {
      const nid = uid();
      insertNote.run(nid, session.project_id, n.note_type, n.title, n.body, n.status, msgId, ts, ts);
      extracted.notes.push({ ...n, id: nid } as any);
    }

    const insertReq = db.prepare(`INSERT INTO studio_requirements (id, project_id, requirement_type, priority, statement, rationale, source_message_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const r of e.requirements) {
      const rid = uid();
      insertReq.run(rid, session.project_id, r.requirement_type, r.priority, r.statement, r.rationale, msgId, ts, ts);
      extracted.requirements.push({ ...r, id: rid } as any);
    }

    const insertDec = db.prepare(`INSERT INTO studio_decisions (id, project_id, title, decision_text, rationale, created_at) VALUES (?, ?, ?, ?, ?, ?)`);
    for (const d of e.decisions) {
      const did = uid();
      insertDec.run(did, session.project_id, d.title, d.decision_text, d.rationale, ts);
      extracted.decisions.push({ ...d, id: did } as any);
    }

    const insertQ = db.prepare(`INSERT INTO studio_open_questions (id, project_id, question, why_it_matters, severity, created_at) VALUES (?, ?, ?, ?, ?, ?)`);
    for (const q of e.questions) {
      const qid = uid();
      insertQ.run(qid, session.project_id, q.question, q.why_it_matters, q.severity, ts);
      extracted.questions.push({ ...q, id: qid } as any);
    }
  }

  // run model derivation after extraction (async-ish — runs synchronously but fast)
  if ((role ?? "USER") === "USER") {
    runModelDerivation(session.project_id);
  }

  ok(res, { message, extracted }, 201);
});

// ── Structured outputs ─────────────────────────────────────────────────────────

router.get("/projects/:id/notes", (req: Request, res: Response) => {
  const db = getDb();
  ok(res, db.prepare("SELECT * FROM studio_notes WHERE project_id = ? ORDER BY created_at DESC").all(req.params.id));
});

router.delete("/notes/:id", (req: Request, res: Response) => {
  const db = getDb();
  db.prepare("DELETE FROM studio_notes WHERE id = ?").run(req.params.id);
  ok(res, { ok: true });
});

router.get("/projects/:id/requirements", (req: Request, res: Response) => {
  const db = getDb();
  ok(res, db.prepare("SELECT * FROM studio_requirements WHERE project_id = ? ORDER BY priority DESC, created_at DESC").all(req.params.id));
});

router.patch("/requirements/:id", (req: Request, res: Response) => {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM studio_requirements WHERE id = ?").get(req.params.id) as any;
  if (!existing) return notFound(res);
  const { status, priority } = req.body;
  db.prepare("UPDATE studio_requirements SET status = ?, priority = ?, updated_at = ? WHERE id = ?")
    .run(status ?? existing.status, priority ?? existing.priority, now(), req.params.id);
  ok(res, db.prepare("SELECT * FROM studio_requirements WHERE id = ?").get(req.params.id));
});

router.get("/projects/:id/decisions", (req: Request, res: Response) => {
  const db = getDb();
  ok(res, db.prepare("SELECT * FROM studio_decisions WHERE project_id = ? ORDER BY created_at DESC").all(req.params.id));
});

router.get("/projects/:id/questions", (req: Request, res: Response) => {
  const db = getDb();
  ok(res, db.prepare("SELECT * FROM studio_open_questions WHERE project_id = ? AND resolved_at IS NULL ORDER BY severity DESC, created_at DESC").all(req.params.id));
});

router.patch("/questions/:id/resolve", (req: Request, res: Response) => {
  const db = getDb();
  db.prepare("UPDATE studio_open_questions SET resolved_at = ? WHERE id = ?").run(now(), req.params.id);
  ok(res, { ok: true });
});

router.get("/projects/:id/outputs", (req: Request, res: Response) => {
  const db = getDb();
  ok(res, {
    notes:        db.prepare("SELECT * FROM studio_notes        WHERE project_id = ? ORDER BY created_at DESC").all(req.params.id),
    requirements: db.prepare("SELECT * FROM studio_requirements WHERE project_id = ? ORDER BY priority DESC, created_at DESC").all(req.params.id),
    decisions:    db.prepare("SELECT * FROM studio_decisions    WHERE project_id = ? ORDER BY created_at DESC").all(req.params.id),
    questions:    db.prepare("SELECT * FROM studio_open_questions WHERE project_id = ? AND resolved_at IS NULL ORDER BY severity DESC, created_at DESC").all(req.params.id),
  });
});

// ── Modeling (Phase 7) ─────────────────────────────────────────────────────────

function runModelDerivation(projectId: string): void {
  const db = getDb();

  // Load all messages for the project
  const messages = db.prepare(`
    SELECT m.content, m.role FROM studio_messages m
    JOIN studio_sessions s ON s.id = m.session_id
    WHERE s.project_id = ?
    ORDER BY m.created_at ASC
  `).all(projectId) as Array<{ content: string; role: string }>;

  const result = deriveModels(messages);
  const ts = now();

  // Upsert entities
  const upsertEntity = db.prepare(`
    INSERT INTO studio_entities (id, project_id, name, description, attributes, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'INFERRED', ?, ?)
    ON CONFLICT(project_id, name) DO UPDATE SET
      description = excluded.description,
      attributes  = excluded.attributes,
      updated_at  = excluded.updated_at
  `);
  for (const e of result.entities) {
    upsertEntity.run(uid(), projectId, e.name, e.description, e.attributes, ts, ts);
  }

  // Upsert workflows
  const upsertWorkflow = db.prepare(`
    INSERT INTO studio_workflows (id, project_id, name, description, steps, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'INFERRED', ?, ?)
    ON CONFLICT(project_id, name) DO UPDATE SET
      description = excluded.description,
      steps       = excluded.steps,
      updated_at  = excluded.updated_at
  `);
  for (const w of result.workflows) {
    upsertWorkflow.run(uid(), projectId, w.name, w.description, w.steps, ts, ts);
  }

  // Upsert views
  const upsertView = db.prepare(`
    INSERT INTO studio_views (id, project_id, name, view_type, description, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'INFERRED', ?, ?)
    ON CONFLICT(project_id, name) DO UPDATE SET
      view_type   = excluded.view_type,
      description = excluded.description,
      updated_at  = excluded.updated_at
  `);
  for (const v of result.views) {
    upsertView.run(uid(), projectId, v.name, v.view_type, v.description, ts, ts);
  }

  // Upsert concepts
  const upsertConcept = db.prepare(`
    INSERT INTO studio_concepts (id, project_id, name, definition, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'INFERRED', ?, ?)
    ON CONFLICT(project_id, name) DO UPDATE SET
      definition = excluded.definition,
      updated_at = excluded.updated_at
  `);
  for (const c of result.concepts) {
    upsertConcept.run(uid(), projectId, c.name, c.definition, ts, ts);
  }

  // Upsert relationships
  const upsertRel = db.prepare(`
    INSERT INTO studio_relationships (id, project_id, from_name, from_type, to_name, to_type, relation, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'INFERRED', ?)
    ON CONFLICT(project_id, from_name, to_name, relation) DO NOTHING
  `);
  for (const r of result.relationships) {
    upsertRel.run(uid(), projectId, r.from_name, r.from_type, r.to_name, r.to_type, r.relation, ts);
  }
}

// Manual derive trigger
router.post("/projects/:id/models/derive", (req: Request, res: Response) => {
  const db = getDb();
  const project = db.prepare("SELECT id FROM studio_projects WHERE id = ?").get(req.params.id);
  if (!project) return notFound(res);

  runModelDerivation(req.params.id);

  ok(res, {
    entities:      db.prepare("SELECT * FROM studio_entities      WHERE project_id = ? ORDER BY name ASC").all(req.params.id),
    workflows:     db.prepare("SELECT * FROM studio_workflows     WHERE project_id = ? ORDER BY name ASC").all(req.params.id),
    views:         db.prepare("SELECT * FROM studio_views         WHERE project_id = ? ORDER BY name ASC").all(req.params.id),
    concepts:      db.prepare("SELECT * FROM studio_concepts      WHERE project_id = ? ORDER BY name ASC").all(req.params.id),
    relationships: db.prepare("SELECT * FROM studio_relationships WHERE project_id = ? ORDER BY from_name ASC").all(req.params.id),
  });
});

// Read endpoints
router.get("/projects/:id/models", (req: Request, res: Response) => {
  const db = getDb();
  ok(res, {
    entities:      db.prepare("SELECT * FROM studio_entities      WHERE project_id = ? ORDER BY name ASC").all(req.params.id),
    workflows:     db.prepare("SELECT * FROM studio_workflows     WHERE project_id = ? ORDER BY name ASC").all(req.params.id),
    views:         db.prepare("SELECT * FROM studio_views         WHERE project_id = ? ORDER BY name ASC").all(req.params.id),
    concepts:      db.prepare("SELECT * FROM studio_concepts      WHERE project_id = ? ORDER BY name ASC").all(req.params.id),
    relationships: db.prepare("SELECT * FROM studio_relationships WHERE project_id = ? ORDER BY from_name ASC").all(req.params.id),
  });
});

router.get("/projects/:id/entities",      (req: Request, res: Response) => ok(res, getDb().prepare("SELECT * FROM studio_entities      WHERE project_id = ? ORDER BY name ASC").all(req.params.id)));
router.get("/projects/:id/workflows",     (req: Request, res: Response) => ok(res, getDb().prepare("SELECT * FROM studio_workflows     WHERE project_id = ? ORDER BY name ASC").all(req.params.id)));
router.get("/projects/:id/views",         (req: Request, res: Response) => ok(res, getDb().prepare("SELECT * FROM studio_views         WHERE project_id = ? ORDER BY name ASC").all(req.params.id)));
router.get("/projects/:id/concepts",      (req: Request, res: Response) => ok(res, getDb().prepare("SELECT * FROM studio_concepts      WHERE project_id = ? ORDER BY name ASC").all(req.params.id)));
router.get("/projects/:id/relationships", (req: Request, res: Response) => ok(res, getDb().prepare("SELECT * FROM studio_relationships WHERE project_id = ? ORDER BY from_name ASC").all(req.params.id)));

// PATCH entity/workflow/view/concept status (INFERRED → CONFIRMED / REJECTED)
router.patch("/entities/:id",  (req: Request, res: Response) => {
  const db = getDb();
  const { status } = req.body;
  if (!status) return badRequest(res, "status required");
  db.prepare("UPDATE studio_entities SET status = ?, updated_at = ? WHERE id = ?").run(status, now(), req.params.id);
  ok(res, db.prepare("SELECT * FROM studio_entities WHERE id = ?").get(req.params.id));
});
router.patch("/workflows/:id", (req: Request, res: Response) => {
  const db = getDb();
  const { status } = req.body;
  if (!status) return badRequest(res, "status required");
  db.prepare("UPDATE studio_workflows SET status = ?, updated_at = ? WHERE id = ?").run(status, now(), req.params.id);
  ok(res, db.prepare("SELECT * FROM studio_workflows WHERE id = ?").get(req.params.id));
});
router.patch("/views/:id",     (req: Request, res: Response) => {
  const db = getDb();
  const { status } = req.body;
  if (!status) return badRequest(res, "status required");
  db.prepare("UPDATE studio_views SET status = ?, updated_at = ? WHERE id = ?").run(status, now(), req.params.id);
  ok(res, db.prepare("SELECT * FROM studio_views WHERE id = ?").get(req.params.id));
});
router.patch("/concepts/:id",  (req: Request, res: Response) => {
  const db = getDb();
  const { status } = req.body;
  if (!status) return badRequest(res, "status required");
  db.prepare("UPDATE studio_concepts SET status = ?, updated_at = ? WHERE id = ?").run(status, now(), req.params.id);
  ok(res, db.prepare("SELECT * FROM studio_concepts WHERE id = ?").get(req.params.id));
});

// ── Validation (Phase 8) ────────────────────────────────────────────────────

function upsertValidations(projectId: string): void {
  const db = getDb();
  const issues = runValidation(db, projectId);
  const ts = now();

  const upsert = db.prepare(`
    INSERT INTO studio_validations
      (id, project_id, rule_id, severity, category, title, detail, subject_id, subject_type, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', ?)
    ON CONFLICT(project_id, rule_id, subject_id) DO UPDATE SET
      severity     = excluded.severity,
      title        = excluded.title,
      detail       = excluded.detail,
      subject_type = excluded.subject_type
  `);

  for (const issue of issues) {
    upsert.run(
      uid(), projectId,
      issue.rule_id, issue.severity, issue.category,
      issue.title, issue.detail ?? null,
      issue.subject_id ?? "__none__", issue.subject_type ?? null,
      ts,
    );
  }
}

// Trigger full validation
router.post("/projects/:id/validate", (req: Request, res: Response) => {
  const db = getDb();
  const project = db.prepare("SELECT id FROM studio_projects WHERE id = ?").get(req.params.id);
  if (!project) return notFound(res);

  upsertValidations(req.params.id);

  const issues = db.prepare(`
    SELECT * FROM studio_validations
    WHERE project_id = ? AND status = 'OPEN'
    ORDER BY CASE severity
      WHEN 'CRITICAL' THEN 0 WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2
      WHEN 'LOW' THEN 3 ELSE 4 END, created_at DESC
  `).all(req.params.id);

  ok(res, issues);
});

// Get current open issues
router.get("/projects/:id/validations", (req: Request, res: Response) => {
  const db = getDb();
  const issues = db.prepare(`
    SELECT * FROM studio_validations
    WHERE project_id = ? AND status = 'OPEN'
    ORDER BY CASE severity
      WHEN 'CRITICAL' THEN 0 WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2
      WHEN 'LOW' THEN 3 ELSE 4 END, created_at DESC
  `).all(req.params.id);
  ok(res, issues);
});

// Dismiss a single issue
router.patch("/validations/:id/dismiss", (req: Request, res: Response) => {
  const db = getDb();
  db.prepare("UPDATE studio_validations SET status = 'DISMISSED' WHERE id = ?").run(req.params.id);
  ok(res, { ok: true });
});

export default router;
