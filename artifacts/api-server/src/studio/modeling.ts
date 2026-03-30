// Workforce Studio — Phase 7: Modeling / Derivation Engine
// Derives entities, workflows, views, concepts, and relationships from
// raw chat messages using a deterministic, keyword-based approach.

export interface DerivedEntity {
  name: string;
  description: string;
  attributes: string; // JSON string
}

export interface DerivedWorkflow {
  name: string;
  description: string;
  steps: string; // JSON string
}

export interface DerivedView {
  name: string;
  view_type: string; // LIST | FORM | DASHBOARD | REPORT | MOBILE | DETAIL
  description: string;
}

export interface DerivedConcept {
  name: string;
  definition: string;
}

export interface DerivedRelationship {
  from_name: string;
  from_type: string; // ENTITY | WORKFLOW | VIEW | CONCEPT
  to_name: string;
  to_type: string;
  relation: string; // "manages", "has", "uses", "performs", etc.
}

export interface ModelingResult {
  entities: DerivedEntity[];
  workflows: DerivedWorkflow[];
  views: DerivedView[];
  concepts: DerivedConcept[];
  relationships: DerivedRelationship[];
}

// ── Entity Lexicon ────────────────────────────────────────────────────────────

const ENTITY_LEXICON: Record<string, { name: string; description: string; attributes: string[] }> = {
  room:          { name: "Room",               description: "Physical hotel or motel room unit",                    attributes: ["number", "status", "floor", "type", "pet_policy", "bed_type"] },
  rooms:         { name: "Room",               description: "Physical hotel or motel room unit",                    attributes: ["number", "status", "floor", "type", "pet_policy", "bed_type"] },
  unit:          { name: "Room Unit",          description: "Rentable guest room or accommodation unit",            attributes: ["number", "status", "floor"] },
  staff:         { name: "Staff Member",       description: "Employee or worker at the property",                   attributes: ["name", "role", "shift", "location", "contact", "is_active"] },
  employee:      { name: "Staff Member",       description: "Employee or worker at the property",                   attributes: ["name", "role", "shift", "location", "contact", "is_active"] },
  worker:        { name: "Staff Member",       description: "Employee or worker at the property",                   attributes: ["name", "role", "shift", "location", "contact", "is_active"] },
  housekeeper:   { name: "Housekeeper",        description: "Housekeeping team member",                             attributes: ["name", "assigned_rooms", "shift", "checklist_progress"] },
  housekeeping:  { name: "Housekeeper",        description: "Housekeeping team member",                             attributes: ["name", "assigned_rooms", "shift", "checklist_progress"] },
  shift:         { name: "Shift",              description: "Scheduled work period for one or more staff",          attributes: ["date", "start_time", "end_time", "role", "capacity", "status", "location"] },
  shifts:        { name: "Shift",              description: "Scheduled work period for one or more staff",          attributes: ["date", "start_time", "end_time", "role", "capacity", "status", "location"] },
  task:          { name: "Task",               description: "Unit of work to be completed",                         attributes: ["title", "status", "assigned_to", "due_date", "priority", "room"] },
  tasks:         { name: "Task",               description: "Unit of work to be completed",                         attributes: ["title", "status", "assigned_to", "due_date", "priority", "room"] },
  assignment:    { name: "Assignment",         description: "Link between a staff member and a shift or task",      attributes: ["staff", "shift", "role", "status", "assigned_at"] },
  assignments:   { name: "Assignment",         description: "Link between a staff member and a shift or task",      attributes: ["staff", "shift", "role", "status", "assigned_at"] },
  checklist:     { name: "Checklist",          description: "Ordered list of required cleaning or inspection steps",attributes: ["items", "room", "completed_by", "completion_rate", "status"] },
  checklists:    { name: "Checklist",          description: "Ordered list of required cleaning or inspection steps",attributes: ["items", "room", "completed_by", "completion_rate", "status"] },
  schedule:      { name: "Schedule",           description: "Published staff work schedule for a period",           attributes: ["date", "location", "shifts", "published_at", "published_by"] },
  inspection:    { name: "Inspection",         description: "Quality inspection record for a room",                 attributes: ["room", "result", "inspector", "issues_found", "completed_at"] },
  inspections:   { name: "Inspection",         description: "Quality inspection record for a room",                 attributes: ["room", "result", "inspector", "issues_found", "completed_at"] },
  maintenance:   { name: "Maintenance Request",description: "Maintenance or repair work order",                     attributes: ["room", "issue_type", "status", "assigned_to", "created_at", "resolved_at"] },
  repair:        { name: "Maintenance Request",description: "Maintenance or repair work order",                     attributes: ["room", "issue_type", "status", "assigned_to", "created_at", "resolved_at"] },
  issue:         { name: "Issue",              description: "Problem or defect requiring resolution",               attributes: ["type", "severity", "status", "room", "reported_by", "created_at"] },
  issues:        { name: "Issue",              description: "Problem or defect requiring resolution",               attributes: ["type", "severity", "status", "room", "reported_by", "created_at"] },
  ticket:        { name: "Ticket",             description: "Work request or support ticket",                       attributes: ["title", "status", "assigned_to", "priority", "created_at"] },
  tickets:       { name: "Ticket",             description: "Work request or support ticket",                       attributes: ["title", "status", "assigned_to", "priority", "created_at"] },
  report:        { name: "Report",             description: "Operational report or analytics output",               attributes: ["type", "period", "generated_at", "created_by", "format"] },
  reports:       { name: "Report",             description: "Operational report or analytics output",               attributes: ["type", "period", "generated_at", "created_by", "format"] },
  inventory:     { name: "Inventory Item",     description: "Trackable supply or consumable",                       attributes: ["name", "quantity", "unit", "threshold", "location"] },
  supply:        { name: "Supply",             description: "Consumable supply for operations",                     attributes: ["name", "quantity", "unit", "storage_location", "par_level"] },
  supplies:      { name: "Supply",             description: "Consumable supply for operations",                     attributes: ["name", "quantity", "unit", "storage_location", "par_level"] },
  guest:         { name: "Guest",              description: "Hotel or motel guest",                                 attributes: ["name", "room", "check_in", "check_out", "preferences"] },
  guests:        { name: "Guest",              description: "Hotel or motel guest",                                 attributes: ["name", "room", "check_in", "check_out", "preferences"] },
  booking:       { name: "Booking",            description: "Room reservation",                                     attributes: ["guest", "room", "check_in", "check_out", "status", "source"] },
  reservation:   { name: "Reservation",        description: "Room reservation",                                     attributes: ["guest", "room", "dates", "status", "confirmation_number"] },
  notification:  { name: "Notification",       description: "Alert or message sent to staff",                       attributes: ["recipient", "type", "content", "sent_at", "read_at", "channel"] },
  notifications: { name: "Notification",       description: "Alert or message sent to staff",                       attributes: ["recipient", "type", "content", "sent_at", "read_at", "channel"] },
  alert:         { name: "Alert",              description: "Operational alert requiring attention",                 attributes: ["type", "severity", "message", "recipient", "sent_at"] },
  alerts:        { name: "Alert",              description: "Operational alert requiring attention",                 attributes: ["type", "severity", "message", "recipient", "sent_at"] },
  role:          { name: "Role",               description: "Staff role defining responsibilities and access",       attributes: ["name", "permissions", "staff_count", "department"] },
  roles:         { name: "Role",               description: "Staff role defining responsibilities and access",       attributes: ["name", "permissions", "staff_count", "department"] },
  permission:    { name: "Permission",         description: "Granular access control permission",                   attributes: ["key", "description", "scope", "roles"] },
  permissions:   { name: "Permission",         description: "Granular access control permission",                   attributes: ["key", "description", "scope", "roles"] },
  department:    { name: "Department",         description: "Organizational department or team",                    attributes: ["name", "manager", "staff_count", "location"] },
  departments:   { name: "Department",         description: "Organizational department or team",                    attributes: ["name", "manager", "staff_count", "location"] },
  location:      { name: "Location",           description: "Physical property location",                           attributes: ["name", "address", "timezone", "room_count"] },
  property:      { name: "Property",           description: "Hotel or motel property",                              attributes: ["name", "address", "locations", "total_rooms"] },
  user:          { name: "User Account",       description: "System user account",                                  attributes: ["email", "name", "role", "business_id", "is_active", "created_at"] },
  users:         { name: "User Account",       description: "System user account",                                  attributes: ["email", "name", "role", "business_id", "is_active", "created_at"] },
  event:         { name: "Event",              description: "Logged system or operational event",                   attributes: ["type", "timestamp", "actor", "entity_type", "entity_id"] },
  events:        { name: "Event",              description: "Logged system or operational event",                   attributes: ["type", "timestamp", "actor", "entity_type", "entity_id"] },
  audit:         { name: "Audit Log",          description: "Immutable audit record for compliance",                attributes: ["action", "user", "timestamp", "entity", "before", "after"] },
  priority:      { name: "Priority",           description: "Priority classification for tasks and issues",         attributes: ["level", "label", "color", "sort_order"] },
  flag:          { name: "Flag",               description: "Status or attention flag on a record",                 attributes: ["type", "set_by", "set_at", "reason", "entity_id"] },
  flags:         { name: "Flag",               description: "Status or attention flag on a record",                 attributes: ["type", "set_by", "set_at", "reason", "entity_id"] },
  swap:          { name: "Shift Swap",         description: "Request to trade shifts between staff",                attributes: ["requester", "target_user", "shift", "status", "created_at"] },
  availability:  { name: "Availability",       description: "Staff availability record for scheduling",             attributes: ["user", "date", "is_available", "notes", "updated_at"] },
  timeoff:       { name: "Time-Off Request",   description: "Staff request for time off",                           attributes: ["user", "start_date", "end_date", "status", "approved_by"] },
};

// ── Workflow Patterns ─────────────────────────────────────────────────────────

interface WorkflowPattern { pattern: RegExp; name: string; description: string; steps: string[]; }

const WORKFLOW_PATTERNS: WorkflowPattern[] = [
  { pattern: /\bclean(?:ing)?\s+room|room.*clean|housekeep/i,
    name: "Room Cleaning",
    description: "Process for cleaning and turning over rooms between guests",
    steps: ["Enter room and assess", "Strip dirty linens", "Clean bathroom thoroughly", "Dust all surfaces", "Vacuum or mop floor", "Replace amenities and linens", "Final visual check", "Mark room as clean in system"] },
  { pattern: /\bassign\s+(?:shift|task|room)|shift.*assign|task.*assign/i,
    name: "Shift Assignment",
    description: "Process for assigning staff members to available shifts",
    steps: ["View open shifts", "Check staff availability and role", "Create assignment record", "Notify staff of assignment", "Staff confirms or declines", "Update schedule"] },
  { pattern: /\broom.*inspect|inspect.*room/i,
    name: "Room Inspection",
    description: "Quality control inspection process after room cleaning",
    steps: ["Enter room after cleaning", "Run through inspection checklist", "Note any deficiencies", "Take photos of issues", "Mark pass or fail", "Return to housekeeper if fail", "Submit inspection report"] },
  { pattern: /\bescalat/i,
    name: "Issue Escalation",
    description: "Escalation path for issues that cannot be resolved at the first level",
    steps: ["Issue reported", "First-level response attempt", "Determine if escalation needed", "Route to supervisor", "Supervisor reviews and acts", "Resolution documented", "Close and notify reporter"] },
  { pattern: /\bonboard|new\s+(?:staff|employee|hire)/i,
    name: "Staff Onboarding",
    description: "Process for setting up and onboarding a new staff member",
    steps: ["Create user account", "Assign role and permissions", "Set up location access", "Add to schedule template", "Send welcome notification with credentials", "Assign onboarding checklist"] },
  { pattern: /\bschedul(?:e|ing)|rost(?:er|ering)/i,
    name: "Shift Scheduling",
    description: "Creating and publishing the staff schedule for a given period",
    steps: ["Determine staffing requirements", "Review staff availability", "Create shift slots", "Assign staff to shifts", "Check for conflicts or overtime", "Publish schedule", "Notify staff"] },
  { pattern: /\bnotif(?:y|ication)|push\s+alert|send\s+alert/i,
    name: "Staff Notification",
    description: "Delivering alerts and notifications to the right staff members",
    steps: ["Trigger event in system", "Determine notification recipients", "Compose notification content", "Send via preferred channel (push/SMS/email)", "Track delivery and read status"] },
  { pattern: /\bapprov(?:e|al)|review.*request/i,
    name: "Request Approval",
    description: "Approval workflow for shift swaps, time-off, and other requests",
    steps: ["Staff submits request", "Route to approving manager", "Manager reviews request", "Approve or reject with reason", "Notify staff of decision", "Update system records"] },
  { pattern: /\bmaintenance.*request|work\s+order|repair/i,
    name: "Maintenance Request",
    description: "End-to-end process for handling room maintenance and repairs",
    steps: ["Issue reported by staff", "Maintenance ticket created", "Ticket assigned to maintenance team", "Work scheduled and completed", "Reporter notified of fix", "Room cleared for use", "Ticket closed"] },
  { pattern: /\bcheck.?in|check.?out/i,
    name: "Guest Check-In/Out",
    description: "Guest arrival and departure process",
    steps: ["Verify guest reservation", "Confirm room is ready", "Process payment", "Issue room key", "Update room status to Occupied", "On checkout: mark room Dirty and trigger cleaning task"] },
  { pattern: /\bgenerat.*report|report.*generat/i,
    name: "Report Generation",
    description: "Generating and distributing operational reports",
    steps: ["Select report type and parameters", "Choose date range", "Aggregate data from system", "Format report output", "Preview and validate", "Export or email to recipients"] },
  { pattern: /\bswap.*shift|shift.*swap|trade.*shift/i,
    name: "Shift Swap",
    description: "Process for staff to trade shifts with manager approval",
    steps: ["Staff requests swap", "System finds eligible swap partners", "Both parties agree", "Manager reviews and approves", "Schedule updated", "Both staff notified"] },
  { pattern: /\binventory.*check|supply.*count|stock.*count/i,
    name: "Inventory Count",
    description: "Process for auditing supply and inventory levels",
    steps: ["Select location for count", "Print or load count sheet", "Count each item", "Record actual quantities", "Compare to par levels", "Flag shortages", "Submit count and create reorder list"] },
];

// ── View Patterns ─────────────────────────────────────────────────────────────

interface ViewPattern { pattern: RegExp; name: string; view_type: string; description: string; }

const VIEW_PATTERNS: ViewPattern[] = [
  { pattern: /\broom\s*(?:list|status|board|overview|grid|map|dashboard)/i,
    name: "Room Status Board", view_type: "DASHBOARD", description: "Real-time color-coded overview of all room statuses" },
  { pattern: /\bstaff\s*(?:list|roster|directory|table|view)/i,
    name: "Staff Directory", view_type: "LIST", description: "Searchable list of staff members with role and contact info" },
  { pattern: /\bshift\s*(?:schedule|calendar|view|list)|schedule\s*(?:view|page|calendar)/i,
    name: "Shift Schedule", view_type: "LIST", description: "Calendar or list view of shifts and staff assignments" },
  { pattern: /\btask\s*(?:list|board|queue|view)|task\s*dashboard/i,
    name: "Task Board", view_type: "LIST", description: "Kanban or list view of tasks and their current statuses" },
  { pattern: /\bdashboard|operations\s*overview|main\s*screen/i,
    name: "Operations Dashboard", view_type: "DASHBOARD", description: "High-level operational overview for managers" },
  { pattern: /\bmobile\s*(?:app|checklist|form|screen|view|interface|first)/i,
    name: "Mobile Checklist App", view_type: "MOBILE", description: "Mobile-optimized interface for staff to complete tasks on the go" },
  { pattern: /\bchecklist\s*(?:form|screen|view)|cleaning\s*checklist|room\s*checklist/i,
    name: "Room Checklist", view_type: "FORM", description: "Interactive checklist form for cleaning and inspection steps" },
  { pattern: /\breport\s*(?:page|view|screen)|analytics\s*(?:page|view|screen)/i,
    name: "Reports & Analytics", view_type: "REPORT", description: "Reporting, analytics, and export interface" },
  { pattern: /\binspection\s*(?:form|screen|view)/i,
    name: "Inspection Form", view_type: "FORM", description: "Room inspection data entry form for housekeepers and supervisors" },
  { pattern: /\bassignment\s*(?:view|page|screen|list)/i,
    name: "Assignments View", view_type: "LIST", description: "View of staff assignments filtered by date, role, and status" },
  { pattern: /\bnotification\s*(?:center|inbox|list|view)/i,
    name: "Notification Center", view_type: "LIST", description: "Inbox for staff notifications and alerts" },
  { pattern: /\binventory\s*(?:view|screen|list)|supply\s*(?:view|list|tracker)/i,
    name: "Inventory Tracker", view_type: "LIST", description: "Supply and inventory count and management view" },
  { pattern: /\btimeline|event\s*(?:log|feed|history)/i,
    name: "Event Timeline", view_type: "REPORT", description: "Chronological activity and event log across the property" },
  { pattern: /\bproperty\s*map|floor\s*plan|map\s*view/i,
    name: "Property Map", view_type: "DASHBOARD", description: "Visual floor plan showing room locations and statuses" },
  { pattern: /\bswap\s*(?:marketplace|board|view)/i,
    name: "Shift Swap Board", view_type: "LIST", description: "Marketplace view for posting and claiming open shift swaps" },
];

// ── Concept Patterns ──────────────────────────────────────────────────────────

interface ConceptPattern { pattern: RegExp; name: string; definition: string; }

const CONCEPT_PATTERNS: ConceptPattern[] = [
  { pattern: /\bmobile[\s-]first/i,
    name: "Mobile-First Design",
    definition: "Design approach where the mobile experience is designed and built before desktop" },
  { pattern: /\breal[\s-]?time/i,
    name: "Real-Time Updates",
    definition: "System capability to push live data changes to users without requiring a page refresh" },
  { pattern: /\brole[\s-]based|rbac/i,
    name: "Role-Based Access Control",
    definition: "Permission model where access rights are assigned based on a user's organizational role" },
  { pattern: /\bmulti[\s-]?tenant/i,
    name: "Multi-Tenancy",
    definition: "Architecture where a single system instance serves multiple independent business clients with isolated data" },
  { pattern: /\baudit[\s-]?(?:trail|log)/i,
    name: "Audit Trail",
    definition: "Immutable chronological record of significant system and user actions for compliance and debugging" },
  { pattern: /\bescalat(?:ion|e)/i,
    name: "Escalation Path",
    definition: "Defined chain of responsibility for issues that require senior attention or cannot be resolved at the first level" },
  { pattern: /\bpriority\s+flag|flag.*priority/i,
    name: "Priority Flagging",
    definition: "System for marking items by urgency level to drive appropriate response times" },
  { pattern: /\bcapacity\s+manag/i,
    name: "Capacity Management",
    definition: "Tracking and optimizing resource utilization to avoid under- or over-staffing" },
  { pattern: /\bstaff\s+availab|availab.*staff/i,
    name: "Staff Availability",
    definition: "Mechanism for tracking and querying when staff members are available for scheduling" },
  { pattern: /\bovertime/i,
    name: "Overtime Management",
    definition: "Tracking and managing staff working hours that exceed their scheduled allocation" },
  { pattern: /\b(?:ai|machine\s+learning|ml)\s+(?:schedul|optim)|automat.*schedul/i,
    name: "AI-Assisted Scheduling",
    definition: "Using AI or machine learning to suggest or automatically generate optimal shift and staffing configurations" },
  { pattern: /\boffline\s*(?:mode|capable|first|support)/i,
    name: "Offline Capability",
    definition: "Ability for the app to function without an active internet connection and sync when reconnected" },
  { pattern: /\bintegrat(?:ion|e)|webhook/i,
    name: "System Integration",
    definition: "Connecting Workforce with external systems (PMS, payroll, HR) via APIs or webhooks" },
  { pattern: /\bworkflow\s+automat|automat.*workflow/i,
    name: "Workflow Automation",
    definition: "Automating the routing, assignment, and progression of business processes without manual steps" },
  { pattern: /\bpush\s+notif/i,
    name: "Push Notifications",
    definition: "Real-time alerts delivered to staff mobile devices via OS push notification service" },
  { pattern: /\btenant\s+isol/i,
    name: "Tenant Isolation",
    definition: "Strict enforcement of data boundaries between separate business clients in the same system" },
  { pattern: /\bsoft\s+delete|archive\s+(?:instead|rather)|archiv\w+\s+(?:record|data)/i,
    name: "Soft Deletion",
    definition: "Marking records as archived or inactive rather than permanently removing them from the database" },
  { pattern: /\bpar\s+level|reorder\s+(?:point|level)/i,
    name: "Par-Level Tracking",
    definition: "Minimum acceptable quantity thresholds for supplies that trigger reorder alerts" },
  { pattern: /\bshift\s+swap\s+market|swap\s+market/i,
    name: "Shift Swap Marketplace",
    definition: "Self-service board where staff can post and claim open shift swaps, reducing manager workload" },
];

// ── Relationship Rules ────────────────────────────────────────────────────────

interface RelRule {
  from: string; fromType: string;
  to: string;   toType: string;
  relation: string;
  requires: string[]; // entity/workflow names that must exist for rule to fire
}

const REL_RULES: RelRule[] = [
  { from: "Staff Member",        fromType: "ENTITY",   to: "Shift",             toType: "ENTITY",   relation: "works",          requires: ["Staff Member", "Shift"] },
  { from: "Staff Member",        fromType: "ENTITY",   to: "Assignment",        toType: "ENTITY",   relation: "receives",       requires: ["Staff Member", "Assignment"] },
  { from: "Staff Member",        fromType: "ENTITY",   to: "Role",              toType: "ENTITY",   relation: "has",            requires: ["Staff Member", "Role"] },
  { from: "Staff Member",        fromType: "ENTITY",   to: "Notification",      toType: "ENTITY",   relation: "receives",       requires: ["Staff Member", "Notification"] },
  { from: "Staff Member",        fromType: "ENTITY",   to: "Task",              toType: "ENTITY",   relation: "is assigned",    requires: ["Staff Member", "Task"] },
  { from: "Shift",               fromType: "ENTITY",   to: "Assignment",        toType: "ENTITY",   relation: "has",            requires: ["Shift", "Assignment"] },
  { from: "Shift",               fromType: "ENTITY",   to: "Location",          toType: "ENTITY",   relation: "belongs to",     requires: ["Shift", "Location"] },
  { from: "Room",                fromType: "ENTITY",   to: "Task",              toType: "ENTITY",   relation: "generates",      requires: ["Room", "Task"] },
  { from: "Room",                fromType: "ENTITY",   to: "Checklist",         toType: "ENTITY",   relation: "uses",           requires: ["Room", "Checklist"] },
  { from: "Room",                fromType: "ENTITY",   to: "Inspection",        toType: "ENTITY",   relation: "undergoes",      requires: ["Room", "Inspection"] },
  { from: "Room",                fromType: "ENTITY",   to: "Issue",             toType: "ENTITY",   relation: "may have",       requires: ["Room", "Issue"] },
  { from: "Housekeeper",         fromType: "ENTITY",   to: "Room",              toType: "ENTITY",   relation: "cleans",         requires: ["Housekeeper", "Room"] },
  { from: "Housekeeper",         fromType: "ENTITY",   to: "Checklist",         toType: "ENTITY",   relation: "completes",      requires: ["Housekeeper", "Checklist"] },
  { from: "Task",                fromType: "ENTITY",   to: "Staff Member",      toType: "ENTITY",   relation: "assigned to",    requires: ["Task", "Staff Member"] },
  { from: "Task",                fromType: "ENTITY",   to: "Room",              toType: "ENTITY",   relation: "belongs to",     requires: ["Task", "Room"] },
  { from: "Issue",               fromType: "ENTITY",   to: "Maintenance Request", toType: "ENTITY", relation: "creates",        requires: ["Issue", "Maintenance Request"] },
  { from: "Maintenance Request", fromType: "ENTITY",   to: "Staff Member",      toType: "ENTITY",   relation: "assigned to",    requires: ["Maintenance Request", "Staff Member"] },
  { from: "Guest",               fromType: "ENTITY",   to: "Booking",           toType: "ENTITY",   relation: "has",            requires: ["Guest", "Booking"] },
  { from: "Guest",               fromType: "ENTITY",   to: "Room",              toType: "ENTITY",   relation: "occupies",       requires: ["Guest", "Room"] },
  { from: "Booking",             fromType: "ENTITY",   to: "Room",              toType: "ENTITY",   relation: "reserves",       requires: ["Booking", "Room"] },
  { from: "Location",            fromType: "ENTITY",   to: "Room",              toType: "ENTITY",   relation: "contains",       requires: ["Location", "Room"] },
  { from: "Location",            fromType: "ENTITY",   to: "Shift",             toType: "ENTITY",   relation: "hosts",          requires: ["Location", "Shift"] },
  { from: "Shift Assignment",    fromType: "WORKFLOW", to: "Staff Member",      toType: "ENTITY",   relation: "operates on",    requires: ["Staff Member"] },
  { from: "Room Cleaning",       fromType: "WORKFLOW", to: "Housekeeper",       toType: "ENTITY",   relation: "performed by",   requires: ["Housekeeper", "Room Cleaning"] },
  { from: "Room Cleaning",       fromType: "WORKFLOW", to: "Room",              toType: "ENTITY",   relation: "updates",        requires: ["Room", "Room Cleaning"] },
  { from: "Room Inspection",     fromType: "WORKFLOW", to: "Room",              toType: "ENTITY",   relation: "checks",         requires: ["Room", "Room Inspection"] },
  { from: "Shift Scheduling",    fromType: "WORKFLOW", to: "Shift",             toType: "ENTITY",   relation: "produces",       requires: ["Shift", "Shift Scheduling"] },
  { from: "Request Approval",    fromType: "WORKFLOW", to: "Staff Member",      toType: "ENTITY",   relation: "involves",       requires: ["Staff Member", "Request Approval"] },
  { from: "Room Cleaning",       fromType: "WORKFLOW", to: "Room Status Board", toType: "VIEW",     relation: "updates",        requires: ["Room Cleaning"] },
  { from: "Shift Scheduling",    fromType: "WORKFLOW", to: "Shift Schedule",    toType: "VIEW",     relation: "populates",      requires: ["Shift Scheduling"] },
];

// ── Main Derivation Function ──────────────────────────────────────────────────

export function deriveModels(
  messages: Array<{ content: string; role: string }>
): ModelingResult {
  const userMessages = messages.filter(m => m.role === "USER");
  if (userMessages.length === 0) {
    return { entities: [], workflows: [], views: [], concepts: [], relationships: [] };
  }

  const corpus = userMessages.map(m => m.content).join("\n");

  // ── Entities ───────────────────────────────────────────────────────────────
  const tokens = corpus.toLowerCase().split(/[\s.,!?;:()\-"'/\[\]]+/).filter(Boolean);
  const tokenSet = new Set(tokens);
  const entityMap = new Map<string, DerivedEntity>();
  for (const token of tokenSet) {
    const def = ENTITY_LEXICON[token];
    if (def && !entityMap.has(def.name)) {
      entityMap.set(def.name, {
        name: def.name,
        description: def.description,
        attributes: JSON.stringify(def.attributes),
      });
    }
  }
  const entities = Array.from(entityMap.values());

  // ── Workflows ──────────────────────────────────────────────────────────────
  const workflowMap = new Map<string, DerivedWorkflow>();
  for (const wp of WORKFLOW_PATTERNS) {
    if (wp.pattern.test(corpus) && !workflowMap.has(wp.name)) {
      workflowMap.set(wp.name, {
        name: wp.name,
        description: wp.description,
        steps: JSON.stringify(wp.steps),
      });
    }
  }
  const workflows = Array.from(workflowMap.values());

  // ── Views ──────────────────────────────────────────────────────────────────
  const viewMap = new Map<string, DerivedView>();
  for (const vp of VIEW_PATTERNS) {
    if (vp.pattern.test(corpus) && !viewMap.has(vp.name)) {
      viewMap.set(vp.name, {
        name: vp.name,
        view_type: vp.view_type,
        description: vp.description,
      });
    }
  }
  const views = Array.from(viewMap.values());

  // ── Concepts ───────────────────────────────────────────────────────────────
  const conceptMap = new Map<string, DerivedConcept>();
  for (const cp of CONCEPT_PATTERNS) {
    if (cp.pattern.test(corpus) && !conceptMap.has(cp.name)) {
      conceptMap.set(cp.name, { name: cp.name, definition: cp.definition });
    }
  }
  const concepts = Array.from(conceptMap.values());

  // ── Relationships ──────────────────────────────────────────────────────────
  const entityNames = new Set(entities.map(e => e.name));
  const workflowNames = new Set(workflows.map(w => w.name));
  const viewNames = new Set(views.map(v => v.name));
  const allNames = new Set([...entityNames, ...workflowNames, ...viewNames]);

  const relationships: DerivedRelationship[] = [];
  const relSeen = new Set<string>();

  for (const rule of REL_RULES) {
    const allPresent = rule.requires.every(r => allNames.has(r));
    if (!allPresent) continue;
    const key = `${rule.from}|${rule.to}|${rule.relation}`;
    if (!relSeen.has(key)) {
      relSeen.add(key);
      relationships.push({
        from_name: rule.from,
        from_type: rule.fromType,
        to_name: rule.to,
        to_type: rule.toType,
        relation: rule.relation,
      });
    }
  }

  return { entities, workflows, views, concepts, relationships };
}
