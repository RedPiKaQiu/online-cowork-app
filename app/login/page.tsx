import { Suspense } from "react"

import { LoginForm } from "@/components/admin/login-form"

export default function LoginPage() {
  return <main className="grid min-h-dvh place-items-center bg-secondary/40 p-4"><Suspense><LoginForm /></Suspense></main>
}
