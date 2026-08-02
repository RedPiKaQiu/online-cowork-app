import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

import { getAdminSessionFromRequest, isSameOrigin } from "@/lib/admin-auth"

export function requireAdminApi(request: NextRequest, options: { write?: boolean } = {}) {
  if (options.write && !isSameOrigin(request)) {
    return { response: NextResponse.json({ error: "请求来源无效。" }, { status: 403 }) }
  }

  try {
    const session = getAdminSessionFromRequest(request)
    if (!session) return { response: NextResponse.json({ error: "未授权。" }, { status: 401 }) }
    return { session }
  } catch {
    return { response: NextResponse.json({ error: "管理员认证尚未配置。" }, { status: 503 }) }
  }
}

export async function readJson(request: NextRequest) {
  try {
    return { value: await request.json() as Record<string, unknown> }
  } catch {
    return { response: NextResponse.json({ error: "请求数据格式无效。" }, { status: 400 }) }
  }
}

export function projectErrorResponse(error: unknown) {
  if (error instanceof Error && "status" in error && typeof error.status === "number") {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  return NextResponse.json({ error: "请求处理失败。" }, { status: 500 })
}

export function asExpectedVersion(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : null
}
