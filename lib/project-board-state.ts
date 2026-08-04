import type { ColumnId, Task } from "@/lib/board-data"
import type { ProjectSnapshot } from "@/lib/project-snapshot"

export type BoardState = ProjectSnapshot & {
  pending: string[]
  error: string | null
  isRefreshing: boolean
  refreshError: string | null
  refreshQueued: boolean
}
export type BoardAction =
  | { type: "replace"; snapshot: ProjectSnapshot }
  | { type: "error"; error: string | null }
  | { type: "pending"; id: string; value: boolean }
  | { type: "refreshing"; value: boolean }
  | { type: "refresh-error"; error: string | null }
  | { type: "refresh-queued"; value: boolean }
  | { type: "project"; project: ProjectSnapshot["project"] }
  | { type: "member-add"; member: ProjectSnapshot["members"][number] }
  | { type: "member-remove"; id: string }
  | { type: "task-upsert"; task: Task; status: ColumnId; previousId?: string }
  | { type: "task-remove"; id: string }
  | { type: "columns"; columns: Partial<ProjectSnapshot["tasks"]> }

export function initialBoardState(snapshot: ProjectSnapshot): BoardState {
  return { ...snapshot, pending: [], error: null, isRefreshing: false, refreshError: null, refreshQueued: false }
}
export function boardReducer(state: BoardState, action: BoardAction): BoardState {
  if (action.type === "replace") return initialBoardState(action.snapshot)
  if (action.type === "error") return { ...state, error: action.error }
  if (action.type === "pending") return { ...state, pending: action.value ? [...state.pending, action.id] : state.pending.filter((id) => id !== action.id) }
  if (action.type === "refreshing") return { ...state, isRefreshing: action.value }
  if (action.type === "refresh-error") return { ...state, refreshError: action.error }
  if (action.type === "refresh-queued") return { ...state, refreshQueued: action.value }
  if (action.type === "project") return { ...state, project: action.project }
  if (action.type === "member-add") return { ...state, members: [...state.members.filter((m) => m.id !== action.member.id), action.member] }
  if (action.type === "member-remove") return { ...state, members: state.members.filter((m) => m.id !== action.id), tasks: Object.fromEntries(Object.entries(state.tasks).map(([key, tasks]) => [key, tasks.map((task) => task.assigneeId === action.id ? { ...task, assigneeId: null } : task)])) as ProjectSnapshot["tasks"] }
  if (action.type === "task-remove") return { ...state, tasks: Object.fromEntries(Object.entries(state.tasks).map(([key, tasks]) => [key, tasks.filter((task) => task.id !== action.id)])) as ProjectSnapshot["tasks"] }
  if (action.type === "columns") return { ...state, tasks: { ...state.tasks, ...action.columns } }
  const previous = (Object.entries(state.tasks) as [ColumnId, Task[]][])
    .map(([column, items]) => ({ column, index: items.findIndex((task) => task.id === action.task.id || task.id === action.previousId) }))
    .find(({ index }) => index >= 0)
  const tasks = Object.fromEntries(Object.entries(state.tasks).map(([key, items]) => [key, items.filter((task) => task.id !== action.task.id && task.id !== action.previousId)])) as ProjectSnapshot["tasks"]
  if (previous?.column === action.status) tasks[action.status].splice(previous.index, 0, action.task)
  else tasks[action.status] = [...tasks[action.status], action.task]
  return { ...state, tasks }
}
