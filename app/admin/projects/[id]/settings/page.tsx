import { notFound } from "next/navigation"

import { LogoutButton } from "@/components/admin/logout-button"
import { ProjectSettings } from "@/components/admin/project-settings"
import { requireAdminPage } from "@/lib/admin-auth"
import { findAdminProject } from "@/lib/admin-projects"

type PageProps = { params: Promise<{ id: string }> }

export default async function ProjectSettingsPage({ params }: PageProps) {
  await requireAdminPage("/admin/projects")
  const project = await findAdminProject((await params).id)
  if (!project) notFound()
  return <><div className="absolute right-4 top-4"><LogoutButton /></div><ProjectSettings initialProject={project} /></>
}
