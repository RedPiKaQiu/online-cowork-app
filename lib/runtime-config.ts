import "server-only"

export function requiredEnv(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required at runtime.`)
  return value
}

export function productionConfig() {
  return Object.fromEntries(["DATABASE_URL", "ADMIN_EMAIL", "ADMIN_PASSWORD_HASH", "SESSION_SECRET", "PROJECT_TOKEN_PEPPER", "APP_URL"].map((name) => [name, requiredEnv(name)]))
}
