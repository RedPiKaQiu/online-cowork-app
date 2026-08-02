import "server-only"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import type { NextRequest } from "next/server"

import { adminSessionMaxAge, createSession, verifyPassword, verifySession } from "@/lib/admin-security"
import { requiredEnv } from "@/lib/runtime-config"

export const adminSessionCookieName = "cowork_admin_session"

type AdminConfig = {
  email: string
  passwordHash: string
  sessionSecret: string
}

export function hasAdminConfiguration() {
  return Boolean(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD_HASH && process.env.SESSION_SECRET)
}

export async function authenticateAdmin(email: string, password: string) {
  const config = getAdminConfig()
  const passwordMatches = await verifyPassword(password, config.passwordHash)
  return passwordMatches && email.trim().toLowerCase() === config.email.toLowerCase()
}

export function createAdminSessionValue() {
  const config = getAdminConfig()
  return createSession(config.email, config.sessionSecret)
}

export function getAdminSessionFromRequest(request: NextRequest) {
  const config = getAdminConfig()
  return verifySession(request.cookies.get(adminSessionCookieName)?.value, config.sessionSecret)
}

export async function requireAdminPage(returnPath = "/admin/projects") {
  const config = getAdminConfig()
  const cookieStore = await cookies()
  const session = verifySession(cookieStore.get(adminSessionCookieName)?.value, config.sessionSecret)
  if (!session) redirect(`/login?next=${encodeURIComponent(safeReturnPath(returnPath))}`)
  return session
}

export function adminSessionCookie(value: string) {
  return {
    name: adminSessionCookieName,
    value,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: adminSessionMaxAge,
  }
}

export function expiredAdminSessionCookie() {
  return { ...adminSessionCookie(""), maxAge: 0 }
}

export function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin")
  if (!origin) return false
  try {
    return new URL(origin).origin === new URL(request.url).origin
  } catch {
    return false
  }
}

export function safeReturnPath(path: string | null | undefined) {
  return path?.startsWith("/admin") && !path.startsWith("//") ? path : "/admin/projects"
}

function getAdminConfig(): AdminConfig {
  const email = requiredEnv("ADMIN_EMAIL")
  const passwordHash = requiredEnv("ADMIN_PASSWORD_HASH")
  const sessionSecret = requiredEnv("SESSION_SECRET")
  return { email, passwordHash, sessionSecret }
}
