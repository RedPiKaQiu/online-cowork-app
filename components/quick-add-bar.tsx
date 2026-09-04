"use client"

import { useMemo, useRef, useState } from "react"
import { Check, ChevronDown, Plus, UserRound, Users } from "lucide-react"
import { type ColumnId, type Member, getMember } from "@/lib/board-data"
import { cn } from "@/lib/utils"

const TARGETS: { id: ColumnId; label: string }[] = [
  { id: "box", label: "事项盒子" },
  { id: "todo", label: "当前待办" },
]

export type QuickAddInput = {
  title: string
  status: ColumnId
  assigneeId: string | null
}

type QuickAddBarProps = {
  members: Member[]
  onManageMembers: () => void
  onAdd: (input: QuickAddInput) => Promise<boolean>
  pending?: boolean
}

export function QuickAddBar({ members, onManageMembers, onAdd, pending = false }: QuickAddBarProps) {
  const [value, setValue] = useState("")
  const [target, setTarget] = useState<ColumnId>("box")
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const composingRef = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([])
  const validSelectedAssigneeId = selectedAssigneeId && members.some((member) => member.id === selectedAssigneeId)
    ? selectedAssigneeId
    : null
  const selectedMember = getMember(members, validSelectedAssigneeId)
  const options = useMemo(() => [{ id: null, name: "未分配", color: null }, ...members], [members])
  const busy = pending || submitting

  function openPicker(direction: "selected" | "first" | "last" = "selected") {
    const selectedIndex = options.findIndex((option) => option.id === validSelectedAssigneeId)
    const nextIndex = direction === "first" ? 0 : direction === "last" ? options.length - 1 : Math.max(0, selectedIndex)
    setActiveIndex(nextIndex)
    setPickerOpen(true)
    requestAnimationFrame(() => optionRefs.current[nextIndex]?.focus())
  }

  function closePicker(restoreFocus = true) {
    setPickerOpen(false)
    if (restoreFocus) requestAnimationFrame(() => triggerRef.current?.focus())
  }

  function chooseAssignee(id: string | null) {
    setSelectedAssigneeId(id)
    closePicker()
  }

  async function submit() {
    const trimmed = value.trim()
    if (!trimmed || busy) return
    setSubmitting(true)
    try {
      const success = await onAdd({
        title: trimmed,
        status: target,
        assigneeId: target === "todo" ? validSelectedAssigneeId : null,
      })
      if (success) {
        setValue("")
        requestAnimationFrame(() => inputRef.current?.focus())
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="sticky bottom-0 z-30 shrink-0 border-t border-border bg-card/80 pb-[env(safe-area-inset-bottom)] backdrop-blur md:static md:z-auto md:pb-0">
      <form
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
        className={cn(
          "mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-4 py-3",
          target === "todo"
            ? "md:grid-cols-[auto_auto_minmax(10rem,1fr)_auto]"
            : "md:grid-cols-[auto_minmax(10rem,1fr)_auto]",
        )}
      >
        <div className={cn("flex min-w-0 items-center justify-center rounded-xl bg-secondary p-0.5", target === "box" && "col-span-2 md:col-span-1")}>
          {TARGETS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setTarget(item.id)
                closePicker(false)
              }}
              disabled={busy}
              className={cn(
                "min-w-0 flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition md:flex-none",
                target === item.id
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        {target === "todo" && (
          <div className="relative min-w-0 justify-self-end md:justify-self-stretch">
            <button
              ref={triggerRef}
              type="button"
              aria-label={`负责人：${selectedMember?.name ?? "未分配"}`}
              aria-haspopup="listbox"
              aria-expanded={pickerOpen}
              onClick={() => pickerOpen ? closePicker(false) : openPicker()}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                  event.preventDefault()
                  openPicker(event.key === "ArrowDown" ? "first" : "last")
                }
              }}
              disabled={busy}
              className="flex h-9 w-full max-w-32 items-center gap-1.5 rounded-xl border border-border bg-background px-2.5 text-xs font-medium text-foreground outline-none transition hover:border-primary/40 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 disabled:opacity-50 md:h-10 md:max-w-40"
            >
              {selectedMember ? (
                <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: selectedMember.color }} aria-hidden />
              ) : (
                <UserRound className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
              )}
              <span className="min-w-0 flex-1 truncate text-left">{selectedMember?.name ?? "未分配"}</span>
              <ChevronDown className={cn("size-3.5 shrink-0 text-muted-foreground transition", pickerOpen && "rotate-180")} aria-hidden />
            </button>

            {pickerOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => closePicker()} aria-hidden />
                <div
                  role="listbox"
                  aria-label="选择默认负责人"
                  aria-activedescendant={`quick-assignee-${activeIndex}`}
                  onKeyDown={(event) => {
                    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
                      event.preventDefault()
                      const nextIndex = event.key === "Home"
                        ? 0
                        : event.key === "End"
                          ? options.length - 1
                          : (activeIndex + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length
                      setActiveIndex(nextIndex)
                      optionRefs.current[nextIndex]?.focus()
                    } else if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault()
                      chooseAssignee(options[activeIndex]?.id ?? null)
                    } else if (event.key === "Escape") {
                      event.preventDefault()
                      closePicker()
                    }
                  }}
                  className="absolute bottom-full right-0 z-50 mb-2 max-h-56 w-48 overflow-y-auto rounded-xl border border-border bg-popover p-1 shadow-lg"
                >
                  {options.map((option, index) => (
                    <button
                      id={`quick-assignee-${index}`}
                      key={option.id ?? "unassigned"}
                      ref={(element) => { optionRefs.current[index] = element }}
                      type="button"
                      role="option"
                      aria-selected={validSelectedAssigneeId === option.id}
                      tabIndex={index === activeIndex ? 0 : -1}
                      onFocus={() => setActiveIndex(index)}
                      onClick={() => chooseAssignee(option.id)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs outline-none transition hover:bg-accent focus:bg-accent",
                        validSelectedAssigneeId === option.id && "bg-accent",
                      )}
                    >
                      {option.color ? (
                        <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: option.color }} aria-hidden />
                      ) : (
                        <span className="size-3 shrink-0 rounded-full border border-muted-foreground/50" aria-hidden />
                      )}
                      <span className="min-w-0 flex-1 truncate">{option.name}</span>
                      {validSelectedAssigneeId === option.id && <Check className="size-3.5 shrink-0" aria-hidden />}
                    </button>
                  ))}
                  {members.length === 0 && (
                    <div className="mt-1 border-t border-border px-2 py-2">
                      <p className="mb-2 text-xs text-muted-foreground">暂无项目成员</p>
                      <button
                        type="button"
                        onClick={() => {
                          closePicker(false)
                          onManageMembers()
                        }}
                        className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-secondary px-2 py-1.5 text-xs font-medium text-secondary-foreground hover:text-primary"
                      >
                        <Users className="size-3.5" aria-hidden />
                        管理成员
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        <input
          ref={inputRef}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onCompositionStart={() => (composingRef.current = true)}
          onCompositionEnd={() => (composingRef.current = false)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !composingRef.current && (event.nativeEvent as KeyboardEvent).keyCode !== 229) {
              event.preventDefault()
              void submit()
            }
          }}
          disabled={busy}
          placeholder="快速添加一个事项，回车即可创建…"
          className="col-start-1 row-start-2 h-10 min-w-0 rounded-xl border border-border bg-background px-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/20 disabled:opacity-60 md:col-auto md:row-auto"
          aria-label="新事项标题"
        />

        <button
          type="submit"
          className="col-start-2 row-start-2 inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50 md:col-auto md:row-auto"
          disabled={!value.trim() || busy}
        >
          <Plus className="size-4" />
          {busy ? "添加中…" : "添加"}
        </button>
      </form>
    </div>
  )
}
