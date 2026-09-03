import { expect, test, type Page } from "@playwright/test"
import { eq } from "drizzle-orm"

import { db } from "../db/client"
import { projects, tasks } from "../db/schema"
import { createProjectAccessToken, hashProjectAccessToken } from "../lib/project-access"

async function createLongBoardFixture(name: string) {
  const token = createProjectAccessToken()
  const [project] = await db.insert(projects).values({
    name,
    description: "验证大量事项下的响应式滚动布局",
    accessTokenHash: hashProjectAccessToken(token, process.env.PROJECT_TOKEN_PEPPER!),
  }).returning({ id: projects.id })

  await db.insert(tasks).values(
    (["box", "todo"] as const).flatMap((status) => {
      const prefix = status === "box" ? "盒子" : "待办"
      return Array.from({ length: 9 }, (_, index) => ({
        projectId: project.id,
        title: `${prefix}长事项 ${index + 1}`,
        description: `用于验证${prefix}列表独立滚动的较长事项说明 ${index + 1}`,
        status,
        position: index,
      }))
    }),
  )

  return { projectId: project.id, token }
}

async function deleteLongBoardFixture(projectId: string) {
  await db.transaction(async (tx) => {
    await tx.delete(tasks).where(eq(tasks.projectId, projectId))
    await tx.delete(projects).where(eq(projects.id, projectId))
  })
}

function taskCard(page: Page, title: string) {
  return page.getByText(title, { exact: true }).locator("xpath=ancestor::li[1]")
}

test.describe("协作看板长列表布局", () => {
  test.skip(!process.env.DATABASE_URL || !process.env.PROJECT_TOKEN_PEPPER, "设置数据库和项目 token 环境变量后运行。")

  test("桌面双列独立滚动，窄屏保留页面流且长列表可拖拽", async ({ browser }) => {
    test.setTimeout(90_000)
    const name = `E2E 滚动布局 ${Date.now()}`
    const fixture = await createLongBoardFixture(name)
    const board = await browser.newPage({ viewport: { width: 1280, height: 720 } })

    try {
      await board.goto(`/p/${fixture.token}`)

      const box = board.getByRole("region", { name: "事项盒子" })
      const todo = board.getByRole("region", { name: "当前待办" })
      await expect(box).toBeVisible()
      await expect(todo).toBeVisible()

      const boxSize = await box.evaluate((element) => ({
        clientHeight: element.clientHeight,
        scrollHeight: element.scrollHeight,
      }))
      const todoSize = await todo.evaluate((element) => ({
        clientHeight: element.clientHeight,
        scrollHeight: element.scrollHeight,
      }))
      expect(boxSize.scrollHeight).toBeGreaterThan(boxSize.clientHeight)
      expect(todoSize.scrollHeight).toBeGreaterThan(todoSize.clientHeight)

      await box.evaluate((element) => element.scrollTo({ top: element.scrollHeight }))
      await expect.poll(() => box.evaluate((element) => element.scrollTop)).toBeGreaterThan(0)
      expect(await todo.evaluate((element) => element.scrollTop)).toBe(0)
      await expect(board.getByRole("heading", { name: "事项盒子" })).toBeVisible()
      await expect(board.getByLabel("新事项标题")).toBeInViewport()

      await box.evaluate((element) => element.scrollTo({ top: 0 }))
      await box.focus()
      await expect(box).toBeFocused()
      await board.keyboard.press("PageDown")
      await expect.poll(() => box.evaluate((element) => element.scrollTop)).toBeGreaterThan(0)
      expect(await box.evaluate((element) => getComputedStyle(element).boxShadow)).not.toBe("none")

      await box.evaluate((element) => element.scrollTo({ top: 0 }))
      const sourceBounds = await taskCard(board, "盒子长事项 1").boundingBox()
      const boxBounds = await box.boundingBox()
      if (!sourceBounds || !boxBounds) throw new Error("无法取得长列表拖拽区域尺寸")
      await board.mouse.move(sourceBounds.x + sourceBounds.width / 2, sourceBounds.y + sourceBounds.height / 2)
      await board.mouse.down()
      await board.mouse.move(boxBounds.x + boxBounds.width / 2, boxBounds.y + boxBounds.height - 4, { steps: 12 })
      await expect.poll(() => box.evaluate((element) => element.scrollTop)).toBeGreaterThan(0)
      await board.keyboard.press("Escape")
      await board.mouse.up()

      await box.evaluate((element) => element.scrollTo({ top: 0 }))
      await todo.evaluate((element) => element.scrollTo({ top: 0 }))
      const sameColumnResponse = board.waitForResponse((response) =>
        response.request().method() === "POST" && response.url().endsWith("/tasks/reorder"),
      )
      await taskCard(board, "盒子长事项 1").dragTo(taskCard(board, "盒子长事项 3"))
      expect((await sameColumnResponse).status()).toBe(200)

      const crossColumnResponse = board.waitForResponse((response) =>
        response.request().method() === "POST" && response.url().endsWith("/tasks/reorder"),
      )
      await taskCard(board, "盒子长事项 2").dragTo(taskCard(board, "待办长事项 1"))
      expect((await crossColumnResponse).status()).toBe(200)
      await expect(todo.getByText("盒子长事项 2", { exact: true })).toBeAttached()

      await board.setViewportSize({ width: 1280, height: 520 })
      await expect.poll(() => board.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(520)
      await expect(board.getByLabel("新事项标题")).toBeInViewport()
      expect(await box.evaluate((element) => element.scrollHeight)).toBeGreaterThan(await box.evaluate((element) => element.clientHeight))

      await board.setViewportSize({ width: 390, height: 844 })
      await board.evaluate(() => window.scrollTo({ top: 0 }))
      expect(await board.evaluate(() => document.documentElement.scrollHeight)).toBeGreaterThan(844)

      for (const region of [box, todo]) {
        const dimensions = await region.evaluate((element) => ({
          columnHeight: element.parentElement?.getBoundingClientRect().height ?? 0,
          clientHeight: element.clientHeight,
          scrollHeight: element.scrollHeight,
        }))
        expect(dimensions.columnHeight).toBeGreaterThanOrEqual(360)
        expect(dimensions.columnHeight).toBeLessThanOrEqual(Math.ceil(844 * 0.66) + 1)
        expect(dimensions.scrollHeight).toBeGreaterThan(dimensions.clientHeight)
      }

      const boxScrollTop = await box.evaluate((element) => element.scrollTop)
      await todo.scrollIntoViewIfNeeded()
      await todo.evaluate((element) => element.scrollTo({ top: element.scrollHeight }))
      await expect.poll(() => todo.evaluate((element) => element.scrollTop)).toBeGreaterThan(0)
      expect(await box.evaluate((element) => element.scrollTop)).toBe(boxScrollTop)

      const quickInput = board.getByLabel("新事项标题")
      await quickInput.scrollIntoViewIfNeeded()
      await expect(quickInput).toBeInViewport()
      await quickInput.focus()
      await expect(quickInput).toBeFocused()

      await board.emulateMedia({ colorScheme: "dark" })
      await box.focus()
      await board.keyboard.press("PageDown")
      await expect.poll(() => box.evaluate((element) => element.scrollTop)).toBeGreaterThan(0)
      expect(await box.evaluate((element) => getComputedStyle(element).boxShadow)).not.toBe("none")
    } finally {
      await board.close()
      await deleteLongBoardFixture(fixture.projectId)
    }
  })
})
