import { Link2Off } from "lucide-react"

export function ProjectUnavailable() {
  return (
    <main className="grid min-h-dvh place-items-center bg-background p-6 text-center">
      <div className="max-w-sm rounded-2xl border border-border bg-card p-8 shadow-sm">
        <Link2Off className="mx-auto size-10 text-muted-foreground" aria-hidden />
        <h1 className="mt-4 text-xl font-semibold">项目不存在或链接已失效</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">请向项目管理员索取最新的访问链接。</p>
      </div>
    </main>
  )
}
