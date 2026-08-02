import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { createSession } from "@/lib/admin-security"
import { adminSessionCookieName } from "@/lib/admin-auth"
import { requireAdminApi } from "@/lib/admin-api"
import { NextRequest } from "next/server"

describe("管理员 API 鉴权", () => {
  beforeEach(() => {
    process.env.ADMIN_EMAIL = "admin@example.com"
    process.env.ADMIN_PASSWORD_HASH = "scrypt:16384:8:1:salt:hash"
    process.env.SESSION_SECRET = "test-session-secret"
  })

  it("允许携带有效会话且同源的写请求", async () => {
    const session = createSession("admin@example.com", process.env.SESSION_SECRET!)
    const request = new NextRequest("https://cowork.example.com/api/admin/projects", {
      method: "POST",
      headers: {
        origin: "https://cowork.example.com",
        cookie: `${adminSessionCookieName}=${session}`,
      },
    })

    const result = requireAdminApi(request, { write: true })

    expect(result.response).toBeUndefined()
    expect(result.session).toMatchObject({ email: "admin@example.com" })
  })

  it("拒绝未认证或跨来源的管理员写请求", async () => {
    const unauthenticated = new NextRequest("https://cowork.example.com/api/admin/projects", {
      method: "POST",
      headers: { origin: "https://cowork.example.com" },
    })
    const crossOrigin = new NextRequest("https://cowork.example.com/api/admin/projects", {
      method: "POST",
      headers: { origin: "https://attacker.example" },
    })

    expect(requireAdminApi(unauthenticated, { write: true }).response?.status).toBe(401)
    expect(requireAdminApi(crossOrigin, { write: true }).response?.status).toBe(403)
  })
})
