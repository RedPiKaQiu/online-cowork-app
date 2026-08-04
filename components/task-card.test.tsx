import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { TaskCard } from "./task-card"

describe("TaskCard", () => {
  it("不为已完成事项提供拖拽排序控件", () => {
    const html = renderToStaticMarkup(<TaskCard task={{ id: "done", title: "已完成", description: "", assigneeId: null, version: 1 }} column="done" members={[]} isDragging={false} isDropTarget={false} onDragStart={() => {}} onDragEnd={() => {}} onDragOverCard={() => {}} onMoveToTodo={() => {}} onComplete={() => {}} onUncomplete={() => {}} onAssign={() => {}} onEdit={() => {}} onDelete={() => {}} />)
    expect(html).not.toContain('aria-label="拖动排序"')
    expect(html).toContain('draggable="false"')
  })
})
