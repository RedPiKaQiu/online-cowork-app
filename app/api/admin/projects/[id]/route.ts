import { NextRequest, NextResponse } from "next/server"

import { asExpectedVersion, projectErrorResponse, readJson, requireAdminApi } from "@/lib/admin-api"
import { deleteAdminProject, updateAdminProject } from "@/lib/admin-projects"
import { auditAdminProjectAction } from "@/lib/audit-log"

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const authorization = requireAdminApi(request, { write: true })
  if (authorization.response) return authorization.response
  const body = await readJson(request)
  if (body.response) return body.response
  const expectedVersion = asExpectedVersion(body.value.expectedVersion)
  if (!expectedVersion) return NextResponse.json({ error: "项目版本无效。" }, { status: 400 })

  try {
    const project = await updateAdminProject((await params).id, {
      name: typeof body.value.name === "string" ? body.value.name : "",
      description: typeof body.value.description === "string" ? body.value.description : "",
    }, expectedVersion)
    return NextResponse.json({ project })
  } catch (error) {
    return projectErrorResponse(error)
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const authorization = requireAdminApi(request, { write: true })
  if (authorization.response) return authorization.response
  const body = await readJson(request)
  if (body.response) return body.response
  const expectedVersion = asExpectedVersion(body.value.expectedVersion)
  if (!expectedVersion) return NextResponse.json({ error: "项目版本无效。" }, { status: 400 })

  try {
    const id = (await params).id
    await deleteAdminProject(id, expectedVersion)
    auditAdminProjectAction("project_deleted", id, authorization.session!.email)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return projectErrorResponse(error)
  }
}
