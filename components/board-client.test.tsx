import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { BoardClient } from "./board-client"

describe("BoardClient", () => {
  it("呈现服务器快照和空状态", () => {
    const html = renderToStaticMarkup(<BoardClient token="token" snapshot={{ project: { id: "p", name: "协作项目", description: "项目说明", version: 1 }, members: [], tasks: { box: [], todo: [], done: [] } }} />)
    expect(html).toContain("协作项目")
    expect(html).toContain("暂无事项")
    expect(html).toContain("成员 0")
  })
})
