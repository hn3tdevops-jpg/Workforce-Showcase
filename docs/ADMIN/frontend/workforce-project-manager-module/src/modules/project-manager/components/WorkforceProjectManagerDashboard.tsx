"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowUpRight,
  Bot,
  BrainCircuit,
  CalendarDays,
  CheckSquare,
  Clock3,
  Database,
  Download,
  FileText,
  FileUp,
  Filter,
  FolderKanban,
  FolderOpen,
  Link as LinkIcon,
  ListTodo,
  Plus,
  Search,
  Sparkles,
  Upload,
  Wand2,
  Workflow,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ParsedProjectSource, ProjectManagerWorkspace, ProjectTask } from "../types";
import { parseMarkdown, generateId, formatToday } from "../utils/markdown";

const STORAGE_KEY = "workforce-pm-dashboard-module-v1";

const modules = [
  { key: "all", label: "All Modules" },
  { key: "core", label: "Workforce Core" },
  { key: "frontend", label: "Frontend App" },
  { key: "hospitable", label: "Hospitable Ops" },
  { key: "crm", label: "CRM" },
  { key: "restopeneur", label: "Restopeneur" },
  { key: "platform", label: "Platform / Infra" },
] as const;

const taskStatuses = ["Ready", "In Progress", "In Review", "Backlog", "Done"] as const;
const priorities = ["Critical", "High", "Medium", "Low"] as const;
const docStatuses = ["Canonical", "Active", "Operational", "Reference", "Draft", "Planned"] as const;

const seedData: ProjectManagerWorkspace = {
  docs: [
    {
      id: 1,
      title: "HN3T_MASTER_PLAN.md",
      module: "platform",
      type: "Master Plan",
      status: "Canonical",
      owner: "Project Core",
      updated: "Apr 4, 2026",
      summary: "Primary roadmap and execution order for the full Workforce platform.",
      path: "/docs/HN3T_MASTER_PLAN.md",
    },
    {
      id: 2,
      title: "PROGRESS_REPORT.md",
      module: "platform",
      type: "Progress Report",
      status: "Active",
      owner: "Execution Log",
      updated: "Apr 4, 2026",
      summary: "Rolling status, completed tasks, blockers, and next actions.",
      path: "/docs/PROGRESS_REPORT.md",
    },
  ],
  tasks: [
    {
      id: "WF-101",
      title: "Stabilize tenancy and RBAC foundation",
      module: "core",
      assignee: "Backend",
      priority: "Critical",
      status: "In Progress",
      due: "Apr 8",
      planPhase: "Phase 1",
      blocker: "Need migration sequencing and route validation.",
    },
    {
      id: "WF-102",
      title: "Create frontend command center / developer hub",
      module: "frontend",
      assignee: "Frontend",
      priority: "High",
      status: "Ready",
      due: "Apr 6",
      planPhase: "Phase 2",
      blocker: "Needs content wiring and docs ingestion.",
    },
  ],
  progress: [
    {
      id: 1,
      date: "Apr 4, 2026",
      title: "Project manager module scaffold created",
      detail: "Established a unified project operations dashboard for Workforce planning and execution.",
      tag: "Planning",
    },
  ],
  execution: [
    { id: 1, phase: "Phase 1 — Foundation", percent: 78, items: ["Tenancy model", "RBAC baseline", "Docs taxonomy", "Backend boundaries"] },
    { id: 2, phase: "Phase 2 — Visibility & Control", percent: 52, items: ["Developer hub", "Progress automation", "Task dashboards", "Static web tools"] },
    { id: 3, phase: "Phase 3 — AI & Communication", percent: 24, items: ["OpenAI backend", "Communication Center", "Studio actions", "AI guidance rules"] },
  ],
  sources: [
    {
      id: "SRC-1",
      name: "HN3T_MASTER_PLAN.md",
      kind: "markdown",
      updated: "Apr 4, 2026",
      path: "/docs/HN3T_MASTER_PLAN.md",
      module: "platform",
      content: "# HN3T Master Plan\n\n## Phase 1\n- [ ] Finish tenancy and RBAC hardening\n- [ ] Standardize docs taxonomy\n\n## Phase 2\n- [ ] Build developer hub\n- [ ] Add progress automation\n\nBlocker: Need strict source-of-truth rules for docs and task ownership.",
    },
  ],
  project: {
    name: "Workforce Project Manager",
    repoRoot: "/home/hn3t/workforce_api",
    frontendRoot: "/home/hn3t/workforce_frontend_app",
    docsRoot: "/docs",
    aiMode: "Enabled",
    syncHealth: 62,
    moduleSlug: "project-manager",
    routePath: "/superadmin/project-manager",
    mountArea: "Superadmin / Command Center",
    accessPolicy: "superadmin_only",
    docsApiPath: "/api/v1/project-manager/docs",
    tasksApiPath: "/api/v1/project-manager/tasks",
    sourcesApiPath: "/api/v1/project-manager/sources",
    progressApiPath: "/api/v1/project-manager/progress",
    aiApiPath: "/api/v1/project-manager/ai/brief",
  },
};

function getModuleLabel(key: string): string {
  return modules.find((m) => m.key === key)?.label || key;
}

function pillClass(priority: string): string {
  if (priority === "Critical") return "bg-red-100 text-red-700 border-red-200";
  if (priority === "High") return "bg-orange-100 text-orange-700 border-orange-200";
  if (priority === "Medium") return "bg-blue-100 text-blue-700 border-blue-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

export default function WorkforceProjectManagerDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [workspace, setWorkspace] = useState<ProjectManagerWorkspace>(seedData);
  const [selectedSourceId, setSelectedSourceId] = useState(seedData.sources[0]?.id || "");
  const [aiFocus, setAiFocus] = useState("platform");
  const [aiInstruction, setAiInstruction] = useState(
    "Review current docs, sources, tasks, and progress items. Summarize drift from the master plan, identify blockers, and produce the next recommended actions."
  );

  const [sourceDraft, setSourceDraft] = useState({
    name: "",
    path: "",
    module: "platform",
    content: "",
  });

  const [taskDraft, setTaskDraft] = useState<ProjectTask>({
    id: "",
    title: "",
    module: "platform",
    assignee: "",
    priority: "Medium",
    status: "Backlog",
    due: "",
    planPhase: "Phase 1",
    blocker: "",
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ProjectManagerWorkspace;
        setWorkspace(parsed);
        setSelectedSourceId(parsed.sources?.[0]?.id || "");
      }
    } catch (error) {
      console.error("Failed to restore project manager state", error);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
    } catch (error) {
      console.error("Failed to save project manager state", error);
    }
  }, [workspace]);

  const parsedSources = useMemo<ParsedProjectSource[]>(() => {
    return workspace.sources.map((source) => ({
      ...source,
      parsed: parseMarkdown(source.content, source.name),
    }));
  }, [workspace.sources]);

  const selectedSource = useMemo(() => {
    return parsedSources.find((source) => source.id === selectedSourceId) || parsedSources[0] || null;
  }, [parsedSources, selectedSourceId]);

  const filteredDocs = useMemo(() => {
    return workspace.docs.filter((doc) => {
      const matchesModule = moduleFilter === "all" || doc.module === moduleFilter;
      const text = `${doc.title} ${doc.type} ${doc.summary ?? ""} ${doc.owner ?? ""} ${doc.path ?? ""}`.toLowerCase();
      return matchesModule && text.includes(search.toLowerCase());
    });
  }, [workspace.docs, moduleFilter, search]);

  const filteredTasks = useMemo(() => {
    return workspace.tasks.filter((task) => {
      const matchesModule = moduleFilter === "all" || task.module === moduleFilter;
      const text = `${task.id} ${task.title} ${task.assignee ?? ""} ${task.planPhase ?? ""} ${task.blocker ?? ""}`.toLowerCase();
      return matchesModule && text.includes(search.toLowerCase());
    });
  }, [workspace.tasks, moduleFilter, search]);

  const filteredProgress = useMemo(() => {
    return workspace.progress.filter((item) => {
      const text = `${item.title} ${item.detail} ${item.tag ?? ""}`.toLowerCase();
      return text.includes(search.toLowerCase());
    });
  }, [workspace.progress, search]);

  const filteredSources = useMemo(() => {
    return parsedSources.filter((source) => {
      const matchesModule = moduleFilter === "all" || source.module === moduleFilter;
      const text = `${source.name} ${source.path ?? ""} ${source.content}`.toLowerCase();
      return matchesModule && text.includes(search.toLowerCase());
    });
  }, [parsedSources, moduleFilter, search]);

  const metrics = useMemo(() => {
    const openTasks = workspace.tasks.filter((task) => task.status !== "Done").length;
    const blockedTasks = workspace.tasks.filter((task) => task.blocker?.trim()).length;
    const sourceTodos = parsedSources.reduce((sum, source) => sum + source.parsed.todos.length, 0);
    const sourceBlockers = parsedSources.reduce((sum, source) => sum + source.parsed.blockers.length, 0);
    const executionScore = Math.round(
      workspace.execution.reduce((sum, phase) => sum + phase.percent, 0) / workspace.execution.length
    );

    return {
      docs: workspace.docs.length,
      tasks: workspace.tasks.length,
      sources: workspace.sources.length,
      openTasks,
      blockedTasks: blockedTasks + sourceBlockers,
      sourceTodos,
      executionScore,
    };
  }, [workspace, parsedSources]);

  const aiPrompt = useMemo(() => {
    const matchingDocs = workspace.docs.filter((doc) => aiFocus === "all" || doc.module === aiFocus);
    const matchingTasks = workspace.tasks.filter((task) => aiFocus === "all" || task.module === aiFocus);
    const matchingSources = parsedSources.filter((source) => aiFocus === "all" || source.module === aiFocus);

    return `You are assisting with the ${getModuleLabel(aiFocus)} stream of the Workforce project.

Context:
- Project name: ${workspace.project.name}
- Repo root: ${workspace.project.repoRoot}
- Frontend root: ${workspace.project.frontendRoot}
- Docs root: ${workspace.project.docsRoot}
- Matching docs: ${matchingDocs.map((doc) => doc.title).join(", ") || "None listed"}
- Matching tasks: ${matchingTasks.map((task) => `${task.id}: ${task.title}`).join(" | ") || "None listed"}
- Matching sources: ${matchingSources.map((source) => source.name).join(", ") || "None listed"}
- Extracted source actions: ${matchingSources.flatMap((source) => source.parsed.todos).slice(0, 20).join(" | ") || "None detected"}
- Extracted blockers: ${matchingSources.flatMap((source) => source.parsed.blockers).slice(0, 12).join(" | ") || "None detected"}

Instruction:
${aiInstruction}

Required output:
1. Current state summary
2. Drift or risk areas
3. Recommended next tasks
4. Suggested progress report entry
5. Docs that should be canonical or updated
6. Task records that should be created, closed, or reclassified`;
  }, [aiFocus, aiInstruction, workspace, parsedSources]);

  function cycleTaskStatus(taskId: string): void {
    setWorkspace((current) => ({
      ...current,
      tasks: current.tasks.map((task) => {
        if (task.id !== taskId) return task;
        const index = taskStatuses.indexOf(task.status);
        const next = taskStatuses[(index + 1) % taskStatuses.length];
        return { ...task, status: next };
      }),
    }));
  }

  function addTask(): void {
    if (!taskDraft.title.trim()) return;
    setWorkspace((current) => ({
      ...current,
      tasks: [{ ...taskDraft, id: generateId("WF") }, ...current.tasks],
    }));
    setTaskDraft({
      id: "",
      title: "",
      module: "platform",
      assignee: "",
      priority: "Medium",
      status: "Backlog",
      due: "",
      planPhase: "Phase 1",
      blocker: "",
    });
  }

  function addSource(): void {
    if (!sourceDraft.name.trim() || !sourceDraft.content.trim()) return;
    const nextSource = {
      id: generateId("SRC"),
      name: sourceDraft.name,
      kind: "markdown",
      updated: formatToday(),
      path: sourceDraft.path,
      module: sourceDraft.module,
      content: sourceDraft.content,
    };
    setWorkspace((current) => ({ ...current, sources: [nextSource, ...current.sources] }));
    setSelectedSourceId(nextSource.id);
    setSourceDraft({ name: "", path: "", module: "platform", content: "" });
  }

  function promoteSourceToTasks(): void {
    if (!selectedSource) return;
    const imported = selectedSource.parsed.todos.slice(0, 10).map((todo) => ({
      id: generateId("WF"),
      title: todo,
      module: selectedSource.module,
      assignee: "",
      priority: "Medium" as const,
      status: "Backlog" as const,
      due: "",
      planPhase: "Imported",
      blocker: selectedSource.parsed.blockers[0] || "Imported from source",
    }));
    if (!imported.length) return;
    setWorkspace((current) => ({ ...current, tasks: [...imported, ...current.tasks] }));
  }

  async function copyText(value: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(value);
    } catch (error) {
      console.error("Copy failed", error);
    }
  }

  function exportWorkspace(): void {
    const blob = new Blob([JSON.stringify(workspace, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "workforce-project-manager-data.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-[1600px] p-4 md:p-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white">
                  <FolderKanban className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold">{workspace.project.name}</h1>
                  <p className="text-sm text-slate-600">Unified control center for Workforce planning, execution, documents, sources, and AI support.</p>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3 md:flex-row">
              <div className="relative min-w-[280px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search docs, tasks, sources..." className="pl-9" />
              </div>
              <Select value={moduleFilter} onValueChange={setModuleFilter}>
                <SelectTrigger className="w-[190px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {modules.map((module) => (
                    <SelectItem key={module.key} value={module.key}>{module.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" />
                Filter
              </Button>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6 flex h-auto flex-wrap justify-start gap-2 bg-transparent p-0">
              {[
                ["overview", "Overview"],
                ["sources", "Project Sources"],
                ["docs", "Docs Library"],
                ["tasks", "Tasks"],
                ["execution", "Plan Execution"],
                ["progress", "Progress"],
                ["ai", "AI Assistant"],
                ["workspace", "Workspace"],
              ].map(([value, label]) => (
                <TabsTrigger key={value} value={value} className="rounded-xl border border-slate-200 bg-white px-4 py-2 data-[state=active]:bg-slate-900 data-[state=active]:text-white">
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                {[
                  ["Tracked docs", metrics.docs, FileText, "Reference files"],
                  ["Tracked sources", metrics.sources, Database, "Imported project text"],
                  ["Open source actions", metrics.sourceTodos, ListTodo, "Parsed from markdown"],
                  ["Tracked tasks", metrics.tasks, CheckSquare, "Across modules"],
                  ["Blocked items", metrics.blockedTasks, AlertTriangle, "Tasks + source blockers"],
                  ["Execution health", `${metrics.executionScore}%`, Workflow, "Plan alignment"],
                ].map(([label, value, Icon, sub]) => (
                  <Card key={String(label)}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm text-slate-500">{label}</div>
                          <div className="mt-2 text-3xl font-semibold">{value as React.ReactNode}</div>
                          <div className="mt-1 text-xs text-slate-500">{sub as React.ReactNode}</div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2">
                          {React.createElement(Icon as React.ComponentType<{ className?: string }>, { className: "h-4 w-4" })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                <Card>
                  <CardHeader>
                    <CardTitle>Execution phases</CardTitle>
                    <CardDescription>Track project progress against the master implementation order.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {workspace.execution.map((phase) => (
                      <div key={String(phase.id)} className="rounded-2xl border border-slate-200 p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <div className="font-medium">{phase.phase}</div>
                            <div className="mt-1 text-sm text-slate-500">{phase.items.join(" • ")}</div>
                          </div>
                          <div className="w-full md:w-56">
                            <div className="mb-2 flex justify-between text-xs text-slate-500">
                              <span>Completion</span>
                              <span>{phase.percent}%</span>
                            </div>
                            <Progress value={phase.percent} className="h-2" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>AI operator</CardTitle>
                    <CardDescription>Generate a reusable planning brief from the current workspace context.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Select value={aiFocus} onValueChange={setAiFocus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {modules.map((module) => (
                          <SelectItem key={module.key} value={module.key}>{module.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <textarea value={aiInstruction} onChange={(e) => setAiInstruction(e.target.value)} className="min-h-[160px] w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none" />
                    <div className="grid gap-3 md:grid-cols-2">
                      <Button onClick={() => copyText(aiPrompt)}>
                        <BrainCircuit className="mr-2 h-4 w-4" />
                        Copy AI brief
                      </Button>
                      <Button variant="outline" onClick={exportWorkspace}>
                        <Download className="mr-2 h-4 w-4" />
                        Export JSON
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="sources" className="space-y-6">
              <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                <Card>
                  <CardHeader>
                    <CardTitle>Source intake</CardTitle>
                    <CardDescription>Paste markdown, notes, or progress reports for parsing.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Input value={sourceDraft.name} onChange={(e) => setSourceDraft({ ...sourceDraft, name: e.target.value })} placeholder="Source name" />
                    <Input value={sourceDraft.path} onChange={(e) => setSourceDraft({ ...sourceDraft, path: e.target.value })} placeholder="Path or URL" />
                    <Select value={sourceDraft.module} onValueChange={(value) => setSourceDraft({ ...sourceDraft, module: value })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {modules.filter((module) => module.key !== "all").map((module) => (
                          <SelectItem key={module.key} value={module.key}>{module.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <textarea value={sourceDraft.content} onChange={(e) => setSourceDraft({ ...sourceDraft, content: e.target.value })} className="min-h-[220px] w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none" placeholder="Paste markdown, notes, or todo lists" />
                    <Button onClick={addSource}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add source
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Parsed source view</CardTitle>
                    <CardDescription>Inspect headings, open actions, blockers, and raw content.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {filteredSources.map((source) => (
                        <button key={source.id} onClick={() => setSelectedSourceId(source.id)} className={`rounded-full border px-3 py-1.5 text-sm ${selectedSourceId === source.id ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700"}`}>
                          {source.name}
                        </button>
                      ))}
                    </div>

                    {selectedSource ? (
                      <>
                        <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">{selectedSource.parsed.summary}</div>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="rounded-2xl border border-slate-200 p-4">
                            <div className="mb-3 font-medium">Open actions</div>
                            <div className="space-y-2 text-sm text-slate-600">
                              {selectedSource.parsed.todos.length ? selectedSource.parsed.todos.map((todo, index) => <div key={index}>• {todo}</div>) : <div>No open actions detected.</div>}
                            </div>
                          </div>
                          <div className="rounded-2xl border border-slate-200 p-4">
                            <div className="mb-3 font-medium">Blockers</div>
                            <div className="space-y-2 text-sm text-slate-600">
                              {selectedSource.parsed.blockers.length ? selectedSource.parsed.blockers.map((item, index) => <div key={index}>• {item}</div>) : <div>No blockers detected.</div>}
                            </div>
                          </div>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          <Button onClick={promoteSourceToTasks}>
                            <Wand2 className="mr-2 h-4 w-4" />
                            Create tasks
                          </Button>
                          <Button variant="outline" onClick={() => copyText(selectedSource.content)}>
                            <FileUp className="mr-2 h-4 w-4" />
                            Copy source text
                          </Button>
                        </div>
                        <ScrollArea className="h-[220px] rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <pre className="whitespace-pre-wrap text-xs leading-6 text-slate-700">{selectedSource.content}</pre>
                        </ScrollArea>
                      </>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">No source selected.</div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="docs">
              <Card>
                <CardHeader>
                  <CardTitle>Docs library</CardTitle>
                  <CardDescription>Track canonical plans, runbooks, and reference docs.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {filteredDocs.map((doc) => (
                    <div key={String(doc.id)} className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="font-semibold">{doc.title}</div>
                            <Badge variant="outline">{doc.type}</Badge>
                            <Badge variant="outline">{doc.status}</Badge>
                          </div>
                          <p className="mt-2 text-sm text-slate-600">{doc.summary}</p>
                          <div className="mt-3 text-xs text-slate-500">{doc.path}</div>
                        </div>
                        <Button variant="outline">
                          Open doc
                          <ArrowUpRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tasks" className="space-y-6">
              <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                <div className="grid gap-4 xl:grid-cols-5">
                  {taskStatuses.map((status) => (
                    <Card key={status}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">{status}</CardTitle>
                        <CardDescription>{filteredTasks.filter((task) => task.status === status).length} task(s)</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {filteredTasks.filter((task) => task.status === status).map((task) => (
                          <div key={task.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="text-xs font-semibold text-slate-500">{task.id}</div>
                              <Badge className={`rounded-full border ${pillClass(task.priority)}`}>{task.priority}</Badge>
                            </div>
                            <div className="mt-2 text-sm font-medium">{task.title}</div>
                            <div className="mt-3 space-y-1 text-xs text-slate-500">
                              <div>Module: {getModuleLabel(String(task.module))}</div>
                              <div>Assignee: {task.assignee || "Unassigned"}</div>
                              <div>Phase: {task.planPhase || "—"}</div>
                            </div>
                            <Button variant="outline" className="mt-3 w-full" onClick={() => cycleTaskStatus(task.id)}>
                              <Clock3 className="mr-2 h-4 w-4" />
                              Advance status
                            </Button>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Add task</CardTitle>
                    <CardDescription>Create project tasks manually when needed.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Input value={taskDraft.title} onChange={(e) => setTaskDraft({ ...taskDraft, title: e.target.value })} placeholder="Task title" />
                    <Input value={taskDraft.assignee ?? ""} onChange={(e) => setTaskDraft({ ...taskDraft, assignee: e.target.value })} placeholder="Assignee" />
                    <Select value={String(taskDraft.module)} onValueChange={(value) => setTaskDraft({ ...taskDraft, module: value })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {modules.filter((module) => module.key !== "all").map((module) => (
                          <SelectItem key={module.key} value={module.key}>{module.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={taskDraft.priority} onValueChange={(value) => setTaskDraft({ ...taskDraft, priority: value as ProjectTask["priority"] })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {priorities.map((priority) => (
                          <SelectItem key={priority} value={priority}>{priority}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={taskDraft.status} onValueChange={(value) => setTaskDraft({ ...taskDraft, status: value as ProjectTask["status"] })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {taskStatuses.map((status) => (
                          <SelectItem key={status} value={status}>{status}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input value={taskDraft.planPhase ?? ""} onChange={(e) => setTaskDraft({ ...taskDraft, planPhase: e.target.value })} placeholder="Plan phase" />
                    <textarea value={taskDraft.blocker ?? ""} onChange={(e) => setTaskDraft({ ...taskDraft, blocker: e.target.value })} className="min-h-[120px] w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none" placeholder="Blocker or dependency" />
                    <Button onClick={addTask}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add task
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="execution">
              <Card>
                <CardHeader>
                  <CardTitle>Plan execution</CardTitle>
                  <CardDescription>Phase-oriented tracking for the Workforce roadmap.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {workspace.execution.map((phase) => (
                    <div key={String(phase.id)} className="rounded-2xl border border-slate-200 p-4">
                      <div className="font-medium">{phase.phase}</div>
                      <div className="mt-1 text-sm text-slate-500">{phase.items.join(" • ")}</div>
                      <div className="mt-3">
                        <Progress value={phase.percent} className="h-2" />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="progress">
              <Card>
                <CardHeader>
                  <CardTitle>Progress timeline</CardTitle>
                  <CardDescription>Manager-readable execution history.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {filteredProgress.map((entry) => (
                    <div key={String(entry.id)} className="grid gap-3 rounded-2xl border border-slate-200 p-4 md:grid-cols-[160px_1fr]">
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <CalendarDays className="h-4 w-4" />
                        {entry.date}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="font-medium">{entry.title}</div>
                          {entry.tag ? <Badge variant="outline">{entry.tag}</Badge> : null}
                        </div>
                        <p className="mt-2 text-sm text-slate-600">{entry.detail}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ai">
              <Card>
                <CardHeader>
                  <CardTitle>Generated AI brief</CardTitle>
                  <CardDescription>Use this prompt with ChatGPT, Codex, or Copilot for manager support.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[420px] rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <pre className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{aiPrompt}</pre>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="workspace">
              <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                <Card>
                  <CardHeader>
                    <CardTitle>Workspace</CardTitle>
                    <CardDescription>Project paths and portable state controls.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-700">Repo root: {workspace.project.repoRoot}</div>
                    <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-700">Frontend root: {workspace.project.frontendRoot}</div>
                    <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-700">Docs root: {workspace.project.docsRoot}</div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <Button onClick={exportWorkspace}>
                        <Upload className="mr-2 h-4 w-4" />
                        Export workspace
                      </Button>
                      <Button variant="outline" onClick={() => copyText(workspace.project.routePath)}>
                        <LinkIcon className="mr-2 h-4 w-4" />
                        Copy route path
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Install notes</CardTitle>
                    <CardDescription>Keep this module privileged and tied to canonical sources.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-slate-700">
                    <div className="rounded-2xl border border-slate-200 p-4">Recommended route: {workspace.project.routePath}</div>
                    <div className="rounded-2xl border border-slate-200 p-4">Access policy: {workspace.project.accessPolicy}</div>
                    <div className="rounded-2xl border border-slate-200 p-4">Docs endpoint: {workspace.project.docsApiPath}</div>
                    <div className="rounded-2xl border border-slate-200 p-4">Tasks endpoint: {workspace.project.tasksApiPath}</div>
                    <div className="rounded-2xl border border-slate-200 p-4">Sources endpoint: {workspace.project.sourcesApiPath}</div>
                    <div className="rounded-2xl border border-slate-200 p-4">AI endpoint: {workspace.project.aiApiPath}</div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}
