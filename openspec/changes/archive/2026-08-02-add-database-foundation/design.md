## Context

当前项目是 Next.js 单页 Demo，项目、成员和任务均由客户端内存状态及 `lib/board-data.ts` 初始化。参见 proposal.md。开发机没有 Docker，数据库将先部署在远程服务器；待应用完成后，Next.js 也会部署到该服务器。

## Goals / Non-Goals

**Goals:**

- 提供可迁移、可种子的 PostgreSQL 数据基础。
- 在数据库层与服务层共同保证项目数据隔离。
- 让本地开发可通过 SSH 隧道安全使用远程开发数据库。
- 提供可复现的远程 PostgreSQL 部署、备份与恢复操作文档。

**Non-Goals:**

- 本变更不把现有看板 UI 改为数据库读取或写入。
- 本变更不实现管理员登录、项目链接鉴权、任务 API 或实时订阅。
- 本变更不连接、配置或改动任何真实远程服务器。

## Decisions

### PostgreSQL 16 作为唯一关系数据库

项目需要跨设备持久化、任务排序、未来并发写入和实时同步。选择 PostgreSQL 16，使用 UUID 主键和 `timestamptz` 时间字段。SQLite 的本地单文件部署更简单，但在远程共享数据库、并发及后续生产扩展上不适合作为目标架构。

### Drizzle 负责 schema 与迁移

使用 Drizzle ORM 和 PostgreSQL 驱动，schema 放置在 `db/schema.ts`，生成的迁移放在 `db/migrations/`，连接创建放在 `lib/db.ts`。Drizzle 保持 SQL 能力和 TypeScript 类型推导，适合当前小型 Next.js 项目。Prisma 是可行替代方案，但会额外引入生成客户端和更重的工作流。

### 数据模型与完整性约束

建立 `projects`、`members`、`tasks` 表及 `task_status` 枚举。

- `projects` 存储 `access_token_hash`，不存储原始项目 token；token 在后续项目链接功能中以带 pepper 的 SHA-256 哈希比对。
- `members.project_id` 外键关联项目；`members` 建立 `(id, project_id)` 唯一约束。
- `tasks.project_id` 外键关联项目；`tasks(assignee_id, project_id)` 以复合外键关联 `members(id, project_id)`，在数据库层拒绝跨项目负责人。
- `tasks.status` 是 `box`、`todo`、`done` 枚举。`position` 使用整数，查询索引为 `(project_id, status, position)`。首期移动操作可在事务中重排单列，不加入位置唯一约束以降低批量重排冲突风险。
- `tasks.assignee_id` 可空；后续服务层将强制任务移动至 `box` 时清空负责人。

### 项目删除采用软删除

`projects.deleted_at` 表示项目已删除；常规读取必须排除该项目。成员与任务保留，以便管理员功能完成后支持恢复和审计。外键不对软删除项目做级联物理删除。

### 远程 Docker Compose 与局域网受限访问

远程服务器运行 PostgreSQL 16 的 Docker Compose 服务，并将端口发布到受信任局域网接口。服务器防火墙仅允许开发机的固定局域网 IP 访问 TCP 5432，禁止公网和其他 LAN 客户端。应用上线后，Next.js 与 PostgreSQL 位于同一 Compose 网络，应用以 `postgres:5432` 连接数据库，移除宿主机端口发布。

### 环境与种子策略

`.env.example` 只保留变量名，`.env.local` 与服务器 `.env` 不提交。开发种子必须由显式脚本执行，并检查 `NODE_ENV !== production`；生产启动或迁移不自动注入 Demo 数据。

## Risks / Trade-offs

- [远程开发数据库不可用会阻塞本地开发] → 在部署文档中提供 SSH 隧道检查、健康检查、备份和恢复步骤；后续可增加本地 Docker 或托管开发库作为替代。
- [共享开发数据库可能被错误 seed 或迁移污染] → 使用独立 `cowork_dev` 数据库，迁移先在备份后执行，种子显式运行且可安全重置。
- [局域网访问范围过宽导致数据库暴露] → 在部署文档中要求只对开发机固定 IP 添加防火墙白名单，并验证公网及非白名单客户端无法访问。
- [软删除数据持续累积] → 后续管理员功能增加恢复和保留期清理策略；本变更仅保证读取隔离。
- [整数排序在频繁拖拽下会重排多行] → 首期看板任务规模小，使用事务重排换取简单性；任务量增加后可迁移至分数索引。

## Migration Plan

1. 添加依赖、环境变量模板、schema、迁移与数据库连接模块。
2. 在远程服务器部署仅本机监听的 PostgreSQL，并完成一次备份验证。
3. 通过受信任局域网连接在本地执行迁移与开发 seed，验证约束和读取结果。
4. 后续阶段将现有 UI 改为通过服务端 API 使用本 schema；该阶段完成前不删除 Demo 内存数据。
5. 回滚时停止使用数据库连接并回退应用代码；保留数据库卷和最近备份，不执行破坏性删库操作。

## Open Questions

- 远程服务器的操作系统、SSH 登录用户和域名尚未提供；部署文档将使用占位符，并要求实施前替换为实际值。
