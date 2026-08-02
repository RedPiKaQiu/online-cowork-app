"use client"

import { useRef, useState } from "react"
import { Plus } from "lucide-react"
import { type ColumnId } from "@/lib/board-data"
import { cn } from "@/lib/utils"

const TARGETS: { id: ColumnId; label: string }[] = [
  { id: "box", label: "事项盒子" },
  { id: "todo", label: "当前待办" },
]

export function QuickAddBar({ onAdd, pending = false }: { onAdd: (title: string, column: ColumnId) => void; pending?: boolean }) {
  const [value, setValue] = useState("")
  const [target, setTarget] = useState<ColumnId>("box")
  const composingRef = useRef(false)

  function submit() {
    const trimmed = value.trim()
    if (!trimmed) return
    onAdd(trimmed, target)
    if (!pending) setValue("")
  }

  return (
    <div className="border-t border-border bg-card/80 backdrop-blur">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
        className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3"
      >
        <div className="flex shrink-0 items-center rounded-xl bg-secondary p-0.5">
          {TARGETS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTarget(t.id)} disabled={pending}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition",
                target === t.id
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onCompositionStart={() => (composingRef.current = true)}
          onCompositionEnd={() => (composingRef.current = false)}
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              !composingRef.current &&
              (e.nativeEvent as any).keyCode !== 229
            ) {
              e.preventDefault()
              submit()
            }
          }}
          placeholder="快速添加一个事项，回车即可创建…"
          className="h-10 flex-1 rounded-xl border border-border bg-background px-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
          aria-label="新事项标题"
        />

        <button
          type="submit"
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          disabled={!value.trim() || pending}
        >
          <Plus className="size-4" />
          {pending ? "添加中…" : "添加"}
        </button>
      </form>
    </div>
  )
}
