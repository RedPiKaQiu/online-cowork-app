import { expect, test, type Page } from "@playwright/test"
import { eq } from "drizzle-orm"

import { db } from "../db/client"
import { members, projects, tasks } from "../db/schema"
import { createProjectAccessToken, hashProjectAccessToken } from "../lib/project-access"

async function createQuickAddFixture(name: string, withMember = true) {
  const token = createProjectAccessToken()
  const [project] = await db.insert(projects).values({
    name,
    description: "验证快速添加默认负责人",
    accessTokenHash: hashProjectAccessToken(token, process.env.PROJECT_TOKEN_PEPPER!),
  }).returning({ id: projects.id })
  const [member] = withMember
    ? await db.insert(members).values({
      projectId: project.id,
      name: "测试成员名字很长",
      color: "oklch(0.58 0.1 195)",
      fg: "oklch(0.99 0 0)",
    }).returning({ id: members.id, name: members.name })
    : []

  return { projectId: project.id, token, member }
}

async function deleteQuickAddFixture(projectId: string) {
  await db.transaction(async (tx) => {
    await tx.delete(tasks).where(eq(tasks.projectId, projectId))
    await tx.delete(members).where(eq(members.projectId, projectId))
    await tx.delete(projects).where(eq(projects.id, projectId))
  })
}

function taskCard(page: Page, title: string) {
  return page.getByText(title, { exact: true }).locator("xpath=ancestor::li[1]")
}

test.describe("快速添加默认负责人", () => {
  test.skip(!process.env.DATABASE_URL || !process.env.PROJECT_TOKEN_PEPPER, "设置数据库和项目 token 环境变量后运行。")

  test("选择负责人后连续沿用，切换目标时隐藏并在刷新后重置", async ({ browser }) => {
    const fixture = await createQuickAddFixture(`E2E 默认负责人 ${Date.now()}`)
    const board = await browser.newPage({ viewport: { width: 1280, height: 720 } })

    try {
      await board.goto(`/p/${fixture.token}`)
      await expect(board.getByLabel(/负责人/)).toHaveCount(0)
      await board.getByRole("button", { name: "当前待办" }).click()

      const trigger = board.getByRole("button", { name: "负责人：未分配" })
      await expect(trigger).toBeVisible()
      await trigger.focus()
      await board.keyboard.press("ArrowDown")
      await expect(board.getByRole("listbox", { name: "选择默认负责人" })).toBeVisible()
      await board.keyboard.press("ArrowDown")
      await board.keyboard.press("Enter")
      await expect(board.getByRole("button", { name: `负责人：${fixture.member!.name}` })).toBeFocused()

      const requestBodies: Record<string, unknown>[] = []
      board.on("request", (request) => {
        if (request.method() === "POST" && /\/api\/projects\/[^/]+\/tasks$/.test(request.url())) {
          requestBodies.push(request.postDataJSON())
        }
      })

      for (const title of ["负责人待办一", "负责人待办二"]) {
        await board.getByLabel("新事项标题").fill(title)
        await board.getByRole("button", { name: "添加" }).click()
        await expect(taskCard(board, title)).toContainText(fixture.member!.name)
        await expect(board.getByRole("button", { name: `负责人：${fixture.member!.name}` })).toBeVisible()
        await expect(board.getByLabel("新事项标题")).toBeFocused()
      }
      expect(requestBodies).toMatchObject([
        { title: "负责人待办一", status: "todo", assigneeId: fixture.member!.id },
        { title: "负责人待办二", status: "todo", assigneeId: fixture.member!.id },
      ])

      await board.getByRole("button", { name: "事项盒子" }).click()
      await expect(board.getByLabel(/负责人/)).toHaveCount(0)
      await board.getByLabel("新事项标题").fill("盒子事项")
      await board.getByRole("button", { name: "添加" }).click()
      await expect(taskCard(board, "盒子事项")).not.toContainText(fixture.member!.name)
      expect(requestBodies.at(-1)).toMatchObject({ title: "盒子事项", status: "box", assigneeId: null })

      await board.getByRole("button", { name: "当前待办" }).click()
      await expect(board.getByRole("button", { name: `负责人：${fixture.member!.name}` })).toBeVisible()

      await board.getByRole("button", { name: "成员 1" }).click()
      board.once("dialog", (dialog) => dialog.accept())
      await board.getByRole("button", { name: `移除 ${fixture.member!.name}` }).click()
      await board.getByRole("button", { name: "关闭" }).click()
      await expect(board.getByRole("button", { name: "负责人：未分配" })).toBeVisible()

      await board.reload()
      await board.getByRole("button", { name: "当前待办" }).click()
      await expect(board.getByRole("button", { name: "负责人：未分配" })).toBeVisible()
    } finally {
      await board.close()
      await deleteQuickAddFixture(fixture.projectId)
    }
  })

  test("失败时保留草稿和负责人，并可在窄屏直接重试", async ({ browser }) => {
    const fixture = await createQuickAddFixture(`E2E 失败重试 ${Date.now()}`)
    const board = await browser.newPage({ viewport: { width: 390, height: 844 } })

    try {
      await board.goto(`/p/${fixture.token}`)
      await board.getByRole("button", { name: "当前待办" }).click()
      await board.getByRole("button", { name: "负责人：未分配" }).click()
      await board.getByRole("option", { name: fixture.member!.name }).click()
      await board.getByLabel("新事项标题").fill("失败后重试事项")

      await board.route(/\/api\/projects\/[^/]+\/tasks$/, async (route) => {
        if (route.request().method() === "POST") {
          await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "模拟创建失败。" }) })
        } else {
          await route.continue()
        }
      })
      await board.getByRole("button", { name: "添加" }).click()
      await expect(board.getByRole("alert")).toContainText("模拟创建失败。")
      await expect(board.getByLabel("新事项标题")).toHaveValue("失败后重试事项")
      await expect(board.getByRole("button", { name: `负责人：${fixture.member!.name}` })).toBeVisible()

      await board.unroute(/\/api\/projects\/[^/]+\/tasks$/)
      await board.getByRole("button", { name: "添加" }).click()
      await expect(taskCard(board, "失败后重试事项")).toContainText(fixture.member!.name)

      const bounds = await Promise.all([
        board.getByRole("button", { name: "当前待办" }).boundingBox(),
        board.getByRole("button", { name: `负责人：${fixture.member!.name}` }).boundingBox(),
        board.getByLabel("新事项标题").boundingBox(),
        board.getByRole("button", { name: "添加" }).boundingBox(),
      ])
      for (const box of bounds) {
        expect(box).not.toBeNull()
        expect(box!.x).toBeGreaterThanOrEqual(0)
        expect(box!.x + box!.width).toBeLessThanOrEqual(390)
      }
      expect(await board.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
    } finally {
      await board.close()
      await deleteQuickAddFixture(fixture.projectId)
    }
  })

  test("没有成员时可从选择器进入成员管理", async ({ browser }) => {
    const fixture = await createQuickAddFixture(`E2E 无成员 ${Date.now()}`, false)
    const board = await browser.newPage({ viewport: { width: 390, height: 844 } })

    try {
      await board.goto(`/p/${fixture.token}`)
      await board.getByRole("button", { name: "当前待办" }).click()
      await board.getByRole("button", { name: "负责人：未分配" }).click()
      await expect(board.getByText("暂无项目成员")).toBeVisible()
      await board.getByRole("button", { name: "管理成员" }).click()
      await expect(board.getByRole("dialog", { name: "管理成员" })).toBeVisible()
    } finally {
      await board.close()
      await deleteQuickAddFixture(fixture.projectId)
    }
  })
})
