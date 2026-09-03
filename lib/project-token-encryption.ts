import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto"

const ALGORITHM = "aes-256-gcm"
const VERSION = "v1"
const IV_BYTES = 12

export function encryptProjectAccessToken(token: string, encodedKey = getProjectTokenEncryptionKey()) {
  if (!token) throw new Error("Project access token is required for encryption.")

  const key = decodeEncryptionKey(encodedKey)
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  cipher.setAAD(Buffer.from(VERSION))
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()

  return [VERSION, iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".")
}

export function decryptProjectAccessToken(payload: string, encodedKey = getProjectTokenEncryptionKey()) {
  const [version, encodedIv, encodedTag, encodedCiphertext, extra] = payload.split(".")
  if (version !== VERSION || !encodedIv || !encodedTag || !encodedCiphertext || extra !== undefined) {
    throw new Error("Project access token ciphertext is invalid.")
  }

  try {
    const key = decodeEncryptionKey(encodedKey)
    const iv = Buffer.from(encodedIv, "base64url")
    const tag = Buffer.from(encodedTag, "base64url")
    const ciphertext = Buffer.from(encodedCiphertext, "base64url")
    if (iv.length !== IV_BYTES || tag.length !== 16 || ciphertext.length === 0) throw new Error("invalid payload")

    const decipher = createDecipheriv(ALGORITHM, key, iv)
    decipher.setAAD(Buffer.from(VERSION))
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8")
  } catch {
    throw new Error("Project access token ciphertext could not be decrypted.")
  }
}

export function getProjectTokenEncryptionKey() {
  const key = process.env.PROJECT_TOKEN_ENCRYPTION_KEY
  if (!key) throw new Error("PROJECT_TOKEN_ENCRYPTION_KEY is required for project link recovery.")
  return key
}

function decodeEncryptionKey(encodedKey: string) {
  if (!/^(?:[A-Za-z0-9+/]{4}){10}[A-Za-z0-9+/]{3}=$/.test(encodedKey)) {
    throw new Error("PROJECT_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key.")
  }
  const key = Buffer.from(encodedKey, "base64")
  if (key.length !== 32) throw new Error("PROJECT_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key.")
  return key
}
