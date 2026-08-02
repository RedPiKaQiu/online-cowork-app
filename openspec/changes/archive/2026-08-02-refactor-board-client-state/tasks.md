## 1. 客户端状态与请求基础

- [x] 1.1 将 `lib/board-data.ts` 收敛为项目页面共享的显示类型、成员查找与颜色常量，移除 `INITIAL_PROJECTS`、`INITIAL_MEMBERS` 和 `newId()`，并清理相应引用。
- [x] 1.2 新建浏览器端项目 API 请求与错误解析工具，覆盖快照 `GET /api/projects/:token` 及阶段 4 的项目、成员、任务和排序写入响应。
- [x] 1.3 为 `ProjectSnapshot` 建立可复用的 reducer/action：支持项目、成员、任务的 upsert/remove、受影响列替换、临时任务替换、进行中状态和错误状态。
- [x] 1.4 实现统一 mutation 执行流程：生成本地 `mutationId`，执行乐观更新，成功时合并服务端 DTO，失败或 `409` 时重取快照并展示可重试错误。

## 2. 项目看板交互迁移

- [x] 2.1 改造 `app/p/[token]/page.tsx` 与 `BoardClient`，向客户端传入项目 token 和初始快照，并以 reducer 状态替换只读展示。
- [x] 2.2 将现有 `CoworkBoard` 的列、拖拽、完成抽屉、成员管理和任务编辑交互迁入 `BoardClient`，使其只操作当前链接项目。
- [x] 2.3 接入项目名称与说明编辑，使用项目 `version` 调用 `PATCH /api/projects/:token`，并处理提交中与冲突恢复状态。
- [x] 2.4 接入任务创建、编辑、删除、负责人分配、移动和完成/恢复；为 PATCH、DELETE 和 reorder 传递当前 `expectedVersion`，并在拖入 `box` 时乐观清空负责人。
- [x] 2.5 接入任务拖拽排序，生成 UUID `mutationId` 调用 `/api/projects/:token/tasks/reorder`，并以响应中的受影响列确认顺序。
- [x] 2.6 接入成员新增与删除；删除成功前后正确处理被取消分配的任务和成员头像列表。

## 3. 组件状态与清理

- [x] 3.1 扩展 `TaskCard`，加入任务删除的确认入口以及由父级传入的提交中禁用状态；保留键盘与拖拽可用性。
- [x] 3.2 为 `QuickAddBar`、`MemberManager`、`TaskEditDialog` 和项目资料编辑提供提交中、空状态和失败反馈，并防止同一实体重复提交。
- [x] 3.3 在刷新替换或删除目标实体后安全关闭/重置任务编辑对话框、成员管理和完成抽屉的失效引用。
- [x] 3.4 从项目协作页移除 `ProjectSwitcher`，确认项目创建与切换仅保留在管理员后台；删除不再被引用的 `CoworkBoard` 或 Demo 专用代码。

## 4. 验证

- [x] 4.1 为 reducer 和项目 API 客户端工具添加单元测试，覆盖乐观创建替换、成员删除取消分配、列排序确认与错误恢复。
- [x] 4.2 添加组件/交互测试，覆盖初始快照呈现、任务和成员写入、项目资料编辑、空状态、进行中状态、网络失败及 `409` 后快照重取。
- [x] 4.3 运行 `pnpm lint`、`pnpm typecheck` 和 `pnpm test`；在本地验证刷新后任务、成员、项目资料和排序均来自持久化快照。
