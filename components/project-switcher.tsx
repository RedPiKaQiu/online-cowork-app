"use client"

import { useRef, useState } from "react"
import { Check, ChevronDown, Plus } from "lucide-react"
import type { Project } from "@/lib/board-data"
import { cn } from "@/lib/utils"

type ProjectSwitcherProps = {
  projects: Project[]
  activeId: string
  onSwitch: (id: string) => void
  onCreate: (name: string) => void
}

export function ProjectSwitcher({ projects, activeId, onSwitch, onCreate }: ProjectSwitcherProps) {
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState("")
  const composingRef = useRef(false)

  const active = projects.find((p) => p.id === activeId)

  function close() {
    setOpen(false)
    setCreating(false)
    setName("")
  }

  function submit() {
    const trimmed = name.trim()
    if (!trimmed) return
    onCreate(trimmed)
    close()
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-xl px-2 py-1 text-left transition hover:bg-secondary"
      >
        <h1 className="max-w-[16rem] truncate text-base font-semibold leading-tight text-foreground">
          {active?.name ?? "未选择项目"}
        </h1>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={close} aria-hidden />
          <div className="absolute left-0 z-20 mt-1 w-64 overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-lg">
            <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">切换项目</p>
            <ul className="max-h-64 overflow-y-auto">
              {projects.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSwitch(p.id)
                      close()
                    }}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left text-sm transition hover:bg-accent",
                      p.id === activeId && "bg-accent",
                    )}
                  >
                    <span className="truncate">{p.name}</span>
                    {p.id === activeId && <Check className="size-4 shrink-0 text-primary" />}
                  </button>
                </li>
              ))}
            </ul>

            <div className="mt-1 border-t border-border pt-1">
              {creating ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    submit()
                  }}
                  className="flex items-center gap-1.5 p-1"
                >
                  <input
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onCompositionStart={() => (composingRef.current = true)}
                    onCompositionEnd={() => (composingRef.current = false)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !composingRef.current && (e.nativeEvent as any).keyCode !== 229) {
                        e.preventDefault()
                        submit()
                      }
                    }}
                    placeholder="新项目名称…"
                    className="h-8 flex-1 rounded-lg border border-border bg-background px-2 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                    aria-label="新项目名称"
                  />
                  <button
                    type="submit"
                    disabled={!name.trim()}
                    className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
                    aria-label="创建项目"
                  >
                    <Check className="size-4" />
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setCreating(true)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-primary transition hover:bg-accent"
                >
                  <Plus className="size-4" />
                  新建项目
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
