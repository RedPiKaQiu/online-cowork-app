import { NextRequest, NextResponse } from "next/server"

import { expiredAdminSessionCookie, isSameOrigin } from "@/lib/admin-auth"

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "请求来源无效。" }, { status: 403 })
  const response = NextResponse.json({ ok: true })
  response.cookies.set(expiredAdminSessionCookie())
  return response
}
