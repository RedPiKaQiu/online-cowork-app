import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import { ShareLink, copyProjectLink } from "./share-link"

describe("ShareLink", () => {
  it("renders a selectable URL with copy and direct navigation actions", () => {
    const url = "https://cowork.example.com/p/project-a"
    const markup = renderToStaticMarkup(<ShareLink url={url} />)

    expect(markup).toContain("select-all")
    expect(markup).toContain(`href="${url}"`)
    expect(markup).toContain("打开项目")
    expect(markup).toContain("复制链接")
    expect(markup).toContain(url)
  })

  it("writes the exact selected project URL to the clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)

    await copyProjectLink("https://cowork.example.com/p/project-b", { writeText })

    expect(writeText).toHaveBeenCalledWith("https://cowork.example.com/p/project-b")
  })

  it("surfaces clipboard rejection to the component state handler", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"))

    await expect(copyProjectLink("https://cowork.example.com/p/project-c", { writeText })).rejects.toThrow("denied")
  })
})
