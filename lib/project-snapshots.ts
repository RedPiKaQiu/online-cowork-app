import "server-only"

import { and, asc, eq, isNull, sql } from "drizzle-orm"

import { members, projects, tasks } from "@/db/schema"
import { db } from "@/lib/db"
import { hashProjectAccessToken } from "@/lib/project-access"
import { groupProjectTasks, isProjectAccessToken, type ProjectSnapshot } from "@/lib/project-snapshot"

export class ProjectLinkNotFoundError extends Error {
  constructor() {
    super("项目不存在或链接已失效。")
  }
}

const projectSelection = {
  id: projects.id,
  name: projects.name,
  description: projects.description,
  version: projects.version,
}

export async function getProjectSnapshot(token: string): Promise<ProjectSnapshot> {
  if (!isProjectAccessToken(token)) throw new ProjectLinkNotFoundError()

  const [project] = await db
    .select(projectSelection)
    .from(projects)
    .where(and(eq(projects.accessTokenHash, hashProjectAccessToken(token, getProjectTokenPepper())), isNull(projects.deletedAt)))

  if (!project) throw new ProjectLinkNotFoundError()

  const [projectMembers, projectTasks] = await Promise.all([
    db
      .select({ id: members.id, name: members.name, color: members.color, fg: members.fg })
      .from(members)
      .where(eq(members.projectId, project.id))
      .orderBy(asc(members.createdAt)),
    db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        assigneeId: tasks.assigneeId,
        version: tasks.version,
      })
      .from(tasks)
      .where(eq(tasks.projectId, project.id))
      .orderBy(
        asc(tasks.status),
        sql`case when ${tasks.status} = 'done' then ${tasks.completedAt} end desc nulls last`,
        asc(tasks.position),
      ),
  ])

  return { project, members: projectMembers, tasks: groupProjectTasks(projectTasks) }
}

function getProjectTokenPepper() {
  const pepper = process.env.PROJECT_TOKEN_PEPPER
  if (!pepper) throw new Error("PROJECT_TOKEN_PEPPER is required for project access.")
  return pepper
}
