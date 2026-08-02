import { NextRequest, NextResponse } from "next/server"

import { asExpectedVersion, projectMutationErrorResponse, readProjectJson, requireProjectWriteOrigin } from "@/lib/project-api"
import { updateProjectByToken } from "@/lib/project-mutations"
import { ProjectLinkNotFoundError, getProjectSnapshot } from "@/lib/project-snapshots"

type RouteContext = { params: Promise<{ token: string }> }

export async function GET(_: Request, { params }: RouteContext) {
  try {
    return NextResponse.json(await getProjectSnapshot((await params).token))
  } catch (error) {
    if (error instanceof ProjectLinkNotFoundError) {
      return NextResponse.json({ error: "项目不存在或链接已失效。" }, { status: 404 })
    }
    return NextResponse.json({ error: "项目读取失败。" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const originError = requireProjectWriteOrigin(request)
  if (originError) return originError
  const body = await readProjectJson(request)
  if (body.response) return body.response
  const expectedVersion = asExpectedVersion(body.value.expectedVersion)
  if (!expectedVersion) return NextResponse.json({ error: "项目版本无效。" }, { status: 400 })

  try {
    const project = await updateProjectByToken((await params).token, body.value, expectedVersion)
    return NextResponse.json({ project })
  } catch (error) {
    return projectMutationErrorResponse(error)
  }
}
