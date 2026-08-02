import type { ColumnId } from "@/lib/board-data"
import type { ProjectMemberSnapshot, ProjectSnapshot, ProjectTaskSnapshot } from "@/lib/project-snapshot"

type Project = ProjectSnapshot["project"]
type ReorderResponse = { task: ProjectTaskSnapshot; columns: Partial<ProjectSnapshot["tasks"]> }

export class ProjectBoardApiError extends Error {
  constructor(message: string, readonly status: number) { super(message) }
}

async function request<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, body === undefined ? { method } : { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
  } catch {
    throw new ProjectBoardApiError("网络连接失败，请检查网络后重试。", 0)
  }
  const data = await response.json().catch(() => ({})) as T & { error?: string }
  if (!response.ok) throw new ProjectBoardApiError(data.error || "请求失败，请稍后重试。", response.status)
  return data
}

const base = (token: string) => `/api/projects/${encodeURIComponent(token)}`
export const projectBoardApi = {
  snapshot: (token: string) => request<ProjectSnapshot>(base(token)),
  updateProject: (token: string, input: { name: string; description: string; expectedVersion: number }) => request<{ project: Project }>(base(token), "PATCH", input),
  createMember: (token: string, name: string) => request<{ member: ProjectMemberSnapshot }>(`${base(token)}/members`, "POST", { name }),
  deleteMember: (token: string, id: string) => request<{ ok: true }>(`${base(token)}/members/${id}`, "DELETE"),
  createTask: (token: string, input: { title: string; status: ColumnId }) => request<{ task: ProjectTaskSnapshot }>(`${base(token)}/tasks`, "POST", input),
  updateTask: (token: string, id: string, input: Record<string, unknown>) => request<{ task: ProjectTaskSnapshot }>(`${base(token)}/tasks/${id}`, "PATCH", input),
  deleteTask: (token: string, id: string, expectedVersion: number) => request<{ ok: true }>(`${base(token)}/tasks/${id}`, "DELETE", { expectedVersion }),
  reorder: (token: string, input: { taskId: string; fromStatus: ColumnId; toStatus: ColumnId; targetIndex: number; expectedVersion: number; mutationId: string }) => request<ReorderResponse>(`${base(token)}/tasks/reorder`, "POST", input),
}
