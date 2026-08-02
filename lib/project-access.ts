import { createHash, randomBytes } from "node:crypto"

export function createProjectAccessToken() {
  return randomBytes(32).toString("base64url")
}

export function hashProjectAccessToken(token: string, pepper: string) {
  return createHash("sha256").update(`${token}:${pepper}`).digest("hex")
}

export function createProjectAccessUrl(token: string, appUrl: string) {
  return new URL(`/p/${token}`, appUrl).toString()
}
