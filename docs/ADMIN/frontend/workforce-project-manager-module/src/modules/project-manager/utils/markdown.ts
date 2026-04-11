import type { ParsedSource } from "../types";

export function guessModule(text: string): ParsedSource["module"] {
  const lower = text.toLowerCase();
  if (lower.includes("frontend") || lower.includes("playwright") || lower.includes("ui") || lower.includes("dist-staging")) return "frontend";
  if (lower.includes("rbac") || lower.includes("tenancy") || lower.includes("schedule") || lower.includes("employee")) return "core";
  if (lower.includes("hospitable") || lower.includes("room") || lower.includes("inspection") || lower.includes("maintenance")) return "hospitable";
  if (lower.includes("restopeneur") || lower.includes("menu") || lower.includes("modifier") || lower.includes("ticket") || lower.includes("kds")) return "restopeneur";
  if (lower.includes("crm") || lower.includes("customer") || lower.includes("pipeline")) return "crm";
  return "platform";
}

export function parseMarkdown(content = "", sourceName = "Untitled"): ParsedSource {
  const lines = content.split(/\r?\n/);
  const headings: string[] = [];
  const todos: string[] = [];
  const completed: string[] = [];
  const blockers: string[] = [];
  const dates: string[] = [];

  const dateRegex = /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b|\b\d{4}-\d{2}-\d{2}\b/gi;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    if (/^#{1,6}\s+/.test(line)) {
      headings.push(line.replace(/^#{1,6}\s+/, ""));
    }

    if (/^[-*]\s+\[( |x|X)\]\s+/.test(line)) {
      const checked = /^[-*]\s+\[(x|X)\]\s+/.test(line);
      const item = line.replace(/^[-*]\s+\[( |x|X)\]\s+/, "");
      if (checked) completed.push(item);
      else todos.push(item);
    } else if (/^(todo|next|action|follow-up|follow up)\s*:/i.test(line)) {
      todos.push(line.replace(/^(todo|next|action|follow-up|follow up)\s*:/i, "").trim());
    }

    if (/(blocker|blocked|risk|issue|problem)/i.test(line)) {
      blockers.push(line);
    }

    const matches = line.match(dateRegex);
    if (matches) dates.push(...matches);
  }

  const summary = [
    headings[0] ? `Primary heading: ${headings[0]}` : null,
    todos.length ? `${todos.length} open action item(s)` : null,
    blockers.length ? `${blockers.length} blocker/risk line(s)` : null,
    completed.length ? `${completed.length} completed checklist item(s)` : null,
  ]
    .filter(Boolean)
    .join(" • ");

  return {
    sourceName,
    module: guessModule(`${sourceName}\n${content}`),
    headings: headings.slice(0, 20),
    todos: todos.slice(0, 50),
    completed: completed.slice(0, 50),
    blockers: blockers.slice(0, 20),
    dates: [...new Set(dates)].slice(0, 12),
    summary: summary || "Parsed source with no headings or tasks detected.",
    lineCount: lines.length,
    charCount: content.length,
  };
}

export function generateId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export function formatToday(): string {
  return new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
