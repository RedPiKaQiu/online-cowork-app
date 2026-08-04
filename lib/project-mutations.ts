import "server-only"

import { and, asc, desc, eq, isNull, sql } from "drizzle-orm"

import { members, projects, tasks, type TaskStatus } from "@/db/schema"
import { db } from "@/lib/db"
import { hashProjectAccessToken } from "@/lib/project-access"
import { ProjectLinkNotFoundError } from "@/lib/project-snapshots"
import { ProjectMutationError } from "@/lib/project-api"
import type { ProjectMemberSnapshot, ProjectTaskSnapshot } from "@/lib/project-snapshot"

const MEMBER_COLORS = [
  { color: "oklch(0.58 0.1 195)", fg: "oklch(0.99 0 0)" },
  { color: "oklch(0.6 0.12 250)", fg: "oklch(0.99 0 0)" },
  { color: "oklch(0.72 0.15 70)", fg: "oklch(0.24 0.02 250)" },
  { color: "oklch(0.62 0.16 15)", fg: "oklch(0.99 0 0)" },
  { color: "oklch(0.6 0.13 300)", fg: "oklch(0.99 0 0)" },
  { color: "oklch(0.62 0.14 150)", fg: "oklch(0.99 0 0)" },
  { color: "oklch(0.66 0.15 40)", fg: "oklch(0.24 0.02 250)" },
  { color: "oklch(0.55 0.12 330)", fg: "oklch(0.99 0 0)" },
] as const

const STATUSES = ["box", "todo", "done"] as const

export type ProjectMutationTask = ProjectTaskSnapshot & { status: TaskStatus }

const projectSelection = {
  id: projects.id,
  name: projects.name,
  description: projects.description,
  version: projects.version,
}
const memberSelection = { id: members.id, name: members.name, color: members.color, fg: members.fg }
const taskSelection = {
  id: tasks.id,
  title: tasks.title,
  description: tasks.description,
  status: tasks.status,
  position: tasks.position,
  assigneeId: tasks.assigneeId,
  completedAt: tasks.completedAt,
  version: tasks.version,
}

export function isTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === "string" && (STATUSES as readonly string[]).includes(value)
}

export function completedAtForStatusTransition(previousStatus: TaskStatus | null, previousCompletedAt: Date | null, nextStatus: TaskStatus, now = new Date()) {
  if (nextStatus !== "done") return null
  return previousStatus === "done" ? previousCompletedAt : now
}

export function nextProjectMemberColor(existing: Pick<ProjectMemberSnapshot, "color">[]) {
  return MEMBER_COLORS.reduce((best, candidate) => {
    const bestCount = existing.filter((member) => member.color === best.color).length
    const candidateCount = existing.filter((member) => member.color === candidate.color).length
    return candidateCount < bestCount ? candidate : best
  })
}

export function normalizeProjectInput(input: Record<string, unknown>) {
  const name = typeof input.name === "string" ? input.name.trim() : ""
  const description = typeof input.description === "string" ? input.description.trim() : ""
  if (!name) throw new ProjectMutationError("项目名称不能为空。", 400)
  if (name.length > 120) throw new ProjectMutationError("项目名称不能超过 120 个字符。", 400)
  if (description.length > 10_000) throw new ProjectMutationError("项目说明不能超过 10000 个字符。", 400)
  return { name, description }
}

export function normalizeMemberName(value: unknown) {
  const name = typeof value === "string" ? value.trim() : ""
  if (!name) throw new ProjectMutationError("成员名称不能为空。", 400)
  if (name.length > 80) throw new ProjectMutationError("成员名称不能超过 80 个字符。", 400)
  return name
}

export function normalizeTaskInput(input: Record<string, unknown>) {
  const title = typeof input.title === "string" ? input.title.trim() : ""
  const description = typeof input.description === "string" ? input.description.trim() : ""
  if (!title) throw new ProjectMutationError("任务标题不能为空。", 400)
  if (title.length > 200) throw new ProjectMutationError("任务标题不能超过 200 个字符。", 400)
  if (description.length > 10_000) throw new ProjectMutationError("任务说明不能超过 10000 个字符。", 400)
  return { title, description }
}

export async function updateProjectByToken(token: string, input: Record<string, unknown>, expectedVersion: number) {
  const context = await getProjectContext(token)
  const values = normalizeProjectInput(input)
  const [project] = await db.update(projects)
    .set({ ...values, version: sql`${projects.version} + 1`, updatedAt: new Date() })
    .where(and(eq(projects.id, context.id), isNull(projects.deletedAt), eq(projects.version, expectedVersion)))
    .returning(projectSelection)
  if (!project) throw new ProjectMutationError("项目已被其他会话更新，请刷新后重试。", 409)
  return project
}

export async function createMemberByToken(token: string, input: Record<string, unknown>) {
  const context = await getProjectContext(token)
  const name = normalizeMemberName(input.name)
  const existing = await db.select({ color: members.color }).from(members).where(eq(members.projectId, context.id))
  const color = nextProjectMemberColor(existing)
  const [member] = await db.insert(members).values({ projectId: context.id, name, ...color }).returning(memberSelection)
  return member
}

export async function updateMemberByToken(token: string, id: string, input: Record<string, unknown>) {
  const context = await getProjectContext(token)
  const name = normalizeMemberName(input.name)
  const [member] = await db.update(members).set({ name, updatedAt: new Date() })
    .where(and(eq(members.id, id), eq(members.projectId, context.id))).returning(memberSelection)
  if (!member) throw new ProjectMutationError("成员不存在。", 404)
  return member
}

export async function deleteMemberByToken(token: string, id: string) {
  const context = await getProjectContext(token)
  await db.transaction(async (tx) => {
    await tx.update(tasks).set({ assigneeId: null, version: sql`${tasks.version} + 1`, updatedAt: new Date() })
      .where(and(eq(tasks.projectId, context.id), eq(tasks.assigneeId, id)))
    const [member] = await tx.delete(members).where(and(eq(members.id, id), eq(members.projectId, context.id))).returning({ id: members.id })
    if (!member) throw new ProjectMutationError("成员不存在。", 404)
  })
}

export async function createTaskByToken(token: string, input: Record<string, unknown>) {
  const context = await getProjectContext(token)
  const values = normalizeTaskInput(input)
  if (!isTaskStatus(input.status)) throw new ProjectMutationError("任务状态无效。", 400)
  const [last] = await db.select({ position: tasks.position }).from(tasks)
    .where(and(eq(tasks.projectId, context.id), eq(tasks.status, input.status))).orderBy(desc(tasks.position)).limit(1)
  const [task] = await db.insert(tasks).values({ ...values, projectId: context.id, status: input.status, position: (last?.position ?? -1) + 1, assigneeId: null, completedAt: completedAtForStatusTransition(null, null, input.status) }).returning(taskSelection)
  return toTaskSnapshot(task)
}

export async function updateTaskByToken(token: string, id: string, input: Record<string, unknown>, expectedVersion: number) {
  const context = await getProjectContext(token)
  const [current] = await db.select(taskSelection).from(tasks).where(and(eq(tasks.id, id), eq(tasks.projectId, context.id)))
  if (!current) throw new ProjectMutationError("任务不存在。", 404)
  if (current.version !== expectedVersion) throw new ProjectMutationError("任务已被其他会话更新，请刷新后重试。", 409)
  const values = normalizeTaskInput({
    title: Object.hasOwn(input, "title") ? input.title : current.title,
    description: Object.hasOwn(input, "description") ? input.description : current.description,
  })
  const status = Object.hasOwn(input, "status") ? input.status : current.status
  if (!isTaskStatus(status)) throw new ProjectMutationError("任务状态无效。", 400)
  const requestedAssignee = Object.hasOwn(input, "assigneeId") ? input.assigneeId : current.assigneeId
  const assigneeId = status === "box" ? null : await resolveAssignee(context.id, requestedAssignee)
  const position = status === current.status ? current.position : await nextTaskPosition(context.id, status)
  const completedAt = completedAtForStatusTransition(current.status, current.completedAt, status)
  const [task] = await db.update(tasks).set({ ...values, status, position, assigneeId, completedAt, version: sql`${tasks.version} + 1`, updatedAt: new Date() })
    .where(and(eq(tasks.id, id), eq(tasks.projectId, context.id), eq(tasks.version, expectedVersion))).returning(taskSelection)
  if (!task) throw new ProjectMutationError("任务已被其他会话更新，请刷新后重试。", 409)
  return toTaskSnapshot(task)
}

export async function deleteTaskByToken(token: string, id: string, expectedVersion: number) {
  const context = await getProjectContext(token)
  const [current] = await db.select({ version: tasks.version }).from(tasks).where(and(eq(tasks.id, id), eq(tasks.projectId, context.id)))
  if (!current) throw new ProjectMutationError("任务不存在。", 404)
  if (current.version !== expectedVersion) throw new ProjectMutationError("任务已被其他会话更新，请刷新后重试。", 409)
  const [task] = await db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.projectId, context.id), eq(tasks.version, expectedVersion))).returning({ id: tasks.id })
  if (!task) throw new ProjectMutationError("任务已被其他会话更新，请刷新后重试。", 409)
}

export function reorderTaskList<T extends { id: string }>(items: T[], taskId: string, targetIndex: number) {
  const index = items.findIndex((item) => item.id === taskId)
  if (index < 0) throw new ProjectMutationError("任务不存在。", 404)
  const next = items.filter((item) => item.id !== taskId)
  if (targetIndex < 0 || targetIndex > next.length) throw new ProjectMutationError("目标排序位置无效。", 400)
  next.splice(targetIndex, 0, items[index])
  return next
}

export async function reorderTaskByToken(token: string, input: Record<string, unknown>) {
  const context = await getProjectContext(token)
  const { taskId, fromStatus, toStatus, targetIndex, expectedVersion, mutationId } = input
  if (typeof taskId !== "string" || !taskId || !isTaskStatus(fromStatus) || !isTaskStatus(toStatus) || typeof targetIndex !== "number" || !Number.isInteger(targetIndex) || targetIndex < 0 || typeof mutationId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(mutationId) || typeof expectedVersion !== "number" || !Number.isInteger(expectedVersion) || expectedVersion < 1) {
    throw new ProjectMutationError("任务重排请求无效。", 400)
  }
  if (fromStatus === "done" || toStatus === "done") throw new ProjectMutationError("已完成事项不能通过拖拽排序。", 400)
  return db.transaction(async (tx) => {
    const [moving] = await tx.select(taskSelection).from(tasks).where(and(eq(tasks.id, taskId), eq(tasks.projectId, context.id)))
    if (!moving) throw new ProjectMutationError("任务不存在。", 404)
    if (moving.status !== fromStatus || moving.version !== expectedVersion) throw new ProjectMutationError("任务已被其他会话更新，请刷新后重试。", 409)
    const source = await tx.select(taskSelection).from(tasks).where(and(eq(tasks.projectId, context.id), eq(tasks.status, fromStatus))).orderBy(asc(tasks.position))
    const sourceWithoutMoving = source.filter((task) => task.id !== moving.id)
    const targetBase = fromStatus === toStatus
      ? sourceWithoutMoving
      : await tx.select(taskSelection).from(tasks).where(and(eq(tasks.projectId, context.id), eq(tasks.status, toStatus))).orderBy(asc(tasks.position))
    if (targetIndex > targetBase.length) throw new ProjectMutationError("目标排序位置无效。", 400)
    const target = [...targetBase]
    target.splice(targetIndex, 0, { ...moving, status: toStatus, assigneeId: toStatus === "box" ? null : moving.assigneeId, completedAt: null })
    const updateColumn = async (column: typeof source, status: TaskStatus) => {
      for (const [position, task] of column.entries()) {
        const moved = task.id === moving.id
        const values = { status, position, assigneeId: task.assigneeId, completedAt: status === "done" ? task.completedAt : null, updatedAt: new Date() }
        await tx.update(tasks).set(moved ? { ...values, version: sql`${tasks.version} + 1` } : values)
          .where(and(eq(tasks.id, task.id), eq(tasks.projectId, context.id)))
      }
    }
    if (fromStatus === toStatus) {
      await updateColumn(target, toStatus)
    } else {
      await updateColumn(sourceWithoutMoving, fromStatus)
      await updateColumn(target, toStatus)
    }
    const updatedTask = { ...toTaskSnapshot({ ...moving, status: toStatus, assigneeId: toStatus === "box" ? null : moving.assigneeId }), version: moving.version + 1 }
    const updatedSource = sourceWithoutMoving.map(toTaskSnapshot)
    const updatedTarget = target.map((task) => task.id === moving.id ? updatedTask : toTaskSnapshot(task))
    return {
      task: updatedTask,
      columns: fromStatus === toStatus
        ? { [toStatus]: updatedTarget }
        : { [fromStatus]: updatedSource, [toStatus]: updatedTarget },
    }
  })
}

export async function getProjectContext(token: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new ProjectLinkNotFoundError()
  const pepper = process.env.PROJECT_TOKEN_PEPPER
  if (!pepper) throw new Error("PROJECT_TOKEN_PEPPER is required for project access.")
  const [project] = await db.select(projectSelection).from(projects)
    .where(and(eq(projects.accessTokenHash, hashProjectAccessToken(token, pepper)), isNull(projects.deletedAt)))
  if (!project) throw new ProjectLinkNotFoundError()
  return project
}

async function resolveAssignee(projectId: string, value: unknown) {
  if (value === null) return null
  if (typeof value !== "string" || !value) throw new ProjectMutationError("任务负责人无效。", 400)
  const [member] = await db.select({ id: members.id }).from(members).where(and(eq(members.id, value), eq(members.projectId, projectId)))
  if (!member) throw new ProjectMutationError("任务负责人不存在。", 404)
  return member.id
}

async function nextTaskPosition(projectId: string, status: TaskStatus) {
  const [last] = await db.select({ position: tasks.position }).from(tasks)
    .where(and(eq(tasks.projectId, projectId), eq(tasks.status, status))).orderBy(desc(tasks.position)).limit(1)
  return (last?.position ?? -1) + 1
}

function toTaskSnapshot(task: typeof taskSelection extends never ? never : { id: string; title: string; description: string; status: TaskStatus; assigneeId: string | null; version: number }) {
  return { id: task.id, title: task.title, description: task.description, status: task.status, assigneeId: task.assigneeId, version: task.version }
}
