export type ModuleKey =
  | "all"
  | "core"
  | "frontend"
  | "hospitable"
  | "crm"
  | "restopeneur"
  | "platform";

export type TaskStatus = "Ready" | "In Progress" | "In Review" | "Backlog" | "Done";
export type Priority = "Critical" | "High" | "Medium" | "Low";

export interface ProjectDoc {
  id: string | number;
  title: string;
  module: ModuleKey | string;
  type: string;
  status: string;
  owner?: string;
  updated?: string;
  summary?: string;
  path?: string;
}

export interface ProjectTask {
  id: string;
  title: string;
  module: ModuleKey | string;
  assignee?: string;
  priority: Priority;
  status: TaskStatus;
  due?: string;
  planPhase?: string;
  blocker?: string;
}

export interface ProgressEntry {
  id: string | number;
  date: string;
  title: string;
  detail: string;
  tag?: string;
}

export interface ProjectSource {
  id: string;
  name: string;
  kind: string;
  updated?: string;
  path?: string;
  module: ModuleKey | string;
  content: string;
}

export interface ParsedSource {
  sourceName: string;
  module: ModuleKey | string;
  headings: string[];
  todos: string[];
  completed: string[];
  blockers: string[];
  dates: string[];
  summary: string;
  lineCount: number;
  charCount: number;
}

export interface ParsedProjectSource extends ProjectSource {
  parsed: ParsedSource;
}

export interface ProjectManagerWorkspace {
  docs: ProjectDoc[];
  tasks: ProjectTask[];
  progress: ProgressEntry[];
  execution: Array<{
    id: string | number;
    phase: string;
    percent: number;
    items: string[];
  }>;
  sources: ProjectSource[];
  project: {
    name: string;
    repoRoot: string;
    frontendRoot: string;
    docsRoot: string;
    aiMode: string;
    syncHealth: number;
    moduleSlug: string;
    routePath: string;
    mountArea: string;
    accessPolicy: string;
    docsApiPath: string;
    tasksApiPath: string;
    sourcesApiPath: string;
    progressApiPath: string;
    aiApiPath: string;
  };
}
