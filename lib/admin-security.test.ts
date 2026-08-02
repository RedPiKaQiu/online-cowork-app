import { describe, expect, it } from "vitest"

import { createSession, hashPassword, verifyPassword, verifySession } from "./admin-security"
import { createProjectAccessToken, createProjectAccessUrl, hashProjectAccessToken } from "./project-access"

describe("administrator security", () => {
  it("verifies only the password used to create a scrypt hash", async () => {
    const hash = await hashPassword("correct horse battery staple", {
      salt: Buffer.alloc(16, 7),
      cost: 1024,
    })

    await expect(verifyPassword("correct horse battery staple", hash)).resolves.toBe(true)
    await expect(verifyPassword("incorrect", hash)).resolves.toBe(false)
  })

  it("accepts valid signed sessions and rejects tampered or expired sessions", () => {
    const now = Date.UTC(2026, 7, 2)
    const token = createSession("admin@example.com", "session-secret", now)

    expect(verifySession(token, "session-secret", now)).toMatchObject({ email: "admin@example.com" })
    expect(verifySession(`${token}tampered`, "session-secret", now)).toBeNull()
    expect(verifySession(token, "session-secret", now + 13 * 60 * 60 * 1000)).toBeNull()
  })

  it("creates unique project tokens, hashes them with a pepper, and builds share URLs", () => {
    const token = createProjectAccessToken()

    expect(token).not.toBe(createProjectAccessToken())
    expect(hashProjectAccessToken(token, "pepper-a")).not.toBe(hashProjectAccessToken(token, "pepper-b"))
    expect(createProjectAccessUrl(token, "https://cowork.example.com")).toBe(
      `https://cowork.example.com/p/${token}`,
    )
  })
})
