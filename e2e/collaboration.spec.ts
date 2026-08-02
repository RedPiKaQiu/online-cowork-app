import { expect, test } from "@playwright/test"

const email = process.env.E2E_ADMIN_EMAIL
const password = process.env.E2E_ADMIN_PASSWORD

test.describe("协作看板发布冒烟测试", () => {
  test.skip(!email || !password, "设置 E2E_ADMIN_EMAIL 与 E2E_ADMIN_PASSWORD 后运行。")

  test("管理员创建项目、访客通过链接添加事项并在刷新后取得快照", async ({ browser, page }) => {
    const name = `E2E 项目 ${Date.now()}`
    await page.goto("/login")
    await page.getByLabel("邮箱").fill(email!)
    await page.getByRole("textbox", { name: "密码" }).fill(password!)
    await page.getByRole("button", { name: "登录" }).click()
    await expect(page.getByRole("heading", { name: "新建项目" })).toBeVisible()
    await page.getByPlaceholder("项目名称").fill(name)
    await page.getByRole("button", { name: "创建项目" }).click()
    const link = await page.getByLabel("项目访问链接").textContent()
    if (!link) throw new Error("创建项目后未获得访问链接")

    const guest = await browser.newPage()
    await guest.goto(link)
    await guest.getByLabel("新事项标题").fill("由访客创建的事项")
    const createTask = guest.waitForResponse((response) =>
      response.request().method() === "POST" && /\/api\/projects\/[^/]+\/tasks$/.test(response.url()),
    )
    await guest.getByRole("button", { name: "添加" }).click()
    expect((await createTask).status()).toBe(201)
    await expect(guest.getByText("由访客创建的事项")).toBeVisible()

    await page.goto(link)
    await page.reload()
    await expect(page.getByText("由访客创建的事项")).toBeVisible()
    await guest.close()
  })
})
