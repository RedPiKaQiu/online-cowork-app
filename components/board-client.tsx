"use client"

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react"
import { CheckCircle2, Inbox, ListTodo, Pencil, RefreshCw, Users } from "lucide-react"
import type { ColumnId, Task } from "@/lib/board-data"
import { TaskColumn } from "@/components/task-column"
import { TaskCard } from "@/components/task-card"
import { QuickAddBar } from "@/components/quick-add-bar"
import { MemberManager } from "@/components/member-manager"
import { DoneDrawer } from "@/components/done-drawer"
import { TaskEditDialog } from "@/components/task-edit-dialog"
import { projectBoardApi, ProjectBoardApiError } from "@/lib/project-board-api"
import { boardReducer, initialBoardState } from "@/lib/project-board-state"
import type { ProjectSnapshot } from "@/lib/project-snapshot"
import { createSnapshotRefreshGate, subscribeToSnapshotRefresh } from "@/lib/project-snapshot-refresh"

const columns = [{ id: "box" as const, title: "事项盒子", hint: "将来计划要做的事项", icon: Inbox, accent: "oklch(0.6 0.13 300)" }, { id: "todo" as const, title: "当前待办", hint: "正在推进的事项", icon: ListTodo, accent: "oklch(0.58 0.1 195)" }]
type Drag = { id: string; from: ColumnId } | null

export function BoardClient({ snapshot, token }: { snapshot: ProjectSnapshot; token: string }) {
  const [state, dispatch] = useReducer(boardReducer, snapshot, initialBoardState)
  const [drag, setDrag] = useState<Drag>(null); const [drop, setDrop] = useState<{ col: ColumnId; index: number } | null>(null)
  const [doneOpen, setDoneOpen] = useState(false); const [membersOpen, setMembersOpen] = useState(false); const [editing, setEditing] = useState<{ task: Task; col: ColumnId } | null>(null)
  const [editingProject, setEditingProject] = useState(false); const [projectName, setProjectName] = useState(state.project.name); const [projectDescription, setProjectDescription] = useState(state.project.description)
  const pendingRef = useRef(state.pending)
  const pending = (id: string) => state.pending.includes(id)
  useEffect(() => { pendingRef.current = state.pending }, [state.pending])
  const performRefresh = useCallback(async () => {
    dispatch({ type: "refreshing", value: true }); dispatch({ type: "refresh-error", error: null })
    await projectBoardApi.snapshot(token).then((next) => {
      dispatch({ type: "replace", snapshot: next })
    }).catch((error) => {
      const message = error instanceof ProjectBoardApiError ? error.message : "刷新最新数据失败，请重试。"
      dispatch({ type: "refresh-error", error: message })
    }).finally(() => {
      dispatch({ type: "refreshing", value: false })
    })
  }, [token])
  const refreshGate = useMemo(() => createSnapshotRefreshGate(performRefresh), [performRefresh])
  const refreshSnapshot = useCallback(() => {
    const request = refreshGate.request(pendingRef.current.length > 0)
    if (!request) dispatch({ type: "refresh-queued", value: true })
    return request
  }, [refreshGate])
  useEffect(() => {
    if (state.pending.length !== 0 || !refreshGate.isQueued()) return
    dispatch({ type: "refresh-queued", value: false })
    void refreshGate.flush(false)
  }, [refreshGate, state.pending.length])
  async function mutate(id: string, optimistic: () => void, request: () => Promise<void>) {
    dispatch({ type: "error", error: null }); dispatch({ type: "pending", id, value: true }); optimistic()
    try { await request() } catch (error) {
      const message = error instanceof ProjectBoardApiError ? error.message : "操作失败，请重试。"
      dispatch({ type: "error", error: message })
      await refreshSnapshot()
    } finally { dispatch({ type: "pending", id, value: false }) }
  }
  function find(id: string) { for (const col of ["box", "todo", "done"] as ColumnId[]) { const task = state.tasks[col].find((item) => item.id === id); if (task) return { task, col } } }
  const editingCurrent = editing ? find(editing.task.id) : undefined
  useEffect(() => {
    return subscribeToSnapshotRefresh(window, document, () => void refreshSnapshot())
  }, [refreshSnapshot])
  function addTask(title: string, col: ColumnId) { const localId = `local-${crypto.randomUUID()}`; const task = { id: localId, title, description: "", assigneeId: null, version: 1 }
    void mutate(localId, () => dispatch({ type: "task-upsert", task, status: col }), async () => { const response = await projectBoardApi.createTask(token, { title, status: col }); dispatch({ type: "task-upsert", task: response.task, status: col, previousId: localId }) }) }
  function patchTask(id: string, patch: Record<string, unknown>, status?: ColumnId) { const found = find(id); if (!found || pending(id)) return; const to = status ?? found.col; const task = { ...found.task, ...patch, assigneeId: to === "box" ? null : (patch.assigneeId === undefined ? found.task.assigneeId : patch.assigneeId as string | null) }
    void mutate(id, () => dispatch({ type: "task-upsert", task, status: to, previousId: id }), async () => { const response = await projectBoardApi.updateTask(token, id, { ...patch, status: to, expectedVersion: found.task.version }); dispatch({ type: "task-upsert", task: response.task, status: to, previousId: id }) }) }
  function removeTask(id: string) { const found = find(id); if (!found || pending(id) || !window.confirm("确定删除这条事项吗？")) return; void mutate(id, () => dispatch({ type: "task-remove", id }), async () => { await projectBoardApi.deleteTask(token, id, found.task.version) }) }
  function reorder(to: ColumnId) { if (!drag) return; const found = find(drag.id); if (!found || pending(drag.id)) return; const index = drop?.col === to ? drop.index : state.tasks[to].length; const source = state.tasks[drag.from].filter((task) => task.id !== drag.id); const target = drag.from === to ? source : state.tasks[to]; const inserted = { ...found.task, assigneeId: to === "box" ? null : found.task.assigneeId }; target.splice(Math.max(0, Math.min(index, target.length)), 0, inserted)
    setDrag(null); setDrop(null); void mutate(found.task.id, () => dispatch({ type: "columns", columns: drag.from === to ? { [to]: target } : { [drag.from]: source, [to]: target } }), async () => { const response = await projectBoardApi.reorder(token, { taskId: found.task.id, fromStatus: drag.from, toStatus: to, targetIndex: Math.max(0, Math.min(index, target.length - 1)), expectedVersion: found.task.version, mutationId: crypto.randomUUID() }); dispatch({ type: "columns", columns: response.columns }) }) }
  function addMember(name: string) { const id = "members"; if (pending(id)) return; void mutate(id, () => {}, async () => { const response = await projectBoardApi.createMember(token, name); dispatch({ type: "member-add", member: response.member }) }) }
  function removeMember(id: string) { if (pending("members")) return; void mutate("members", () => dispatch({ type: "member-remove", id }), async () => { await projectBoardApi.deleteMember(token, id) }) }
  function saveProject() { if (!projectName.trim() || pending("project")) return; void mutate("project", () => dispatch({ type: "project", project: { ...state.project, name: projectName.trim(), description: projectDescription.trim() } }), async () => { const response = await projectBoardApi.updateProject(token, { name: projectName.trim(), description: projectDescription.trim(), expectedVersion: state.project.version }); dispatch({ type: "project", project: response.project }); setEditingProject(false) }) }
  const renderCard = (task: Task, col: ColumnId, index: number) => <TaskCard key={task.id} task={task} column={col} members={state.members} isDragging={drag?.id === task.id} isDropTarget={drop?.col === col && drop.index === index && drag?.id !== task.id} onDragStart={() => setDrag({ id: task.id, from: col })} onDragEnd={() => { setDrag(null); setDrop(null) }} onDragOverCard={() => setDrop({ col, index })} onMoveToTodo={() => patchTask(task.id, {}, "todo")} onComplete={() => patchTask(task.id, {}, "done")} onUncomplete={() => patchTask(task.id, {}, "todo")} onAssign={(assigneeId) => patchTask(task.id, { assigneeId })} onEdit={() => setEditing({ task, col })} onDelete={() => removeTask(task.id)} pending={pending(task.id)} />
  return <div className="flex min-h-dvh flex-col bg-background">
    <header className="border-b border-border bg-card/60"><div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3"><div className="flex min-w-0 items-center gap-2"><span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground"><ListTodo className="size-5" /></span>{editingProject ? <div className="flex flex-col gap-1"><input aria-label="项目名称" value={projectName} onChange={(e) => setProjectName(e.target.value)} className="rounded border px-2" /><textarea aria-label="项目说明" value={projectDescription} onChange={(e) => setProjectDescription(e.target.value)} className="rounded border px-2 text-xs" rows={2} /><div><button type="button" onClick={saveProject} disabled={pending("project")} className="text-sm text-primary">{pending("project") ? "保存中…" : "保存"}</button><button type="button" onClick={() => setEditingProject(false)} className="ml-3 text-sm text-muted-foreground">取消</button></div></div> : <div><h1 className="font-semibold">{state.project.name}</h1>{state.project.description && <p className="text-xs text-muted-foreground">{state.project.description}</p>}</div>}<button aria-label="编辑项目资料" onClick={() => setEditingProject((value) => !value)} className="p-1 text-muted-foreground"><Pencil className="size-4" /></button></div><div className="flex gap-2"><button type="button" aria-label="刷新" onClick={() => void refreshSnapshot()} disabled={state.isRefreshing} className="rounded-xl border px-3 py-2 text-sm"><RefreshCw className={`mr-1 inline size-4 ${state.isRefreshing ? "animate-spin" : ""}`} />{state.isRefreshing ? "刷新中…" : "刷新"}</button><button type="button" onClick={() => setMembersOpen(true)} className="rounded-xl border px-3 py-2 text-sm"><Users className="mr-1 inline size-4" />成员 {state.members.length}</button><button type="button" onClick={() => setDoneOpen(true)} className="rounded-xl border px-3 py-2 text-sm"><CheckCircle2 className="mr-1 inline size-4" />已完成 {state.tasks.done.length}</button></div></div></header>
    {state.error && <div role="alert" className="mx-auto mt-3 w-full max-w-6xl rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">{state.error}</div>}
    {state.refreshError && <div role="alert" className="mx-auto mt-3 flex w-full max-w-6xl items-center justify-between gap-3 rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive"><span>{state.refreshError}</span><button type="button" onClick={() => void refreshSnapshot()} className="shrink-0 underline">重试刷新</button></div>}
    {state.refreshQueued && <p className="mx-auto mt-3 w-full max-w-6xl px-4 text-sm text-muted-foreground">当前操作完成后将刷新最新数据。</p>}
    <main className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 gap-4 p-4 md:grid-cols-2">{columns.map((column) => <TaskColumn key={column.id} {...column} count={state.tasks[column.id].length} isActiveDropZone={drag !== null && drop?.col === column.id} onDragOverColumn={() => setDrop({ col: column.id, index: state.tasks[column.id].length })} onDrop={() => reorder(column.id)} empty={<div className="p-6 text-center text-xs text-muted-foreground">暂无事项</div>}>{state.tasks[column.id].map((task, index) => renderCard(task, column.id, index))}</TaskColumn>)}</main>
    <QuickAddBar onAdd={addTask} pending={pending("add")} /><DoneDrawer open={doneOpen} count={state.tasks.done.length} onClose={() => setDoneOpen(false)} empty={<div className="p-6 text-center text-xs text-muted-foreground">完成的事项会出现在这里</div>}>{state.tasks.done.map((task, index) => renderCard(task, "done", index))}</DoneDrawer><MemberManager open={membersOpen} members={state.members} onClose={() => setMembersOpen(false)} onAdd={addMember} onRemove={removeMember} pending={pending("members")} /><TaskEditDialog task={editingCurrent?.task ?? null} pending={editingCurrent ? pending(editingCurrent.task.id) : false} onClose={() => setEditing(null)} onSave={(patch) => editingCurrent && patchTask(editingCurrent.task.id, patch, editingCurrent.col)} />
  </div>
}
