## 1. 统一快照刷新状态

- [x] 1.1 扩展 `boardReducer` 与 `BoardClient` 状态，表示刷新进行中、刷新错误和待执行的自动刷新，同时保留最后一个可信 `ProjectSnapshot`。
- [x] 1.2 抽取单一去重 `refreshSnapshot` 流程，复用 `projectBoardApi.snapshot(token)` 和 `replace` action，并防止并发请求或乱序响应覆盖较新状态。
- [x] 1.3 将既有 mutation 失败及 `409` 冲突后的快照恢复改为复用该流程；存在本地 pending 写入时延后自动刷新，并在写入结束后补拉一次快照。

## 2. 看板刷新交互与生命周期

- [x] 2.1 在项目看板加入“刷新最新数据”入口，展示刷新中状态、失败提示及明确的重试操作。
- [x] 2.2 在组件首次可见、浏览器 `focus` 和 `visibilitychange` 恢复为可见时触发受控快照刷新。
- [x] 2.3 实现仅在页面可见期间运行、间隔不短于 60 秒的刷新计时器；页面隐藏或组件卸载时停止计时器并清理全部事件监听。
- [x] 2.4 确保快照替换移除当前引用的任务或成员时，完成抽屉、成员管理和任务编辑对话框安全关闭或停止引用失效实体。

## 3. 验证与交接

- [x] 3.1 为 reducer 和 `BoardClient` 补充手动刷新、focus/可见性恢复、可见页面轮询、隐藏后停止及卸载清理测试。
- [x] 3.2 覆盖刷新与乐观写入重叠、`409` 冲突恢复、快照读取失败后重试和乱序请求去重的测试场景。
- [x] 3.3 以两个浏览器窗口手工验证：窗口 A 保存变更后，窗口 B 通过刷新按钮、切回前台或最多 60 秒轮询获得最新快照。
- [x] 3.4 运行 `pnpm test`、`pnpm lint`、`pnpm typecheck`、`pnpm build` 与 `openspec validate add-project-snapshot-refresh --strict`。
