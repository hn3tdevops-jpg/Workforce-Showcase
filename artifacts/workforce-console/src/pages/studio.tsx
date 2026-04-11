import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Sparkles, Plus, FolderOpen, MessageSquare, Send, Loader2,
  FileText, CheckSquare, Lightbulb, HelpCircle, ChevronRight,
  Archive, Layers, Clock, X, RefreshCw, CheckCircle2, Trash2,
  BookOpen, Zap, AlertTriangle, Settings2, Database, GitBranch,
  Layout, Brain, ArrowRight, ChevronDown, ChevronUp, Cpu,
  ShieldCheck, XCircle, Info, AlertCircle, EyeOff,
  PackageOpen, Copy, Check, Download, Wand2,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface StudioProject {
  id: string;
  title: string;
  summary?: string;
  scope_type: string;
  domain_type?: string;
  status: string;
  session_count?: number;
  message_count?: number;
  created_at: string;
  updated_at: string;
}

interface StudioSession {
  id: string;
  project_id: string;
  title?: string;
  mode: string;
  message_count?: number;
  created_at: string;
  updated_at: string;
}

interface StudioMessage {
  id: string;
  session_id: string;
  role: "USER" | "ASSISTANT" | "SYSTEM";
  content: string;
  created_at: string;
}

interface StudioNote { id: string; project_id: string; note_type: string; title: string; body: string; status: string; created_at: string; }
interface StudioRequirement { id: string; project_id: string; requirement_type: string; priority: string; statement: string; status: string; created_at: string; }
interface StudioDecision { id: string; project_id: string; title: string; decision_text: string; rationale?: string; created_at: string; }
interface StudioQuestion { id: string; project_id: string; question: string; why_it_matters?: string; severity: string; resolved_at?: string; created_at: string; }

interface StudioOutputs {
  notes: StudioNote[];
  requirements: StudioRequirement[];
  decisions: StudioDecision[];
  questions: StudioQuestion[];
}

interface StudioEntity    { id: string; project_id: string; name: string; description: string; attributes: string; status: string; created_at: string; }
interface StudioWorkflow  { id: string; project_id: string; name: string; description: string; steps: string;      status: string; created_at: string; }
interface StudioView      { id: string; project_id: string; name: string; view_type: string; description: string;  status: string; created_at: string; }
interface StudioConcept   { id: string; project_id: string; name: string; definition: string;                      status: string; created_at: string; }
interface StudioRelationship { id: string; project_id: string; from_name: string; from_type: string; to_name: string; to_type: string; relation: string; status: string; }

interface StudioModels {
  entities:      StudioEntity[];
  workflows:     StudioWorkflow[];
  views:         StudioView[];
  concepts:      StudioConcept[];
  relationships: StudioRelationship[];
}

interface StudioValidation {
  id:           string;
  project_id:   string;
  rule_id:      string;
  severity:     "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  category:     string;
  title:        string;
  detail?:      string;
  subject_id?:  string;
  subject_type?: string;
  status:       string;
  created_at:   string;
}

type ArtifactType = "SUMMARY" | "DESIGN_DOC" | "SCHEMA_DRAFT" | "API_SPEC" | "ROADMAP" | "COPILOT_PACK";

interface StudioArtifactMeta {
  id:            string;
  project_id:    string;
  artifact_type: ArtifactType;
  label:         string;
  word_count:    number;
  generated_at:  string;
}

interface StudioArtifact extends StudioArtifactMeta {
  content: string;
}

const ARTIFACT_EMOJI: Record<ArtifactType, string> = {
  SUMMARY:      "📋",
  DESIGN_DOC:   "📐",
  SCHEMA_DRAFT: "🗄️",
  API_SPEC:     "🔌",
  ROADMAP:      "🗺️",
  COPILOT_PACK: "🤖",
};

// ── API helpers ───────────────────────────────────────────────────────────────

const studioApi = {
  listProjects: ()           => fetchApi<StudioProject[]>("/studio/projects"),
  createProject: (body: any) => fetchApi<StudioProject>("/studio/projects", { method: "POST", body: JSON.stringify(body) }),
  listSessions:  (pid: string) => fetchApi<StudioSession[]>(`/studio/projects/${pid}/sessions`),
  createSession: (pid: string, body: any) => fetchApi<StudioSession>(`/studio/projects/${pid}/sessions`, { method: "POST", body: JSON.stringify(body) }),
  getSession:    (sid: string) => fetchApi<StudioSession & { messages: StudioMessage[] }>(`/studio/sessions/${sid}`),
  sendMessage:   (sid: string, content: string, role = "USER") =>
    fetchApi<{ message: StudioMessage; extracted: StudioOutputs }>(`/studio/sessions/${sid}/messages`, { method: "POST", body: JSON.stringify({ content, role }) }),
  getOutputs:    (pid: string) => fetchApi<StudioOutputs>(`/studio/projects/${pid}/outputs`),
  resolveQuestion: (qid: string) => fetchApi(`/studio/questions/${qid}/resolve`, { method: "PATCH" }),
  deleteNote:    (nid: string)  => fetchApi(`/studio/notes/${nid}`, { method: "DELETE" }),
  getModels:     (pid: string) => fetchApi<StudioModels>(`/studio/projects/${pid}/models`),
  deriveModels:  (pid: string) => fetchApi<StudioModels>(`/studio/projects/${pid}/models/derive`, { method: "POST" }),
  confirmEntity:   (id: string, status: string) => fetchApi(`/studio/entities/${id}`,  { method: "PATCH", body: JSON.stringify({ status }) }),
  confirmWorkflow: (id: string, status: string) => fetchApi(`/studio/workflows/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
  confirmView:     (id: string, status: string) => fetchApi(`/studio/views/${id}`,     { method: "PATCH", body: JSON.stringify({ status }) }),
  confirmConcept:  (id: string, status: string) => fetchApi(`/studio/concepts/${id}`,  { method: "PATCH", body: JSON.stringify({ status }) }),
  getValidations:  (pid: string) => fetchApi<StudioValidation[]>(`/studio/projects/${pid}/validations`),
  validate:        (pid: string) => fetchApi<StudioValidation[]>(`/studio/projects/${pid}/validate`, { method: "POST" }),
  dismissValidation: (vid: string) => fetchApi(`/studio/validations/${vid}/dismiss`, { method: "PATCH" }),
  getArtifacts:   (pid: string) => fetchApi<StudioArtifactMeta[]>(`/studio/projects/${pid}/artifacts`),
  generateAll:    (pid: string) => fetchApi<StudioArtifactMeta[]>(`/studio/projects/${pid}/artifacts/generate`, { method: "POST" }),
  generateOne:    (pid: string, type: ArtifactType) => fetchApi<StudioArtifactMeta[]>(`/studio/projects/${pid}/artifacts/generate?types=${type}`, { method: "POST" }),
  getArtifact:    (aid: string) => fetchApi<StudioArtifact>(`/studio/artifacts/${aid}`),
};

// ── Metadata ──────────────────────────────────────────────────────────────────

const SESSION_MODES = [
  { value: "EXPLORE",    label: "Explore",    desc: "Open brainstorming" },
  { value: "STRUCTURE",  label: "Structure",  desc: "Organize requirements" },
  { value: "MODEL",      label: "Model",      desc: "Define entities & flows" },
  { value: "VISUALIZE",  label: "Visualize",  desc: "Diagram & wireframe" },
  { value: "VALIDATE",   label: "Validate",   desc: "Review & verify" },
  { value: "HANDOFF",    label: "Handoff",    desc: "Export & ship" },
];

const MODE_COLORS: Record<string, string> = {
  EXPLORE:   "bg-violet-500/15 text-violet-400 border-violet-500/30",
  STRUCTURE: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  MODEL:     "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  VISUALIZE: "bg-pink-500/15 text-pink-400 border-pink-500/30",
  VALIDATE:  "bg-amber-500/15 text-amber-400 border-amber-500/30",
  HANDOFF:   "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
};

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: "text-red-400",
  HIGH:     "text-orange-400",
  MEDIUM:   "text-amber-400",
  LOW:      "text-muted-foreground",
};

const SEVERITY_COLORS: Record<string, string> = {
  HIGH:    "text-red-400 bg-red-500/10 border-red-500/30",
  MEDIUM:  "text-amber-400 bg-amber-500/10 border-amber-500/30",
  LOW:     "text-muted-foreground bg-muted/20 border-border/40",
  BLOCKING:"text-red-400 bg-red-500/10 border-red-500/30",
};

const NOTE_TYPE_ICONS: Record<string, React.ElementType> = {
  GOAL:       Zap,
  CONSTRAINT: AlertTriangle,
  ASSUMPTION: BookOpen,
  RISK:       AlertTriangle,
  QUESTION:   HelpCircle,
  DECISION:   CheckCircle2,
  SUMMARY:    FileText,
};

// ── Create Project Dialog ─────────────────────────────────────────────────────

function CreateProjectDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [title,  setTitle]  = useState("");
  const [summary, setSummary] = useState("");
  const [domain,  setDomain]  = useState("__none__");

  const mut = useMutation({
    mutationFn: () => studioApi.createProject({
      title: title.trim(),
      summary: summary.trim() || undefined,
      domain_type: domain === "__none__" ? undefined : domain,
      scope_type: "BUSINESS",
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["studio:projects"] });
      toast({ title: "Project created" });
      setTitle(""); setSummary(""); setDomain("__none__");
      onClose();
    },
    onError: () => toast({ title: "Failed to create project", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md border-border/50 bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Sparkles className="w-4 h-4 text-primary" /> New Studio Project
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div>
            <Label className="text-xs mb-1.5 block">Project Title *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Housekeeping Workflow Redesign" className="h-8 text-sm" autoFocus />
          </div>
          <div>
            <Label className="text-xs mb-1.5 block">Summary</Label>
            <Textarea value={summary} onChange={e => setSummary(e.target.value)} placeholder="What are you designing or planning?" className="text-xs min-h-[72px] resize-none" />
          </div>
          <div>
            <Label className="text-xs mb-1.5 block">Domain Type</Label>
            <Select value={domain} onValueChange={setDomain}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" className="text-xs">— General —</SelectItem>
                {["Housekeeping", "Front Desk", "Maintenance", "Scheduling", "Staff Management", "Reporting", "Integration", "Other"].map(d => (
                  <SelectItem key={d} value={d.toLowerCase().replace(" ", "_")} className="text-xs">{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 text-xs">Cancel</Button>
          <Button size="sm" className="h-8 text-xs gap-1" onClick={() => mut.mutate()} disabled={mut.isPending || !title.trim()}>
            {mut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Plus className="w-3.5 h-3.5" />Create Project</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Create Session Dialog ─────────────────────────────────────────────────────

function CreateSessionDialog({ projectId, open, onClose }: { projectId: string; open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [mode,  setMode]  = useState("EXPLORE");

  const mut = useMutation({
    mutationFn: () => studioApi.createSession(projectId, { title: title.trim() || undefined, mode }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["studio:sessions", projectId] });
      toast({ title: "Session started" });
      setTitle(""); setMode("EXPLORE");
      onClose();
    },
    onError: () => toast({ title: "Failed to start session", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm border-border/50 bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <MessageSquare className="w-4 h-4 text-primary" /> New Session
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div>
            <Label className="text-xs mb-1.5 block">Session Title (optional)</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Initial brainstorm" className="h-8 text-sm" autoFocus />
          </div>
          <div>
            <Label className="text-xs mb-2 block">Mode</Label>
            <div className="grid grid-cols-2 gap-1.5">
              {SESSION_MODES.map(m => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMode(m.value)}
                  className={cn(
                    "text-left p-2 rounded-lg border text-xs transition-all",
                    mode === m.value
                      ? `${MODE_COLORS[m.value]} ring-1 ring-current/40`
                      : "border-border/40 bg-muted/20 hover:bg-muted/40 text-muted-foreground"
                  )}
                >
                  <div className="font-medium">{m.label}</div>
                  <div className="text-[10px] opacity-70 mt-0.5">{m.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 text-xs">Cancel</Button>
          <Button size="sm" className="h-8 text-xs gap-1" onClick={() => mut.mutate()} disabled={mut.isPending}>
            {mut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><MessageSquare className="w-3.5 h-3.5" />Start</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Chat message bubble ───────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: StudioMessage }) {
  const isUser = msg.role === "USER";
  return (
    <div className={cn("flex gap-2.5 group", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="w-6 h-6 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles className="w-3 h-3 text-primary" />
        </div>
      )}
      <div className={cn(
        "max-w-[75%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed",
        isUser
          ? "bg-primary text-primary-foreground rounded-br-sm"
          : "bg-muted/40 border border-border/40 text-foreground rounded-bl-sm"
      )}>
        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
        <p className={cn("text-[9px] mt-1.5 opacity-50", isUser ? "text-right" : "text-left")}>
          {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, string> = {
    CONFIRMED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    INFERRED:  "bg-muted/40 text-muted-foreground border-border/40",
    REJECTED:  "bg-red-500/10 text-red-400 border-red-500/30",
  };
  return (
    <span className={cn("inline-block text-[9px] px-1.5 py-0.5 rounded border", cfg[status] ?? cfg.INFERRED)}>
      {status}
    </span>
  );
}

// ── Derived Models Panel ───────────────────────────────────────────────────────

type ModelTab = "entities" | "workflows" | "views" | "concepts" | "relationships";

const VIEW_TYPE_COLORS: Record<string, string> = {
  DASHBOARD: "text-violet-400 bg-violet-500/10 border-violet-500/30",
  LIST:      "text-blue-400 bg-blue-500/10 border-blue-500/30",
  FORM:      "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
  REPORT:    "text-amber-400 bg-amber-500/10 border-amber-500/30",
  MOBILE:    "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  DETAIL:    "text-pink-400 bg-pink-500/10 border-pink-500/30",
};

const REL_TYPE_COLORS: Record<string, string> = {
  ENTITY:   "text-blue-400",
  WORKFLOW: "text-violet-400",
  VIEW:     "text-cyan-400",
  CONCEPT:  "text-amber-400",
};

function ModelsPanel({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [tab, setTab] = useState<ModelTab>("entities");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: models, isLoading, refetch } = useQuery({
    queryKey: ["studio:models", projectId],
    queryFn: () => studioApi.getModels(projectId),
    refetchInterval: 10000,
  });

  const deriveMut = useMutation({
    mutationFn: () => studioApi.deriveModels(projectId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["studio:models", projectId] });
      toast({ title: "Models derived from conversation" });
    },
    onError: () => toast({ title: "Derivation failed", variant: "destructive" }),
  });

  const confirmMut = useMutation({
    mutationFn: ({ type, id, status }: { type: string; id: string; status: string }) => {
      if (type === "entity")   return studioApi.confirmEntity(id, status);
      if (type === "workflow") return studioApi.confirmWorkflow(id, status);
      if (type === "view")     return studioApi.confirmView(id, status);
      return studioApi.confirmConcept(id, status);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["studio:models", projectId] }),
  });

  const modelTabs: { id: ModelTab; label: string; icon: React.ElementType; count?: number }[] = [
    { id: "entities",      label: "Entities",   icon: Database,   count: models?.entities.length },
    { id: "workflows",     label: "Flows",      icon: GitBranch,  count: models?.workflows.length },
    { id: "views",         label: "Views",      icon: Layout,     count: models?.views.length },
    { id: "concepts",      label: "Concepts",   icon: Brain,      count: models?.concepts.length },
    { id: "relationships", label: "Links",      icon: ArrowRight, count: models?.relationships.length },
  ];

  const totalModels = (models?.entities.length ?? 0) + (models?.workflows.length ?? 0) +
    (models?.views.length ?? 0) + (models?.concepts.length ?? 0);

  return (
    <div className="flex flex-col h-full">
      {/* derive button */}
      <div className="shrink-0 px-3 pt-2 pb-1.5">
        <Button
          size="sm"
          variant="outline"
          className="w-full h-7 text-xs gap-1.5 border-dashed border-primary/40 hover:border-primary/70 hover:bg-primary/5"
          onClick={() => deriveMut.mutate()}
          disabled={deriveMut.isPending}
        >
          {deriveMut.isPending
            ? <><Loader2 className="w-3 h-3 animate-spin" />Deriving…</>
            : <><Cpu className="w-3 h-3 text-primary" />Derive from Conversation</>
          }
        </Button>
        {totalModels === 0 && !isLoading && (
          <p className="text-[9px] text-muted-foreground text-center mt-1.5">
            Send messages then click Derive to extract entities, workflows, and views.
          </p>
        )}
      </div>

      {/* tabs */}
      <div className="shrink-0 flex border-b border-border/50">
        {modelTabs.map(t => {
          const Icon = t.icon as any;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex-1 flex flex-col items-center gap-0.5 py-2 text-[9px] font-medium transition-colors border-b-2",
                tab === t.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
              {(t.count ?? 0) > 0 && (
                <span className="bg-primary/20 text-primary rounded-full px-1 min-w-[14px] text-center leading-none py-0.5">
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isLoading && [1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}

        {/* Entities */}
        {!isLoading && tab === "entities" && (
          (models?.entities.length ?? 0) === 0
            ? <EmptyOutput label="No entities derived yet. Send messages then click Derive." />
            : models!.entities.map(e => {
              const attrs: string[] = (() => { try { return JSON.parse(e.attributes); } catch { return []; } })();
              const expanded = expandedId === e.id;
              return (
                <div key={e.id} className="rounded-lg border border-border/40 bg-muted/10 overflow-hidden">
                  <div className="p-2.5">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5">
                        <Database className="w-3 h-3 text-blue-400 shrink-0" />
                        <span className="text-xs font-semibold text-blue-300">{e.name}</span>
                      </div>
                      <StatusBadge status={e.status} />
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">{e.description}</p>
                    {attrs.length > 0 && (
                      <button
                        onClick={() => setExpandedId(expanded ? null : e.id)}
                        className="flex items-center gap-1 mt-1.5 text-[9px] text-muted-foreground/70 hover:text-muted-foreground"
                      >
                        {expanded ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
                        {attrs.length} attribute{attrs.length !== 1 ? "s" : ""}
                      </button>
                    )}
                    {expanded && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {attrs.map(a => (
                          <span key={a} className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-300 font-mono">{a}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  {e.status === "INFERRED" && (
                    <div className="px-2.5 pb-2 flex gap-1">
                      <button onClick={() => confirmMut.mutate({ type: "entity", id: e.id, status: "CONFIRMED" })} className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20">✓ Confirm</button>
                      <button onClick={() => confirmMut.mutate({ type: "entity", id: e.id, status: "REJECTED"  })} className="text-[9px] px-2 py-0.5 rounded bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20">✗ Reject</button>
                    </div>
                  )}
                </div>
              );
            })
        )}

        {/* Workflows */}
        {!isLoading && tab === "workflows" && (
          (models?.workflows.length ?? 0) === 0
            ? <EmptyOutput label="No workflows derived yet. Describe processes in chat then click Derive." />
            : models!.workflows.map(w => {
              const steps: string[] = (() => { try { return JSON.parse(w.steps); } catch { return []; } })();
              const expanded = expandedId === w.id;
              return (
                <div key={w.id} className="rounded-lg border border-border/40 bg-muted/10 overflow-hidden">
                  <div className="p-2.5">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5">
                        <GitBranch className="w-3 h-3 text-violet-400 shrink-0" />
                        <span className="text-xs font-semibold text-violet-300">{w.name}</span>
                      </div>
                      <StatusBadge status={w.status} />
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">{w.description}</p>
                    {steps.length > 0 && (
                      <button
                        onClick={() => setExpandedId(expanded ? null : w.id)}
                        className="flex items-center gap-1 mt-1.5 text-[9px] text-muted-foreground/70 hover:text-muted-foreground"
                      >
                        {expanded ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
                        {steps.length} step{steps.length !== 1 ? "s" : ""}
                      </button>
                    )}
                    {expanded && (
                      <ol className="mt-1.5 space-y-1">
                        {steps.map((s, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-[10px] text-foreground/80">
                            <span className="shrink-0 text-[9px] font-bold text-violet-400 mt-px">{i + 1}.</span>
                            {s}
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                  {w.status === "INFERRED" && (
                    <div className="px-2.5 pb-2 flex gap-1">
                      <button onClick={() => confirmMut.mutate({ type: "workflow", id: w.id, status: "CONFIRMED" })} className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20">✓ Confirm</button>
                      <button onClick={() => confirmMut.mutate({ type: "workflow", id: w.id, status: "REJECTED"  })} className="text-[9px] px-2 py-0.5 rounded bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20">✗ Reject</button>
                    </div>
                  )}
                </div>
              );
            })
        )}

        {/* Views */}
        {!isLoading && tab === "views" && (
          (models?.views.length ?? 0) === 0
            ? <EmptyOutput label="No UI views derived yet. Describe screens or pages in chat then click Derive." />
            : models!.views.map(v => (
              <div key={v.id} className="p-2.5 rounded-lg border border-border/40 bg-muted/10">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5">
                    <Layout className="w-3 h-3 text-cyan-400 shrink-0" />
                    <span className="text-xs font-semibold text-cyan-300">{v.name}</span>
                  </div>
                  <StatusBadge status={v.status} />
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed mb-1.5">{v.description}</p>
                <span className={cn("text-[9px] px-1.5 py-0.5 rounded border font-mono", VIEW_TYPE_COLORS[v.view_type] ?? VIEW_TYPE_COLORS.LIST)}>{v.view_type}</span>
                {v.status === "INFERRED" && (
                  <div className="flex gap-1 mt-1.5">
                    <button onClick={() => confirmMut.mutate({ type: "view", id: v.id, status: "CONFIRMED" })} className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20">✓ Confirm</button>
                    <button onClick={() => confirmMut.mutate({ type: "view", id: v.id, status: "REJECTED"  })} className="text-[9px] px-2 py-0.5 rounded bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20">✗ Reject</button>
                  </div>
                )}
              </div>
            ))
        )}

        {/* Concepts */}
        {!isLoading && tab === "concepts" && (
          (models?.concepts.length ?? 0) === 0
            ? <EmptyOutput label="No concepts derived yet. Use domain-specific language in chat then click Derive." />
            : models!.concepts.map(c => (
              <div key={c.id} className="p-2.5 rounded-lg border border-border/40 bg-muted/10">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5">
                    <Brain className="w-3 h-3 text-amber-400 shrink-0" />
                    <span className="text-xs font-semibold text-amber-300">{c.name}</span>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">{c.definition}</p>
                {c.status === "INFERRED" && (
                  <div className="flex gap-1 mt-1.5">
                    <button onClick={() => confirmMut.mutate({ type: "concept", id: c.id, status: "CONFIRMED" })} className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20">✓ Confirm</button>
                    <button onClick={() => confirmMut.mutate({ type: "concept", id: c.id, status: "REJECTED"  })} className="text-[9px] px-2 py-0.5 rounded bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20">✗ Reject</button>
                  </div>
                )}
              </div>
            ))
        )}

        {/* Relationships */}
        {!isLoading && tab === "relationships" && (
          (models?.relationships.length ?? 0) === 0
            ? <EmptyOutput label="Relationships appear automatically after entities and workflows are derived." />
            : models!.relationships.map(r => (
              <div key={r.id} className="p-2 rounded-lg border border-border/40 bg-muted/10">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={cn("text-[10px] font-semibold", REL_TYPE_COLORS[r.from_type] ?? "text-foreground")}>{r.from_name}</span>
                  <ArrowRight className="w-2.5 h-2.5 text-muted-foreground shrink-0" />
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted/40 border border-border/40 text-muted-foreground font-mono">{r.relation}</span>
                  <ArrowRight className="w-2.5 h-2.5 text-muted-foreground shrink-0" />
                  <span className={cn("text-[10px] font-semibold", REL_TYPE_COLORS[r.to_type] ?? "text-foreground")}>{r.to_name}</span>
                </div>
                <div className="flex gap-2 mt-1">
                  <span className={cn("text-[9px] font-mono", REL_TYPE_COLORS[r.from_type])}>{r.from_type}</span>
                  <span className="text-[9px] text-muted-foreground">→</span>
                  <span className={cn("text-[9px] font-mono", REL_TYPE_COLORS[r.to_type])}>{r.to_type}</span>
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  );
}

// ── Artifacts Panel (Phase 9) ────────────────────────────────────────────────

const ARTIFACT_ORDER: ArtifactType[] = ["SUMMARY","DESIGN_DOC","SCHEMA_DRAFT","API_SPEC","ROADMAP","COPILOT_PACK"];
const ARTIFACT_LABEL: Record<ArtifactType, string> = {
  SUMMARY:      "Executive Summary",
  DESIGN_DOC:   "Design Document",
  SCHEMA_DRAFT: "Schema Draft",
  API_SPEC:     "API Spec",
  ROADMAP:      "Roadmap",
  COPILOT_PACK: "Copilot Pack",
};
const ARTIFACT_DESC: Record<ArtifactType, string> = {
  SUMMARY:      "High-level overview & stats",
  DESIGN_DOC:   "Full structured design spec (Markdown)",
  SCHEMA_DRAFT: "SQL table definitions for all entities",
  API_SPEC:     "REST endpoint blueprint from models",
  ROADMAP:      "Phased delivery plan from requirements",
  COPILOT_PACK: "AI-ready context bundle for developers",
};

function ArtifactsPanel({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const { data: artifacts = [], isLoading, refetch } = useQuery({
    queryKey: ["studio:artifacts", projectId],
    queryFn: () => studioApi.getArtifacts(projectId),
  });

  // Full content query (lazy — only when expanded)
  const { data: expandedArtifact } = useQuery({
    queryKey: ["studio:artifact", expandedId],
    queryFn: () => studioApi.getArtifact(expandedId!),
    enabled: !!expandedId,
  });

  const generateAllMut = useMutation({
    mutationFn: () => studioApi.generateAll(projectId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["studio:artifacts", projectId] });
      toast({ title: "All artifacts generated" });
    },
    onError: () => toast({ title: "Generation failed", variant: "destructive" }),
  });

  const generateOneMut = useMutation({
    mutationFn: (type: ArtifactType) => studioApi.generateOne(projectId, type),
    onSuccess: (_, type) => {
      qc.invalidateQueries({ queryKey: ["studio:artifacts", projectId] });
      toast({ title: `${ARTIFACT_LABEL[type]} regenerated` });
    },
    onError: () => toast({ title: "Regeneration failed", variant: "destructive" }),
  });

  const artifactMap = new Map(artifacts.map(a => [a.artifact_type, a]));

  async function handleCopy(content: string, id: string) {
    await navigator.clipboard.writeText(content);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  function handleDownload(artifact: StudioArtifact) {
    const ext = artifact.artifact_type === "DESIGN_DOC" ? "md" : "txt";
    const filename = `${artifact.artifact_type.toLowerCase()}.${ext}`;
    const blob = new Blob([artifact.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col h-full">
      {/* generate all button */}
      <div className="shrink-0 px-3 pt-2 pb-1.5">
        <Button
          size="sm"
          variant="outline"
          className="w-full h-7 text-xs gap-1.5 border-dashed border-primary/40 hover:border-primary/70 hover:bg-primary/5"
          onClick={() => generateAllMut.mutate()}
          disabled={generateAllMut.isPending}
        >
          {generateAllMut.isPending
            ? <><Loader2 className="w-3 h-3 animate-spin" />Generating…</>
            : <><Wand2 className="w-3 h-3 text-primary" />Generate All Artifacts</>
          }
        </Button>
        {artifacts.length === 0 && !isLoading && (
          <p className="text-[9px] text-muted-foreground text-center mt-1.5">
            Click Generate to build all 6 output documents from your project data.
          </p>
        )}
      </div>

      {/* artifact cards */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isLoading && ARTIFACT_ORDER.map(t => <Skeleton key={t} className="h-16 w-full rounded-lg" />)}

        {!isLoading && ARTIFACT_ORDER.map(type => {
          const meta   = artifactMap.get(type);
          const isOpen = expandedId === (meta?.id ?? null);
          const emoji  = ARTIFACT_EMOJI[type];

          return (
            <div key={type} className="rounded-lg border border-border/40 bg-muted/10 overflow-hidden">
              {/* header row */}
              <div className="flex items-center gap-2 px-2.5 py-2">
                <span className="text-sm shrink-0">{emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-foreground truncate">{ARTIFACT_LABEL[type]}</p>
                  <p className="text-[9px] text-muted-foreground leading-tight">{ARTIFACT_DESC[type]}</p>
                </div>
                {meta ? (
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[8px] text-muted-foreground font-mono">{meta.word_count}w</span>
                    <button
                      onClick={() => setExpandedId(isOpen ? null : meta.id)}
                      className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20"
                    >
                      {isOpen ? "Hide" : "View"}
                    </button>
                    <button
                      onClick={() => generateOneMut.mutate(type)}
                      title="Regenerate"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <RefreshCw className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => generateOneMut.mutate(type)}
                    disabled={generateOneMut.isPending}
                    className="text-[9px] px-1.5 py-0.5 rounded bg-muted/60 border border-border/40 text-muted-foreground hover:text-foreground hover:border-border/70 disabled:opacity-50 shrink-0"
                  >
                    Generate
                  </button>
                )}
              </div>

              {/* expanded content viewer */}
              {isOpen && (
                <div className="border-t border-border/40">
                  <div className="flex items-center justify-end gap-1 px-2.5 py-1 border-b border-border/30 bg-muted/5">
                    {expandedArtifact && (
                      <>
                        <button
                          onClick={() => handleCopy(expandedArtifact.content, expandedArtifact.id)}
                          className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-foreground"
                        >
                          {copied === expandedArtifact.id
                            ? <><Check className="w-2.5 h-2.5 text-emerald-400" /><span className="text-emerald-400">Copied!</span></>
                            : <><Copy className="w-2.5 h-2.5" />Copy</>
                          }
                        </button>
                        <button
                          onClick={() => handleDownload(expandedArtifact)}
                          className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-foreground ml-2"
                        >
                          <Download className="w-2.5 h-2.5" />Save
                        </button>
                      </>
                    )}
                  </div>
                  {!expandedArtifact ? (
                    <div className="p-3"><Skeleton className="h-32 w-full" /></div>
                  ) : (
                    <pre className="p-3 text-[10px] text-foreground/80 font-mono whitespace-pre-wrap break-words leading-relaxed max-h-80 overflow-y-auto bg-muted/5">
                      {expandedArtifact.content}
                    </pre>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Validation Panel (Phase 8) ────────────────────────────────────────────────

const SEVERITY_ICON: Record<string, React.ElementType> = {
  CRITICAL: XCircle,
  HIGH:     AlertCircle,
  MEDIUM:   AlertTriangle,
  LOW:      Info,
  INFO:     Info,
};

const SEVERITY_CHIP: Record<string, string> = {
  CRITICAL: "bg-red-500/10 text-red-400 border-red-500/30",
  HIGH:     "bg-orange-500/10 text-orange-400 border-orange-500/30",
  MEDIUM:   "bg-amber-500/10 text-amber-400 border-amber-500/30",
  LOW:      "bg-blue-500/10 text-blue-400 border-blue-500/30",
  INFO:     "bg-muted/40 text-muted-foreground border-border/40",
};

const CATEGORY_LABEL: Record<string, string> = {
  MODEL:       "Model",
  REQUIREMENT: "Req",
  QUESTION:    "Question",
  WORKFLOW:    "Workflow",
  COVERAGE:    "Coverage",
};

function ValidationPanel({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: issues = [], isLoading, refetch } = useQuery({
    queryKey: ["studio:validations", projectId],
    queryFn: () => studioApi.getValidations(projectId),
    refetchInterval: false,
  });

  const validateMut = useMutation({
    mutationFn: () => studioApi.validate(projectId),
    onSuccess: (data) => {
      qc.setQueryData(["studio:validations", projectId], data);
      const open = data.filter(i => i.status === "OPEN").length;
      toast({ title: open === 0 ? "No issues found!" : `${open} issue${open !== 1 ? "s" : ""} found` });
    },
    onError: () => toast({ title: "Validation failed", variant: "destructive" }),
  });

  const dismissMut = useMutation({
    mutationFn: (vid: string) => studioApi.dismissValidation(vid),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["studio:validations", projectId] }),
  });

  const critCount = issues.filter(i => i.severity === "CRITICAL").length;
  const highCount = issues.filter(i => i.severity === "HIGH").length;
  const medCount  = issues.filter(i => i.severity === "MEDIUM").length;

  return (
    <div className="flex flex-col h-full">
      {/* run button */}
      <div className="shrink-0 px-3 pt-2 pb-1.5 space-y-1.5">
        <Button
          size="sm"
          variant="outline"
          className="w-full h-7 text-xs gap-1.5 border-dashed border-primary/40 hover:border-primary/70 hover:bg-primary/5"
          onClick={() => validateMut.mutate()}
          disabled={validateMut.isPending}
        >
          {validateMut.isPending
            ? <><Loader2 className="w-3 h-3 animate-spin" />Validating…</>
            : <><ShieldCheck className="w-3 h-3 text-primary" />Run Validation</>
          }
        </Button>

        {/* summary chips */}
        {issues.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {critCount > 0 && <span className={cn("text-[9px] px-1.5 py-0.5 rounded border", SEVERITY_CHIP.CRITICAL)}>{critCount} Critical</span>}
            {highCount > 0 && <span className={cn("text-[9px] px-1.5 py-0.5 rounded border", SEVERITY_CHIP.HIGH)}>{highCount} High</span>}
            {medCount  > 0 && <span className={cn("text-[9px] px-1.5 py-0.5 rounded border", SEVERITY_CHIP.MEDIUM)}>{medCount} Medium</span>}
            {(issues.length - critCount - highCount - medCount) > 0 && (
              <span className={cn("text-[9px] px-1.5 py-0.5 rounded border", SEVERITY_CHIP.LOW)}>
                {issues.length - critCount - highCount - medCount} Low/Info
              </span>
            )}
          </div>
        )}
      </div>

      {/* issue list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isLoading && [1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}

        {!isLoading && issues.length === 0 && (
          <div className="py-10 flex flex-col items-center gap-2 text-center">
            <ShieldCheck className="w-8 h-8 text-emerald-400/50" />
            <p className="text-xs text-muted-foreground">
              {validateMut.isSuccess ? "No issues found — model looks good!" : "Click Run Validation to check your project."}
            </p>
          </div>
        )}

        {!isLoading && issues.map(issue => {
          const Icon = (SEVERITY_ICON[issue.severity] ?? Info) as any;
          return (
            <div
              key={issue.id}
              className={cn(
                "group p-2.5 rounded-lg border transition-colors",
                issue.severity === "CRITICAL" ? "border-red-500/30 bg-red-500/5" :
                issue.severity === "HIGH"     ? "border-orange-500/30 bg-orange-500/5" :
                issue.severity === "MEDIUM"   ? "border-amber-500/20 bg-amber-500/5" :
                "border-border/40 bg-muted/10"
              )}
            >
              <div className="flex items-start gap-2">
                <Icon className={cn("w-3.5 h-3.5 shrink-0 mt-0.5",
                  issue.severity === "CRITICAL" ? "text-red-400" :
                  issue.severity === "HIGH"     ? "text-orange-400" :
                  issue.severity === "MEDIUM"   ? "text-amber-400" : "text-blue-400"
                )} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                    <span className={cn("text-[9px] px-1 py-0.5 rounded border", SEVERITY_CHIP[issue.severity] ?? SEVERITY_CHIP.INFO)}>
                      {issue.severity}
                    </span>
                    <span className="text-[9px] text-muted-foreground/70 font-mono">
                      {CATEGORY_LABEL[issue.category] ?? issue.category}
                    </span>
                  </div>
                  <p className="text-[11px] font-medium text-foreground leading-tight">{issue.title}</p>
                  {issue.detail && (
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{issue.detail}</p>
                  )}
                </div>
                <button
                  onClick={() => dismissMut.mutate(issue.id)}
                  title="Dismiss this issue"
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground shrink-0"
                >
                  <EyeOff className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Outputs panel ─────────────────────────────────────────────────────────────

type OutputTab = "notes" | "requirements" | "decisions" | "questions";
type PanelMode = "captured" | "derived" | "validate" | "artifacts" | "insights";

function OutputsPanel({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [tab, setTab] = useState<OutputTab>("notes");
  const [mode, setMode] = useState<PanelMode>("captured");

  const { data: outputs, isLoading, refetch } = useQuery({
    queryKey: ["studio:outputs", projectId],
    queryFn: () => studioApi.getOutputs(projectId),
    refetchInterval: 5000,
  });

  const resolveQ = useMutation({
    mutationFn: (qid: string) => studioApi.resolveQuestion(qid),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["studio:outputs", projectId] }); toast({ title: "Question resolved" }); },
  });

  const deleteNote = useMutation({
    mutationFn: (nid: string) => studioApi.deleteNote(nid),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["studio:outputs", projectId] }); },
  });

  const tabs: { id: OutputTab; label: string; icon: React.ElementType; count?: number }[] = [
    { id: "notes",        label: "Notes",     icon: FileText,    count: outputs?.notes.length },
    { id: "requirements", label: "Reqs",      icon: CheckSquare, count: outputs?.requirements.length },
    { id: "decisions",    label: "Decisions", icon: Lightbulb,   count: outputs?.decisions.length },
    { id: "questions",    label: "Questions", icon: HelpCircle,  count: outputs?.questions.length },
  ];

  return (
    <div className="flex flex-col h-full border-l border-border/50 bg-card/30 overflow-hidden">
      {/* header with mode toggle — 2×2 grid */}
      <div className="shrink-0 px-1.5 py-1.5 border-b border-border/50 flex flex-wrap gap-0.5">
        {(
          [
            { m: "captured",  Icon: FileText,     label: "Captured"  },
            { m: "derived",   Icon: Cpu,          label: "Derived"   },
            { m: "validate",  Icon: ShieldCheck,  label: "Validate"  },
            { m: "artifacts", Icon: PackageOpen,  label: "Artifacts" },
            { m: "insights",  Icon: Brain,        label: "Insights"  },
          ] as { m: PanelMode; Icon: React.ElementType; label: string }[]
        ).map(({ m, Icon, label }) => {
          const I = Icon as any;
          return (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                "flex items-center justify-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors flex-1 min-w-[45px]",
                mode === m ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <I className="w-3 h-3" />{label}
            </button>
          );
        })}
      </div>

      {/* Derived Models panel */}
      {mode === "derived" && <ModelsPanel projectId={projectId} />}

      {/* Validation panel */}
      {mode === "validate" && <ValidationPanel projectId={projectId} />}

      {/* Artifacts panel */}
      {mode === "artifacts" && <ArtifactsPanel projectId={projectId} />}

      {/* Insights panel (Phase 10) */}
      {mode === "insights" && <InsightsPanel projectId={projectId} />}

      {/* Captured tabs — only shown when mode=captured */}
      {mode === "captured" && (
        <>
          <div className="shrink-0 flex border-b border-border/50">
            {tabs.map(t => {
                const Icon = t.icon as any;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={cn(
                      "flex-1 flex flex-col items-center gap-0.5 py-2 text-[9px] font-medium transition-colors border-b-2",
                      tab === t.id
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{t.label}</span>
                    {(t.count ?? 0) > 0 && (
                      <span className="bg-primary/20 text-primary rounded-full px-1 min-w-[14px] text-center leading-none py-0.5">
                        {t.count}
                      </span>
                    )}
                  </button>
                );
              })}
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {isLoading && (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
              </div>
            )}

        {/* Notes */}
        {!isLoading && tab === "notes" && (
          outputs?.notes.length === 0
            ? <EmptyOutput label="No notes extracted yet. Start chatting!" />
            : outputs?.notes.map(n => {
              const Icon = (NOTE_TYPE_ICONS[n.note_type] ?? FileText) as any;
              return (
                <div key={n.id} className="group p-2.5 rounded-lg border border-border/40 bg-muted/10 hover:border-border/60 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Icon className="w-3 h-3 text-muted-foreground shrink-0" />
                      <span className="text-[10px] font-mono text-muted-foreground uppercase">{n.note_type}</span>
                    </div>
                    <button
                      onClick={() => deleteNote.mutate(n.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-xs text-foreground mt-1.5 leading-relaxed">{n.body}</p>
                  <span className={cn(
                    "inline-block mt-1.5 text-[9px] px-1.5 py-0.5 rounded border",
                    n.status === "CONFIRMED" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-muted/40 text-muted-foreground border-border/40"
                  )}>{n.status}</span>
                </div>
              );
            })
        )}

        {/* Requirements */}
        {!isLoading && tab === "requirements" && (
          outputs?.requirements.length === 0
            ? <EmptyOutput label="No requirements extracted yet." />
            : outputs?.requirements.map(r => (
              <div key={r.id} className="p-2.5 rounded-lg border border-border/40 bg-muted/10">
                <div className="flex items-center justify-between mb-1">
                  <span className={cn("text-[10px] font-bold uppercase", PRIORITY_COLORS[r.priority] ?? "text-muted-foreground")}>{r.priority}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">{r.requirement_type}</span>
                </div>
                <p className="text-xs text-foreground leading-relaxed">{r.statement}</p>
                <span className={cn(
                  "inline-block mt-1.5 text-[9px] px-1.5 py-0.5 rounded border",
                  r.status === "CONFIRMED" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-muted/40 text-muted-foreground border-border/40"
                )}>{r.status}</span>
              </div>
            ))
        )}

        {/* Decisions */}
        {!isLoading && tab === "decisions" && (
          outputs?.decisions.length === 0
            ? <EmptyOutput label="No decisions recorded yet." />
            : outputs?.decisions.map(d => (
              <div key={d.id} className="p-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
                <div className="flex items-center gap-1.5 mb-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                  <p className="text-xs font-medium text-emerald-400 leading-tight">{d.title}</p>
                </div>
                <p className="text-xs text-foreground/80 leading-relaxed">{d.decision_text}</p>
                {d.rationale && <p className="text-[10px] text-muted-foreground mt-1 italic">{d.rationale}</p>}
              </div>
            ))
        )}

        {/* Questions */}
        {!isLoading && tab === "questions" && (
          outputs?.questions.length === 0
            ? <EmptyOutput label="No open questions yet." />
            : outputs?.questions.map(q => (
              <div key={q.id} className={cn("p-2.5 rounded-lg border", SEVERITY_COLORS[q.severity] ?? SEVERITY_COLORS.MEDIUM)}>
                <div className="flex items-start gap-2">
                  <HelpCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs leading-relaxed">{q.question}</p>
                    {q.why_it_matters && <p className="text-[10px] opacity-70 mt-1">{q.why_it_matters}</p>}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-[10px] gap-1 mt-1.5 opacity-70 hover:opacity-100"
                  onClick={() => resolveQ.mutate(q.id)}
                  disabled={resolveQ.isPending}
                >
                  <CheckCircle2 className="w-2.5 h-2.5" />Mark resolved
                </Button>
              </div>
            ))
        )}
          </div>
        </>
      )}
    </div>
  );
}

function EmptyOutput({ label }: { label: string }) {
  return (
    <div className="py-8 text-center text-xs text-muted-foreground/60 italic">{label}</div>
  );
}

// ── Chat Panel ────────────────────────────────────────────────────────────────

function ChatPanel({ session }: { session: StudioSession }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: sessionData, isLoading } = useQuery({
    queryKey: ["studio:session", session.id],
    queryFn: () => studioApi.getSession(session.id),
    refetchInterval: false,
  });

  const messages = sessionData?.messages ?? [];

  const sendMut = useMutation({
    mutationFn: (content: string) => studioApi.sendMessage(session.id, content),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["studio:session", session.id] });
      qc.invalidateQueries({ queryKey: ["studio:sessions", session.project_id] });
      qc.invalidateQueries({ queryKey: ["studio:outputs", session.project_id] });
      qc.invalidateQueries({ queryKey: ["studio:models",  session.project_id] });
      qc.invalidateQueries({ queryKey: ["studio:projects"] });

      const extracted = data.extracted;
      const totalExtracted = (extracted?.notes?.length ?? 0) + (extracted?.requirements?.length ?? 0) + (extracted?.decisions?.length ?? 0) + (extracted?.questions?.length ?? 0);
      if (totalExtracted > 0) {
        toast({ title: `Extracted ${totalExtracted} item${totalExtracted !== 1 ? "s" : ""} from your message` });
      }
    },
    onError: () => toast({ title: "Failed to send message", variant: "destructive" }),
  });

  const handleSend = useCallback(() => {
    const content = input.trim();
    if (!content || sendMut.isPending) return;
    setInput("");
    sendMut.mutate(content);
  }, [input, sendMut]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const modeMeta = SESSION_MODES.find(m => m.value === session.mode);

  return (
    <div className="flex flex-col h-full">
      {/* Session header */}
      <div className="shrink-0 px-4 py-3 border-b border-border/50 flex items-center gap-3">
        <div className={cn("text-[10px] px-2 py-0.5 rounded-full border font-medium", MODE_COLORS[session.mode] ?? MODE_COLORS.EXPLORE)}>
          {modeMeta?.label ?? session.mode}
        </div>
        <p className="text-sm font-medium truncate flex-1">{session.title ?? "Untitled Session"}</p>
        <span className="text-[10px] text-muted-foreground shrink-0">
          {messages.length} message{messages.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-3">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <p className="text-sm font-medium">Start your {modeMeta?.label.toLowerCase()} session</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">{modeMeta?.desc}. Describe your ideas, requirements, or questions — they'll be extracted into structured outputs automatically.</p>
          </div>
        )}

        {messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 p-3 border-t border-border/50 bg-card/50">
        <div className="flex gap-2 items-end">
          <Textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe requirements, ideas, decisions, or questions… (Enter to send)"
            className="text-sm min-h-[60px] max-h-32 resize-none flex-1"
            disabled={sendMut.isPending}
          />
          <Button
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={handleSend}
            disabled={!input.trim() || sendMut.isPending}
          >
            {sendMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5">
          Requirements, decisions, and questions are extracted automatically from your messages.
        </p>
      </div>
    </div>
  );
}

// ── Insights Panel (Phase 10) ─────────────────────────────────────────────────

function InsightsPanel({ projectId }: { projectId: string }) {
  const { data: outputs } = useQuery({
    queryKey: ["studio:outputs", projectId],
    queryFn: () => studioApi.getOutputs(projectId),
  });
  const { data: sessions } = useQuery({
    queryKey: ["studio:sessions", projectId],
    queryFn: () => studioApi.listSessions(projectId),
  });

  const totalMessages = sessions?.reduce((s, sess) => s + (sess.message_count ?? 0), 0) ?? 0;
  const noteCount     = outputs?.notes.length ?? 0;
  const reqCount      = outputs?.requirements.length ?? 0;
  const decCount      = outputs?.decisions.length ?? 0;
  const qCount        = outputs?.questions.length ?? 0;

  const confirmedReqs = outputs?.requirements.filter(r => r.status === "CONFIRMED").length ?? 0;
  const reqRate = reqCount > 0 ? Math.round((confirmedReqs / reqCount) * 100) : 0;

  const KPI = ({ label, value, sub }: { label: string; value: string | number; sub?: string }) => (
    <div className="p-2.5 rounded-lg border border-border/40 bg-muted/10">
      <div className="text-lg font-bold text-primary">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
      {sub && <div className="text-[9px] text-muted-foreground/60 mt-0.5">{sub}</div>}
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-3">
      <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Project Insights</p>

      <div className="grid grid-cols-2 gap-2">
        <KPI label="Sessions" value={sessions?.length ?? 0} />
        <KPI label="Messages" value={totalMessages} />
        <KPI label="Notes" value={noteCount} />
        <KPI label="Requirements" value={reqCount} sub={`${confirmedReqs} confirmed`} />
        <KPI label="Decisions" value={decCount} />
        <KPI label="Open Questions" value={qCount} />
      </div>

      {reqCount > 0 && (
        <div className="p-2.5 rounded-lg border border-primary/20 bg-primary/5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-medium text-primary">Requirement Confirmation</span>
            <span className="text-[10px] font-bold text-primary">{reqRate}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
            <div className="h-full rounded-full bg-primary/70" style={{ width: `${reqRate}%` }} />
          </div>
        </div>
      )}

      {(sessions?.length ?? 0) > 0 && (
        <div>
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">Sessions by Activity</p>
          <div className="space-y-1.5">
            {[...(sessions ?? [])].sort((a, b) => (b.message_count ?? 0) - (a.message_count ?? 0)).slice(0, 5).map(s => (
              <div key={s.id} className="flex items-center gap-2 p-1.5 rounded border border-border/30 bg-muted/10">
                <span className={cn("text-[8px] px-1 py-0.5 rounded-full border font-medium", MODE_COLORS[s.mode] ?? MODE_COLORS.EXPLORE)}>{s.mode}</span>
                <p className="text-[10px] flex-1 truncate">{s.title ?? "Untitled"}</p>
                <span className="text-[9px] font-mono text-muted-foreground shrink-0">{s.message_count ?? 0}msg</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {noteCount === 0 && reqCount === 0 && decCount === 0 && (
        <div className="py-8 text-center text-xs text-muted-foreground/50 italic">
          No session data yet. Start chatting to generate insights.
        </div>
      )}
    </div>
  );
}

// ── Sessions list ─────────────────────────────────────────────────────────────

function SessionsList({ project, onSelect, selectedId }: {
  project: StudioProject;
  onSelect: (s: StudioSession) => void;
  selectedId?: string;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");

  const { data: sessions, isLoading } = useQuery({
    queryKey: ["studio:sessions", project.id],
    queryFn: () => studioApi.listSessions(project.id),
  });

  const filtered = (sessions ?? []).filter(s =>
    !search || (s.title ?? "Untitled Session").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 px-3 py-2.5 border-b border-border/50">
        <div className="flex items-center justify-between mb-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold truncate">{project.title}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{project.domain_type ?? project.scope_type}</p>
          </div>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-dashed border-primary/30 hover:border-primary/60 shrink-0 ml-2" onClick={() => setShowCreate(true)}>
            <Plus className="w-3 h-3" />New
          </Button>
        </div>
        {(sessions?.length ?? 0) > 2 && (
          <div className="relative">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search sessions…"
              className="w-full text-[10px] bg-muted/30 border border-border/40 rounded px-2 py-1 pl-5 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
            />
            <svg className="absolute left-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {isLoading && [1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
        {!isLoading && filtered.length === 0 && (
          <div className="py-10 text-center">
            <MessageSquare className="w-6 h-6 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">
              {search ? "No sessions match your search." : "No sessions yet. Start one to begin designing."}
            </p>
            {!search && (
              <Button size="sm" variant="outline" className="mt-3 h-7 text-xs gap-1" onClick={() => setShowCreate(true)}>
                <Plus className="w-3 h-3" />Start First Session
              </Button>
            )}
          </div>
        )}
        {filtered.map(s => (
          <button
            key={s.id}
            onClick={() => onSelect(s)}
            className={cn(
              "w-full text-left p-2.5 rounded-lg border transition-all",
              selectedId === s.id
                ? "border-primary/30 bg-primary/5"
                : "border-border/40 bg-muted/10 hover:border-border/60 hover:bg-muted/20"
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full border font-medium", MODE_COLORS[s.mode] ?? MODE_COLORS.EXPLORE)}>
                {s.mode}
              </span>
              <span className="text-[10px] text-muted-foreground ml-auto">
                {s.message_count ?? 0}msg
              </span>
            </div>
            <p className="text-xs font-medium truncate">{s.title ?? "Untitled Session"}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {new Date(s.updated_at).toLocaleDateString()}
            </p>
          </button>
        ))}
      </div>

      <CreateSessionDialog projectId={project.id} open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}

// ── Project list sidebar ──────────────────────────────────────────────────────

// ── Relative time helper ──────────────────────────────────────────────────────

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 2) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Projects Table ────────────────────────────────────────────────────────────

type ProjSortField = "title" | "session_count" | "message_count" | "updated_at" | "status";

function ProjectsTable({
  selected,
  onSelect,
}: {
  selected: StudioProject | null;
  onSelect: (p: StudioProject) => void;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<ProjSortField>("updated_at");
  const [sortAsc, setSortAsc] = useState(false);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["studio:projects"],
    queryFn: studioApi.listProjects,
  });

  const filtered = projects.filter(p =>
    !search ||
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    (p.domain_type ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    const av: unknown = sortField === "session_count" ? (a.session_count ?? 0)
      : sortField === "message_count" ? (a.message_count ?? 0)
      : a[sortField as keyof StudioProject] ?? "";
    const bv: unknown = sortField === "session_count" ? (b.session_count ?? 0)
      : sortField === "message_count" ? (b.message_count ?? 0)
      : b[sortField as keyof StudioProject] ?? "";
    const avAny: any = av as any;
    const bvAny: any = bv as any;
    if (avAny < bvAny) return sortAsc ? -1 : 1;
    if (avAny > bvAny) return sortAsc ? 1 : -1;
    return 0;
  });

  const toggleSort = (field: ProjSortField) => {
    if (sortField === field) setSortAsc(a => !a);
    else { setSortField(field); setSortAsc(true); }
  };

  const ColHeader = ({
    label, field, className = "",
  }: { label: string; field?: ProjSortField; className?: string }) => (
    <th
      onClick={() => field && toggleSort(field)}
      className={cn(
        "text-left text-[10px] font-mono uppercase tracking-wider text-muted-foreground py-2.5 px-3 border-b border-border/50 whitespace-nowrap bg-background/80",
        field && "cursor-pointer select-none hover:text-foreground",
        className
      )}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {field && sortField === field && (
          <span className="text-primary text-[9px]">{sortAsc ? "▲" : "▼"}</span>
        )}
      </span>
    </th>
  );

  return (
    <div className="flex flex-col h-full bg-card/10 overflow-hidden">
      {/* Toolbar */}
      <div className="shrink-0 flex items-center gap-3 px-5 py-3 border-b border-border/50 bg-background/60">
        <Sparkles className="w-4 h-4 text-primary shrink-0" />
        <span className="text-sm font-semibold">Workforce Studio</span>
        <span className="text-muted-foreground/30 text-sm">·</span>
        <span className="text-xs text-muted-foreground">{projects.length} project{projects.length !== 1 ? "s" : ""}</span>
        <div className="flex-1" />
        <div className="relative">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search projects…"
            className="text-xs bg-muted/30 border border-border/40 rounded-md px-3 py-1.5 pl-7 w-48 focus:outline-none focus:border-primary/50"
          />
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs gap-1.5 border-primary/20 text-primary hover:bg-primary/10"
          onClick={() => setShowCreate(true)}
        >
          <Plus className="w-3.5 h-3.5" /> New Project
        </Button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10">
            <tr>
              <ColHeader label="Project" field="title" className="pl-5 w-[38%]" />
              <ColHeader label="Domain" className="w-[14%]" />
              <ColHeader label="Sessions" field="session_count" className="w-[10%]" />
              <ColHeader label="Messages" field="message_count" className="w-[10%]" />
              <ColHeader label="Status" field="status" className="w-[12%]" />
              <ColHeader label="Updated" field="updated_at" className="w-[13%]" />
              <th className="w-[3%] border-b border-border/50 bg-background/80" />
            </tr>
          </thead>
          <tbody>
            {isLoading && [...Array(4)].map((_, i) => (
              <tr key={i} className="border-b border-border/20">
                {[38, 14, 10, 10, 12, 13, 3].map((w, j) => (
                  <td key={j} className="px-3 py-3.5">
                    <Skeleton className="h-3.5 rounded" style={{ width: `${60 + j * 5}%` }} />
                  </td>
                ))}
              </tr>
            ))}
            {!isLoading && sorted.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-20 text-muted-foreground">
                  <FolderOpen className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">{search ? "No projects match your search." : "No projects yet."}</p>
                  {!search && (
                    <Button size="sm" variant="outline" className="mt-4 gap-1.5" onClick={() => setShowCreate(true)}>
                      <Plus className="w-3.5 h-3.5" /> Create your first project
                    </Button>
                  )}
                </td>
              </tr>
            )}
            {sorted.map(p => {
              const isSelected = selected?.id === p.id;
              return (
                <tr
                  key={p.id}
                  onClick={() => onSelect(p)}
                  className={cn(
                    "cursor-pointer border-b border-border/25 transition-colors group",
                    isSelected
                      ? "bg-primary/5"
                      : "hover:bg-muted/15"
                  )}
                >
                  <td className="px-3 py-2.5 pl-5">
                    <div className="flex items-center gap-2.5">
                      {isSelected
                        ? <ChevronRight className="w-3 h-3 text-primary shrink-0" />
                        : <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", p.status === "ACTIVE" ? "bg-emerald-500" : "bg-muted-foreground/30")} />
                      }
                      <div className="min-w-0">
                        <p className={cn("text-xs font-medium truncate", isSelected && "text-primary")}>{p.title}</p>
                        {p.summary && (
                          <p className="text-[10px] text-muted-foreground truncate mt-0.5 max-w-[260px]">{p.summary}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    {p.domain_type
                      ? <span className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">{p.domain_type.replace(/_/g, " ")}</span>
                      : <span className="text-muted-foreground/30 text-xs">—</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-xs font-mono text-muted-foreground">{p.session_count ?? 0}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-xs font-mono text-muted-foreground">{p.message_count ?? 0}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={cn(
                      "text-[10px] font-mono px-1.5 py-0.5 rounded border inline-block",
                      p.status === "ACTIVE"   ? "text-emerald-400 bg-emerald-950/40 border-emerald-800/40"
                      : p.status === "ARCHIVED" ? "text-zinc-500 bg-zinc-900/40 border-zinc-700/40"
                      : "text-muted-foreground bg-muted/20 border-border/40"
                    )}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-xs text-muted-foreground">{relTime(p.updated_at)}</span>
                  </td>
                  <td className="px-3 py-2.5 pr-4">
                    <ChevronRight className={cn("w-3.5 h-3.5 transition-colors",
                      isSelected ? "text-primary" : "text-muted-foreground/30 group-hover:text-muted-foreground/70"
                    )} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <CreateProjectDialog open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}

// ── Sessions Table (tabular sub-view) ─────────────────────────────────────────

type SessSortField = "updated_at" | "message_count" | "mode" | "title";

function SessionsTable({
  project,
  selectedId,
  onSelect,
}: {
  project: StudioProject;
  selectedId?: string;
  onSelect: (s: StudioSession) => void;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SessSortField>("updated_at");
  const [sortAsc, setSortAsc] = useState(false);

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["studio:sessions", project.id],
    queryFn: () => studioApi.listSessions(project.id),
  });

  const filtered = sessions.filter(s =>
    !search || (s.title ?? "Untitled Session").toLowerCase().includes(search.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    const av: unknown = sortField === "message_count" ? (a.message_count ?? 0)
      : sortField === "updated_at" ? a.updated_at
      : sortField === "mode" ? a.mode
      : (a.title ?? "");
    const bv: unknown = sortField === "message_count" ? (b.message_count ?? 0)
      : sortField === "updated_at" ? b.updated_at
      : sortField === "mode" ? b.mode
      : (b.title ?? "");
    const avAny: any = av as any;
    const bvAny: any = bv as any;
    if (avAny < bvAny) return sortAsc ? -1 : 1;
    if (avAny > bvAny) return sortAsc ? 1 : -1;
    return 0;
  });

  const toggleSort = (field: SessSortField) => {
    if (sortField === field) setSortAsc(a => !a);
    else { setSortField(field); setSortAsc(false); }
  };

  const ColHeader = ({ label, field, className = "" }: { label: string; field?: SessSortField; className?: string }) => (
    <th
      onClick={() => field && toggleSort(field)}
      className={cn(
        "text-left text-[10px] font-mono uppercase tracking-wider text-muted-foreground py-2 px-3 border-b border-border/40 whitespace-nowrap bg-muted/10",
        field && "cursor-pointer select-none hover:text-foreground",
        className
      )}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {field && sortField === field && (
          <span className="text-primary text-[9px]">{sortAsc ? "▲" : "▼"}</span>
        )}
      </span>
    </th>
  );

  return (
    <div className="flex flex-col border-t-2 border-primary/20 bg-primary/2">
      {/* Sub-header */}
      <div className="shrink-0 flex items-center gap-2.5 px-5 py-2.5 border-b border-border/30 bg-primary/5">
        <MessageSquare className="w-3.5 h-3.5 text-primary/60 shrink-0" />
        <span className="text-xs font-semibold text-primary/80 truncate">{project.title}</span>
        <span className="text-primary/20 text-sm">·</span>
        <span className="text-[11px] text-primary/50">{sessions.length} session{sessions.length !== 1 ? "s" : ""}</span>
        <div className="flex-1" />
        {sessions.length > 4 && (
          <div className="relative">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filter sessions…"
              className="text-[10px] bg-muted/20 border border-border/40 rounded px-2.5 py-1 pl-6 w-36 focus:outline-none focus:border-primary/50"
            />
            <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-muted-foreground/60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          </div>
        )}
        <Button
          size="sm"
          variant="outline"
          className="h-6 text-[10px] gap-1 border-primary/20 text-primary hover:bg-primary/10 px-2"
          onClick={() => setShowCreate(true)}
        >
          <Plus className="w-2.5 h-2.5" /> New Session
        </Button>
      </div>

      {/* Sessions table */}
      <div className="overflow-auto" style={{ maxHeight: "260px" }}>
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10">
            <tr>
              <ColHeader label="Mode" field="mode" className="pl-5 w-[12%]" />
              <ColHeader label="Session Title" field="title" className="w-[46%]" />
              <ColHeader label="Messages" field="message_count" className="w-[12%]" />
              <ColHeader label="Updated" field="updated_at" className="w-[20%]" />
              <th className="w-[10%] border-b border-border/40 bg-muted/10" />
            </tr>
          </thead>
          <tbody>
            {isLoading && [...Array(3)].map((_, i) => (
              <tr key={i} className="border-b border-border/20">
                {[1, 2, 3, 4, 5].map(j => (
                  <td key={j} className="px-3 py-2.5">
                    <Skeleton className="h-3 w-3/4 rounded" />
                  </td>
                ))}
              </tr>
            ))}
            {!isLoading && sorted.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-10 text-xs text-muted-foreground">
                  {search ? "No sessions match." : (
                    <div>
                      <p className="mb-2">No sessions yet. Start one to begin designing.</p>
                      <Button size="sm" variant="outline" className="gap-1.5 h-7" onClick={() => setShowCreate(true)}>
                        <Plus className="w-3 h-3" /> Start First Session
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            )}
            {sorted.map(s => {
              const isSelected = selectedId === s.id;
              return (
                <tr
                  key={s.id}
                  onClick={() => onSelect(s)}
                  className={cn(
                    "cursor-pointer border-b border-border/20 transition-colors group",
                    isSelected ? "bg-primary/8" : "hover:bg-muted/10"
                  )}
                >
                  <td className="px-3 py-2 pl-5">
                    <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full border font-medium", MODE_COLORS[s.mode] ?? MODE_COLORS.EXPLORE)}>
                      {s.mode}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={cn("text-xs font-medium truncate block max-w-[320px]", isSelected && "text-primary")}>
                      {s.title ?? "Untitled Session"}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-xs font-mono text-muted-foreground">{s.message_count ?? 0}</span>
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-xs text-muted-foreground">{relTime(s.updated_at)}</span>
                  </td>
                  <td className="px-3 py-2 pr-4 text-right">
                    <span className={cn(
                      "inline-flex items-center gap-1 text-[10px] font-medium text-primary transition-opacity",
                      isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    )}>
                      Open <ArrowRight className="w-2.5 h-2.5" />
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <CreateSessionDialog projectId={project.id} open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}

// ── Compact sidebar (project+session lists when chat is open) ─────────────────

function CompactProjectList({
  projects,
  selected,
  onSelect,
}: {
  projects: StudioProject[];
  selected: StudioProject | null;
  onSelect: (p: StudioProject) => void;
}) {
  return (
    <div className="overflow-y-auto py-1">
      {projects.map(p => (
        <button
          key={p.id}
          onClick={() => onSelect(p)}
          className={cn(
            "w-full text-left px-3 py-2 transition-colors border-l-2 flex items-center gap-2",
            selected?.id === p.id
              ? "border-l-primary bg-primary/5 text-primary"
              : "border-l-transparent hover:bg-muted/20 text-muted-foreground hover:text-foreground"
          )}
        >
          <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", p.status === "ACTIVE" ? "bg-emerald-500" : "bg-muted-foreground/30")} />
          <p className="text-[11px] font-medium truncate flex-1">{p.title}</p>
          <span className="text-[9px] font-mono text-muted-foreground shrink-0">{p.session_count ?? 0}</span>
        </button>
      ))}
    </div>
  );
}

// ── Legacy sidebar (kept for reference, no longer primary) ────────────────────

function ProjectSidebar({ selected, onSelect }: {
  selected: StudioProject | null;
  onSelect: (p: StudioProject) => void;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["studio:projects"],
    queryFn: studioApi.listProjects,
  });

  return (
    <div className="flex flex-col h-full border-r border-border/50 bg-card/30 overflow-hidden">
      <div className="shrink-0 px-3 py-2.5 border-b border-border/50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-semibold">Projects</span>
          </div>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setShowCreate(true)}>
            <Plus className="w-3 h-3" />
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {isLoading && <div className="p-2 space-y-1">{[1,2,3].map(i => <Skeleton key={i} className="h-8 w-full rounded" />)}</div>}
        {!isLoading && (
          <CompactProjectList projects={projects} selected={selected} onSelect={onSelect} />
        )}
      </div>
      <CreateProjectDialog open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Studio() {
  const [selectedProject, setSelectedProject] = useState<StudioProject | null>(null);
  const [selectedSession, setSelectedSession] = useState<StudioSession | null>(null);

  const { data: allProjects = [] } = useQuery({
    queryKey: ["studio:projects"],
    queryFn: studioApi.listProjects,
  });

  const handleProjectSelect = (p: StudioProject) => {
    // Clicking the same project collapses sessions
    if (selectedProject?.id === p.id) {
      setSelectedProject(null);
      setSelectedSession(null);
    } else {
      setSelectedProject(p);
      setSelectedSession(null);
    }
  };

  // ── Session active: 3-panel chat layout ────────────────────────────────────
  if (selectedSession) {
    return (
      <div className="flex h-full overflow-hidden">
        {/* Compact left: projects + sessions stacked */}
        <div className="w-52 shrink-0 flex flex-col border-r border-border/50 bg-card/20">
          {/* Projects list */}
          <div className="shrink-0 px-3 py-2 border-b border-border/40 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-primary" />
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Projects</span>
            </div>
            <button
              onClick={() => { setSelectedSession(null); setSelectedProject(null); }}
              className="text-[9px] text-muted-foreground hover:text-foreground flex items-center gap-0.5"
            >
              <X className="w-2.5 h-2.5" /> Close
            </button>
          </div>
          <div className="flex-none overflow-y-auto" style={{ maxHeight: "30%" }}>
            <CompactProjectList projects={allProjects} selected={selectedProject} onSelect={p => { setSelectedProject(p); setSelectedSession(null); }} />
          </div>

          {/* Sessions list */}
          {selectedProject && (
            <>
              <div className="shrink-0 px-3 py-1.5 border-y border-border/40 bg-primary/5">
                <span className="text-[9px] font-mono uppercase tracking-wider text-primary/60">Sessions</span>
              </div>
              <div className="flex-1 overflow-y-auto">
                <SessionsList
                  project={selectedProject}
                  selectedId={selectedSession?.id}
                  onSelect={setSelectedSession}
                />
              </div>
            </>
          )}
        </div>

        {/* Chat */}
        <div className="flex-1 overflow-hidden">
          <ChatPanel session={selectedSession} />
        </div>

        {/* Outputs */}
        <div className="w-60 shrink-0">
          <OutputsPanel projectId={selectedProject!.id} />
        </div>
      </div>
    );
  }

  // ── Browse state: full-width table layout ──────────────────────────────────
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Projects table — takes available space, sessions expand below */}
      <div className={cn("overflow-hidden transition-all", selectedProject ? "flex-none" : "flex-1")}
        style={selectedProject ? { height: "55%" } : undefined}>
        <ProjectsTable selected={selectedProject} onSelect={handleProjectSelect} />
      </div>

      {/* Sessions table — slides in when project is selected */}
      {selectedProject && (
        <div className="flex-1 overflow-hidden">
          <SessionsTable
            project={selectedProject}
            selectedId={(selectedSession as any)?.id}
            onSelect={setSelectedSession}
          />
        </div>
      )}

      {/* Empty state when nothing selected */}
      {!selectedProject && (
        <div className="shrink-0 border-t border-border/30 bg-muted/5 px-6 py-4 flex items-center gap-6">
          {[
            { icon: Layers,        title: "Design Projects",    desc: "Organize work into scoped projects" },
            { icon: MessageSquare, title: "Session Chat",        desc: "AI-assisted design conversations" },
            { icon: CheckSquare,   title: "Auto-Extract",        desc: "Requirements & decisions captured automatically" },
            { icon: Zap,           title: "Dev Handoff",         desc: "Export structured specs" },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-2.5 flex-1 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                <Icon className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium">{title}</p>
                <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
