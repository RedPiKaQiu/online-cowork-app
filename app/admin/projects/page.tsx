import { LogoutButton } from "@/components/admin/logout-button"
import { ProjectList } from "@/components/admin/project-list"
import { requireAdminPage } from "@/lib/admin-auth"
import { listActiveProjects } from "@/lib/admin-projects"

export default async function AdminProjectsPage() {
  await requireAdminPage("/admin/projects")
  const projects = await listActiveProjects()

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <header className="mb-8 flex items-center justify-between gap-4"><div><p className="text-xs font-medium text-primary">ONLINE-COWORK</p><h1 className="mt-1 text-2xl font-semibold">项目管理</h1></div><LogoutButton /></header>
      <ProjectList initialProjects={projects.map((project) => ({ ...project, updatedAt: project.updatedAt.toISOString() }))} />
    </main>
  )
}
