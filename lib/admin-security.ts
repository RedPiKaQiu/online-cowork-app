import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto"
const PASSWORD_PREFIX = "scrypt"
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12
const PASSWORD_SEPARATOR = ":"

export type PasswordHashOptions = {
  salt?: Buffer
  cost?: number
  blockSize?: number
  parallelization?: number
}

export type AdminSession = {
  email: string
  expiresAt: number
}

export async function hashPassword(password: string, options: PasswordHashOptions = {}) {
  const cost = options.cost ?? 16_384
  const blockSize = options.blockSize ?? 8
  const parallelization = options.parallelization ?? 1
  const salt = options.salt ?? randomBytes(16)
  const derivedKey = await new Promise<Buffer>((resolve, reject) => {
    scryptCallback(
      password,
      salt,
      64,
      {
        N: cost,
        r: blockSize,
        p: parallelization,
        maxmem: 128 * cost * blockSize + 1024 * 1024,
      },
      (error, key) => (error ? reject(error) : resolve(key)),
    )
  })

  return [
    PASSWORD_PREFIX,
    cost,
    blockSize,
    parallelization,
    salt.toString("base64url"),
    derivedKey.toString("base64url"),
  ].join(PASSWORD_SEPARATOR)
}

export async function verifyPassword(password: string, encodedHash: string) {
  // `$` is interpreted as a variable reference by Next.js environment loading.
  // Accept it for existing deployments, but generate colon-separated hashes.
  const separator = encodedHash.includes(PASSWORD_SEPARATOR) ? PASSWORD_SEPARATOR : "$"
  const [prefix, cost, blockSize, parallelization, salt, expected] = encodedHash.split(separator)
  if (
    prefix !== PASSWORD_PREFIX ||
    !cost ||
    !blockSize ||
    !parallelization ||
    !salt ||
    !expected
  ) {
    return false
  }

  const expectedKey = Buffer.from(expected, "base64url")
  const actualHash = await hashPassword(password, {
    cost: Number(cost),
    blockSize: Number(blockSize),
    parallelization: Number(parallelization),
    salt: Buffer.from(salt, "base64url"),
  })
  const actualKey = Buffer.from(actualHash.split(PASSWORD_SEPARATOR).at(-1) ?? "", "base64url")

  return expectedKey.length === actualKey.length && timingSafeEqual(expectedKey, actualKey)
}

export function createSession(email: string, sessionSecret: string, now = Date.now()) {
  const payload = Buffer.from(
    JSON.stringify({ email, exp: Math.floor(now / 1000) + SESSION_MAX_AGE_SECONDS }),
  ).toString("base64url")
  const signature = sign(payload, sessionSecret)
  return `${payload}.${signature}`
}

export function verifySession(token: string | undefined, sessionSecret: string, now = Date.now()): AdminSession | null {
  if (!token) return null
  const [payload, signature, extra] = token.split(".")
  if (!payload || !signature || extra || !safeEqual(signature, sign(payload, sessionSecret))) return null

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      email?: unknown
      exp?: unknown
    }
    if (typeof parsed.email !== "string" || typeof parsed.exp !== "number" || parsed.exp <= now / 1000) return null
    return { email: parsed.email, expiresAt: parsed.exp }
  } catch {
    return null
  }
}

function sign(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("base64url")
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
}

export const adminSessionMaxAge = SESSION_MAX_AGE_SECONDS
