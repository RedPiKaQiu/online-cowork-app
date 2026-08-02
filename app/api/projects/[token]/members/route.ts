import { NextRequest, NextResponse } from "next/server"

import { projectMutationErrorResponse, readProjectJson, requireProjectWriteOrigin } from "@/lib/project-api"
import { createMemberByToken } from "@/lib/project-mutations"

type RouteContext = { params: Promise<{ token: string }> }

export async function POST(request: NextRequest, { params }: RouteContext) {
  const originError = requireProjectWriteOrigin(request)
  if (originError) return originError
  const body = await readProjectJson(request)
  if (body.response) return body.response
  try {
    const member = await createMemberByToken((await params).token, body.value)
    return NextResponse.json({ member }, { status: 201 })
  } catch (error) {
    return projectMutationErrorResponse(error)
  }
}
