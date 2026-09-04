import { beforeEach, describe, expect, it, vi } from "vitest"

const { createTaskByToken } = vi.hoisted(() => ({ createTaskByToken: vi.fn() }))

vi.mock("server-only", () => ({}))
vi.mock("@/lib/project-mutations", () => ({ createTaskByToken }))

import { NextRequest } from "next/server"
import { POST } from "./route"

describe("POST /api/projects/:token/tasks", () => {
  beforeEach(() => createTaskByToken.mockReset())

  it("forwards an optional assignee in the atomic create request", async () => {
    createTaskByToken.mockResolvedValue({ id: "task-a", title: "待办", description: "", status: "todo", assigneeId: "member-a", version: 1 })
    const request = new NextRequest("https://cowork.example.com/api/projects/token/tasks", {
      method: "POST",
      headers: { "content-type": "application/json", host: "cowork.example.com", origin: "https://cowork.example.com" },
      body: JSON.stringify({ title: "待办", status: "todo", assigneeId: "member-a" }),
    })

    const response = await POST(request, { params: Promise.resolve({ token: "token" }) })

    expect(response.status).toBe(201)
    expect(createTaskByToken).toHaveBeenCalledWith("token", { title: "待办", status: "todo", assigneeId: "member-a" })
    await expect(response.json()).resolves.toMatchObject({ task: { assigneeId: "member-a" } })
  })
})
