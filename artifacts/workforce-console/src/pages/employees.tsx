import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi as apiFetch } from "@/lib/api-client";
import {
  IdCard, Link2, ShieldCheck, ClipboardList, Plus, Search,
  RefreshCw, ChevronDown, ChevronUp, AlertCircle, CheckCircle2,
  XCircle, UserCheck, Loader2, X, Check, Send, GitBranch, Copy,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ── Types ─────────────────────────────────────────────────────────────────────

interface EmployeeProfile {
  id: string;
  business_id: string;
  staff_id: string | null;
  employee_code: string | null;
  legal_first_name: string;
  legal_last_name: string;
  display_name: string | null;
  work_email: string | null;
  work_phone: string | null;
  employment_status: string;
  employment_type: string;
  hire_date: string | null;
  termination_date: string | null;
  department: string | null;
  job_title: string | null;
  schedule_eligible: number;
  is_active: number;
  created_at: string;
  updated_at: string;
  link_id: string | null;
  link_status: string | null;
  linked_at: string | null;
  manager_name: string | null;
  active_role_count: number;
}

interface UserEmployeeLink {
  id: string;
  user_id: string;
  employee_profile_id: string;
  link_status: string;
  is_primary: number;
  linked_at: string | null;
  unlinked_at: string | null;
  ended_reason: string | null;
  created_at: string;
  user_email?: string;
  user_name?: string;
}

interface RoleAssignment {
  id: string;
  employee_profile_id: string;
  role_name: string;
  scope_type: string;
  location_id: string | null;
  location_name: string | null;
  permissions: string;
  is_active: number;
  created_at: string;
}

interface AuditEvent {
  id: string;
  event_key: string;
  actor_type: string;
  actor_user_id: string | null;
  target_type: string;
  target_id: string;
  reason: string | null;
  before_json: string | null;
  after_json: string | null;
  created_at: string;
}

// ── Status Badge ──────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  ACTIVE:        "bg-green-100 text-green-800",
  PENDING_HIRE:  "bg-blue-100 text-blue-800",
  ON_LEAVE:      "bg-yellow-100 text-yellow-800",
  SUSPENDED:     "bg-orange-100 text-orange-800",
  TERMINATED:    "bg-red-100 text-red-800",
  ARCHIVED:      "bg-gray-100 text-gray-500",
  APPLICANT:     "bg-purple-100 text-purple-800",
  // link statuses
  PENDING:       "bg-blue-100 text-blue-800",
  REVOKED:       "bg-red-100 text-red-800",
  ENDED:         "bg-gray-100 text-gray-500",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

// ── Lifecycle action buttons ──────────────────────────────────────────────────

const LIFECYCLE_ACTIONS: Record<string, string[]> = {
  APPLICANT:    ["activate-employment"],
  PENDING_HIRE: ["activate-employment"],
  ACTIVE:       ["start-leave", "suspend-employment", "terminate"],
  ON_LEAVE:     ["end-leave", "suspend-employment", "terminate"],
  SUSPENDED:    ["reinstate-employment", "terminate"],
  TERMINATED:   ["archive", "rehire"],
  ARCHIVED:     ["rehire"],
};

const ACTION_LABELS: Record<string, string> = {
  "activate-employment":  "Activate",
  "start-leave":          "Start Leave",
  "end-leave":            "End Leave",
  "suspend-employment":   "Suspend",
  "reinstate-employment": "Reinstate",
  "terminate":            "Terminate",
  "archive":              "Archive",
  "rehire":               "Rehire",
};

const ACTION_VARIANT: Record<string, string> = {
  "activate-employment":  "text-green-700 hover:bg-green-50 border-green-200",
  "start-leave":          "text-yellow-700 hover:bg-yellow-50 border-yellow-200",
  "end-leave":            "text-blue-700 hover:bg-blue-50 border-blue-200",
  "suspend-employment":   "text-orange-700 hover:bg-orange-50 border-orange-200",
  "reinstate-employment": "text-green-700 hover:bg-green-50 border-green-200",
  "terminate":            "text-red-700 hover:bg-red-50 border-red-200",
  "archive":              "text-gray-700 hover:bg-gray-50 border-gray-200",
  "rehire":               "text-green-700 hover:bg-green-50 border-green-200",
};

// ── Tab: Profiles ─────────────────────────────────────────────────────────────

function ProfilesTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [inviteResult, setInviteResult] = useState<Record<string, { token: string; email: string }>>({});
  const [inviteEmail, setInviteEmail] = useState<Record<string, string>>({});

  const { data: profiles = [], isLoading, refetch } = useQuery<EmployeeProfile[]>({
    queryKey: ["workforce-employees", statusFilter, search],
    queryFn: () => {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (search) params.set("search", search);
      return apiFetch(`/workforce/employees?${params}`);
    },
  });

  const lifecycleMutation = useMutation({
    mutationFn: ({ id, action, reason }: { id: string; action: string; reason?: string }) =>
      apiFetch(`/workforce/employees/${id}/${action}`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workforce-employees"] }),
    onSettled: () => setActionLoading(null),
  });

  const inviteMutation = useMutation({
    mutationFn: ({ id, email }: { id: string; email: string }) =>
      apiFetch(`/workforce/employees/${id}/invite-link`, {
        method: "POST",
        body: JSON.stringify({ target_email: email }),
      }),
    onSuccess: (data: { invite_token: string; target_email: string }, vars) => {
      setInviteResult(r => ({ ...r, [vars.id]: { token: data.invite_token, email: data.target_email } }));
      toast({ title: "Invitation created", description: `Token: ${data.invite_token.slice(0, 12)}…` });
    },
    onError: (e: Error) => toast({ title: "Invite failed", description: e.message, variant: "destructive" }),
  });

  const doAction = async (id: string, action: string) => {
    let reason: string | undefined;
    if (["terminate", "suspend-employment", "start-leave"].includes(action)) {
      reason = window.prompt(`Reason for ${ACTION_LABELS[action]}?`) ?? undefined;
      if (!reason) return;
    }
    setActionLoading(`${id}-${action}`);
    lifecycleMutation.mutate({ id, action, reason });
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email or code…"
            value={search}
            onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter((e.target as HTMLSelectElement).value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Statuses</option>
          {["ACTIVE", "PENDING_HIRE", "ON_LEAVE", "SUSPENDED", "TERMINATED", "ARCHIVED"].map(s => (
            <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
          ))}
        </select>
        <button
          onClick={() => refetch()}
          className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4" /> New Profile
        </button>
      </div>

      {/* Create modal */}
      {showCreate && <CreateProfileModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); qc.invalidateQueries({ queryKey: ["workforce-employees"] }); }} />}

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading…
        </div>
      ) : profiles.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No employee profiles found.</div>
      ) : (
        <div className="space-y-2">
          {profiles.map(ep => (
            <div key={ep.id} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Row */}
              <button
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 text-left"
                onClick={() => setExpanded(expanded === ep.id ? null : ep.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-sm">
                    {ep.legal_first_name[0]}{ep.legal_last_name[0]}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{ep.display_name ?? `${ep.legal_first_name} ${ep.legal_last_name}`}</div>
                    <div className="text-xs text-gray-500">{ep.job_title ?? "—"} · {ep.department ?? "—"} {ep.employee_code ? `· ${ep.employee_code}` : ""}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={ep.employment_status} />
                  {ep.link_status && <StatusBadge status={ep.link_status} />}
                  {expanded === ep.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
              </button>

              {/* Expanded details */}
              {expanded === ep.id && (
                <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm mb-3">
                    <Detail label="Work Email"  value={ep.work_email} />
                    <Detail label="Work Phone"  value={ep.work_phone} />
                    <Detail label="Type"        value={ep.employment_type?.replace(/_/g, " ")} />
                    <Detail label="Hire Date"   value={ep.hire_date} />
                    <Detail label="Manager"     value={ep.manager_name} />
                    <Detail label="Roles"       value={String(ep.active_role_count)} />
                  </div>

                  {/* Lifecycle actions */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(LIFECYCLE_ACTIONS[ep.employment_status] ?? []).map(action => (
                      <button
                        key={action}
                        disabled={actionLoading === `${ep.id}-${action}`}
                        onClick={() => doAction(ep.id, action)}
                        className={`px-2.5 py-1 rounded border text-xs font-medium transition-colors disabled:opacity-50 ${ACTION_VARIANT[action] ?? "text-gray-700 border-gray-200 hover:bg-gray-50"}`}
                      >
                        {actionLoading === `${ep.id}-${action}` ? <Loader2 className="w-3 h-3 animate-spin inline mr-1" /> : null}
                        {ACTION_LABELS[action]}
                      </button>
                    ))}
                  </div>

                  {/* Invite section */}
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    {inviteResult[ep.id] ? (
                      <div className="rounded bg-green-50 border border-green-200 px-3 py-2 space-y-1">
                        <p className="text-xs font-medium text-green-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />Invite sent to {inviteResult[ep.id].email}
                        </p>
                        <div className="flex items-center gap-2">
                          <code className="text-[10px] bg-white border border-green-200 rounded px-2 py-0.5 font-mono text-green-800 truncate flex-1">
                            {window.location.origin}/invite/{inviteResult[ep.id].token}
                          </code>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(`${window.location.origin}/invite/${inviteResult[ep.id].token}`);
                              toast({ title: "Link copied" });
                            }}
                            className="p-1 rounded hover:bg-green-100"
                            title="Copy link"
                          >
                            <Copy className="w-3 h-3 text-green-600" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <input
                          type="email"
                          placeholder="Email to invite…"
                          value={inviteEmail[ep.id] ?? ep.work_email ?? ""}
                          onInput={(e) => setInviteEmail(m => ({ ...m, [ep.id]: (e.target as HTMLInputElement).value }))}
                          className="flex-1 px-2.5 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <button
                          onClick={() => {
                            const email = inviteEmail[ep.id] ?? ep.work_email ?? "";
                            if (!email) { toast({ title: "Enter an email address", variant: "destructive" }); return; }
                            inviteMutation.mutate({ id: ep.id, email });
                          }}
                          disabled={inviteMutation.isPending}
                          className="flex items-center gap-1 px-2.5 py-1 rounded border border-indigo-300 bg-indigo-50 text-indigo-700 text-xs font-medium hover:bg-indigo-100 disabled:opacity-50"
                        >
                          {inviteMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                          Send Invite
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <div className="text-xs text-gray-400 uppercase tracking-wide">{label}</div>
      <div className="text-gray-700 font-medium">{value ?? "—"}</div>
    </div>
  );
}

function CreateProfileModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    legal_first_name: "", legal_last_name: "", display_name: "",
    work_email: "", job_title: "", department: "", employment_type: "FULL_TIME",
    hire_date: "", employee_code: "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    if (!form.legal_first_name || !form.legal_last_name) { setErr("First and last name required"); return; }
    setSaving(true); setErr("");
    try {
      await apiFetch("/workforce/employees", {
        method: "POST",
        body: JSON.stringify(form),
      });
      onCreated();
    } catch (e: any) { setErr(e?.message ?? "Failed to create"); }
    finally { setSaving(false); }
  };

  const field = (key: keyof typeof form, label: string, type = "text", opts?: string[]) => (
    <div className="space-y-1">
      <label className="text-xs font-medium text-gray-700">{label}</label>
      {opts ? (
        <select
          value={form[key]}
          onChange={(e) => setForm(f => ({ ...f, [key]: (e.target as HTMLSelectElement).value }))}
          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {opts.map(o => <option key={o} value={o}>{o.replace(/_/g, " ")}</option>)}
        </select>
      ) : (
        <input
          type={type}
          value={form[key]}
          onInput={(e) => setForm(f => ({ ...f, [key]: (e.target as HTMLInputElement).value }))}
          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold text-gray-900">New Employee Profile</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 grid grid-cols-2 gap-3">
          {field("legal_first_name", "First Name *")}
          {field("legal_last_name", "Last Name *")}
          {field("display_name", "Display Name")}
          {field("work_email", "Work Email", "email")}
          {field("job_title", "Job Title")}
          {field("department", "Department")}
          {field("employment_type", "Type", "text", ["FULL_TIME", "PART_TIME", "CONTRACTOR", "SEASONAL", "ON_CALL"])}
          {field("hire_date", "Hire Date", "date")}
          {field("employee_code", "Employee Code")}
        </div>
        {err && <div className="px-4 pb-2 text-sm text-red-600">{err}</div>}
        <div className="flex justify-end gap-2 p-4 border-t">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button
            onClick={submit}
            disabled={saving}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Tab: Links ────────────────────────────────────────────────────────────────

function LinksTab() {
  const qc = useQueryClient();

  // We load links per employee from the first tab profiles, but here we show
  // a cross-employee links view via access-context aggregation
  const { data: profiles = [], isLoading } = useQuery<EmployeeProfile[]>({
    queryKey: ["workforce-employees", "", ""],
    queryFn: () => apiFetch("/workforce/employees"),
  });

  // Fetch links for each employee, but lazy
  const [selectedEp, setSelectedEp] = useState<string | null>(null);

  const { data: links = [], isLoading: linksLoading } = useQuery<UserEmployeeLink[]>({
    queryKey: ["workforce-links", selectedEp],
    queryFn: () => apiFetch(`/workforce/employees/${selectedEp}/links`),
    enabled: !!selectedEp,
  });

  const linkActionMutation = useMutation({
    mutationFn: ({ linkId, action, reason }: { linkId: string; action: string; reason?: string }) =>
      apiFetch(`/workforce/links/${linkId}/${action}`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workforce-links", selectedEp] }),
  });

  const LINK_ACTIONS: Record<string, string[]> = {
    PENDING:   ["activate", "revoke"],
    ACTIVE:    ["suspend", "revoke", "end"],
    SUSPENDED: ["activate", "revoke", "end"],
    REVOKED:   ["end"],
    ENDED:     [],
  };

  const LINK_ACTION_COLORS: Record<string, string> = {
    activate: "text-green-700 border-green-200 hover:bg-green-50",
    suspend:  "text-orange-700 border-orange-200 hover:bg-orange-50",
    revoke:   "text-red-700 border-red-200 hover:bg-red-50",
    end:      "text-gray-700 border-gray-200 hover:bg-gray-50",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">Select Employee:</label>
        <select
          value={selectedEp ?? ""}
          onChange={(e) => setSelectedEp((e.target as HTMLSelectElement).value || null)}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">— choose an employee —</option>
          {profiles.map(ep => (
            <option key={ep.id} value={ep.id}>
              {ep.legal_first_name} {ep.legal_last_name} ({ep.employment_status})
            </option>
          ))}
        </select>
      </div>

      {!selectedEp && (
        <div className="text-center py-12 text-gray-400">Select an employee above to view their User ↔ Employee links.</div>
      )}

      {selectedEp && linksLoading && (
        <div className="flex items-center justify-center py-8 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading links…
        </div>
      )}

      {selectedEp && !linksLoading && links.length === 0 && (
        <div className="text-center py-8 text-gray-400">No links found for this employee.</div>
      )}

      {selectedEp && links.length > 0 && (
        <div className="space-y-2">
          {links.map(link => (
            <div key={link.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Link2 className="w-4 h-4 text-indigo-500" />
                    <span className="font-medium text-sm text-gray-900">{link.user_name ?? link.user_id}</span>
                    <StatusBadge status={link.link_status} />
                  </div>
                  <div className="text-xs text-gray-500 space-y-0.5">
                    <div>User ID: {link.user_id}</div>
                    {link.user_email && <div>Email: {link.user_email}</div>}
                    {link.linked_at && <div>Linked: {new Date(link.linked_at).toLocaleDateString()}</div>}
                    {link.unlinked_at && <div>Unlinked: {new Date(link.unlinked_at).toLocaleDateString()}</div>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(LINK_ACTIONS[link.link_status] ?? []).map(action => (
                    <button
                      key={action}
                      onClick={() => {
                        const reason = ["revoke", "end"].includes(action)
                          ? window.prompt(`Reason to ${action}?`) ?? undefined
                          : undefined;
                        linkActionMutation.mutate({ linkId: link.id, action, reason });
                      }}
                      className={`px-2 py-1 rounded border text-xs font-medium capitalize transition-colors ${LINK_ACTION_COLORS[action] ?? ""}`}
                    >
                      {action}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tab: Role Assignments ─────────────────────────────────────────────────────

function RoleAssignmentsTab() {
  const qc = useQueryClient();
  const [selectedEp, setSelectedEp] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const { data: profiles = [] } = useQuery<EmployeeProfile[]>({
    queryKey: ["workforce-employees", "", ""],
    queryFn: () => apiFetch("/workforce/employees"),
  });

  const { data: assignments = [], isLoading } = useQuery<RoleAssignment[]>({
    queryKey: ["workforce-role-assignments", selectedEp],
    queryFn: () => apiFetch(`/workforce/employees/${selectedEp}/role-assignments`),
    enabled: !!selectedEp,
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/workforce/role-assignments/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workforce-role-assignments", selectedEp] }),
  });

  const selectedEpProfile = profiles.find(e => e.id === selectedEp);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">Select Employee:</label>
        <select
          value={selectedEp ?? ""}
          onChange={(e) => setSelectedEp((e.target as HTMLSelectElement).value || null)}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">— choose an employee —</option>
          {profiles.map(ep => (
            <option key={ep.id} value={ep.id}>
              {ep.legal_first_name} {ep.legal_last_name}
            </option>
          ))}
        </select>
        {selectedEp && (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" /> Add Role
          </button>
        )}
      </div>

      {showAdd && selectedEp && (
        <AddRoleModal
          epId={selectedEp}
          epName={selectedEpProfile ? `${selectedEpProfile.legal_first_name} ${selectedEpProfile.legal_last_name}` : selectedEp}
          onClose={() => setShowAdd(false)}
          onAdded={() => { setShowAdd(false); qc.invalidateQueries({ queryKey: ["workforce-role-assignments", selectedEp] }); }}
        />
      )}

      {!selectedEp && <div className="text-center py-12 text-gray-400">Select an employee to manage their role assignments.</div>}

      {selectedEp && isLoading && <div className="flex items-center justify-center py-8 text-gray-400"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…</div>}

      {selectedEp && !isLoading && assignments.length === 0 && (
        <div className="text-center py-8 text-gray-400">No role assignments yet.</div>
      )}

      {selectedEp && assignments.length > 0 && (
        <div className="space-y-2">
          {assignments.map(ra => {
            let perms: string[] = [];
            try { perms = JSON.parse(ra.permissions); } catch { /* ignore */ }
            return (
              <div key={ra.id} className={`border rounded-lg p-4 ${ra.is_active ? "border-gray-200" : "border-gray-100 bg-gray-50 opacity-60"}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <ShieldCheck className="w-4 h-4 text-indigo-500" />
                      <span className="font-medium text-sm text-gray-900 capitalize">{ra.role_name}</span>
                      <span className="text-xs px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">{ra.scope_type}</span>
                      {ra.is_active ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-gray-400" />
                      )}
                    </div>
                    {ra.location_name && <div className="text-xs text-gray-500 mb-1">Location: {ra.location_name}</div>}
                    <div className="flex flex-wrap gap-1 mt-1">
                      {perms.slice(0, 8).map(p => (
                        <span key={p} className="text-xs bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-mono">{p}</span>
                      ))}
                      {perms.length > 8 && <span className="text-xs text-gray-400">+{perms.length - 8} more</span>}
                    </div>
                  </div>
                  {ra.is_active === 1 && (
                    <button
                      onClick={() => { if (window.confirm("Deactivate this role assignment?")) deactivateMutation.mutate(ra.id); }}
                      className="text-red-500 hover:text-red-700 p-1"
                      title="Deactivate"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AddRoleModal({ epId, epName, onClose, onAdded }: {
  epId: string; epName: string; onClose: () => void; onAdded: () => void;
}) {
  const [form, setForm] = useState({ role_name: "staff", scope_type: "BUSINESS" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    setSaving(true); setErr("");
    try {
      const PERMS: Record<string, string[]> = {
        owner:      ["*"],
        admin:      ["rooms:read","rooms:write","tasks:read","tasks:write","staff:read","staff:write","shifts:read","shifts:write"],
        supervisor: ["rooms:write","tasks:write","staff:read","shifts:read","shifts:write"],
        staff:      ["tasks:read","tasks:write:own","shifts:read"],
      };
      await apiFetch(`/workforce/employees/${epId}/role-assignments`, {
        method: "POST",
        body: JSON.stringify({ ...form, permissions: PERMS[form.role_name] ?? [] }),
      });
      onAdded();
    } catch (e: any) { setErr(e?.message ?? "Failed"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold text-gray-900">Add Role — {epName}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-4 space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">Role</label>
            <select
              value={form.role_name}
              onChange={(e) => setForm(f => ({ ...f, role_name: (e.target as HTMLSelectElement).value }))}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {["owner", "admin", "supervisor", "staff"].map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">Scope</label>
            <select
              value={form.scope_type}
              onChange={(e) => setForm(f => ({ ...f, scope_type: (e.target as HTMLSelectElement).value }))}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="BUSINESS">BUSINESS</option>
              <option value="LOCATION">LOCATION</option>
            </select>
          </div>
        </div>
        {err && <div className="px-4 pb-2 text-sm text-red-600">{err}</div>}
        <div className="flex justify-end gap-2 p-4 border-t">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button
            onClick={submit}
            disabled={saving}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Add
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Tab: Audit Log ────────────────────────────────────────────────────────────

const EVENT_ICONS: Record<string, string> = {
  "employee_profile.create":         "🟢",
  "employee_profile.update":         "✏️",
  "employee_profile.hire_activate":  "✅",
  "employee_profile.leave_start":    "🟡",
  "employee_profile.leave_end":      "🔵",
  "employee_profile.suspend":        "🟠",
  "employee_profile.reinstate":      "✅",
  "employee_profile.terminate":      "🔴",
  "employee_profile.archive":        "📦",
  "employee_profile.rehire":         "🔄",
  "user_employee_link.create":       "🔗",
  "user_employee_link.activate":     "🟢",
  "user_employee_link.suspend":      "🟠",
  "user_employee_link.revoke":       "❌",
  "user_employee_link.end":          "⬛",
  "employee_role_assignment.add":    "🛡️",
  "employee_role_assignment.deactivate": "🛡️",
  "employee_link_invitation.create": "📨",
};

function AuditTab() {
  const [filter, setFilter] = useState({ event_key: "", target_id: "" });

  const { data: events = [], isLoading, refetch } = useQuery<AuditEvent[]>({
    queryKey: ["workforce-audit", filter],
    queryFn: () => {
      const p = new URLSearchParams({ limit: "100" });
      if (filter.event_key) p.set("event_key", filter.event_key);
      if (filter.target_id) p.set("target_id", filter.target_id);
      return apiFetch(`/workforce/audit?${p}`);
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Filter by event key…"
          value={filter.event_key}
          onInput={(e) => setFilter(f => ({ ...f, event_key: (e.target as HTMLInputElement).value }))}
          className="flex-1 min-w-40 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <input
          type="text"
          placeholder="Target ID…"
          value={filter.target_id}
          onInput={(e) => setFilter(f => ({ ...f, target_id: (e.target as HTMLInputElement).value }))}
          className="flex-1 min-w-40 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          onClick={() => refetch()}
          className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8 text-gray-400"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…</div>
      ) : events.length === 0 ? (
        <div className="text-center py-8 text-gray-400">No audit events found.</div>
      ) : (
        <div className="space-y-1.5">
          {events.map(ev => {
            let after: any = null;
            try { after = ev.after_json ? JSON.parse(ev.after_json) : null; } catch { /* ignore */ }
            return (
              <div key={ev.id} className="flex items-start gap-3 border border-gray-100 rounded-lg px-3 py-2.5 hover:bg-gray-50">
                <div className="text-base mt-0.5 w-5 text-center shrink-0">{EVENT_ICONS[ev.event_key] ?? "📋"}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-mono text-gray-700">{ev.event_key}</span>
                    <span className="text-xs text-gray-400">{ev.target_type}:{ev.target_id.slice(0, 8)}…</span>
                    {ev.reason && (
                      <span className="text-xs text-gray-500 italic">"{ev.reason}"</span>
                    )}
                  </div>
                  {after && (
                    <div className="text-xs text-gray-500 mt-0.5">
                      {Object.entries(after).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                    </div>
                  )}
                </div>
                <div className="text-xs text-gray-400 shrink-0 mt-0.5">
                  {new Date(ev.created_at).toLocaleString()}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Access Context Panel ──────────────────────────────────────────────────────

function AccessContextPanel() {
  const { data: profiles = [] } = useQuery<EmployeeProfile[]>({
    queryKey: ["workforce-employees", "", ""],
    queryFn: () => apiFetch("/workforce/employees"),
  });

  const [selectedUserId, setSelectedUserId] = useState("");

  const { data: ctx, isLoading, refetch } = useQuery<any>({
    queryKey: ["workforce-access-context", selectedUserId],
    queryFn: () => apiFetch(`/workforce/access-context?user_id=${selectedUserId}`),
    enabled: !!selectedUserId,
  });

  // Build unique user list from linked profiles
  const users = profiles
    .filter(ep => ep.link_status === "ACTIVE")
    .map(ep => ({ id: ep.staff_id ?? "", name: ep.display_name ?? `${ep.legal_first_name} ${ep.legal_last_name}` }))
    .filter((u, i, a) => u.id && a.findIndex(x => x.id === u.id) === i);

  return (
    <div className="border border-indigo-200 bg-indigo-50 rounded-xl p-4 mt-6">
      <div className="flex items-center gap-2 mb-3">
        <UserCheck className="w-4 h-4 text-indigo-600" />
        <h3 className="text-sm font-semibold text-indigo-800">Access Context Resolver</h3>
      </div>
      <div className="flex items-center gap-3 mb-3">
        <select
          value={selectedUserId}
          onChange={(e) => setSelectedUserId((e.target as HTMLSelectElement).value)}
          className="flex-1 border border-indigo-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        >
          <option value="">— select a user to resolve permissions —</option>
          {users.map(u => (
            <option key={u.id} value={u.id}>{u.name} ({u.id})</option>
          ))}
        </select>
        <button onClick={() => refetch()} className="p-1.5 border border-indigo-300 rounded-lg hover:bg-indigo-100 text-indigo-600">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {isLoading && <div className="text-sm text-indigo-500">Resolving…</div>}

      {ctx && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {(ctx as any).has_access ? (
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-500" />
            )}
            <span className="text-sm text-indigo-800">
              {(ctx as any).has_access
                ? `${(ctx as any).active_scope_count} active employment scope(s)`
                : "No active employment access"}
            </span>
          </div>
          {(ctx as any).scopes?.map((s: any) => (
            <div key={s.employee_profile_id} className="bg-white rounded-lg border border-indigo-200 p-3">
              <div className="text-xs font-semibold text-indigo-700 mb-1">{s.employee_name} · {s.employee_code} · {s.job_title}</div>
              <div className="flex flex-wrap gap-1">
                {s.is_super_admin ? (
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-mono">* (super admin)</span>
                ) : (
                  s.effective_permissions?.map((p: string) => (
                    <span key={p} className="text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-mono">{p}</span>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tab: Org Chart ────────────────────────────────────────────────────────────

interface OrgNode {
  id: string;
  name: string;
  job_title: string | null;
  department: string | null;
  employment_status: string;
  manager_employee_id: string | null;
  employee_code: string | null;
  children: OrgNode[];
}

function buildTree(employees: (EmployeeProfile & { manager_employee_id?: string | null })[]): OrgNode[] {
  const map = new Map<string, OrgNode>();
  for (const ep of employees) {
    map.set(ep.id, {
      id: ep.id,
      name: ep.display_name ?? `${ep.legal_first_name} ${ep.legal_last_name}`,
      job_title: ep.job_title,
      department: ep.department,
      employment_status: ep.employment_status,
      manager_employee_id: (ep as any).manager_employee_id ?? null,
      employee_code: ep.employee_code,
      children: [],
    });
  }
  const roots: OrgNode[] = [];
  for (const node of map.values()) {
    const mgr = node.manager_employee_id ? map.get(node.manager_employee_id) : null;
    if (mgr) { mgr.children.push(node); } else { roots.push(node); }
  }
  return roots;
}

function OrgNodeRow({ node, depth }: { node: OrgNode; depth: number }) {
  const [open, setOpen] = useState(true);
  const hasChildren = node.children.length > 0;
  return (
    <div>
      <div
        className="flex items-center gap-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer"
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
        onClick={() => hasChildren && setOpen(o => !o)}
      >
        {depth > 0 && (
          <div className="flex items-center shrink-0" style={{ marginLeft: "-12px" }}>
            <span className="text-gray-300 text-xs mr-1">└</span>
          </div>
        )}
        <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-xs shrink-0">
          {node.name[0]}
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-gray-800">{node.name}</span>
          {node.job_title && <span className="text-xs text-gray-400 ml-2">{node.job_title}</span>}
          {node.department && <span className="text-xs text-gray-400 ml-1">· {node.department}</span>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={node.employment_status} />
          {node.employee_code && (
            <span className="text-[10px] font-mono text-gray-400">{node.employee_code}</span>
          )}
          {hasChildren && (
            <span className="text-[10px] text-gray-400">
              {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {node.children.length}
            </span>
          )}
        </div>
      </div>
      {open && node.children.map(child => (
        <OrgNodeRow key={child.id} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

function OrgChartTab() {
  const [setManagerFor, setSetManagerFor] = useState<string | null>(null);
  const [managerSearch, setManagerSearch] = useState("");
  const qc = useQueryClient();

  const { data: rawProfiles = [], isLoading, refetch } = useQuery<EmployeeProfile[]>({
    queryKey: ["workforce-employees-org"],
    queryFn: () => apiFetch("/workforce/employees"),
  });

  const setManagerMut = useMutation({
    mutationFn: ({ id, manager_employee_id }: { id: string; manager_employee_id: string | null }) =>
      apiFetch(`/workforce/employees/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ manager_employee_id }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workforce-employees-org"] });
      setSetManagerFor(null);
    },
  });

  const roots = buildTree(rawProfiles as any);
  const filtered = managerSearch
    ? rawProfiles.filter(ep =>
        `${ep.legal_first_name} ${ep.legal_last_name}`.toLowerCase().includes(managerSearch.toLowerCase())
      )
    : rawProfiles;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Manager hierarchy based on employee profile relationships
        </p>
        <button
          onClick={() => refetch()}
          className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />Loading…
        </div>
      ) : roots.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No employee profiles found</div>
      ) : (
        <div className="border border-gray-200 rounded-lg p-4 bg-white">
          {roots.map(node => <OrgNodeRow key={node.id} node={node} depth={0} />)}
        </div>
      )}

      {/* Set Manager panel */}
      {setManagerFor && (
        <div className="border border-indigo-200 rounded-lg p-4 bg-indigo-50 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-indigo-800">
              Set manager for: <span className="font-semibold">
                {rawProfiles.find(e => e.id === setManagerFor)?.legal_first_name}
              </span>
            </p>
            <button onClick={() => setSetManagerFor(null)} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              placeholder="Search employee…"
              value={managerSearch}
              onInput={(e) => setManagerSearch((e.target as HTMLInputElement).value)}
              className="flex-1 px-2.5 py-1.5 border border-indigo-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            <button
              onClick={() => setManagerMut.mutate({ id: setManagerFor, manager_employee_id: null })}
              className="w-full text-left px-3 py-1.5 rounded text-sm text-red-600 hover:bg-red-50"
            >
              — Remove manager
            </button>
            {filtered.filter(e => e.id !== setManagerFor).map(ep => (
              <button
                key={ep.id}
                onClick={() => setManagerMut.mutate({ id: setManagerFor, manager_employee_id: ep.id })}
                className="w-full text-left px-3 py-1.5 rounded text-sm text-indigo-800 hover:bg-indigo-100"
              >
                {ep.display_name ?? `${ep.legal_first_name} ${ep.legal_last_name}`}
                {ep.job_title && <span className="text-xs text-indigo-500 ml-1">· {ep.job_title}</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Select who to reassign */}
      {!setManagerFor && rawProfiles.length > 0 && (
        <div className="text-center">
          <select
            onChange={(e) => setSetManagerFor(e.target.value || null)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-600 focus:outline-none"
          >
            <option value="">Set manager for…</option>
            {rawProfiles.map(ep => (
              <option key={ep.id} value={ep.id}>
                {ep.display_name ?? `${ep.legal_first_name} ${ep.legal_last_name}`}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const TABS = [
  { id: "profiles",  label: "Profiles",        icon: IdCard },
  { id: "links",     label: "User Links",       icon: Link2 },
  { id: "roles",     label: "Role Assignments", icon: ShieldCheck },
  { id: "audit",     label: "Audit Log",        icon: ClipboardList },
  { id: "orgchart",  label: "Org Chart",        icon: GitBranch },
] as const;

type TabId = typeof TABS[number]["id"];

export default function EmployeesPage() {
  const [activeTab, setActiveTab] = useState<TabId>("profiles");

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <IdCard className="w-6 h-6 text-indigo-500" />
            Employee Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Workforce identity — employee profiles are separate from user accounts.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-0" aria-label="Tabs">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === id
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === "profiles" && (
          <>
            <ProfilesTab />
            <AccessContextPanel />
          </>
        )}
        {activeTab === "links" && <LinksTab />}
        {activeTab === "roles" && <RoleAssignmentsTab />}
        {activeTab === "audit" && <AuditTab />}
        {activeTab === "orgchart" && <OrgChartTab />}
      </div>
    </div>
  );
}
