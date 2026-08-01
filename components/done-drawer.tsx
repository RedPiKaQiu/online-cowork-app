"use client"

import { useEffect } from "react"
import { CheckCircle2, X } from "lucide-react"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

type DoneDrawerProps = {
  open: boolean
  count: number
  onClose: () => void
  children: ReactNode
  empty: ReactNode
}

export function DoneDrawer({ open, count, onClose, children, empty }: DoneDrawerProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    if (open) window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  return (
    <>
      {/* overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm transition-opacity duration-300",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
        aria-hidden
      />

      {/* panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="已完成事项"
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l border-border bg-card shadow-2xl transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <header className="flex items-center gap-2 border-b border-border px-4 py-4">
          <span
            className="grid size-8 place-items-center rounded-lg text-background"
            style={{ backgroundColor: "oklch(0.6 0.14 150)" }}
          >
            <CheckCircle2 className="size-4" />
          </span>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-foreground">已完成事项</h2>
            <p className="text-xs text-muted-foreground">已交付 / 已解决</p>
          </div>
          <span className="grid size-6 place-items-center rounded-full bg-secondary text-xs font-semibold text-muted-foreground tabular-nums">
            {count}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="收起已完成事项"
            className="ml-1 grid size-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-3">
          {count === 0 ? empty : <ul className="flex flex-col gap-2.5">{children}</ul>}
        </div>
      </aside>
    </>
  )
}
