export const projectManagerConfig = {
  slug: "project-manager",
  title: "Workforce Project Manager",
  route: "/superadmin/project-manager",
  area: "Superadmin / Command Center",
  access: "superadmin_only",
  endpoints: {
    docs: "/api/v1/project-manager/docs",
    tasks: "/api/v1/project-manager/tasks",
    sources: "/api/v1/project-manager/sources",
    progress: "/api/v1/project-manager/progress",
    aiBrief: "/api/v1/project-manager/ai/brief",
  },
} as const;
