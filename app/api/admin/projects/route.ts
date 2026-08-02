import { NextRequest, NextResponse } from "next/server"

import { readJson, projectErrorResponse, requireAdminApi } from "@/lib/admin-api"
import { createAdminProject, listActiveProjects } from "@/lib/admin-projects"

export async function GET(request: NextRequest) {
  const authorization = requireAdminApi(request)
  if (authorization.response) return authorization.response
  return NextResponse.json({ projects: await listActiveProjects() })
}

export async function POST(request: NextRequest) {
  const authorization = requireAdminApi(request, { write: true })
  if (authorization.response) return authorization.response
  const body = await readJson(request)
  if (body.response) return body.response

  try {
    const result = await createAdminProject({
      name: typeof body.value.name === "string" ? body.value.name : "",
      description: typeof body.value.description === "string" ? body.value.description : "",
    })
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    return projectErrorResponse(error)
  }
}
