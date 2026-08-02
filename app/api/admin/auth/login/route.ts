import { NextRequest, NextResponse } from "next/server"

import { adminSessionCookie, authenticateAdmin, createAdminSessionValue, hasAdminConfiguration, isSameOrigin, safeReturnPath } from "@/lib/admin-auth"
import { canAttemptLogin, clearLoginFailures, getClientIdentifier, recordLoginFailure } from "@/lib/admin-rate-limit"

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "请求来源无效。" }, { status: 403 })
  if (!hasAdminConfiguration()) return NextResponse.json({ error: "管理员认证尚未配置。" }, { status: 503 })

  const identifier = getClientIdentifier(request.headers)
  if (!canAttemptLogin(identifier)) {
    return NextResponse.json(
      { error: "登录失败次数过多，请 10 分钟后重试。" },
      { status: 429, headers: { "retry-after": "600" } },
    )
  }

  let body: { email?: unknown; password?: unknown; next?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "账号或密码错误。" }, { status: 401 })
  }

  const email = typeof body.email === "string" ? body.email : ""
  const password = typeof body.password === "string" ? body.password : ""
  const authenticated = await authenticateAdmin(email, password)
  if (!authenticated) {
    recordLoginFailure(identifier)
    return NextResponse.json({ error: "账号或密码错误。" }, { status: 401 })
  }

  clearLoginFailures(identifier)
  const response = NextResponse.json({ ok: true, redirectTo: safeReturnPath(typeof body.next === "string" ? body.next : null) })
  response.cookies.set(adminSessionCookie(createAdminSessionValue()))
  return response
}
