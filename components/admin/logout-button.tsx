"use client"

import { useRouter } from "next/navigation"

export function LogoutButton() {
  const router = useRouter()

  async function logout() {
    await fetch("/api/admin/auth/logout", { method: "POST" })
    router.replace("/login")
    router.refresh()
  }

  return <button onClick={logout} className="rounded-xl border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-secondary">退出登录</button>
}
