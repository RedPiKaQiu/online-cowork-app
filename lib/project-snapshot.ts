export type ProjectSnapshot = {
  project: {
    id: string
    name: string
    description: string
    version: number
  }
  members: ProjectMemberSnapshot[]
  tasks: ProjectBoardSnapshot
}

export type ProjectMemberSnapshot = {
  id: string
  name: string
  color: string
  fg: string
}

export type ProjectTaskSnapshot = {
  id: string
  title: string
  description: string
  assigneeId: string | null
  version: number
}

export type ProjectBoardSnapshot = Record<"box" | "todo" | "done", ProjectTaskSnapshot[]>

type SnapshotSourceTask = ProjectTaskSnapshot & { status: keyof ProjectBoardSnapshot }

export function groupProjectTasks(tasks: SnapshotSourceTask[]): ProjectBoardSnapshot {
  const board: ProjectBoardSnapshot = { box: [], todo: [], done: [] }
  for (const task of tasks) {
    const { status, ...snapshot } = task
    board[status].push(snapshot)
  }
  return board
}

export function isProjectAccessToken(token: string) {
  return /^[A-Za-z0-9_-]{43}$/.test(token)
}
