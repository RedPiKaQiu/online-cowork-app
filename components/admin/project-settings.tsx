"use client"

import Link from "next/link"
import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"

import { ShareLink } from "@/components/admin/share-link"

type EditableProject = {
  id: string
  name: string
  description: string
  version: number
}

export function ProjectSettings({ initialProject }: { initialProject: EditableProject }) {
  const router = useRouter()
  const [project, setProject] = useState(initialProject)
  const [name, setName] = useState(initialProject.name)
  const [description, setDescription] = useState(initialProject.description)
  const [error, setError] = useState("")
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError("")
    const response = await fetch(`/api/admin/projects/${project.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, description, expectedVersion: project.version }) })
    const body = await response.json().catch(() => ({}))
    setSaving(false)
    if (!response.ok) {
      setError(typeof body.error === "string" ? body.error : "保存失败。")
      return
    }
    setProject(body.project)
    setName(body.project.name)
    setDescription(body.project.description)
    router.refresh()
  }

  async function resetLink() {
    if (!window.confirm("重置后，旧链接将立即失效。确定继续吗？")) return
    setError("")
    const response = await fetch(`/api/admin/projects/${project.id}/reset-link`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ expectedVersion: project.version }) })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) {
      setError(typeof body.error === "string" ? body.error : "重置链接失败。")
      return
    }
    setProject(body.project)
    setShareUrl(body.accessUrl)
    router.refresh()
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <Link href="/admin/projects" className="text-sm text-primary hover:underline">← 返回项目列表</Link>
      <div className="mt-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-semibold">项目设置</h1>
        <form onSubmit={save} className="mt-5 space-y-4">
          <label className="block text-sm font-medium">项目名称<input value={name} onChange={(event) => setName(event.target.value)} required maxLength={120} className="mt-1.5 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary" /></label>
          <label className="block text-sm font-medium">项目说明<textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={10_000} rows={5} className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" /></label>
          <button disabled={saving} className="h-10 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50">{saving ? "保存中…" : "保存更改"}</button>
        </form>
        <div className="mt-8 border-t border-border pt-5"><h2 className="font-semibold">访问链接</h2><p className="mt-1 text-sm text-muted-foreground">重置链接会让旧链接立即失效。</p><button onClick={resetLink} className="mt-3 rounded-xl border border-border px-3 py-2 text-sm hover:bg-secondary">重置访问链接</button>{shareUrl && <div className="mt-4"><ShareLink url={shareUrl} /></div>}</div>
        {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
      </div>
    </main>
  )
}
