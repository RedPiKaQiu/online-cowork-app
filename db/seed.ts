import { createHash, randomUUID } from "node:crypto"

import { db, pool } from "@/db/client"
import { members, projects, tasks } from "@/db/schema"

const seedMembers = [
  { id: "m1", name: "林晓", color: "oklch(0.58 0.1 195)", fg: "oklch(0.99 0 0)" },
  { id: "m2", name: "陈昊", color: "oklch(0.6 0.12 250)", fg: "oklch(0.99 0 0)" },
]
const seedProjects = [{
  name: "官网改版 2.0",
  board: {
    box: [{ id: "t1", title: "接入实时协作光标", description: "多人同时编辑时显示彼此的光标位置与选区。", assigneeId: null }],
    todo: [{ id: "t2", title: "完成登录页面视觉走查", description: "核对间距、配色与暗色模式。", assigneeId: "m1" }],
    done: [{ id: "t3", title: "搭建项目基础框架", description: "初始化仓库与代码规范。", assigneeId: "m2" }],
  },
}]

if (process.env.NODE_ENV === "production") {
  throw new Error("Refusing to seed a production database.")
}

function developmentTokenHash(projectId: string) {
  return createHash("sha256").update(`development-seed:${projectId}`).digest("hex")
}

async function seed() {
  await db.transaction(async (tx) => {
    for (const sourceProject of seedProjects) {
      const projectId = randomUUID()
      const memberIds = new Map<string, string>()

      await tx.insert(projects).values({
        id: projectId,
        name: sourceProject.name,
        accessTokenHash: developmentTokenHash(projectId),
      })

      await tx.insert(members).values(
        seedMembers.map((member) => {
          const id = randomUUID()
          memberIds.set(member.id, id)
          return {
            id,
            projectId,
            name: member.name,
            color: member.color,
            fg: member.fg,
          }
        }),
      )

      for (const status of ["box", "todo", "done"] as const) {
        await tx.insert(tasks).values(
          sourceProject.board[status].map((task, position) => ({
            id: randomUUID(),
            projectId,
            title: task.title,
            description: task.description,
            status,
            position,
            assigneeId: task.assigneeId ? memberIds.get(task.assigneeId) ?? null : null,
          })),
        )
      }
    }
  })

  console.info("Development seed completed.")
}

seed()
  .catch((error: unknown) => {
    console.error("Development seed failed.", error)
    process.exitCode = 1
  })
  .finally(async () => {
    await pool.end()
  })
