import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }))

import { ProjectList } from "./project-list"

describe("ProjectList project links", () => {
  it("renders each recoverable link against its selected project", () => {
    const firstUrl = "https://cowork.example.com/p/project-a"
    const secondUrl = "https://cowork.example.com/p/project-b"
    const markup = renderToStaticMarkup(<ProjectList initialProjects={[
      { id: "a", name: "项目 A", description: "", version: 1, updatedAt: "2026-08-01T00:00:00.000Z", accessUrl: firstUrl },
      { id: "b", name: "项目 B", description: "", version: 1, updatedAt: "2026-08-01T00:00:00.000Z", accessUrl: secondUrl },
    ]} />)

    expect(markup).toContain(`href="${firstUrl}"`)
    expect(markup).toContain(`href="${secondUrl}"`)
    expect(markup).toContain("项目 A")
    expect(markup).toContain("项目 B")
  })

  it("renders a reset path instead of a fabricated URL for a legacy project", () => {
    const markup = renderToStaticMarkup(<ProjectList initialProjects={[
      { id: "legacy", name: "旧项目", description: "", version: 1, updatedAt: "2026-08-01T00:00:00.000Z", accessUrl: null },
    ]} />)

    expect(markup).toContain("原链接无法恢复")
    expect(markup).toContain('href="/admin/projects/legacy/settings"')
    expect(markup).not.toContain("/p/legacy")
  })
})
