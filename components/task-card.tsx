"use client"

import { useState } from "react"
import { ArrowRight, Check, GripVertical, Pencil, RotateCcw, Trash2, UserPlus } from "lucide-react"
import { type ColumnId, type Member, type Task, getMember } from "@/lib/board-data"
import { cn } from "@/lib/utils"

type TaskCardProps = {
  task: Task
  column: ColumnId
  members: Member[]
  isDragging: boolean
  isDropTarget: boolean
  onDragStart: () => void
  onDragEnd: () => void
  onDragOverCard: () => void
  onMoveToTodo: () => void
  onComplete: () => void
  onUncomplete: () => void
  onAssign: (memberId: string | null) => void
  onEdit: () => void
  onDelete: () => void
  pending?: boolean
}

export function TaskCard({
  task,
  column,
  members,
  isDragging,
  isDropTarget,
  onDragStart,
  onDragEnd,
  onDragOverCard,
  onMoveToTodo,
  onComplete,
  onUncomplete,
  onAssign,
  onEdit,
  onDelete,
  pending = false,
}: TaskCardProps) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const member = getMember(members, task.assigneeId)

  return (
    <li
      draggable={!pending}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onDragOverCard()
      }}
      className={cn(
        "group relative rounded-xl border border-border bg-card p-3 shadow-sm transition",
        "hover:border-primary/40 hover:shadow-md",
        isDragging && "opacity-40",
        isDropTarget && "ring-2 ring-primary ring-offset-2 ring-offset-background",
      )}
    >
      {/* assignee color strip */}
      {member && (
        <span
          aria-hidden
          className="absolute left-0 top-2 bottom-2 w-1 rounded-full"
          style={{ backgroundColor: member.color }}
        />
      )}

      <div className="flex items-start gap-2 pl-1.5">
        <button
          type="button"
          aria-label="拖动排序"
          className="mt-0.5 cursor-grab text-muted-foreground/50 transition group-hover:text-muted-foreground active:cursor-grabbing"
        >
          <GripVertical className="size-4" />
        </button>

        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-sm font-medium leading-relaxed text-card-foreground text-pretty",
              column === "done" && "text-muted-foreground line-through",
            )}
          >
            {task.title}
          </p>
          {task.description && (
            <p
              className={cn(
                "mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground text-pretty",
                column === "done" && "line-through",
              )}
            >
              {task.description}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onEdit}
          aria-label="编辑事项"
          className="shrink-0 rounded-lg p-1 text-muted-foreground/50 opacity-0 transition hover:bg-secondary hover:text-primary group-hover:opacity-100 focus:opacity-100"
        >
          <Pencil className="size-3.5" />
        </button>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 pl-1.5">
        {/* assignee display */}
        <div className="min-h-6">
          {member ? (
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
              style={{ backgroundColor: member.color, color: member.fg }}
            >
              <span
                className="grid size-4 place-items-center rounded-full bg-black/15 text-[10px]"
                aria-hidden
              >
                {member.name.slice(0, 1)}
              </span>
              {member.name}
            </span>
          ) : column !== "box" ? (
            <span className="text-xs text-muted-foreground">未分配</span>
          ) : null}
        </div>

        {/* actions */}
        <div className="flex items-center gap-1">
          {column === "box" && (
            <button
              type="button"
              onClick={onMoveToTodo}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground transition hover:border-primary/40 hover:text-primary"
            >
              移到待办
              <ArrowRight className="size-3.5" />
            </button>
          )}

          {column === "todo" && (
            <>
              <div className="relative">
                <button
                  type="button"
                  aria-label="分配成员"
                  onClick={() => setPickerOpen((v) => !v)}
                  className="inline-flex size-7 items-center justify-center rounded-lg border border-border bg-secondary text-secondary-foreground transition hover:border-primary/40 hover:text-primary"
                >
                  <UserPlus className="size-4" />
                </button>
                {pickerOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setPickerOpen(false)} aria-hidden />
                    <div className="absolute right-0 z-20 mt-1 max-h-56 w-36 overflow-y-auto rounded-xl border border-border bg-popover p-1 shadow-lg">
                      {members.length === 0 && (
                        <p className="px-2 py-2 text-xs text-muted-foreground">暂无成员</p>
                      )}
                      {members.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            onAssign(m.id)
                            setPickerOpen(false)
                          }}
                          className={cn(
                            "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition hover:bg-accent",
                            task.assigneeId === m.id && "bg-accent",
                          )}
                        >
                          <span className="size-3 rounded-full" style={{ backgroundColor: m.color }} aria-hidden />
                          {m.name}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          onAssign(null)
                          setPickerOpen(false)
                        }}
                        className="mt-0.5 flex w-full items-center gap-2 rounded-lg border-t border-border px-2 py-1.5 text-left text-xs text-muted-foreground transition hover:bg-accent"
                      >
                        取消分配
                      </button>
                    </div>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={onComplete}
                className="inline-flex items-center gap-1 rounded-lg bg-primary px-2 py-1 text-xs font-medium text-primary-foreground transition hover:opacity-90"
              >
                <Check className="size-3.5" />
                完成
              </button>
            </>
          )}

          {column === "done" && (
            <button
              type="button"
              onClick={onUncomplete}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground transition hover:border-primary/40 hover:text-primary"
            >
              <RotateCcw className="size-3.5" />
              取消完成
            </button>
          )}
          <button type="button" onClick={onDelete} disabled={pending} aria-label="删除事项" className="inline-flex size-7 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:opacity-50">
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>
    </li>
  )
}
