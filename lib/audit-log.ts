import "server-only"

export function auditAdminProjectAction(action: "project_deleted" | "project_link_reset", projectId: string, email: string) {
  console.info(JSON.stringify({ event: "admin_project_audit", action, projectId, actor: email, occurredAt: new Date().toISOString() }))
}
