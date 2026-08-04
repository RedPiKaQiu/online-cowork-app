import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { getTableConfig } from "drizzle-orm/pg-core"

import { members, taskStatus, tasks } from "./schema"

describe("collaboration database schema", () => {
  it("limits task status values to the three board columns", () => {
    expect(taskStatus.enumValues).toEqual(["box", "todo", "done"])
  })

  it("defines a composite task assignee foreign key scoped to its project", () => {
    const taskForeignKeys = getTableConfig(tasks).foreignKeys

    expect(taskForeignKeys.map((foreignKey) => foreignKey.getName())).toContain(
      "tasks_assignee_id_project_id_members_id_project_id_fk",
    )
  })

  it("allows the member composite key required by the scoped assignee foreign key", () => {
    const memberConstraints = getTableConfig(members).uniqueConstraints

    expect(memberConstraints.map((constraint) => constraint.getName())).toContain(
      "members_id_project_id_key",
    )
  })

  it("stores a dedicated completion timestamp and migrates existing completed tasks", () => {
    expect(getTableConfig(tasks).columns.map((column) => column.name)).toContain("completed_at")
    const migration = readFileSync(new URL("./migrations/0001_brown_harrier.sql", import.meta.url), "utf8")
    expect(migration).toContain('UPDATE "tasks" SET "completed_at" = "updated_at" WHERE "status" = \'done\'')
    expect(migration).toContain('tasks_project_status_completed_at_position_idx')
  })
})
