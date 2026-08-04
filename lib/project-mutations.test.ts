import { beforeEach, describe, expect, it, vi } from "vitest"

const { mockDb } = vi.hoisted(() => ({ mockDb: { select: vi.fn(), update: vi.fn() } }))

vi.mock("server-only", () => ({}))
vi.mock("@/lib/db", () => ({ db: mockDb }))

import { ProjectMutationError } from "./project-api"
import { ProjectLinkNotFoundError } from "./project-snapshots"
import { completedAtForStatusTransition, getProjectContext, nextProjectMemberColor, normalizeMemberName, normalizeProjectInput, normalizeTaskInput, reorderTaskList, updateMemberByToken } from "./project-mutations"

function projectQuery<T>(rows: T[]) {
  return { from: () => ({ where: () => Promise.resolve(rows) }) }
}

describe("project mutation rules", () => {
  beforeEach(() => {
    mockDb.select.mockReset()
    mockDb.update.mockReset()
    process.env.PROJECT_TOKEN_PEPPER = "test-pepper"
  })

  it("rejects malformed tokens before querying a project and treats missing projects as unavailable", async () => {
    await expect(getProjectContext("malformed")).rejects.toBeInstanceOf(ProjectLinkNotFoundError)
    expect(mockDb.select).not.toHaveBeenCalled()

    mockDb.select.mockReturnValueOnce(projectQuery([]))
    await expect(getProjectContext("a".repeat(43))).rejects.toBeInstanceOf(ProjectLinkNotFoundError)
  })

  it("normalizes bounded user fields", () => {
    expect(normalizeProjectInput({ name: " 项目 ", description: " 说明 " })).toEqual({ name: "项目", description: "说明" })
    expect(normalizeMemberName(" 成员 ")).toBe("成员")
    expect(normalizeTaskInput({ title: " 任务 ", description: " 内容 " })).toEqual({ title: "任务", description: "内容" })
    expect(() => normalizeProjectInput({ name: " ", description: "" })).toThrow(ProjectMutationError)
    expect(() => normalizeMemberName(" ")).toThrow(ProjectMutationError)
    expect(() => normalizeTaskInput({ title: "", description: "" })).toThrow(ProjectMutationError)
  })

  it("chooses the least-used supported member color", () => {
    const first = nextProjectMemberColor([])
    const second = nextProjectMemberColor([{ color: first.color }])

    expect(second.color).not.toBe(first.color)
    expect(second.fg).toBeTruthy()
  })

  it("reorders within a column without accepting invalid positions", () => {
    const tasks = [{ id: "a" }, { id: "b" }, { id: "c" }]

    expect(reorderTaskList(tasks, "a", 2).map((task) => task.id)).toEqual(["b", "c", "a"])
    expect(() => reorderTaskList(tasks, "a", -1)).toThrow(ProjectMutationError)
    expect(() => reorderTaskList(tasks, "a", 3)).toThrow(ProjectMutationError)
  })

  it("只在进入 done 时记录完成时间，并在恢复后重新完成时更新它", () => {
    const firstCompletedAt = new Date("2026-08-01T10:00:00.000Z")
    const secondCompletedAt = new Date("2026-08-02T10:00:00.000Z")

    expect(completedAtForStatusTransition("todo", null, "done", firstCompletedAt)).toBe(firstCompletedAt)
    expect(completedAtForStatusTransition("done", firstCompletedAt, "done", secondCompletedAt)).toBe(firstCompletedAt)
    expect(completedAtForStatusTransition("done", firstCompletedAt, "todo", secondCompletedAt)).toBeNull()
    expect(completedAtForStatusTransition("todo", null, "done", secondCompletedAt)).toBe(secondCompletedAt)
  })

  it("rejects a member ID that does not belong to the accessed project", async () => {
    mockDb.select.mockReturnValueOnce(projectQuery([{ id: "project-a", name: "A", description: "", version: 1 }]))
    mockDb.update.mockReturnValue({
      set: () => ({ where: () => ({ returning: () => Promise.resolve([]) }) }),
    })

    await expect(updateMemberByToken("a".repeat(43), "member-from-project-b", { name: "Ada" }))
      .rejects.toMatchObject({ status: 404, message: "成员不存在。" })
  })
})
