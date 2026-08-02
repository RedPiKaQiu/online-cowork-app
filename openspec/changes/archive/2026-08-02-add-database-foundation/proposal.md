## Why

当前看板的项目、成员和任务仅保存在浏览器内存中，刷新页面即丢失，无法为后续的匿名链接协作和实时同步提供可靠数据源。项目本地没有 Docker，因此需要先在远程服务器建立安全、可供本地开发访问的 PostgreSQL 基础设施。

## What Changes

- 引入 PostgreSQL 16 与 Drizzle ORM，持久化项目、项目成员和任务数据。
- 定义可保护项目边界的数据模型，使成员只能被分配给所属项目的任务。
- 提供数据库迁移、开发种子数据和共享的数据库连接模块。
- 添加远程服务器 PostgreSQL 部署指南：通过 Docker Compose 在服务器运行数据库、本地以 SSH 隧道开发访问，并为后续同机部署 Next.js 预留路径。
- 添加环境变量模板，禁止将数据库凭据提交到仓库。

## Capabilities

### New Capabilities

- `project-data-persistence`: 持久化项目、项目成员和任务，并保持项目数据隔离与任务排序。
- `remote-database-deployment`: 安全地在远程服务器部署开发用 PostgreSQL，并允许本地开发环境经 SSH 隧道连接。

### Modified Capabilities

- 无。

## Impact

- 新增 Drizzle、PostgreSQL 驱动和数据库迁移开发依赖。
- 新增数据库 schema、迁移、开发种子、连接模块和环境变量示例。
- 新增远程部署与备份操作文档。
- 现有 `lib/board-data.ts` 的演示数据将转为仅供开发环境种子使用；看板 UI 本阶段暂不改为数据库读取。
