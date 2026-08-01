"use client"

import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

type TaskColumnProps = {
  title: string
  hint: string
  icon: LucideIcon
  count: number
  accent: string
  isActiveDropZone: boolean
  onDragOverColumn: () => void
  onDrop: () => void
  children: ReactNode
  empty: ReactNode
}

export function TaskColumn({
  title,
  hint,
  icon: Icon,
  count,
  accent,
  isActiveDropZone,
  onDragOverColumn,
  onDrop,
  children,
  empty,
}: TaskColumnProps) {
  return (
    <section
      onDragOver={(e) => {
        e.preventDefault()
        onDragOverColumn()
      }}
      onDrop={(e) => {
        e.preventDefault()
        onDrop()
      }}
      className={cn(
        "flex min-h-0 flex-col rounded-2xl border border-border bg-secondary/40 transition",
        isActiveDropZone && "border-primary/50 bg-accent/50",
      )}
    >
      <header className="flex items-center gap-2 border-b border-border/70 px-4 py-3">
        <span
          className="grid size-8 place-items-center rounded-lg text-background"
          style={{ backgroundColor: accent }}
        >
          <Icon className="size-4" />
        </span>
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
        <span className="grid size-6 place-items-center rounded-full bg-background text-xs font-semibold text-muted-foreground tabular-nums">
          {count}
        </span>
      </header>

      <div className="flex-1 overflow-y-auto p-3">
        {count === 0 ? empty : <ul className="flex flex-col gap-2.5">{children}</ul>}
      </div>
    </section>
  )
}
