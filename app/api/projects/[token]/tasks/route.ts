import { NextRequest, NextResponse } from "next/server"

import { projectMutationErrorResponse, readProjectJson, requireProjectWriteOrigin } from "@/lib/project-api"
import { createTaskByToken } from "@/lib/project-mutations"

type RouteContext = { params: Promise<{ token: string }> }

export async function POST(request: NextRequest, { params }: RouteContext) {
  const originError = requireProjectWriteOrigin(request)
  if (originError) return originError
  const body = await readProjectJson(request)
  if (body.response) return body.response
  try {
    const task = await createTaskByToken((await params).token, body.value)
    return NextResponse.json({ task }, { status: 201 })
  } catch (error) {
    return projectMutationErrorResponse(error)
  }
}
