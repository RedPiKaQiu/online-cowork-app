import "server-only"

export function runtimeMetadata() {
  return { environment: process.env.NODE_ENV ?? "development", release: process.env.APP_RELEASE ?? "unknown" }
}

export function reportServerError(route: string, error: unknown) {
  console.error(JSON.stringify({ event: "server_error", route, ...runtimeMetadata(), message: error instanceof Error ? error.message : "unknown" }))
}
