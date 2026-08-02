import { redirect } from "next/navigation"

import { requireAdminPage } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"

export default async function AdminPage() {
  await requireAdminPage("/admin")
  redirect("/admin/projects")
}
