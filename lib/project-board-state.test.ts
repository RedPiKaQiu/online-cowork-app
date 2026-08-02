import { describe, expect, it } from "vitest"
import { boardReducer, initialBoardState } from "./project-board-state"

const snapshot = { project: { id: "p", name: "项目", description: "", version: 1 }, members: [{ id: "m", name: "成员", color: "#000", fg: "#fff" }], tasks: { box: [{ id: "a", title: "A", description: "", assigneeId: "m", version: 1 }], todo: [], done: [] } }

describe("boardReducer", () => {
  it("用服务端任务替换乐观创建的临时任务", () => {
    const state = boardReducer(initialBoardState(snapshot), { type: "task-upsert", status: "todo", previousId: "a", task: { ...snapshot.tasks.box[0], id: "server", version: 2 } })
    expect(state.tasks.box).toEqual([]); expect(state.tasks.todo[0].id).toBe("server")
  })
  it("删除成员时取消项目内任务分配", () => {
    const state = boardReducer(initialBoardState(snapshot), { type: "member-remove", id: "m" })
    expect(state.members).toEqual([]); expect(state.tasks.box[0].assigneeId).toBeNull()
  })
  it("以服务端列排序确认拖拽结果", () => {
    const state = boardReducer(initialBoardState(snapshot), { type: "columns", columns: { todo: [snapshot.tasks.box[0]] } })
    expect(state.tasks.todo).toHaveLength(1)
  })
  it("替换快照会清除错误与进行中状态", () => {
    let state = boardReducer(initialBoardState(snapshot), { type: "pending", id: "a", value: true }); state = boardReducer(state, { type: "error", error: "失败" }); state = boardReducer(state, { type: "replace", snapshot })
    expect(state.pending).toEqual([]); expect(state.error).toBeNull()
  })
  it("跟踪刷新与延后刷新状态，并在快照确认后清除它们", () => {
    let state = boardReducer(initialBoardState(snapshot), { type: "refreshing", value: true })
    state = boardReducer(state, { type: "refresh-queued", value: true })
    state = boardReducer(state, { type: "refresh-error", error: "刷新失败" })
    expect(state.isRefreshing).toBe(true); expect(state.refreshQueued).toBe(true); expect(state.refreshError).toBe("刷新失败")
    state = boardReducer(state, { type: "replace", snapshot })
    expect(state.isRefreshing).toBe(false); expect(state.refreshQueued).toBe(false); expect(state.refreshError).toBeNull()
  })
})
