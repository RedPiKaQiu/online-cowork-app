import { NextRequest, NextResponse } from "next/server"

import { projectMutationErrorResponse, readProjectJson, requireProjectWriteOrigin } from "@/lib/project-api"
import { deleteMemberByToken, updateMemberByToken } from "@/lib/project-mutations"

type RouteContext = { params: Promise<{ token: string; id: string }> }

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const originError = requireProjectWriteOrigin(request)
  if (originError) return originError
  const body = await readProjectJson(request)
  if (body.response) return body.response
  const route = await params
  try {
    const member = await updateMemberByToken(route.token, route.id, body.value)
    return NextResponse.json({ member })
  } catch (error) {
    return projectMutationErrorResponse(error)
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const originError = requireProjectWriteOrigin(request)
  if (originError) return originError
  const route = await params
  try {
    await deleteMemberByToken(route.token, route.id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return projectMutationErrorResponse(error)
  }
}
