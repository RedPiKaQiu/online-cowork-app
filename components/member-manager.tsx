"use client"

import { useEffect, useRef, useState } from "react"
import { Trash2, UserPlus, X } from "lucide-react"
import type { Member } from "@/lib/board-data"

type MemberManagerProps = {
  open: boolean
  members: Member[]
  onClose: () => void
  onAdd: (name: string) => void
  onRemove: (id: string) => void
  pending?: boolean
}

export function MemberManager({ open, members, onClose, onAdd, onRemove, pending = false }: MemberManagerProps) {
  const [name, setName] = useState("")
  const composingRef = useRef(false)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    if (open) window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open) return null

  function submit() {
    const trimmed = name.trim()
    if (!trimmed) return
    onAdd(trimmed)
    setName("")
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="管理成员"
        className="relative w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">项目成员</h2>
            <p className="text-xs text-muted-foreground">添加或移除参与协作的成员</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="grid size-7 place-items-center rounded-lg text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
          className="mb-4 flex items-center gap-2"
        >
          <input
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
            placeholder="输入成员姓名…"
            className="h-10 flex-1 rounded-xl border border-border bg-background px-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
            aria-label="新成员姓名"
          />
          <button
            type="submit"
            disabled={!name.trim() || pending}
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            <UserPlus className="size-4" />
            {pending ? "处理中…" : "添加"}
          </button>
        </form>

        <ul className="flex max-h-72 flex-col gap-1.5 overflow-y-auto">
          {members.length === 0 && (
            <li className="rounded-xl border border-dashed border-border/70 p-4 text-center text-xs text-muted-foreground">
              还没有成员，先添加一位吧
            </li>
          )}
          {members.map((m) => (
            <li
              key={m.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2"
            >
              <span
                className="grid size-8 shrink-0 place-items-center rounded-full text-xs font-medium"
                style={{ backgroundColor: m.color, color: m.fg }}
                aria-hidden
              >
                {m.name.slice(0, 1)}
              </span>
              <span className="flex-1 truncate text-sm text-foreground">{m.name}</span>
              <button
                type="button"
                onClick={() => onRemove(m.id)} disabled={pending}
                aria-label={`移除 ${m.name}`}
                className="grid size-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
