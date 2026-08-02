import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("./project-snapshots", () => ({
  ProjectLinkNotFoundError: class ProjectLinkNotFoundError extends Error {},
}))

import { ProjectMutationError, projectMutationErrorResponse, readProjectJson } from "./project-api"
import { ProjectLinkNotFoundError } from "./project-snapshots"

describe("project write API helpers", () => {
  it("rejects malformed and oversized JSON bodies", async () => {
    const malformed = await readProjectJson(new Request("http://localhost", { method: "POST", body: "not-json" }))
    const oversized = await readProjectJson(new Request("http://localhost", { method: "POST", body: JSON.stringify({ text: "x".repeat(64 * 1024) }) }))

    expect(malformed.response?.status).toBe(400)
    expect(oversized.response?.status).toBe(413)
  })

  it("maps project availability and validation failures to safe responses", async () => {
    const unavailable = projectMutationErrorResponse(new ProjectLinkNotFoundError())
    const invalid = projectMutationErrorResponse(new ProjectMutationError("字段无效。", 400))

    expect(unavailable.status).toBe(404)
    await expect(unavailable.json()).resolves.toEqual({ error: "项目不存在或链接已失效。" })
    expect(invalid.status).toBe(400)
    await expect(invalid.json()).resolves.toEqual({ error: "字段无效。" })
  })
})
