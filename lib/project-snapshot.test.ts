import { describe, expect, it } from "vitest"

import { groupProjectTasks, isProjectAccessToken } from "./project-snapshot"

describe("project snapshots", () => {
  it("groups the already ordered, project-scoped task rows by board status", () => {
    const board = groupProjectTasks([
      { id: "box-1", title: "Idea", description: "", assigneeId: null, version: 1, status: "box" },
      { id: "todo-1", title: "Work", description: "", assigneeId: "member-1", version: 2, status: "todo" },
      { id: "done-1", title: "Done", description: "", assigneeId: null, version: 3, status: "done" },
    ])

    expect(board).toEqual({
      box: [{ id: "box-1", title: "Idea", description: "", assigneeId: null, version: 1 }],
      todo: [{ id: "todo-1", title: "Work", description: "", assigneeId: "member-1", version: 2 }],
      done: [{ id: "done-1", title: "Done", description: "", assigneeId: null, version: 3 }],
    })
  })

  it("keeps the database order within each board column", () => {
    const board = groupProjectTasks([
      { id: "first", title: "First", description: "", assigneeId: null, version: 1, status: "todo" },
      { id: "second", title: "Second", description: "", assigneeId: null, version: 1, status: "todo" },
    ])

    expect(board.todo.map((task) => task.id)).toEqual(["first", "second"])
  })

  it("rejects malformed project tokens before a project query can run", () => {
    expect(isProjectAccessToken("not-a-project-token")).toBe(false)
    expect(isProjectAccessToken("a".repeat(43))).toBe(true)
  })
})
