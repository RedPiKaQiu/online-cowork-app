import { beforeEach, describe, expect, it, vi } from "vitest"

const { mockDb } = vi.hoisted(() => ({ mockDb: { select: vi.fn() } }))

vi.mock("server-only", () => ({}))
vi.mock("@/lib/db", () => ({ db: mockDb }))

import { ProjectLinkNotFoundError, getProjectSnapshot } from "./project-snapshots"

function projectQuery<T>(rows: T[]) {
  return { from: () => ({ where: () => Promise.resolve(rows) }) }
}

function orderedQuery<T>(rows: T[]) {
  return { from: () => ({ where: () => ({ orderBy: () => Promise.resolve(rows) }) }) }
}

describe("project snapshot database access", () => {
  beforeEach(() => {
    mockDb.select.mockReset()
    process.env.PROJECT_TOKEN_PEPPER = "test-pepper"
  })

  it("returns only the selected project's ordered data as a browser-safe snapshot", async () => {
    mockDb.select
      .mockReturnValueOnce(projectQuery([{ id: "project-1", name: "One", description: "", version: 3 }]))
      .mockReturnValueOnce(orderedQuery([{ id: "member-1", name: "Ada", color: "blue", fg: "white" }]))
      .mockReturnValueOnce(orderedQuery([
        { id: "todo-1", title: "First", description: "", status: "todo", assigneeId: "member-1", version: 1 },
        { id: "todo-2", title: "Second", description: "", status: "todo", assigneeId: null, version: 1 },
      ]))

    await expect(getProjectSnapshot("a".repeat(43))).resolves.toEqual({
      project: { id: "project-1", name: "One", description: "", version: 3 },
      members: [{ id: "member-1", name: "Ada", color: "blue", fg: "white" }],
      tasks: {
        box: [],
        todo: [
          { id: "todo-1", title: "First", description: "", assigneeId: "member-1", version: 1 },
          { id: "todo-2", title: "Second", description: "", assigneeId: null, version: 1 },
        ],
        done: [],
      },
    })
  })

  it("保留数据库返回的已完成事项时间倒序", async () => {
    mockDb.select
      .mockReturnValueOnce(projectQuery([{ id: "project-1", name: "One", description: "", version: 3 }]))
      .mockReturnValueOnce(orderedQuery([]))
      .mockReturnValueOnce(orderedQuery([
        { id: "done-new", title: "New", description: "", status: "done", assigneeId: null, version: 1 },
        { id: "done-old", title: "Old", description: "", status: "done", assigneeId: null, version: 1 },
      ]))

    const snapshot = await getProjectSnapshot("a".repeat(43))
    expect(snapshot.tasks.done.map((task) => task.id)).toEqual(["done-new", "done-old"])
  })

  it("treats missing and malformed tokens as the same unavailable project", async () => {
    mockDb.select.mockReturnValueOnce(projectQuery([]))

    await expect(getProjectSnapshot("a".repeat(43))).rejects.toBeInstanceOf(ProjectLinkNotFoundError)
    await expect(getProjectSnapshot("malformed")).rejects.toBeInstanceOf(ProjectLinkNotFoundError)
  })
})
