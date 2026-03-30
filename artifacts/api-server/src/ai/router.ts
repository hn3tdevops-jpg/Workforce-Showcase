import { Router, type Request, type Response } from "express";
import OpenAI from "openai";
import { getDb } from "../hospitable/db.js";

const router = Router();

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function getOpenAI(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

const SYSTEM_PROMPT = `You are Workforce AI, an operational assistant embedded in the Silver Sands Motel workforce management console.

Your role is to help staff with:
- Questions about housekeeping operations, room status, and task management
- Shift scheduling, staffing, and workforce planning questions
- Policy reminders and operational best practices
- Summarising handover notes and announcements
- Answering questions about inspections, maintenance, and inventory

Behavioral rules:
1. Be concise, precise, and helpful
2. Focus on hospitality operations topics relevant to this property
3. Do not fabricate specific room numbers, employee names, task counts, or operational data you have not been given
4. When asked about specific current data (rooms, tasks, shifts), be clear that you do not have live system access in this conversation — staff should check the relevant module
5. Separate recommendations from facts
6. Use plain language; avoid unnecessary jargon
7. If uncertain, say so

Business context:
- Property: Silver Sands Motel
- Platform: Workforce Operations Console
- You are operating inside the Communications Center AI Assistant channel`;

// ── GET /ai/conversations ──────────────────────────────────────────────────────
router.get("/conversations", (req: Request, res: Response) => {
  const db = getDb();
  const businessId = (req.query.business_id as string) ?? "biz-silver-sands";
  const userId = req.query.user_id as string | undefined;

  let rows;
  if (userId) {
    rows = db.prepare(`
      SELECT id, business_id, user_id, title, status, provider, message_count, created_at, updated_at
      FROM ai_conversations
      WHERE business_id = ? AND user_id = ?
      ORDER BY updated_at DESC
      LIMIT 30
    `).all(businessId, userId);
  } else {
    rows = db.prepare(`
      SELECT id, business_id, user_id, title, status, provider, message_count, created_at, updated_at
      FROM ai_conversations
      WHERE business_id = ?
      ORDER BY updated_at DESC
      LIMIT 30
    `).all(businessId);
  }
  res.json(rows);
});

// ── POST /ai/conversations ─────────────────────────────────────────────────────
router.post("/conversations", (req: Request, res: Response) => {
  const db = getDb();
  const { business_id = "biz-silver-sands", location_id, title, user_id } = req.body as {
    business_id?: string;
    location_id?: string;
    title?: string;
    user_id?: string;
  };

  const id = uid();
  db.prepare(`
    INSERT INTO ai_conversations (id, business_id, location_id, user_id, title, status, provider, channel)
    VALUES (?, ?, ?, ?, ?, 'active', 'openai', 'communication_center')
  `).run(id, business_id, location_id ?? null, user_id ?? null, title ?? "New conversation");

  const conv = db.prepare("SELECT * FROM ai_conversations WHERE id = ?").get(id);
  res.status(201).json(conv);
});

// ── GET /ai/conversations/:id ──────────────────────────────────────────────────
router.get("/conversations/:id", (req: Request, res: Response) => {
  const db = getDb();
  const conv = db.prepare("SELECT * FROM ai_conversations WHERE id = ?").get(req.params.id);
  if (!conv) return res.status(404).json({ detail: "Conversation not found" });
  const messages = db.prepare(`
    SELECT id, conversation_id, role, content, created_at
    FROM ai_messages
    WHERE conversation_id = ?
    ORDER BY created_at ASC
  `).all(req.params.id);
  res.json({ ...(conv as object), messages });
});

// ── DELETE /ai/conversations/:id ───────────────────────────────────────────────
router.delete("/conversations/:id", (req: Request, res: Response) => {
  const db = getDb();
  db.prepare("DELETE FROM ai_conversations WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// ── POST /ai/conversations/:id/stream — SSE streaming chat ────────────────────
router.post("/conversations/:id/stream", async (req: Request, res: Response) => {
  const db = getDb();
  const { text, user_id } = req.body as { text?: string; user_id?: string };

  if (!text?.trim()) {
    res.status(400).json({ detail: "Message text is required" });
    return;
  }

  const conv = db.prepare("SELECT * FROM ai_conversations WHERE id = ?").get(req.params.id) as { id: string } | undefined;
  if (!conv) {
    res.status(404).json({ detail: "Conversation not found" });
    return;
  }

  // Persist user message
  const userMsgId = uid();
  db.prepare(`
    INSERT INTO ai_messages (id, conversation_id, role, content)
    VALUES (?, ?, 'user', ?)
  `).run(userMsgId, req.params.id, text.trim());

  db.prepare(`
    UPDATE ai_conversations
    SET message_count = message_count + 1, updated_at = datetime('now')
    WHERE id = ?
  `).run(req.params.id);

  // Build history (last 20 exchanges)
  const history = db.prepare(`
    SELECT role, content FROM ai_messages
    WHERE conversation_id = ?
    ORDER BY created_at ASC
    LIMIT 40
  `).all(req.params.id) as { role: string; content: string }[];

  // SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (typeof (res as any).flushHeaders === "function") (res as any).flushHeaders();

  const send = (event: string, data: object) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const assistantMsgId = uid();
  send("message.started", { message_id: assistantMsgId, role: "assistant" });

  const openai = getOpenAI();

  if (!openai) {
    const mockContent = [
      "**AI Assistant is not configured.**",
      "",
      "To enable the AI Assistant, please add your `OPENAI_API_KEY` to the environment secrets.",
      "",
      "Once configured, I can help with operational questions about housekeeping, scheduling, tasks, inspections, and more.",
    ].join("\n");

    send("message.delta", { message_id: assistantMsgId, delta: mockContent });
    send("message.completed", { message_id: assistantMsgId, content: mockContent });

    db.prepare(`INSERT INTO ai_messages (id, conversation_id, role, content) VALUES (?, ?, 'assistant', ?)`).run(assistantMsgId, req.params.id, mockContent);
    db.prepare(`UPDATE ai_conversations SET message_count = message_count + 1, updated_at = datetime('now') WHERE id = ?`).run(req.params.id);
    res.end();
    return;
  }

  try {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.slice(-40).map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      stream: true,
      max_tokens: 1500,
      temperature: 0.5,
    });

    let fullContent = "";
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content ?? "";
      if (delta) {
        fullContent += delta;
        send("message.delta", { message_id: assistantMsgId, delta });
      }
    }

    if (!fullContent) fullContent = "(No response generated)";

    db.prepare(`INSERT INTO ai_messages (id, conversation_id, role, content) VALUES (?, ?, 'assistant', ?)`).run(assistantMsgId, req.params.id, fullContent);
    db.prepare(`UPDATE ai_conversations SET message_count = message_count + 1, updated_at = datetime('now') WHERE id = ?`).run(req.params.id);

    send("message.completed", { message_id: assistantMsgId, content: fullContent });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "AI provider error";
    send("error", { code: "provider_error", message });
    db.prepare("DELETE FROM ai_messages WHERE id = ?").run(userMsgId);
  }

  res.end();
});

// ── GET /ai/health ────────────────────────────────────────────────────────────
router.get("/health", (_req: Request, res: Response) => {
  const configured = !!process.env.OPENAI_API_KEY;
  res.json({
    ok: true,
    provider: "openai",
    configured,
    model: "gpt-4o-mini",
    status: configured ? "ready" : "unconfigured",
  });
});

export default router;
