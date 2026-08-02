import { BoardClient } from "@/components/board-client"
import { ProjectUnavailable } from "@/components/project-unavailable"
import type { ProjectSnapshot } from "@/lib/project-snapshot"
import { ProjectLinkNotFoundError, getProjectSnapshot } from "@/lib/project-snapshots"

type PageProps = { params: Promise<{ token: string }> }

export default async function ProjectBoardPage({ params }: PageProps) {
  let snapshot: ProjectSnapshot
  try {
    snapshot = await getProjectSnapshot((await params).token)
  } catch (error) {
    if (error instanceof ProjectLinkNotFoundError) return <ProjectUnavailable />
    throw error
  }
  return <BoardClient snapshot={snapshot} />
}
