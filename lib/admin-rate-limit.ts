type Attempt = { count: number; resetAt: number }

const attempts = new Map<string, Attempt>()
const maxAttempts = 5
const windowMs = 10 * 60 * 1000

export function canAttemptLogin(identifier: string, now = Date.now()) {
  const attempt = attempts.get(identifier)
  return !attempt || attempt.resetAt <= now || attempt.count < maxAttempts
}

export function recordLoginFailure(identifier: string, now = Date.now()) {
  const attempt = attempts.get(identifier)
  if (!attempt || attempt.resetAt <= now) {
    attempts.set(identifier, { count: 1, resetAt: now + windowMs })
    return
  }
  attempt.count += 1
}

export function clearLoginFailures(identifier: string) {
  attempts.delete(identifier)
}

export function getClientIdentifier(headers: Headers) {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  if (forwarded) return `ip:${forwarded}`

  const realIp = headers.get("x-real-ip")?.trim()
  if (realIp) return `ip:${realIp}`

  // Local development requests do not include proxy IP headers. Keep their
  // counters browser-specific instead of rate-limiting every local visitor.
  return `browser:${headers.get("user-agent") ?? "unknown"}`
}
