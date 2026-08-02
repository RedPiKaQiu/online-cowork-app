"use client"

import Link from "next/link"
import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"

import { ShareLink } from "@/components/admin/share-link"

export type ProjectListItem = {
  id: string
  name: string
  description: string
  version: number
  updatedAt: string
}

export function ProjectList({ initialProjects }: { initialProjects: ProjectListItem[] }) {
  const router = useRouter()
  const [projects, setProjects] = useState(initialProjects)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError("")
    const response = await fetch("/api/admin/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, description }),
    })
    const body = await response.json().catch(() => ({}))
    setSubmitting(false)
    if (!response.ok) {
      setError(typeof body.error === "string" ? body.error : "创建项目失败。")
      return
    }
    const project = { ...body.project, updatedAt: new Date(body.project.updatedAt).toISOString() } as ProjectListItem
    setProjects((current) => [project, ...current])
    setName("")
    setDescription("")
    setShareUrl(body.accessUrl)
  }

  async function deleteProject(project: ProjectListItem) {
    if (window.prompt(`输入“${project.name}”以删除项目`) !== project.name) return
    const response = await fetch(`/api/admin/projects/${project.id}`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ expectedVersion: project.version }),
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) {
      setError(typeof body.error === "string" ? body.error : "删除项目失败。")
      return
    }
    setProjects((current) => current.filter((item) => item.id !== project.id))
    router.refresh()
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="font-semibold">新建项目</h2>
        <form onSubmit={createProject} className="mt-4 space-y-3">
          <input value={name} onChange={(event) => setName(event.target.value)} required maxLength={120} placeholder="项目名称" className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary" />
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={10_000} rows={4} placeholder="项目说明（可选）" className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
          <button disabled={submitting} className="h-10 w-full rounded-xl bg-primary text-sm font-medium text-primary-foreground disabled:opacity-50">{submitting ? "创建中…" : "创建项目"}</button>
        </form>
        {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
        {shareUrl && <div className="mt-4"><ShareLink url={shareUrl} /></div>}
      </section>
      <section>
        <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">活动项目</h2><span className="text-sm text-muted-foreground">{projects.length} 个</span></div>
        <div className="space-y-3">
          {projects.length === 0 && <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">还没有项目，先创建一个吧。</p>}
          {projects.map((project) => (
            <article key={project.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><h3 className="font-semibold">{project.name}</h3><p className="mt-1 text-sm text-muted-foreground">{project.description || "暂无项目说明"}</p><p className="mt-3 text-xs text-muted-foreground">更新于 {new Date(project.updatedAt).toLocaleString("zh-CN")}</p></div>
                <div className="flex gap-2"><Link href={`/admin/projects/${project.id}/settings`} className="rounded-xl border border-border px-3 py-1.5 text-sm hover:bg-secondary">设置</Link><button onClick={() => deleteProject(project)} className="rounded-xl border border-destructive/30 px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10">删除</button></div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
