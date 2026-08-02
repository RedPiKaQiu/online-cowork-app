# 在线协作看板：实施指导文档

## 1. 目标与范围

将当前纯前端 Demo 改造成轻量全栈 Web 应用。

- 管理员登录后可创建、编辑、删除项目，并管理项目访问链接。
- 项目参与者无需登录；持有项目唯一 URL 即可访问，并拥有该项目中任务和成员的完整操作权限。
- 项目名称、描述、成员与任务变更应在已打开同一项目的浏览器间实时同步。

首期**不包含**：多管理员、角色分级、评论/附件、通知、在线光标、任务权限细分。

## 2. 目标架构

```text
浏览器（管理员） ─┐
                  ├─ Next.js（页面、API、鉴权） ─ PostgreSQL
浏览器（项目访客） ─┘                │
                                     └─ Realtime 通道
```

推荐组合：Next.js App Router、PostgreSQL、Drizzle ORM、管理员 Cookie Session、Supabase Realtime（或 Pusher/Ably）。如团队已确定 Supabase，可直接使用其 PostgreSQL、Auth 与 Realtime；本文档的模型和接口设计保持不变。

## 3. 实施原则

1. 先持久化，再改交互：不要在 `CoworkBoard` 中直接接入大量 API；先建立稳定数据模型和读写接口。
2. 所有项目数据均按 `projectId` 隔离；成员必须属于项目，不能继续全局共享。
3. 项目 URL 使用高熵随机令牌，数据库只保存令牌哈希；不可使用递增 ID 作为访问凭据。
4. 所有写操作都要经过服务端鉴权、数据库写入、实时事件发布三个步骤。
5. 客户端可乐观更新，但服务端数据是最终事实来源。

## 4. 任务总览与依赖

| 阶段 | 任务 | 依赖 | 完成标志 |
|---|---|---|---|
| 0 | 基线与技术决策 | 无 | 当前 Demo 可运行，关键技术选型落定 |
| 1 | 数据库与 ORM | 0 | 数据表、迁移、种子数据可用 |
| 2 | 管理员鉴权与后台 | 1 | 管理员可登录并管理项目 |
| 3 | 项目链接访问与读取 | 1 | 唯一 URL 可安全加载项目 |
| 4 | 任务、成员、项目写接口 | 2、3 | 所有看板动作可持久化 |
| 5 | 前端状态重构 | 3、4 | 原 Demo 交互接入 API |
| 6 | 实时同步 | 4、5 | 两个浏览器可同步变更 |
| 7 | 测试、可观测性与上线 | 2–6 | 核心流程可验证并可部署 |

## 5. 阶段 0：基线与技术决策

### 任务

- [ ] 确认包管理器并补齐本地环境。项目已有 `pnpm-lock.yaml`，推荐统一使用 pnpm。
- [ ] 移除 `next.config.mjs` 中的 `typescript.ignoreBuildErrors: true`，避免类型错误被生产构建忽略。
- [ ] 确认 PostgreSQL 提供方和实时服务提供方。
- [ ] 建立 `.env.example`，仅列出变量名，不提交真实密钥。
- [ ] 给 README 增加启动、迁移、测试命令。

### 建议环境变量

```dotenv
DATABASE_URL=
ADMIN_EMAIL=
ADMIN_PASSWORD_HASH=
SESSION_SECRET=
PROJECT_TOKEN_PEPPER=
REALTIME_URL=
REALTIME_KEY=
```

> 第一版只有单管理员时，管理员凭据可由环境变量提供；之后如需多管理员，再引入 `Admin` 表和完整认证服务。

### 验收

- `pnpm lint`、`pnpm build` 均通过。
- `.env.local` 被 git 忽略，`.env.example` 不含任何机密。

## 6. 阶段 1：数据模型与数据库

### 任务

- [ ] 安装并配置 Drizzle（或团队指定 ORM）。
- [ ] 创建数据库连接与迁移脚本。
- [ ] 实现下列数据表。
- [ ] 将现有 `INITIAL_PROJECTS`、`INITIAL_MEMBERS` 转成只供开发环境使用的 seed 数据。

### 数据模型

```text
projects
  id                uuid / cuid，主键
  name              varchar，非空
  description       text，默认空
  access_token_hash varchar，非空且唯一
  version           integer，默认 1
  created_at        timestamp
  updated_at        timestamp
  deleted_at        timestamp，可空（推荐软删除）

members
  id                uuid / cuid，主键
  project_id        外键 -> projects.id，级联删除
  name              varchar，非空
  color             varchar，非空
  fg                varchar，非空
  created_at        timestamp
  updated_at        timestamp

tasks
  id                uuid / cuid，主键
  project_id        外键 -> projects.id，级联删除
  title             varchar，非空
  description       text，默认空
  status            enum: box | todo | done
  position          numeric / varchar，非空
  assignee_id       外键 -> members.id，可空
  version           integer，默认 1
  created_at        timestamp
  updated_at        timestamp
```

### 设计要点

- `position` 用于列内排序。首期可在移动后重排该列所有任务；数据量小而实现稳定。后续再改成分数索引。
- 服务端必须校验 `assignee_id` 属于同一 `project_id`，禁止跨项目关联。
- `status` 替代当前 `BoardState` 的嵌套数组；查询时按 `status, position` 分组即可恢复前端看板结构。
- 删除项目建议先软删除，设置 30 天保留期；访问接口应过滤 `deleted_at IS NULL`。

### 验收

- 空数据库可一键迁移并执行 seed。
- 删除一个项目会删除其成员与任务（或软删除项目并禁止继续访问）。
- 同一成员不能被分配给其他项目的任务。

## 7. 阶段 2：管理员鉴权与项目后台

### 路由

```text
/login
/admin/projects
/admin/projects/new
/admin/projects/[id]/settings
```

### 任务

- [ ] 实现管理员登录表单和 `POST /api/admin/auth/login`。
- [ ] 登录成功后签发 `httpOnly`、`secure`、`sameSite=lax` 的会话 Cookie。
- [ ] 编写服务端 `requireAdmin()`，用于后台页面和所有 `/api/admin/*` 接口。
- [ ] 未登录访问 `/admin/*` 时重定向到 `/login`。
- [ ] 实现项目列表、新建、编辑、删除、重置项目链接。
- [ ] 删除项目时展示项目名称二次确认，不允许直接误删。

### 管理员接口

```text
POST   /api/admin/auth/login
POST   /api/admin/auth/logout
GET    /api/admin/projects
POST   /api/admin/projects
PATCH  /api/admin/projects/:id
DELETE /api/admin/projects/:id
POST   /api/admin/projects/:id/regenerate-link
```

### 项目访问令牌

创建项目或重置链接时：

1. 使用加密安全随机数生成至少 32 字节 token。
2. 将原始 token 仅在当次响应中返回，用于构造 `/p/{token}`。
3. 使用 `token + PROJECT_TOKEN_PEPPER` 计算哈希并存入数据库。
4. 收到 URL token 后，以相同方式计算哈希并查询项目。
5. 重置链接后立刻更新哈希，旧 URL 自动失效。

### 验收

- 未登录用户无法调用任一管理员 API。
- 管理员能复制新项目链接；旧链接在重置后返回 404。
- 删除项目后，项目 URL 不再能访问。

## 8. 阶段 3：匿名项目访问与项目快照

### 路由

```text
/p/[token]
```

### 任务

- [ ] 在服务端解析 token，校验项目存在、未删除。
- [ ] 一次性查询项目、成员及按状态和排序排列的任务。
- [ ] 将数据库结果映射成明确的 DTO，不向浏览器暴露 `accessTokenHash` 等内部字段。
- [ ] 构建 `ProjectBoardPage`（服务端）与 `BoardClient`（客户端）边界。

### 建议读取接口

```text
GET /api/projects/:token
```

响应示例：

```json
{
  "project": { "id": "…", "name": "官网改版", "description": "", "version": 3 },
  "members": [],
  "tasks": { "box": [], "todo": [], "done": [] }
}
```

### 验收

- 有效 URL 能加载对应项目且不泄露其他项目数据。
- 无效、过期或已删除项目 URL 显示统一的“项目不存在或链接已失效”页面。
- 刷新页面后数据来自数据库而非 `INITIAL_*` 常量。

## 9. 阶段 4：写接口与领域规则

所有项目写接口都必须先以 token 获取项目上下文，再限定查询条件 `projectId = 当前项目 ID`。不要仅靠客户端传入的 `projectId` 鉴权。

### 项目与成员

```text
PATCH  /api/projects/:token                 更新名称、描述
POST   /api/projects/:token/members
PATCH  /api/projects/:token/members/:id
DELETE /api/projects/:token/members/:id
```

- 项目访客可修改项目名称/描述（如产品决定仅管理员可改，则移除该接口）。
- 删除成员时，事务中将项目内任务的 `assignee_id` 置空，再删除成员。
- 成员颜色应由服务端生成或校验，避免前端状态不一致。

### 任务

```text
POST   /api/projects/:token/tasks
PATCH  /api/projects/:token/tasks/:id
DELETE /api/projects/:token/tasks/:id
POST   /api/projects/:token/tasks/reorder
```

`PATCH` 可修改标题、描述、负责人、状态；将任务移入 `box` 时由服务端强制将 `assigneeId` 清空。

拖拽排序请求应使用意图明确的负载：

```json
{
  "taskId": "…",
  "fromStatus": "todo",
  "toStatus": "done",
  "targetIndex": 0,
  "expectedVersion": 4,
  "mutationId": "uuid"
}
```

服务端在数据库事务内：校验任务、更新状态与负责人、重算排序值、递增版本，再发布事件。

### 验收

- 刷新页面后，创建、编辑、拖拽、完成、恢复、分配、删除任务均保留。
- 一个项目的 URL 不能读取或修改另一个项目的成员/任务 ID。
- 删除成员后，所有对应任务都显示未分配。

## 10. 阶段 5：前端看板重构

### 现有代码的改造点

| 当前位置 | 改造 |
|---|---|
| `lib/board-data.ts` | 保留 `Task`、`Member` 等共享类型；移除运行时初始数据和递增 `newId()` |
| `components/cowork-board.tsx` | 拆成服务端数据入口与客户端交互组件；不再拥有唯一数据源 |
| `components/project-switcher.tsx` | 从项目协作页移除；项目选择迁移至管理员后台 |
| `components/member-manager.tsx` | 保持界面，回调改为 API mutation |
| `components/task-card.tsx` | 保持展示，操作回调改为 mutation；补充删除入口 |
| `components/quick-add-bar.tsx` | 创建后以服务端返回任务替换临时任务 |

### 客户端状态建议

- 使用 TanStack Query 管理项目快照、缓存失效与 mutation；或者用单个 `useReducer` 管理局部看板状态。
- 每次 mutation 生成 `mutationId`。
- 先乐观更新 UI；请求失败则回滚并展示错误消息。
- 服务端响应与实时事件均合并为同一类状态更新，避免出现两套更新逻辑。
- 初期可在发生冲突时重新获取项目快照；不必实现复杂的 CRDT。

### 验收

- 原 Demo 的任务操作不再直接 `setState` 持久化业务数据。
- 网络请求失败时，UI 会回滚并给出可理解的提示。
- 页面加载、空状态、加载状态和错误状态均完整。

## 11. 阶段 6：实时同步

### 通道与事件

每个项目使用独立主题：`project:{projectId}`。连接前必须先通过服务端验证 URL token，实时服务不得允许客户端任意订阅项目 ID。

```text
project.updated
member.created | member.updated | member.deleted
task.created | task.updated | task.deleted | task.reordered
```

事件统一包含：

```json
{
  "type": "task.updated",
  "projectId": "…",
  "entity": {},
  "version": 5,
  "mutationId": "…",
  "occurredAt": "ISO-8601"
}
```

### 实现步骤

- [ ] 建立实时连接授权接口：前端不能凭裸 `projectId` 订阅。
- [ ] 进入项目页后订阅本项目主题，离开页面时取消订阅。
- [ ] 每一个成功写入的 API 在提交事务后发布事件。
- [ ] 收到本客户端 `mutationId` 对应事件时跳过或仅作版本确认。
- [ ] 收到其他客户端事件时局部更新任务、成员或项目信息。
- [ ] 发现版本跳跃、事件丢失或重连时，重新拉取项目快照。

### 验收用例

1. 在两个浏览器窗口打开同一 URL。
2. 窗口 A 更改项目名称，窗口 B 无刷新更新标题。
3. 窗口 A 新建、移动、完成任务，窗口 B 的列数、卡片与顺序同步。
4. 窗口 A 删除成员，窗口 B 同步移除成员和负责人显示。
5. 窗口 B 断网后恢复网络，自动取得最新项目快照。

## 12. 阶段 7：测试、质量与上线

### 测试清单

- [ ] 单元测试：token 哈希、排序、状态迁移、成员删除后的取消分配。
- [ ] API 集成测试：管理员鉴权、项目 token 隔离、跨项目 ID 越权拦截。
- [ ] 端到端测试：登录、创建项目、匿名协作、链接重置、实时同步。
- [ ] 手工验证：移动端基础操作、键盘操作、弹窗 Escape/焦点行为、无网络提示。

### 安全清单

- [ ] 管理员密码仅保存哈希，Cookie 设为 `httpOnly` 与 `secure`。
- [ ] 项目 token 只存哈希，日志与错误信息中不输出完整 token。
- [ ] 写接口启用同源校验/CSRF 防护，并限制请求体大小。
- [ ] 针对登录和项目写接口实施速率限制。
- [ ] 文本输入按 React 默认转义渲染；若未来支持 Markdown，必须进行 HTML 消毒。

### 上线清单

- [ ] 生产环境执行迁移而非自动 seed。
- [ ] 设置数据库备份和告警。
- [ ] 配置真实 `APP_URL`、Cookie 域名及 HTTPS。
- [ ] 记录管理员项目删除和访问链接重置的审计日志。
- [ ] 配置错误监控与基础性能指标。

## 13. 推荐交付顺序

建议每个里程碑独立提交并部署到预览环境：

1. `chore: establish lint, build and environment baseline`
2. `feat: add database schema and seed data`
3. `feat: add admin authentication and project management`
4. `feat: serve projects through secure share links`
5. `feat: persist board tasks and project members`
6. `feat: sync project board updates in realtime`
7. `test: cover authorization and collaboration flows`

前四项完成后可交付“单人可用的持久化版本”；第六项完成后达到“轻量实时协作版本”的目标。
