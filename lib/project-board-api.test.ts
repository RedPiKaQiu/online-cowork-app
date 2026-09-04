import { afterEach, describe, expect, it, vi } from "vitest"

import { projectBoardApi } from "./project-board-api"

describe("projectBoardApi.createTask", () => {
  afterEach(() => vi.unstubAllGlobals())

  it("sends the selected assignee with a todo create request", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ task: { id: "task-a" } }), {
      status: 201,
      headers: { "content-type": "application/json" },
    }))
    vi.stubGlobal("fetch", fetchMock)

    await projectBoardApi.createTask("a token", { title: "待办", status: "todo", assigneeId: "member-a" })

    expect(fetchMock).toHaveBeenCalledWith("/api/projects/a%20token/tasks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "待办", status: "todo", assigneeId: "member-a" }),
    })
  })

  it("keeps omitted assignee fields backward compatible", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ task: { id: "task-a" } }), { status: 201 }))
    vi.stubGlobal("fetch", fetchMock)

    await projectBoardApi.createTask("token", { title: "盒子", status: "box" })

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ title: "盒子", status: "box" })
  })
})
