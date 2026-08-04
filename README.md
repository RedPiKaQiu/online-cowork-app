# Online Cowork

一个面向小团队的轻量项目协作看板。管理员创建项目并分享专属访问链接，成员无需注册即可在链接内共同维护任务。

## 功能

- 管理员通过邮箱和密码登录，创建、编辑和删除项目。
- 每个项目都有不可预测的专属访问链接；链接仅保存哈希，可随时重置使旧链接失效。
- 项目看板包含「事项盒子」「当前待办」和「已完成」三个状态。
- 支持快速添加、编辑、删除、拖拽排序和移动任务，以及为任务分配成员。
- 支持项目成员管理、项目名称和说明编辑、手动刷新最新数据。
- 使用 PostgreSQL 持久化数据；任务和项目更新带版本校验，避免覆盖其他协作者的修改。

## 技术栈

Next.js 16、React 19、TypeScript、Drizzle ORM、PostgreSQL、Docker Compose。

## 本地开发

### 前置条件

- Node.js 20+（建议使用项目声明的 pnpm `10.32.1`）
- 可访问的 PostgreSQL 数据库

安装依赖并创建本地配置：

```bash
corepack enable
pnpm install
cp .env.example .env.local
```

编辑 `.env.local`：填写可访问的 `DATABASE_URL` 和 `PROJECT_TOKEN_PEPPER`；设置管理员邮箱；然后生成管理员密码哈希与会话密钥。

```bash
pnpm admin:hash-password '你的管理员密码'
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

将两条命令的输出分别填入 `ADMIN_PASSWORD_HASH` 和 `SESSION_SECRET`，并将 `APP_URL` 保持为本地访问地址（默认 `http://localhost:3000`）。完成后执行迁移并启动：

```bash
pnpm db:migrate
pnpm dev
```

打开 `http://localhost:3000`，应用会跳转至项目管理页；未登录时请通过 [http://localhost:3000/login](http://localhost:3000/login) 登录。

## 使用流程

1. 管理员登录后，在「项目管理」创建项目。
2. 复制新建项目返回的访问链接，发送给协作者。
3. 协作者在看板中添加成员和任务，将任务从事项盒子推进到待办，完成后移入已完成。
4. 在项目设置中可修改项目资料或重置访问链接；重置后旧链接立即失效。

## 常用命令

```bash
pnpm dev             # 开发服务器
pnpm lint            # 代码规范检查
pnpm typecheck       # TypeScript 类型检查
pnpm test            # 单元测试
pnpm test:e2e        # 端到端测试
pnpm build           # 生产构建
pnpm db:migrate      # 执行数据库迁移
pnpm db:verify       # 校验数据库连接与结构
```

不要在生产环境执行 `pnpm db:seed`。

## Docker 部署

生产环境变量、试用默认值、Docker 部署、备份与回滚请查看 [部署指导](docs/deployment-guide.md)。正式环境请使用唯一的数据库密码、管理员密码、`SESSION_SECRET` 和 `PROJECT_TOKEN_PEPPER`，且不要提交 `.env.production` 或 `.env.local`。
