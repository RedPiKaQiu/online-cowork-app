import { NextRequest, NextResponse } from "next/server"

import { isSameOrigin } from "@/lib/admin-auth"
import { ProjectLinkNotFoundError } from "@/lib/project-snapshots"

const MAX_JSON_BYTES = 64 * 1024

export class ProjectMutationError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 403 | 404 | 409,
  ) {
    super(message)
  }
}

export function requireProjectWriteOrigin(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "请求来源无效。" }, { status: 403 })
  }
  return null
}

export async function readProjectJson(request: Request) {
  const contentLength = Number(request.headers.get("content-length"))
  if (Number.isFinite(contentLength) && contentLength > MAX_JSON_BYTES) {
    return { response: NextResponse.json({ error: "请求数据过大。" }, { status: 413 }) }
  }

  try {
    const text = await request.text()
    if (Buffer.byteLength(text, "utf8") > MAX_JSON_BYTES) {
      return { response: NextResponse.json({ error: "请求数据过大。" }, { status: 413 }) }
    }
    const value: unknown = JSON.parse(text)
    if (!value || Array.isArray(value) || typeof value !== "object") {
      throw new Error("invalid body")
    }
    return { value: value as Record<string, unknown> }
  } catch {
    return { response: NextResponse.json({ error: "请求数据格式无效。" }, { status: 400 }) }
  }
}

export function projectMutationErrorResponse(error: unknown) {
  if (error instanceof ProjectLinkNotFoundError) {
    return NextResponse.json({ error: "项目不存在或链接已失效。" }, { status: 404 })
  }
  if (error instanceof ProjectMutationError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  return NextResponse.json({ error: "项目写入失败。" }, { status: 500 })
}

export function asExpectedVersion(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : null
}
