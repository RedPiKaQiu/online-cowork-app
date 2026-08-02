import type { ProjectMemberSnapshot, ProjectTaskSnapshot } from "@/lib/project-snapshot"

export type ColumnId = "box" | "todo" | "done"
export type Member = ProjectMemberSnapshot
export type Task = ProjectTaskSnapshot
export type BoardState = Record<ColumnId, Task[]>

export function getMember(members: Member[], id: string | null) {
  return id ? members.find((member) => member.id === id) : undefined
}
