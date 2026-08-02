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
})
