import { createHash, randomUUID } from "node:crypto"

import { INITIAL_MEMBERS, INITIAL_PROJECTS } from "@/lib/board-data"
import { db, pool } from "@/db/client"
import { members, projects, tasks } from "@/db/schema"

if (process.env.NODE_ENV === "production") {
  throw new Error("Refusing to seed a production database.")
}

function developmentTokenHash(projectId: string) {
  return createHash("sha256").update(`development-seed:${projectId}`).digest("hex")
}

async function seed() {
  await db.transaction(async (tx) => {
    for (const sourceProject of INITIAL_PROJECTS) {
      const projectId = randomUUID()
      const memberIds = new Map<string, string>()

      await tx.insert(projects).values({
        id: projectId,
        name: sourceProject.name,
        accessTokenHash: developmentTokenHash(projectId),
      })

      await tx.insert(members).values(
        INITIAL_MEMBERS.map((member) => {
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
