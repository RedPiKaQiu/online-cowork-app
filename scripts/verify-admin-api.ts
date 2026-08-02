import { createSession } from "@/lib/admin-security"

const baseUrl = process.env.ADMIN_VERIFY_URL ?? process.env.APP_URL ?? "http://127.0.0.1:3001"
const email = process.env.ADMIN_EMAIL
const sessionSecret = process.env.SESSION_SECRET

if (!email || !sessionSecret) throw new Error("ADMIN_EMAIL and SESSION_SECRET are required.")

const origin = new URL(baseUrl).origin
const adminEmail = email
const adminSessionSecret = sessionSecret
const cookie = `cowork_admin_session=${createSession(adminEmail, adminSessionSecret)}`

async function request(path: string, options: RequestInit = {}) {
  return fetch(new URL(path, baseUrl), {
    ...options,
    headers: { cookie, origin, "content-type": "application/json", ...options.headers },
  })
}

async function verify() {
  const unauthenticated = await fetch(new URL("/api/admin/projects", baseUrl))
  if (unauthenticated.status !== 401) throw new Error(`Expected 401, received ${unauthenticated.status}.`)

  const crossSite = await fetch(new URL("/api/admin/projects", baseUrl), {
    method: "POST",
    headers: { cookie, origin: "https://invalid.example", "content-type": "application/json" },
    body: JSON.stringify({ name: "forbidden" }),
  })
  if (crossSite.status !== 403) throw new Error(`Expected 403, received ${crossSite.status}.`)

  const expired = createSession(adminEmail, adminSessionSecret, Date.now() - 13 * 60 * 60 * 1000)
  const expiredSession = await fetch(new URL("/api/admin/projects", baseUrl), { headers: { cookie: `cowork_admin_session=${expired}` } })
  if (expiredSession.status !== 401) throw new Error(`Expected expired session to return 401, received ${expiredSession.status}.`)

  const create = await request("/api/admin/projects", {
    method: "POST",
    body: JSON.stringify({ name: `API verification ${Date.now()}`, description: "Temporary verification project" }),
  })
  const created = await create.json()
  if (create.status !== 201 || !created.project?.id || !created.accessUrl || "accessTokenHash" in created.project) {
    throw new Error(`Project creation response is invalid (${create.status}): ${typeof created.error === "string" ? created.error : "unknown error"}.`)
  }

  const update = await request(`/api/admin/projects/${created.project.id}`, {
    method: "PATCH",
    body: JSON.stringify({ name: `${created.project.name} updated`, description: "Updated", expectedVersion: created.project.version }),
  })
  const updated = await update.json()
  if (!update.ok || updated.project.version <= created.project.version) throw new Error("Project update did not advance the version.")

  const reset = await request(`/api/admin/projects/${created.project.id}/reset-link`, {
    method: "POST",
    body: JSON.stringify({ expectedVersion: updated.project.version }),
  })
  const resetBody = await reset.json()
  if (!reset.ok || !resetBody.accessUrl || resetBody.accessUrl === created.accessUrl) throw new Error("Project link reset failed.")

  const remove = await request(`/api/admin/projects/${created.project.id}`, {
    method: "DELETE",
    body: JSON.stringify({ expectedVersion: resetBody.project.version }),
  })
  if (!remove.ok) throw new Error("Project soft delete failed.")

  const list = await request("/api/admin/projects")
  const listBody = await list.json()
  if (listBody.projects.some((project: { id: string }) => project.id === created.project.id)) {
    throw new Error("Soft-deleted project is still listed as active.")
  }

  console.info("Administrator API verification completed successfully.")
}

verify().catch((error: unknown) => {
  console.error("Administrator API verification failed.", error)
  process.exitCode = 1
})
