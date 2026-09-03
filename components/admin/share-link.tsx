"use client"

import { useState } from "react"

type ClipboardWriter = Pick<Clipboard, "writeText">

export async function copyProjectLink(url: string, clipboard: ClipboardWriter | undefined = globalThis.navigator?.clipboard) {
  if (!clipboard) throw new Error("Clipboard API is unavailable.")
  await clipboard.writeText(url)
}

export function ShareLink({ url }: { url: string }) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle")

  async function copy() {
    try {
      await copyProjectLink(url)
      setCopyState("copied")
    } catch {
      setCopyState("failed")
    }
  }

  return (
    <div className="rounded-xl border border-primary/30 bg-accent/40 p-3">
      <p className="text-xs font-medium text-primary">项目访问链接</p>
      <output aria-label="项目访问链接" className="mt-1 block select-all break-all text-xs text-muted-foreground">{url}</output>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <a href={url} className="rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-medium hover:bg-secondary">打开项目</a>
        <button onClick={copy} className="rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-medium hover:bg-secondary">{copyState === "copied" ? "已复制" : "复制链接"}</button>
        <span role={copyState === "failed" ? "alert" : "status"} aria-live="polite" className="text-xs text-muted-foreground">
          {copyState === "copied" ? "链接已复制到剪贴板。" : copyState === "failed" ? "复制失败，请手动选择上方链接。" : ""}
        </span>
      </div>
    </div>
  )
}
