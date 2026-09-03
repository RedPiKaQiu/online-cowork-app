import "server-only"

import { and, desc, eq, isNull, sql } from "drizzle-orm"

import { projects } from "@/db/schema"
import { db } from "@/lib/db"
import { createProjectAccessToken, createProjectAccessUrl, hashProjectAccessToken } from "@/lib/project-access"
import { decryptProjectAccessToken, encryptProjectAccessToken } from "@/lib/project-token-encryption"

export type AdminProject = {
  id: string
  name: string
  description: string
  version: number
  createdAt: Date
  updatedAt: Date
  accessUrl: string | null
}

export class ProjectServiceError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 404 | 409,
  ) {
    super(message)
  }
}

type ProjectInput = { name: string; description?: string }

export async function listActiveProjects(): Promise<AdminProject[]> {
  const rows = await db
    .select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      version: projects.version,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
      accessTokenCiphertext: projects.accessTokenCiphertext,
    })
    .from(projects)
    .where(isNull(projects.deletedAt))
    .orderBy(desc(projects.updatedAt))

  return rows.map(({ accessTokenCiphertext, ...project }) => ({
    ...project,
    accessUrl: accessTokenCiphertext
      ? createProjectAccessUrl(decryptProjectAccessToken(accessTokenCiphertext), getAppUrl())
      : null,
  }))
}

export async function getAdminProject(id: string) {
  return getActiveProject(id)
}

export async function findAdminProject(id: string) {
  const [project] = await db.select(projectSelection).from(projects).where(and(eq(projects.id, id), isNull(projects.deletedAt)))
  return project ?? null
}

export async function createAdminProject(input: ProjectInput) {
  const values = validateProjectInput(input)
  const token = createProjectAccessToken()
  const accessTokenHash = hashProjectAccessToken(token, getProjectTokenPepper())
  const accessTokenCiphertext = encryptProjectAccessToken(token)
  const [project] = await db
    .insert(projects)
    .values({ ...values, accessTokenHash, accessTokenCiphertext })
    .returning(projectSelection)

  return { project, accessUrl: createProjectAccessUrl(token, getAppUrl()) }
}

export async function updateAdminProject(id: string, input: ProjectInput, expectedVersion: number) {
  const values = validateProjectInput(input)
  const project = await getActiveProject(id)
  if (project.version !== expectedVersion) throw new ProjectServiceError("项目已被其他会话更新，请刷新后重试。", 409)

  const [updated] = await db
    .update(projects)
    .set({ ...values, version: sql`${projects.version} + 1`, updatedAt: new Date() })
    .where(and(eq(projects.id, id), isNull(projects.deletedAt), eq(projects.version, expectedVersion)))
    .returning(projectSelection)
  if (!updated) throw new ProjectServiceError("项目已被其他会话更新，请刷新后重试。", 409)
  return updated
}

export async function resetAdminProjectAccessLink(id: string, expectedVersion: number) {
  const project = await getActiveProject(id)
  if (project.version !== expectedVersion) throw new ProjectServiceError("项目已被其他会话更新，请刷新后重试。", 409)

  const token = createProjectAccessToken()
  const [updated] = await db
    .update(projects)
    .set({
      accessTokenHash: hashProjectAccessToken(token, getProjectTokenPepper()),
      accessTokenCiphertext: encryptProjectAccessToken(token),
      version: sql`${projects.version} + 1`,
      updatedAt: new Date(),
    })
    .where(and(eq(projects.id, id), isNull(projects.deletedAt), eq(projects.version, expectedVersion)))
    .returning(projectSelection)
  if (!updated) throw new ProjectServiceError("项目已被其他会话更新，请刷新后重试。", 409)
  return { project: updated, accessUrl: createProjectAccessUrl(token, getAppUrl()) }
}

export async function deleteAdminProject(id: string, expectedVersion: number) {
  const project = await getActiveProject(id)
  if (project.version !== expectedVersion) throw new ProjectServiceError("项目已被其他会话更新，请刷新后重试。", 409)

  const [deleted] = await db
    .update(projects)
    .set({ deletedAt: new Date(), version: sql`${projects.version} + 1`, updatedAt: new Date() })
    .where(and(eq(projects.id, id), isNull(projects.deletedAt), eq(projects.version, expectedVersion)))
    .returning({ id: projects.id })
  if (!deleted) throw new ProjectServiceError("项目已被其他会话更新，请刷新后重试。", 409)
}

const projectSelection = {
  id: projects.id,
  name: projects.name,
  description: projects.description,
  version: projects.version,
  createdAt: projects.createdAt,
  updatedAt: projects.updatedAt,
}

async function getActiveProject(id: string) {
  const [project] = await db.select(projectSelection).from(projects).where(and(eq(projects.id, id), isNull(projects.deletedAt)))
  if (!project) throw new ProjectServiceError("项目不存在或已删除。", 404)
  return project
}

function validateProjectInput(input: ProjectInput) {
  const name = input.name?.trim()
  const description = input.description?.trim() ?? ""
  if (!name) throw new ProjectServiceError("项目名称不能为空。", 400)
  if (name.length > 120) throw new ProjectServiceError("项目名称不能超过 120 个字符。", 400)
  if (description.length > 10_000) throw new ProjectServiceError("项目说明不能超过 10000 个字符。", 400)
  return { name, description }
}

function getProjectTokenPepper() {
  const pepper = process.env.PROJECT_TOKEN_PEPPER
  if (!pepper) throw new Error("PROJECT_TOKEN_PEPPER is required for project management.")
  return pepper
}

function getAppUrl() {
  const appUrl = process.env.APP_URL
  if (!appUrl) throw new Error("APP_URL is required for project management.")
  return appUrl
}
