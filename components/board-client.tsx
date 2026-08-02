"use client"

import { CheckCircle2, Inbox, ListTodo, Users } from "lucide-react"

import type { ProjectBoardSnapshot, ProjectMemberSnapshot, ProjectSnapshot, ProjectTaskSnapshot } from "@/lib/project-snapshot"

const columns: { id: keyof ProjectBoardSnapshot; title: string; hint: string; icon: typeof Inbox; accent: string }[] = [
  { id: "box", title: "事项盒子", hint: "将来计划要做的功能", icon: Inbox, accent: "oklch(0.6 0.13 300)" },
  { id: "todo", title: "当前待办", hint: "正在推进的事项", icon: ListTodo, accent: "oklch(0.58 0.1 195)" },
]

export function BoardClient({ snapshot }: { snapshot: ProjectSnapshot }) {
  const { project, members, tasks } = snapshot
  const membersById = new Map(members.map((member) => [member.id, member]))

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="border-b border-border bg-card/60 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground"><ListTodo className="size-5" /></span>
            <div className="min-w-0">
              <h1 className="truncate font-semibold">{project.name}</h1>
              {project.description && <p className="truncate text-xs text-muted-foreground">{project.description}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 text-sm text-muted-foreground"><Users className="size-4" />{members.length} 位成员</span>
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium">
              <CheckCircle2 className="size-4" style={{ color: "oklch(0.6 0.14 150)" }} />已完成 {tasks.done.length}
            </span>
          </div>
        </div>
      </header>
      <main className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 gap-4 p-4 md:grid-cols-2">
        {columns.map((column) => {
          const Icon = column.icon
          return <BoardColumn key={column.id} title={column.title} hint={column.hint} icon={<Icon className="size-4" />} accent={column.accent} tasks={tasks[column.id]} membersById={membersById} />
        })}
      </main>
      <section className="mx-auto w-full max-w-6xl px-4 pb-6">
        <BoardColumn title="已完成" hint="已完成的事项" icon={<CheckCircle2 className="size-4" />} accent="oklch(0.6 0.14 150)" tasks={tasks.done} membersById={membersById} />
      </section>
    </div>
  )
}

function BoardColumn({ title, hint, icon, accent, tasks, membersById }: { title: string; hint: string; icon: React.ReactNode; accent: string; tasks: ProjectTaskSnapshot[]; membersById: Map<string, ProjectMemberSnapshot> }) {
  return (
    <section className="rounded-2xl border border-border bg-card/50 p-3">
      <header className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2"><span className="grid size-7 place-items-center rounded-lg" style={{ backgroundColor: accent, color: "white" }}>{icon}</span><div><h2 className="text-sm font-semibold">{title}</h2><p className="text-xs text-muted-foreground">{hint}</p></div></div>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">{tasks.length}</span>
      </header>
      <ul className="space-y-2">
        {tasks.length ? tasks.map((task) => <ReadOnlyTaskCard key={task.id} task={task} member={task.assigneeId ? membersById.get(task.assigneeId) : undefined} />) : <li className="rounded-xl border border-dashed border-border/70 p-5 text-center text-xs text-muted-foreground">暂无事项</li>}
      </ul>
    </section>
  )
}

function ReadOnlyTaskCard({ task, member }: { task: ProjectTaskSnapshot; member?: ProjectMemberSnapshot }) {
  return <li className="relative rounded-xl border border-border bg-card p-3 shadow-sm">
    {member && <span aria-hidden className="absolute inset-y-2 left-0 w-1 rounded-full" style={{ backgroundColor: member.color }} />}
    <p className="text-sm font-medium leading-relaxed text-card-foreground">{task.title}</p>
    {task.description && <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{task.description}</p>}
    {member && <span className="mt-3 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: member.color, color: member.fg }}>{member.name}</span>}
  </li>
}
