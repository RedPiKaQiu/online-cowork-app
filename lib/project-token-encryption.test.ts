import { afterEach, describe, expect, it } from "vitest"

import {
  decryptProjectAccessToken,
  encryptProjectAccessToken,
  getProjectTokenEncryptionKey,
} from "./project-token-encryption"

const key = Buffer.alloc(32, 7).toString("base64")
const otherKey = Buffer.alloc(32, 9).toString("base64")

afterEach(() => {
  delete process.env.PROJECT_TOKEN_ENCRYPTION_KEY
})

describe("project token encryption", () => {
  it("round-trips a token with a randomized versioned payload", () => {
    const first = encryptProjectAccessToken("project-token", key)
    const second = encryptProjectAccessToken("project-token", key)

    expect(first).toMatch(/^v1\.[^.]+\.[^.]+\.[^.]+$/)
    expect(first).not.toBe(second)
    expect(decryptProjectAccessToken(first, key)).toBe("project-token")
  })

  it("rejects a wrong key and tampered ciphertext", () => {
    const encrypted = encryptProjectAccessToken("project-token", key)
    const parts = encrypted.split(".")
    parts[3] = `${parts[3].startsWith("A") ? "B" : "A"}${parts[3].slice(1)}`

    expect(() => decryptProjectAccessToken(encrypted, otherKey)).toThrow("could not be decrypted")
    expect(() => decryptProjectAccessToken(parts.join("."), key)).toThrow("could not be decrypted")
  })

  it("rejects missing and malformed key configuration", () => {
    expect(() => getProjectTokenEncryptionKey()).toThrow("PROJECT_TOKEN_ENCRYPTION_KEY is required")
    expect(() => encryptProjectAccessToken("project-token", "not-base64")).toThrow("base64-encoded 32-byte key")
    expect(() => encryptProjectAccessToken("project-token", Buffer.alloc(31).toString("base64"))).toThrow("base64-encoded 32-byte key")
  })

  it("reads a valid key from the environment", () => {
    process.env.PROJECT_TOKEN_ENCRYPTION_KEY = key
    expect(getProjectTokenEncryptionKey()).toBe(key)
  })
})
