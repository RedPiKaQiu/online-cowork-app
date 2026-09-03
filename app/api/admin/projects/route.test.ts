import { beforeEach, describe, expect, it, vi } from "vitest"

const { listActiveProjects } = vi.hoisted(() => ({ listActiveProjects: vi.fn() }))

vi.mock("server-only", () => ({}))
vi.mock("@/lib/admin-projects", () => ({
  createAdminProject: vi.fn(),
  listActiveProjects,
}))

import { NextRequest } from "next/server"

import { adminSessionCookieName } from "@/lib/admin-auth"
import { createSession } from "@/lib/admin-security"
import { GET } from "./route"

describe("GET /api/admin/projects", () => {
  beforeEach(() => {
    listActiveProjects.mockReset()
    process.env.ADMIN_EMAIL = "admin@example.com"
    process.env.ADMIN_PASSWORD_HASH = "scrypt:16384:8:1:salt:hash"
    process.env.SESSION_SECRET = "test-session-secret"
  })

  it("returns recoverable URLs without internal credential fields to an administrator", async () => {
    listActiveProjects.mockResolvedValue([{ id: "project-1", name: "项目一", accessUrl: "https://cowork.example.com/p/token" }])
    const session = createSession("admin@example.com", process.env.SESSION_SECRET!)
    const request = new NextRequest("https://cowork.example.com/api/admin/projects", {
      headers: { cookie: `${adminSessionCookieName}=${session}` },
    })

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.projects[0].accessUrl).toBe("https://cowork.example.com/p/token")
    expect(JSON.stringify(body)).not.toMatch(/accessTokenHash|accessTokenCiphertext|PROJECT_TOKEN_ENCRYPTION_KEY/)
  })

  it("rejects unauthenticated reads before listing projects", async () => {
    const response = await GET(new NextRequest("https://cowork.example.com/api/admin/projects"))

    expect(response.status).toBe(401)
    expect(listActiveProjects).not.toHaveBeenCalled()
  })
})
