## Why

管理员已经可以创建带有高熵令牌的项目链接，但协作者尚不能使用该链接读取持久化看板。阶段 3 将令牌校验和数据库快照提供给匿名项目页面，使已创建的数据能够安全地进入协作体验。

## What Changes

- 新增按项目访问令牌解析活动项目的服务端读取能力。
- 新增 `/p/[token]` 项目页面和 `GET /api/projects/:token` 快照接口。
- 将项目、成员和任务映射为面向浏览器的 DTO；按状态及列内位置分组任务，并且不暴露访问令牌哈希或内部时间戳。
- 为无效、已重置或已删除的链接提供统一的不可用页面。

## Capabilities

### New Capabilities

- `project-link-access`: 通过不可预测的项目链接安全读取项目看板快照。

### Modified Capabilities

- `project-data-persistence`: 明确项目读取应以任务状态和列内位置返回完整的项目看板。

## Impact

- 新增项目访问服务、共享 DTO、项目页、只读客户端看板和项目快照 API 路由。
- 使用现有 Drizzle 数据模型和 `PROJECT_TOKEN_PEPPER`；不引入新的外部依赖或数据库迁移。
