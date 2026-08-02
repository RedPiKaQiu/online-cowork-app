import { createHash, randomUUID } from "node:crypto"

import { and, eq, isNull } from "drizzle-orm"

import { db, pool } from "@/db/client"
import { members, projects, tasks } from "@/db/schema"

class VerificationComplete extends Error {}

function tokenHash(value: string) {
  return createHash("sha256").update(value).digest("hex")
}

async function verify() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to verify constraints against a production database.")
  }

  try {
    await db.transaction(async (tx) => {
      const firstProjectId = randomUUID()
      const secondProjectId = randomUUID()
      const firstMemberId = randomUUID()
      const secondMemberId = randomUUID()

      await tx.insert(projects).values([
        { id: firstProjectId, name: "Verification project A", accessTokenHash: tokenHash(firstProjectId) },
        { id: secondProjectId, name: "Verification project B", accessTokenHash: tokenHash(secondProjectId) },
      ])
      await tx.insert(members).values([
        { id: firstMemberId, projectId: firstProjectId, name: "Member A", color: "#000000", fg: "#ffffff" },
        { id: secondMemberId, projectId: secondProjectId, name: "Member B", color: "#000000", fg: "#ffffff" },
      ])
      await tx.insert(tasks).values({
        projectId: firstProjectId,
        title: "Valid task",
        status: "todo",
        position: 0,
        assigneeId: firstMemberId,
      })

      let crossProjectAssignmentRejected = false
      try {
        await tx.transaction(async (savepoint) => {
          await savepoint.insert(tasks).values({
            projectId: firstProjectId,
            title: "Invalid cross-project assignment",
            status: "todo",
            position: 1,
            assigneeId: secondMemberId,
          })
        })
      } catch {
        crossProjectAssignmentRejected = true
      }

      if (!crossProjectAssignmentRejected) {
        throw new Error("Expected the cross-project assignee constraint to reject the write.")
      }

      await tx.update(projects).set({ deletedAt: new Date() }).where(eq(projects.id, firstProjectId))
      const activeProjects = await tx
        .select({ id: projects.id })
        .from(projects)
        .where(and(eq(projects.id, firstProjectId), isNull(projects.deletedAt)))

      if (activeProjects.length !== 0) {
        throw new Error("Expected soft-deleted projects to be excluded by the active-project query.")
      }

      throw new VerificationComplete()
    })
  } catch (error) {
    if (!(error instanceof VerificationComplete)) throw error
  }

  console.info("Database constraints verified; transaction rolled back without retaining test data.")
}

verify()
  .catch((error: unknown) => {
    console.error("Database verification failed.", error)
    process.exitCode = 1
  })
  .finally(async () => {
    await pool.end()
  })
