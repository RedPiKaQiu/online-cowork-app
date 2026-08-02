import { describe, expect, it, vi } from "vitest"

import { PROJECT_SNAPSHOT_REFRESH_INTERVAL_MS, createSnapshotRefreshGate, subscribeToSnapshotRefresh } from "./project-snapshot-refresh"

describe("subscribeToSnapshotRefresh", () => {
  it("在可见时初始化、聚焦、恢复可见和定时触发刷新，并在清理后停止", () => {
    const windowListeners = new Map<string, () => void>()
    const documentListeners = new Map<string, () => void>()
    const interval = vi.fn()
    const clearInterval = vi.fn()
    const windowRef = { addEventListener: vi.fn((type, listener) => windowListeners.set(type, listener)), removeEventListener: vi.fn((type) => windowListeners.delete(type)), setInterval: vi.fn((listener, delay) => { interval.mockImplementation(listener); expect(delay).toBe(PROJECT_SNAPSHOT_REFRESH_INTERVAL_MS); return 7 }), clearInterval }
    const documentRef = { visibilityState: "visible", addEventListener: vi.fn((type, listener) => documentListeners.set(type, listener)), removeEventListener: vi.fn((type) => documentListeners.delete(type)) }
    const refresh = vi.fn()

    const cleanup = subscribeToSnapshotRefresh(windowRef, documentRef, refresh)
    expect(refresh).toHaveBeenCalledTimes(1)
    windowListeners.get("focus")?.(); interval()
    expect(refresh).toHaveBeenCalledTimes(3)
    documentRef.visibilityState = "hidden"; documentListeners.get("visibilitychange")?.(); interval()
    expect(refresh).toHaveBeenCalledTimes(3)
    documentRef.visibilityState = "visible"; documentListeners.get("visibilitychange")?.()
    expect(refresh).toHaveBeenCalledTimes(4)

    cleanup()
    expect(windowListeners.size).toBe(0); expect(documentListeners.size).toBe(0); expect(clearInterval).toHaveBeenCalledWith(7)
  })
})

describe("createSnapshotRefreshGate", () => {
  it("合并并发刷新，并在本地写入结束后仅补一次延后刷新", async () => {
    let resolveFirst!: () => void
    const refresh = vi.fn(() => new Promise<void>((resolve) => { resolveFirst = resolve }))
    const gate = createSnapshotRefreshGate(refresh)

    const first = gate.request(false)
    const duplicate = gate.request(false)
    expect(duplicate).toBe(first); expect(refresh).toHaveBeenCalledTimes(1)
    gate.request(true); gate.request(true)
    expect(gate.isQueued()).toBe(true); expect(gate.flush(true)).toBeUndefined()
    resolveFirst(); await first
    const delayed = gate.flush(false)
    expect(delayed).toBeDefined(); expect(refresh).toHaveBeenCalledTimes(2); expect(gate.isQueued()).toBe(false)
  })

  it("读取失败后允许重新请求", async () => {
    const refresh = vi.fn().mockRejectedValueOnce(new Error("网络错误")).mockResolvedValueOnce(undefined)
    const gate = createSnapshotRefreshGate(refresh)

    await expect(gate.request(false)).rejects.toThrow("网络错误")
    await expect(gate.request(false)).resolves.toBeUndefined()
    expect(refresh).toHaveBeenCalledTimes(2)
  })
})
