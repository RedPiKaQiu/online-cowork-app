import { NextRequest, NextResponse } from "next/server"

import { asExpectedVersion, projectErrorResponse, readJson, requireAdminApi } from "@/lib/admin-api"
import { resetAdminProjectAccessLink } from "@/lib/admin-projects"
import { auditAdminProjectAction } from "@/lib/audit-log"

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: RouteContext) {
  const authorization = requireAdminApi(request, { write: true })
  if (authorization.response) return authorization.response
  const body = await readJson(request)
  if (body.response) return body.response
  const expectedVersion = asExpectedVersion(body.value.expectedVersion)
  if (!expectedVersion) return NextResponse.json({ error: "项目版本无效。" }, { status: 400 })

  try {
    const result = await resetAdminProjectAccessLink((await params).id, expectedVersion)
    auditAdminProjectAction("project_link_reset", result.project.id, authorization.session!.email)
    return NextResponse.json(result)
  } catch (error) {
    return projectErrorResponse(error)
  }
}
