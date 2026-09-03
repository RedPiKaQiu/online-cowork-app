import { beforeEach, describe, expect, it, vi } from "vitest"

const { mockDb } = vi.hoisted(() => ({
  mockDb: { select: vi.fn(), insert: vi.fn(), update: vi.fn() },
}))

vi.mock("server-only", () => ({}))
vi.mock("@/lib/db", () => ({ db: mockDb }))

import { createAdminProject, listActiveProjects, resetAdminProjectAccessLink } from "./admin-projects"
import { hashProjectAccessToken } from "./project-access"
import { decryptProjectAccessToken, encryptProjectAccessToken } from "./project-token-encryption"

const encryptionKey = Buffer.alloc(32, 7).toString("base64")
const baseProject = {
  id: "project-1",
  name: "项目一",
  description: "",
  version: 1,
  createdAt: new Date("2026-08-01T00:00:00.000Z"),
  updatedAt: new Date("2026-08-01T00:00:00.000Z"),
}

function projectQuery<T>(rows: T[]) {
  return { from: () => ({ where: () => Promise.resolve(rows) }) }
}

function projectListQuery<T>(rows: T[]) {
  return { from: () => ({ where: () => ({ orderBy: () => Promise.resolve(rows) }) }) }
}

describe("administrator project links", () => {
  beforeEach(() => {
    mockDb.select.mockReset()
    mockDb.insert.mockReset()
    mockDb.update.mockReset()
    process.env.APP_URL = "https://cowork.example.com"
    process.env.PROJECT_TOKEN_PEPPER = "test-pepper"
    process.env.PROJECT_TOKEN_ENCRYPTION_KEY = encryptionKey
  })

  it("restores available URLs in the list and preserves null for legacy projects", async () => {
    const ciphertext = encryptProjectAccessToken("a".repeat(43), encryptionKey)
    mockDb.select.mockReturnValueOnce(projectListQuery([
      { ...baseProject, accessTokenCiphertext: ciphertext },
      { ...baseProject, id: "legacy", accessTokenCiphertext: null },
    ]))

    await expect(listActiveProjects()).resolves.toEqual([
      { ...baseProject, accessUrl: `https://cowork.example.com/p/${"a".repeat(43)}` },
      { ...baseProject, id: "legacy", accessUrl: null },
    ])
  })

  it("stores matching hash and encrypted token when creating a project", async () => {
    let inserted: Record<string, unknown> = {}
    mockDb.insert.mockReturnValue({
      values: (values: Record<string, unknown>) => {
        inserted = values
        return { returning: () => Promise.resolve([baseProject]) }
      },
    })

    const result = await createAdminProject({ name: "项目一" })
    const token = decryptProjectAccessToken(String(inserted.accessTokenCiphertext), encryptionKey)

    expect(inserted).not.toHaveProperty("accessToken")
    expect(inserted.accessTokenHash).toBe(hashProjectAccessToken(token, "test-pepper"))
    expect(result.accessUrl).toBe(`https://cowork.example.com/p/${token}`)
  })

  it("atomically replaces hash and ciphertext when resetting a link", async () => {
    const oldToken = "o".repeat(43)
    let updatedValues: Record<string, unknown> = {}
    mockDb.select.mockReturnValueOnce(projectQuery([baseProject]))
    mockDb.update.mockReturnValue({
      set: (values: Record<string, unknown>) => {
        updatedValues = values
        return { where: () => ({ returning: () => Promise.resolve([{ ...baseProject, version: 2 }]) }) }
      },
    })

    const result = await resetAdminProjectAccessLink(baseProject.id, 1)
    const newToken = decryptProjectAccessToken(String(updatedValues.accessTokenCiphertext), encryptionKey)

    expect(updatedValues.accessTokenHash).toBe(hashProjectAccessToken(newToken, "test-pepper"))
    expect(updatedValues.accessTokenHash).not.toBe(hashProjectAccessToken(oldToken, "test-pepper"))
    expect(result.accessUrl).toBe(`https://cowork.example.com/p/${newToken}`)
  })
})
