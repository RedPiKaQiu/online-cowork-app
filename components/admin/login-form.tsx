"use client"

import { FormEvent, useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError("")
    const response = await fetch("/api/admin/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password, next: searchParams.get("next") }),
    })
    const body = await response.json().catch(() => ({}))
    setSubmitting(false)
    if (!response.ok) {
      setError(typeof body.error === "string" ? body.error : "登录失败，请稍后重试。")
      return
    }
    router.replace(typeof body.redirectTo === "string" ? body.redirectTo : "/admin/projects")
    router.refresh()
  }

  return (
    <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="mb-6">
        <p className="text-xs font-medium text-primary">ONLINE-COWORK</p>
        <h1 className="mt-1 text-xl font-semibold">管理员登录</h1>
        <p className="mt-1 text-sm text-muted-foreground">管理项目与协作访问链接</p>
      </div>
      <label className="mb-1 block text-sm font-medium">邮箱</label>
      <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="username" required className="mb-4 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary" />
      <label className="mb-1 block text-sm font-medium">密码</label>
      <div className="relative">
        <input value={password} onChange={(event) => setPassword(event.target.value)} type={showPassword ? "text" : "password"} autoComplete="current-password" required className="h-10 w-full rounded-xl border border-border bg-background px-3 pr-10 text-sm outline-none focus:border-primary" />
        <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "隐藏密码" : "显示密码"} className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted-foreground hover:text-foreground">
          {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
      <button disabled={submitting} className="mt-5 h-10 w-full rounded-xl bg-primary text-sm font-medium text-primary-foreground disabled:opacity-50">
        {submitting ? "登录中…" : "登录"}
      </button>
    </form>
  )
}
