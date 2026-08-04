## Why

编辑事项后，浏览器本地状态会把该事项追加至所属列末尾；刷新快照后又按持久化位置恢复原位。这会造成同一操作前后顺序跳变，降低看板排序的可信度。

## What Changes

- 同列编辑事项时保留其在客户端列数组中的原有位置。
- 服务端确认编辑结果时，使用同一位置替换本地事项，避免再次将其追加到列末尾。
- 为同列编辑顺序建立回归测试。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `interactive-project-board`: 同列编辑任务后，界面持续呈现与持久化看板顺序一致的任务位置。

## Impact

- 影响 `lib/project-board-state.ts` 中的 `task-upsert` reducer 逻辑及其测试。
- 不改变数据库结构、持久化排序规则或项目看板 API。
