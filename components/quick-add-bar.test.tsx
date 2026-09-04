import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import { QuickAddBar } from "./quick-add-bar"

const members = [{ id: "member-a", name: "测试成员", color: "#123456", fg: "#ffffff" }]

describe("QuickAddBar", () => {
  it("initializes each mounted bar for the box target without an assignee control", () => {
    const html = renderToStaticMarkup(<QuickAddBar members={members} onManageMembers={vi.fn()} onAdd={vi.fn()} />)

    expect(html).toContain("事项盒子")
    expect(html).toContain("当前待办")
    expect(html).not.toContain("负责人：")
    expect(html).not.toContain("测试成员")
  })

  it("locks the draft controls while a create request is pending", () => {
    const html = renderToStaticMarkup(<QuickAddBar members={members} onManageMembers={vi.fn()} onAdd={vi.fn()} pending />)

    expect(html).toContain("添加中…")
    expect(html).toMatch(/<input[^>]*disabled=""[^>]*aria-label="新事项标题"/)
  })
})
