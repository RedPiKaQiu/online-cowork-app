"use client"

import { useEffect, useRef, useState } from "react"
import { X } from "lucide-react"
import type { Task } from "@/lib/board-data"

type TaskEditDialogProps = {
  task: Task | null
  onClose: () => void
  onSave: (patch: { title: string; description: string }) => void
  pending?: boolean
}

type TaskEditDialogContentProps = Omit<TaskEditDialogProps, "task"> & {
  task: Task
}

export function TaskEditDialog({ task, onClose, onSave }: TaskEditDialogProps) {
  if (!task) return null

  return <TaskEditDialogContent key={task.id} task={task} onClose={onClose} onSave={onSave} />
}

function TaskEditDialogContent({ task, onClose, onSave, pending }: TaskEditDialogContentProps) {
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description)
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    requestAnimationFrame(() => titleRef.current?.focus())
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  function submit() {
    const trimmed = title.trim()
    if (!trimmed) return
    onSave({ title: trimmed, description: description.trim() })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-foreground/30 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="编辑事项"
        className="relative w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">编辑事项</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="grid size-7 place-items-center rounded-lg text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <label className="mb-1 block text-xs font-medium text-muted-foreground">标题</label>
        <input
          ref={titleRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="事项标题"
          className="mb-4 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
        />

        <label className="mb-1 block text-xs font-medium text-muted-foreground">内容说明</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="补充这条事项的背景、目标或验收标准…"
          rows={4}
          className="mb-5 w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm leading-relaxed outline-none transition placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
        />

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition hover:border-primary/40"
          >
            取消
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!title.trim() || pending}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "保存中…" : "保存"}
          </button>
        </div>
      </div>
    </div>
  )
}
