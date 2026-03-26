import { Router } from "express";
import { scryptSync, randomBytes, timingSafeEqual, randomUUID } from "node:crypto";
import { getDb } from "../hospitable/db.js";

const PA_BASE = "https://hn3t.pythonanywhere.com";

const router = Router();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(":");
    const inputHash = scryptSync(password, salt, 64);
    return timingSafeEqual(Buffer.from(hash, "hex"), inputHash);
  } catch {
    return false;
  }
}

function buildMinimalUser(email: string) {
  return {
    id: `local-${email}`,
    email,
    name: email.split("@")[0],
    role: "admin",
    memberships: [{ business_id: "local", role: "admin" }],
    permissions: ["*"],
  };
}

router.post("/login", async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    res.status(422).json({ detail: "Email and password are required." });
    return;
  }

  const db = getDb();
  const row = db
    .prepare("SELECT pwd_hash, user_json FROM local_credential_overrides WHERE email = ?")
    .get(email) as { pwd_hash: string; user_json: string } | undefined;

  if (row && verifyPassword(password, row.pwd_hash)) {
    const token = randomUUID();
    db.prepare(
      "INSERT INTO local_sessions (token, email, user_json) VALUES (?, ?, ?)"
    ).run(token, email, row.user_json);

    res.json({ access_token: token, token_type: "bearer" });
    return;
  }

  const upstreamRes = await fetch(`${PA_BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(req.body),
  });

  const text = await upstreamRes.text();
  const contentType = upstreamRes.headers.get("content-type");
  if (contentType) res.setHeader("content-type", contentType);
  res.status(upstreamRes.status).send(text);
});

router.get("/me", async (req, res) => {
  const authHeader = req.headers.authorization ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (token) {
    const db = getDb();
    const row = db
      .prepare("SELECT user_json FROM local_sessions WHERE token = ?")
      .get(token) as { user_json: string } | undefined;

    if (row) {
      res.json(JSON.parse(row.user_json));
      return;
    }
  }

  const upstreamRes = await fetch(`${PA_BASE}/api/v1/auth/me`, {
    headers: authHeader ? { authorization: authHeader } : {},
  });

  const text = await upstreamRes.text();
  const contentType = upstreamRes.headers.get("content-type");
  if (contentType) res.setHeader("content-type", contentType);
  res.status(upstreamRes.status).send(text);
});

router.post("/reset", (req, res) => {
  const { email, new_password } = req.body ?? {};
  if (!email || !new_password) {
    res.status(422).json({ detail: "email and new_password are required." });
    return;
  }
  if (typeof new_password !== "string" || new_password.length < 8) {
    res.status(422).json({ detail: "Password must be at least 8 characters." });
    return;
  }

  const db = getDb();
  const userJson = JSON.stringify(buildMinimalUser(email));
  const pwdHash = hashPassword(new_password);

  db.prepare(`
    INSERT INTO local_credential_overrides (email, pwd_hash, user_json, updated_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(email) DO UPDATE SET
      pwd_hash   = excluded.pwd_hash,
      user_json  = excluded.user_json,
      updated_at = excluded.updated_at
  `).run(email, pwdHash, userJson);

  res.json({ ok: true, message: "Local password override saved. You can now sign in with these credentials." });
});

export default router;
