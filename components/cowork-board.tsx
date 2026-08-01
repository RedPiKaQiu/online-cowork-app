"use client"

import { useMemo, useState } from "react"
import { CheckCircle2, Inbox, ListTodo, Users } from "lucide-react"
import {
  type BoardState,
  type ColumnId,
  type Member,
  type Project,
  type Task,
  INITIAL_MEMBERS,
  INITIAL_PROJECTS,
  nextMemberColor,
  newId,
} from "@/lib/board-data"
import { TaskColumn } from "@/components/task-column"
import { TaskCard } from "@/components/task-card"
import { QuickAddBar } from "@/components/quick-add-bar"
import { ProjectSwitcher } from "@/components/project-switcher"
import { MemberManager } from "@/components/member-manager"
import { DoneDrawer } from "@/components/done-drawer"
import { TaskEditDialog } from "@/components/task-edit-dialog"

type DragState = { id: string; from: ColumnId } | null
type DropTarget = { col: ColumnId; index: number } | null

const COLUMN_META: {
  id: Exclude<ColumnId, "done">
  title: string
  hint: string
  icon: typeof Inbox
  accent: string
}[] = [
  { id: "box", title: "事项盒子", hint: "将来计划要做的功能", icon: Inbox, accent: "oklch(0.6 0.13 300)" },
  { id: "todo", title: "当前待办", hint: "正在推进的事项", icon: ListTodo, accent: "oklch(0.58 0.1 195)" },
]

export function CoworkBoard() {
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS)
  const [activeId, setActiveId] = useState<string>(INITIAL_PROJECTS[0].id)
  const [members, setMembers] = useState<Member[]>(INITIAL_MEMBERS)

  const [drag, setDrag] = useState<DragState>(null)
  const [dropTarget, setDropTarget] = useState<DropTarget>(null)

  const [doneOpen, setDoneOpen] = useState(false)
  const [membersOpen, setMembersOpen] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)

  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeId) ?? projects[0],
    [projects, activeId],
  )
  const board = activeProject.board

  /** apply an updater to the active project's board */
  function updateBoard(updater: (b: BoardState) => BoardState) {
    setProjects((prev) =>
      prev.map((p) => (p.id === activeProject.id ? { ...p, board: updater(p.board) } : p)),
    )
  }

  function handleDrop(toCol: ColumnId) {
    if (!drag) return
    const { id, from } = drag
    updateBoard((prev) => {
      const item = prev[from].find((t) => t.id === id)
      if (!item) return prev
      const next: BoardState = {
        box: [...prev.box],
        todo: [...prev.todo],
        done: [...prev.done],
      }
      const fromIdx = next[from].findIndex((t) => t.id === id)
      next[from].splice(fromIdx, 1)

      // moved item; clear assignee when parked back into the idea box
      const moved = toCol === "box" ? { ...item, assigneeId: null } : item

      let index = dropTarget && dropTarget.col === toCol ? dropTarget.index : next[toCol].length
      if (from === toCol && fromIdx < index) index -= 1
      index = Math.max(0, Math.min(index, next[toCol].length))
      next[toCol].splice(index, 0, moved)
      return next
    })
    setDrag(null)
    setDropTarget(null)
  }

  function mutate(col: ColumnId, updater: (list: Task[]) => Task[]) {
    updateBoard((prev) => ({ ...prev, [col]: updater(prev[col]) }))
  }

  function moveBetween(from: ColumnId, to: ColumnId, id: string, transform?: (t: Task) => Task) {
    updateBoard((prev) => {
      const item = prev[from].find((t) => t.id === id)
      if (!item) return prev
      const moved = transform ? transform(item) : item
      return {
        ...prev,
        [from]: prev[from].filter((t) => t.id !== id),
        [to]: [...prev[to], moved],
      }
    })
  }

  function addTask(title: string, column: ColumnId) {
    mutate(column, (list) => [...list, { id: newId(), title, description: "", assigneeId: null }])
  }

  function saveTask(id: string, patch: { title: string; description: string }) {
    updateBoard((prev) => {
      const next: BoardState = { box: [...prev.box], todo: [...prev.todo], done: [...prev.done] }
      ;(Object.keys(next) as ColumnId[]).forEach((col) => {
        next[col] = next[col].map((t) => (t.id === id ? { ...t, ...patch } : t))
      })
      return next
    })
  }

  // ---- member management ----
  function addMember(name: string) {
    const c = nextMemberColor(members)
    setMembers((prev) => [...prev, { id: newId("m"), name, color: c.color, fg: c.fg }])
  }

  function removeMember(id: string) {
    setMembers((prev) => prev.filter((m) => m.id !== id))
    // unassign this member everywhere across all projects
    setProjects((prev) =>
      prev.map((p) => {
        const b = p.board
        const clear = (list: Task[]) => list.map((t) => (t.assigneeId === id ? { ...t, assigneeId: null } : t))
        return { ...p, board: { box: clear(b.box), todo: clear(b.todo), done: clear(b.done) } }
      }),
    )
  }

  // ---- project management ----
  function createProject(name: string) {
    const id = newId("p")
    setProjects((prev) => [...prev, { id, name, board: { box: [], todo: [], done: [] } }])
    setActiveId(id)
  }

  function renderCard(task: Task, col: ColumnId, index: number) {
    return (
      <TaskCard
        key={task.id}
        task={task}
        column={col}
        members={members}
        isDragging={drag?.id === task.id}
        isDropTarget={
          drag !== null && drag.id !== task.id && dropTarget?.col === col && dropTarget.index === index
        }
        onDragStart={() => setDrag({ id: task.id, from: col })}
        onDragEnd={() => {
          setDrag(null)
          setDropTarget(null)
        }}
        onDragOverCard={() => setDropTarget({ col, index })}
        onMoveToTodo={() => moveBetween("box", "todo", task.id)}
        onComplete={() => moveBetween("todo", "done", task.id)}
        onUncomplete={() => moveBetween("done", "todo", task.id)}
        onAssign={(memberId) =>
          mutate(col, (list) => list.map((t) => (t.id === task.id ? { ...t, assigneeId: memberId } : t)))
        }
        onEdit={() => setEditing(task)}
      />
    )
  }

  return (
    <div className="flex h-dvh flex-col bg-background">
      <header className="border-b border-border bg-card/60 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
              <ListTodo className="size-5" />
            </span>
            <ProjectSwitcher
              projects={projects}
              activeId={activeProject.id}
              onSwitch={setActiveId}
              onCreate={createProject}
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMembersOpen(true)}
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-2 py-1.5 transition hover:border-primary/40"
              aria-label="管理成员"
            >
              <div className="flex items-center -space-x-2">
                {members.slice(0, 5).map((m) => (
                  <span
                    key={m.id}
                    title={m.name}
                    className="grid size-7 place-items-center rounded-full border-2 border-card text-xs font-medium"
                    style={{ backgroundColor: m.color, color: m.fg }}
                  >
                    {m.name.slice(0, 1)}
                  </span>
                ))}
                {members.length > 5 && (
                  <span className="grid size-7 place-items-center rounded-full border-2 border-card bg-secondary text-xs font-medium text-muted-foreground">
                    +{members.length - 5}
                  </span>
                )}
              </div>
              <Users className="size-4 text-muted-foreground" />
            </button>

            <button
              type="button"
              onClick={() => setDoneOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition hover:border-primary/40"
            >
              <CheckCircle2 className="size-4" style={{ color: "oklch(0.6 0.14 150)" }} />
              已完成
              <span className="grid min-w-5 place-items-center rounded-full bg-secondary px-1 text-xs font-semibold text-muted-foreground tabular-nums">
                {board.done.length}
              </span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 gap-4 overflow-hidden p-4 md:grid-cols-2">
        {COLUMN_META.map((col) => (
          <TaskColumn
            key={col.id}
            title={col.title}
            hint={col.hint}
            icon={col.icon}
            accent={col.accent}
            count={board[col.id].length}
            isActiveDropZone={drag !== null && dropTarget?.col === col.id}
            onDragOverColumn={() => setDropTarget({ col: col.id, index: board[col.id].length })}
            onDrop={() => handleDrop(col.id)}
            empty={
              <div className="flex h-full min-h-32 items-center justify-center rounded-xl border border-dashed border-border/70 p-4 text-center text-xs text-muted-foreground">
                {col.id === "box" ? "把将来的点子放进盒子" : "从盒子拖入，或直接添加"}
              </div>
            }
          >
            {board[col.id].map((task, index) => renderCard(task, col.id, index))}
          </TaskColumn>
        ))}
      </main>

      <QuickAddBar onAdd={addTask} />

      <DoneDrawer
        open={doneOpen}
        count={board.done.length}
        onClose={() => setDoneOpen(false)}
        empty={
          <div className="flex h-full min-h-32 items-center justify-center rounded-xl border border-dashed border-border/70 p-4 text-center text-xs text-muted-foreground">
            完成的事项会出现在这里
          </div>
        }
      >
        {board.done.map((task, index) => renderCard(task, "done", index))}
      </DoneDrawer>

      <MemberManager
        open={membersOpen}
        members={members}
        onClose={() => setMembersOpen(false)}
        onAdd={addMember}
        onRemove={removeMember}
      />

      <TaskEditDialog
        task={editing}
        onClose={() => setEditing(null)}
        onSave={(patch) => {
          if (editing) saveTask(editing.id, patch)
        }}
      />
    </div>
  )
}
