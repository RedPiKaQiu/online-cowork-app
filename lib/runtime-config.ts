export function requiredEnv(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required at runtime.`)
  return value
}

export function productionConfig() {
  return Object.fromEntries(["DATABASE_URL", "ADMIN_EMAIL", "ADMIN_PASSWORD_HASH", "SESSION_SECRET", "PROJECT_TOKEN_PEPPER", "PROJECT_TOKEN_ENCRYPTION_KEY", "APP_URL"].map((name) => [name, requiredEnv(name)]))
}
