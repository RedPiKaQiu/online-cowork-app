## Why

阶段 4 已提供按项目链接隔离的持久化写接口，但 `/p/[token]` 仍只呈现只读快照，原 Demo 的完整交互则保留在依赖 `INITIAL_*` 数据的 `CoworkBoard` 中。阶段 5 需要把既有看板体验接到服务端事实来源，使协作者的创建、编辑、分配、移动与删除在刷新后仍可见，并能在请求失败时获得明确反馈。

## What Changes

- 将项目协作页重构为以初始 `ProjectSnapshot` 和项目 token 为输入的交互式 `BoardClient`，移除访客页对内存 Demo 数据的依赖。
- 为项目名称/说明、成员、任务和排序操作建立统一的客户端 mutation 层：生成 `mutationId`、执行乐观更新、以服务端 DTO 合并结果，并在失败或版本冲突时恢复可信快照与显示可理解的错误。
- 复用现有任务卡片、快速添加、成员管理、编辑对话框、完成抽屉与拖拽交互；补齐任务删除入口及加载、空和错误状态。
- 将 `lib/board-data.ts` 收敛为共享显示类型和成员色彩常量，移除 `INITIAL_PROJECTS`、`INITIAL_MEMBERS` 和运行时 `newId()`。
- 从项目协作页移除 `ProjectSwitcher`；项目创建与切换继续仅在管理员后台进行。

## Capabilities

### New Capabilities

- `interactive-project-board`: 持有有效项目链接的协作者可在浏览器中操作持久化项目看板，并在网络或并发失败时获得一致、可恢复的界面状态。

### Modified Capabilities

<!-- 无。既有项目链接访问与看板写入 API 的服务端行为保持不变。 -->

## Impact

- 主要影响 `app/p/[token]/page.tsx`、`components/board-client.tsx`、现有看板子组件与 `lib/board-data.ts`。
- 客户端将调用既有 `/api/projects/:token`、成员、任务和 `/tasks/reorder` API；不改变 API 合同或数据库 schema。
- 需要补充客户端状态归约、请求封装与组件/交互测试；不在本变更引入实时订阅服务。
