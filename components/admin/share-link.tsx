"use client"

import { useState } from "react"

export function ShareLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
  }

  return (
    <div className="rounded-xl border border-primary/30 bg-accent/40 p-3">
      <p className="text-xs font-medium text-primary">新的项目访问链接（仅本次显示）</p>
      <p className="mt-1 break-all text-xs text-muted-foreground">{url}</p>
      <button onClick={copy} className="mt-2 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-medium hover:bg-secondary">{copied ? "已复制" : "复制链接"}</button>
    </div>
  )
}
