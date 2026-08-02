import { NextRequest, NextResponse } from "next/server"

import { asExpectedVersion, projectMutationErrorResponse, readProjectJson, requireProjectWriteOrigin } from "@/lib/project-api"
import { deleteTaskByToken, updateTaskByToken } from "@/lib/project-mutations"

type RouteContext = { params: Promise<{ token: string; id: string }> }

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const originError = requireProjectWriteOrigin(request)
  if (originError) return originError
  const body = await readProjectJson(request)
  if (body.response) return body.response
  const expectedVersion = asExpectedVersion(body.value.expectedVersion)
  if (!expectedVersion) return NextResponse.json({ error: "任务版本无效。" }, { status: 400 })
  const route = await params
  try {
    const task = await updateTaskByToken(route.token, route.id, body.value, expectedVersion)
    return NextResponse.json({ task })
  } catch (error) {
    return projectMutationErrorResponse(error)
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const originError = requireProjectWriteOrigin(request)
  if (originError) return originError
  const body = await readProjectJson(request)
  if (body.response) return body.response
  const expectedVersion = asExpectedVersion(body.value.expectedVersion)
  if (!expectedVersion) return NextResponse.json({ error: "任务版本无效。" }, { status: 400 })
  const route = await params
  try {
    await deleteTaskByToken(route.token, route.id, expectedVersion)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return projectMutationErrorResponse(error)
  }
}
