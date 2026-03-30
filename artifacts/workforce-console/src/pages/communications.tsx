import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Megaphone, ArrowLeftRight, StickyNote, Plus, Pin, ChevronDown,
  ChevronUp, MessageSquare, Clock, AlertTriangle, Zap, User,
  Check, Reply, Send, Loader2, Archive, Trash2, Users,
  BellRing, Shield, Bot, Sparkles, CornerDownLeft, RefreshCw,
  PlusCircle, ChevronRight,
} from "lucide-react";
import { API_BASE } from "@/lib/api-client";

// ── Types ─────────────────────────────────────────────────────────────────────

interface CommMessage {
  id: string;
  type: "ANNOUNCEMENT" | "HANDOVER" | "NOTICE";
  subject: string;
  body: string;
  author_user_id?: string;
  author_ep_id?: string;
  author_name?: string;
  author_ep_name?: string;
  author_title?: string;
  author_dept?: string;
  target_type: "ALL" | "DEPT" | "ROLE";
  target_value?: string;
  priority: "NORMAL" | "HIGH" | "URGENT";
  is_pinned: number;
  is_archived: number;
  reply_count: number;
  is_read?: boolean;
  created_at: string;
  updated_at: string;
  expires_at?: string;
  replies?: CommReply[];
}

interface CommReply {
  id: string;
  message_id: string;
  author_user_id?: string;
  author_ep_id?: string;
  author_name?: string;
  author_ep_name?: string;
  author_title?: string;
  body: string;
  created_at: string;
}

interface CommSummary {
  total: number;
  by_type: Record<string, number>;
  pinned: number;
  urgent: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 2) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function authorDisplay(msg: CommMessage) {
  return msg.author_ep_name ?? msg.author_name ?? "Staff";
}

function authorSub(msg: CommMessage) {
  return msg.author_title ?? msg.author_dept ?? null;
}

const PRIORITY_CONFIG = {
  URGENT: { label: "Urgent", icon: AlertTriangle, cls: "bg-red-500/15 text-red-400 border-red-500/30" },
  HIGH:   { label: "High",   icon: Zap,           cls: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  NORMAL: { label: "",       icon: null,          cls: "" },
};

// ── AI Types ──────────────────────────────────────────────────────────────────

interface AiConversation {
  id: string;
  business_id: string;
  user_id?: string;
  title: string;
  status: string;
  message_count: number;
  created_at: string;
  updated_at: string;
}

interface AiMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  streaming?: boolean;
}

// ── AI API ────────────────────────────────────────────────────────────────────

const aiApi = {
  listConversations: (userId?: string) => {
    const p = userId ? `?user_id=${encodeURIComponent(userId)}` : "";
    return fetchApi<AiConversation[]>(`/ai/conversations${p}`);
  },
  createConversation: (data: { user_id?: string; title?: string }) =>
    fetchApi<AiConversation>("/ai/conversations", { method: "POST", body: JSON.stringify(data) }),
  getConversation: (id: string) =>
    fetchApi<AiConversation & { messages: AiMessage[] }>(`/ai/conversations/${id}`),
  deleteConversation: (id: string) =>
    fetchApi<{ ok: boolean }>(`/ai/conversations/${id}`, { method: "DELETE" }),
};

// ── SSE streaming helper ───────────────────────────────────────────────────────

async function streamChat(
  convId: string,
  text: string,
  userId: string | undefined,
  onDelta: (delta: string) => void,
): Promise<void> {
  const token = localStorage.getItem("workforce_token");
  const res = await fetch(`${API_BASE}/ai/conversations/${convId}/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ text, user_id: userId }),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "Stream request failed");
    throw new Error(msg);
  }
  if (!res.body) throw new Error("No response body from SSE stream");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let currentEvent = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (line.startsWith("event: ")) {
        currentEvent = line.slice(7).trim();
      } else if (line.startsWith("data: ")) {
        try {
          const data = JSON.parse(line.slice(6)) as Record<string, unknown>;
          if (currentEvent === "message.delta" && typeof data.delta === "string") {
            onDelta(data.delta);
          } else if (currentEvent === "error") {
            throw new Error((data.message as string) ?? "AI provider error");
          }
        } catch (e) {
          if (e instanceof SyntaxError) continue;
          throw e;
        }
        currentEvent = "";
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────

const TAB_CONFIG = [
  { id: "ANNOUNCEMENT", label: "Announcements", icon: Megaphone,    desc: "Property-wide broadcasts and updates" },
  { id: "HANDOVER",     label: "Handover",       icon: ArrowLeftRight, desc: "Shift-to-shift handover notes" },
  { id: "NOTICE",       label: "Notices",        icon: StickyNote,   desc: "Pinned notices and policy reminders" },
  { id: "AI",           label: "AI Assistant",   icon: Bot,          desc: "Workforce AI chat powered by OpenAI" },
] as const;

type TabId = "ANNOUNCEMENT" | "HANDOVER" | "NOTICE" | "AI";

// ── API helpers ───────────────────────────────────────────────────────────────

const commsApi = {
  list: (type: TabId) =>
    fetchApi<CommMessage[]>(`/communications?type=${type}`),
  get: (id: string) =>
    fetchApi<CommMessage>(`/communications/${id}`),
  summary: () =>
    fetchApi<CommSummary>("/communications/summary"),
  create: (data: Partial<CommMessage>) =>
    fetchApi<CommMessage>("/communications", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<CommMessage>) =>
    fetchApi<CommMessage>(`/communications/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id: string) =>
    fetchApi<{ ok: boolean }>(`/communications/${id}`, { method: "DELETE" }),
  markRead: (id: string, userId: string) =>
    fetchApi(`/communications/${id}/read`, { method: "POST", body: JSON.stringify({ user_id: userId }) }),
  reply: (id: string, data: { body: string; author_user_id?: string; author_ep_id?: string; author_name?: string }) =>
    fetchApi<CommReply>(`/communications/${id}/reply`, { method: "POST", body: JSON.stringify(data) }),
};

// ── Priority Badge ────────────────────────────────────────────────────────────

function PriorityBadge({ priority }: { priority: string }) {
  const cfg = PRIORITY_CONFIG[priority as keyof typeof PRIORITY_CONFIG];
  if (!cfg || !cfg.label) return null;
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border", cfg.cls)}>
      {Icon && <Icon className="w-2.5 h-2.5" />}
      {cfg.label}
    </span>
  );
}

// ── Compose Dialog ────────────────────────────────────────────────────────────

function ComposeDialog({
  open, onClose, defaultType,
}: { open: boolean; onClose: () => void; defaultType: TabId }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { session, employmentScope } = useAuth();

  const [type, setType] = useState<TabId>(defaultType);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState("NORMAL");
  const [targetType, setTargetType] = useState("ALL");
  const [targetValue, setTargetValue] = useState("");
  const [isPinned, setIsPinned] = useState(false);

  const mut = useMutation({
    mutationFn: () => commsApi.create({
      type,
      subject: subject.trim(),
      body: body.trim(),
      priority,
      target_type: targetType as "ALL" | "DEPT" | "ROLE",
      target_value: targetType !== "ALL" ? targetValue.trim() : undefined,
      is_pinned: isPinned,
      author_user_id: session?.id,
      author_ep_id: employmentScope?.employee_profile_id,
      author_name: employmentScope?.employee_name ?? session?.first_name,
    } as Partial<CommMessage>),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comms", type] });
      qc.invalidateQueries({ queryKey: ["comms:summary"] });
      toast({ title: "Message posted" });
      setSubject(""); setBody(""); setPriority("NORMAL"); setTargetType("ALL"); setTargetValue(""); setIsPinned(false);
      onClose();
    },
    onError: () => toast({ title: "Failed to post message", variant: "destructive" }),
  });

  const typeLabels: Record<TabId, string> = { ANNOUNCEMENT: "Announcement", HANDOVER: "Handover Note", NOTICE: "Notice" };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New {typeLabels[type]}</DialogTitle>
          <DialogDescription>Post a message to staff. All fields marked are required.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Type</Label>
              <Select value={type} onValueChange={v => setType(v as TabId)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ANNOUNCEMENT">Announcement</SelectItem>
                  <SelectItem value="HANDOVER">Handover Note</SelectItem>
                  <SelectItem value="NOTICE">Notice</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NORMAL">Normal</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Audience</Label>
              <Select value={targetType} onValueChange={v => { setTargetType(v); setTargetValue(""); }}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Staff</SelectItem>
                  <SelectItem value="DEPT">Department</SelectItem>
                  <SelectItem value="ROLE">Role</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {targetType !== "ALL" && (
              <div className="space-y-1.5">
                <Label className="text-xs">{targetType === "DEPT" ? "Department" : "Role"}</Label>
                <Input
                  className="h-8 text-xs"
                  placeholder={targetType === "DEPT" ? "e.g. Housekeeping" : "e.g. supervisor"}
                  value={targetValue}
                  onChange={e => setTargetValue(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Subject</Label>
            <Input
              className="text-sm"
              placeholder="Message subject…"
              value={subject}
              onChange={e => setSubject(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Message</Label>
            <Textarea
              className="text-sm min-h-[100px] resize-none"
              placeholder="Write your message…"
              value={body}
              onChange={e => setBody(e.target.value)}
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isPinned}
              onChange={e => setIsPinned(e.target.checked)}
              className="w-3.5 h-3.5 rounded accent-primary"
            />
            <span className="text-xs text-muted-foreground">Pin this message to the top</span>
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            size="sm"
            disabled={!subject.trim() || !body.trim() || mut.isPending}
            onClick={() => mut.mutate()}
            className="gap-1.5"
          >
            {mut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Post Message
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Reply Composer ────────────────────────────────────────────────────────────

function ReplyComposer({ messageId, onDone }: { messageId: string; onDone: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { session, employmentScope } = useAuth();
  const [body, setBody] = useState("");

  const mut = useMutation({
    mutationFn: () => commsApi.reply(messageId, {
      body: body.trim(),
      author_user_id: session?.id,
      author_ep_id: employmentScope?.employee_profile_id,
      author_name: employmentScope?.employee_name ?? session?.first_name,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comm:detail", messageId] });
      toast({ title: "Reply posted" });
      setBody("");
      onDone();
    },
  });

  return (
    <div className="mt-3 border-t border-border/40 pt-3 flex gap-2">
      <Textarea
        className="flex-1 text-xs min-h-[60px] resize-none"
        placeholder="Write a reply…"
        value={body}
        onChange={e => setBody(e.target.value)}
      />
      <div className="flex flex-col gap-1.5">
        <Button
          size="sm"
          disabled={!body.trim() || mut.isPending}
          onClick={() => mut.mutate()}
          className="gap-1"
        >
          {mut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
          Send
        </Button>
        <Button size="sm" variant="ghost" onClick={onDone}>Cancel</Button>
      </div>
    </div>
  );
}

// ── Message Card ──────────────────────────────────────────────────────────────

function MessageCard({
  msg, activeTab,
}: { msg: CommMessage; activeTab: TabId }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { session } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [showReply, setShowReply] = useState(false);

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ["comm:detail", msg.id],
    queryFn: () => commsApi.get(msg.id),
    enabled: expanded,
    staleTime: 30_000,
  });

  const markReadMut = useMutation({
    mutationFn: () => commsApi.markRead(msg.id, session!.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comms", activeTab] }),
  });

  const archiveMut = useMutation({
    mutationFn: () => commsApi.update(msg.id, { is_archived: true } as Partial<CommMessage>),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comms", activeTab] });
      qc.invalidateQueries({ queryKey: ["comms:summary"] });
      toast({ title: "Message archived" });
    },
  });

  const pinMut = useMutation({
    mutationFn: () => commsApi.update(msg.id, { is_pinned: !msg.is_pinned } as Partial<CommMessage>),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comms", activeTab] }),
  });

  const handleExpand = () => {
    setExpanded(e => !e);
    if (!expanded && !msg.is_read && session) {
      markReadMut.mutate();
    }
  };

  const isRead = msg.is_read;
  const isPinned = Boolean(msg.is_pinned);

  return (
    <div
      className={cn(
        "rounded-lg border transition-all",
        isPinned ? "border-primary/30 bg-primary/3" : "border-border/40 bg-card/30",
        !isRead && "border-l-2 border-l-primary",
        expanded && "shadow-sm"
      )}
    >
      {/* Header row */}
      <button
        className="w-full text-left px-4 py-3 flex items-start gap-3"
        onClick={handleExpand}
      >
        {/* Unread dot */}
        <div className="mt-1.5 shrink-0">
          {!isRead
            ? <div className="w-2 h-2 rounded-full bg-primary" />
            : <div className="w-2 h-2 rounded-full bg-muted-foreground/20" />
          }
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {isPinned && <Pin className="w-3 h-3 text-primary/70 shrink-0" />}
            <span className={cn("text-sm font-medium truncate", !isRead && "text-foreground", isRead && "text-muted-foreground")}>
              {msg.subject}
            </span>
            <PriorityBadge priority={msg.priority} />
            {msg.target_type !== "ALL" && (
              <span className="text-[10px] px-1.5 py-0.5 rounded border border-border/40 text-muted-foreground bg-muted/20 flex items-center gap-1">
                <Users className="w-2.5 h-2.5" />
                {msg.target_value ?? msg.target_type}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-muted-foreground">{authorDisplay(msg)}</span>
            {authorSub(msg) && <span className="text-[10px] text-muted-foreground/60">· {authorSub(msg)}</span>}
            <span className="text-[10px] text-muted-foreground/50 ml-auto flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />
              {relTime(msg.created_at)}
            </span>
            {msg.reply_count > 0 && (
              <span className="text-[10px] text-muted-foreground/60 flex items-center gap-0.5">
                <MessageSquare className="w-2.5 h-2.5" />{msg.reply_count}
              </span>
            )}
          </div>
        </div>

        {/* Expand chevron */}
        <div className="shrink-0 mt-1">
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-border/30">
          <div className="py-3 text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
            {msg.body}
          </div>

          {/* Action bar */}
          <div className="flex items-center gap-1.5 mt-1 pt-2 border-t border-border/25">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs gap-1.5"
              onClick={() => setShowReply(s => !s)}
            >
              <Reply className="w-3 h-3" /> Reply
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className={cn("h-7 text-xs gap-1.5", isPinned && "text-primary")}
              onClick={() => pinMut.mutate()}
              disabled={pinMut.isPending}
            >
              <Pin className="w-3 h-3" /> {isPinned ? "Unpin" : "Pin"}
            </Button>
            {!isRead && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs gap-1.5"
                onClick={() => markReadMut.mutate()}
                disabled={markReadMut.isPending}
              >
                <Check className="w-3 h-3" /> Mark read
              </Button>
            )}
            <div className="flex-1" />
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-destructive"
              onClick={() => archiveMut.mutate()}
              disabled={archiveMut.isPending}
            >
              <Archive className="w-3 h-3" /> Archive
            </Button>
          </div>

          {/* Reply composer */}
          {showReply && (
            <ReplyComposer messageId={msg.id} onDone={() => setShowReply(false)} />
          )}

          {/* Replies */}
          {detailLoading && (
            <div className="mt-3 space-y-2">
              <Skeleton className="h-10 w-full rounded" />
              <Skeleton className="h-10 w-4/5 rounded" />
            </div>
          )}
          {(detail?.replies?.length ?? 0) > 0 && (
            <div className="mt-3 space-y-2 border-t border-border/25 pt-3">
              <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">
                {detail!.replies!.length} {detail!.replies!.length === 1 ? "Reply" : "Replies"}
              </p>
              {detail!.replies!.map(reply => (
                <div key={reply.id} className="flex gap-2.5 p-2.5 rounded-lg bg-muted/20 border border-border/30">
                  <div className="w-6 h-6 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-3 h-3 text-primary/70" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span className="text-xs font-medium">{reply.author_ep_name ?? reply.author_name ?? "Staff"}</span>
                      {reply.author_title && <span className="text-[10px] text-muted-foreground">{reply.author_title}</span>}
                      <span className="text-[10px] text-muted-foreground/50 ml-auto">{relTime(reply.created_at)}</span>
                    </div>
                    <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap">{reply.body}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Tab Panel ─────────────────────────────────────────────────────────────────

function TabPanel({
  type, summary,
}: { type: TabId; summary?: CommSummary }) {
  const [showCompose, setShowCompose] = useState(false);

  const { data: messages, isLoading } = useQuery({
    queryKey: ["comms", type],
    queryFn: () => commsApi.list(type),
    refetchInterval: 60_000,
  });

  const typeCount = summary?.by_type?.[type] ?? 0;

  const pinned = (messages ?? []).filter(m => m.is_pinned);
  const regular = (messages ?? []).filter(m => !m.is_pinned);
  const unread = (messages ?? []).filter(m => !m.is_read).length;

  return (
    <div className="flex flex-col h-full">
      {/* Sub-header */}
      <div className="flex items-center gap-3 py-3 border-b border-border/40">
        <div>
          <p className="text-xs text-muted-foreground">
            {typeCount} {type === "ANNOUNCEMENT" ? "announcements" : type === "HANDOVER" ? "handover notes" : "notices"}
            {unread > 0 && <span className="ml-2 text-primary font-medium">{unread} unread</span>}
          </p>
        </div>
        <div className="flex-1" />
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 h-8 text-xs border-primary/20 text-primary hover:bg-primary/10"
          onClick={() => setShowCompose(true)}
        >
          <Plus className="w-3.5 h-3.5" />
          {type === "ANNOUNCEMENT" ? "New Announcement" : type === "HANDOVER" ? "Add Handover Note" : "Post Notice"}
        </Button>
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto py-4 space-y-2.5">
        {isLoading && (
          [...Array(3)].map((_, i) => (
            <div key={i} className="rounded-lg border border-border/40 p-4 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))
        )}

        {!isLoading && messages?.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-full bg-muted/20 border border-border/40 flex items-center justify-center mb-4">
              {type === "ANNOUNCEMENT" ? <Megaphone className="w-7 h-7 text-muted-foreground/40" />
               : type === "HANDOVER" ? <ArrowLeftRight className="w-7 h-7 text-muted-foreground/40" />
               : <StickyNote className="w-7 h-7 text-muted-foreground/40" />}
            </div>
            <p className="text-sm text-muted-foreground font-medium">No {type.toLowerCase()}s yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {type === "ANNOUNCEMENT" ? "Post an announcement to notify all staff."
               : type === "HANDOVER" ? "Leave a handover note for the incoming shift."
               : "Post a notice to pin important information."}
            </p>
            <Button size="sm" variant="outline" className="mt-4 gap-1.5" onClick={() => setShowCompose(true)}>
              <Plus className="w-3.5 h-3.5" /> Post First {type === "HANDOVER" ? "Note" : type === "NOTICE" ? "Notice" : "Announcement"}
            </Button>
          </div>
        )}

        {pinned.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/60 flex items-center gap-1.5">
              <Pin className="w-2.5 h-2.5" /> Pinned
            </p>
            {pinned.map(msg => <MessageCard key={msg.id} msg={msg} activeTab={type} />)}
          </div>
        )}

        {pinned.length > 0 && regular.length > 0 && (
          <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/60 pt-1">Recent</p>
        )}

        {regular.map(msg => <MessageCard key={msg.id} msg={msg} activeTab={type} />)}
      </div>

      <ComposeDialog open={showCompose} onClose={() => setShowCompose(false)} defaultType={type} />
    </div>
  );
}

// ── Summary Cards ─────────────────────────────────────────────────────────────

function SummaryBar({ summary }: { summary?: CommSummary }) {
  const cards = [
    { label: "Announcements", value: summary?.by_type?.ANNOUNCEMENT ?? 0, icon: Megaphone, cls: "text-primary" },
    { label: "Handover Notes", value: summary?.by_type?.HANDOVER ?? 0,     icon: ArrowLeftRight, cls: "text-sky-400" },
    { label: "Notices",        value: summary?.by_type?.NOTICE ?? 0,       icon: StickyNote, cls: "text-amber-400" },
    { label: "Urgent",         value: summary?.urgent ?? 0,                 icon: AlertTriangle, cls: "text-red-400" },
    { label: "Pinned",         value: summary?.pinned ?? 0,                 icon: Pin, cls: "text-emerald-400" },
  ];

  return (
    <div className="grid grid-cols-5 gap-3 mb-5">
      {cards.map(({ label, value, icon: Icon, cls }) => (
        <div key={label} className="rounded-lg border border-border/40 bg-card/30 p-3 flex items-center gap-2.5">
          <Icon className={cn("w-4 h-4 shrink-0", cls)} />
          <div>
            <p className="text-lg font-bold leading-tight">{value}</p>
            <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Communications() {
  const [activeTab, setActiveTab] = useState<TabId>("ANNOUNCEMENT");

  const { data: summary } = useQuery({
    queryKey: ["comms:summary"],
    queryFn: commsApi.summary,
    refetchInterval: 60_000,
  });

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <BellRing className="w-5 h-5 text-primary" />
            Communications
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Staff announcements, handover notes, and property notices
          </p>
        </div>
      </div>

      {/* Summary bar */}
      <SummaryBar summary={summary} />

      {/* Tabs */}
      <div className="flex gap-0.5 bg-muted/20 rounded-lg p-0.5 mb-4 border border-border/40 w-fit">
        {TAB_CONFIG.map(({ id, label, icon: Icon }) => {
          const count = summary?.by_type?.[id] ?? 0;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
                activeTab === id
                  ? "bg-background text-foreground shadow-sm border border-border/40"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
              {count > 0 && (
                <span className={cn(
                  "text-[10px] font-mono px-1.5 py-0.5 rounded-full",
                  activeTab === id ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active tab content */}
      <div className="flex-1 overflow-hidden">
        <TabPanel type={activeTab} summary={summary} />
      </div>
    </div>
  );
}
