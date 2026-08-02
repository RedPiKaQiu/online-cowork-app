export const PROJECT_SNAPSHOT_REFRESH_INTERVAL_MS = 60_000

type BrowserWindow = {
  addEventListener: (type: "focus", listener: () => void) => void
  removeEventListener: (type: "focus", listener: () => void) => void
  setInterval: (listener: () => void, delay: number) => number
  clearInterval: (id: number) => void
}

type BrowserDocument = {
  visibilityState: "visible" | "hidden" | string
  addEventListener: (type: "visibilitychange", listener: () => void) => void
  removeEventListener: (type: "visibilitychange", listener: () => void) => void
}

export function subscribeToSnapshotRefresh(windowRef: BrowserWindow, documentRef: BrowserDocument, refresh: () => void) {
  const refreshWhenVisible = () => { if (documentRef.visibilityState === "visible") refresh() }
  windowRef.addEventListener("focus", refreshWhenVisible)
  documentRef.addEventListener("visibilitychange", refreshWhenVisible)
  refreshWhenVisible()
  const interval = windowRef.setInterval(refreshWhenVisible, PROJECT_SNAPSHOT_REFRESH_INTERVAL_MS)
  return () => {
    windowRef.removeEventListener("focus", refreshWhenVisible)
    documentRef.removeEventListener("visibilitychange", refreshWhenVisible)
    windowRef.clearInterval(interval)
  }
}

export function createSnapshotRefreshGate(refresh: () => Promise<void>) {
  let inFlight: Promise<void> | null = null
  let queued = false
  const request = (hasPendingMutations: boolean) => {
    if (hasPendingMutations) {
      queued = true
      return undefined
    }
    if (inFlight) return inFlight
    const next = refresh().finally(() => { if (inFlight === next) inFlight = null })
    inFlight = next
    return next
  }
  return {
    request,
    flush(hasPendingMutations: boolean) {
      if (!queued || hasPendingMutations) return undefined
      queued = false
      return request(false)
    },
    isQueued: () => queued,
  }
}
