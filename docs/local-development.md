# 本地开发指南

本文介绍如何在本地运行 Online Cowork。应用在本地运行，但需要连接一个可用的 PostgreSQL 数据库。

## 1. 前置条件

- Node.js 20+
- Corepack 与项目声明的 pnpm `10.32.1`
- 可访问的 PostgreSQL 数据库

如果没有本地数据库，也可以按照 [远程 PostgreSQL 开发指南](remote-postgres-deployment.md) 在 Linux 服务器上准备开发数据库。

## 2. 安装依赖

在项目根目录执行：

```bash
corepack enable
pnpm install
cp .env.example .env.local
```

`.env.local` 包含数据库凭据和应用密钥，已经被 Git 忽略，请勿提交。

## 3. 配置本地环境

编辑 `.env.local`，先填写数据库连接和项目链接密钥：

```dotenv
DATABASE_URL=postgresql://用户名:密码@数据库地址:5432/数据库名
PROJECT_TOKEN_PEPPER=替换为随机长字符串
```

如果数据库密码含有 `@`、`:`、`/`、`?`、`#`、`%`、`$` 或空格，需要先进行 URL 编码。

设置管理员邮箱，然后生成密码哈希：

```bash
pnpm admin:hash-password '你的管理员密码'
```

生成会话密钥：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

将两条命令的输出分别填入 `ADMIN_PASSWORD_HASH` 和 `SESSION_SECRET`。本地开发配置示例：

```dotenv
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD_HASH=粘贴生成的密码哈希
SESSION_SECRET=粘贴生成的会话密钥
APP_URL=http://localhost:3000
```

`PROJECT_TOKEN_PEPPER` 用来保护项目访问链接；修改它会让已有项目链接失效。`SESSION_SECRET` 用来保护管理员会话；修改它会让管理员重新登录。

## 4. 初始化并启动

执行数据库迁移：

```bash
pnpm db:migrate
```

启动开发服务器：

```bash
pnpm dev
```

打开 [http://localhost:3000/login](http://localhost:3000/login)，使用 `.env.local` 中配置的管理员账号和密码登录。

如需写入开发用示例数据，可以显式执行：

```bash
pnpm db:seed
```

`db:seed` 只应用于开发环境，不要对生产数据库执行。

## 5. 常用命令

| 命令 | 用途 |
|---|---|
| `pnpm dev` | 启动本地开发服务器 |
| `pnpm lint` | 检查代码规范 |
| `pnpm typecheck` | 检查 TypeScript 类型 |
| `pnpm test` | 运行单元测试 |
| `pnpm test:e2e` | 运行端到端测试 |
| `pnpm build` | 创建生产构建 |
| `pnpm db:generate` | 根据 schema 生成迁移文件 |
| `pnpm db:migrate` | 执行数据库迁移 |
| `pnpm db:verify` | 校验数据库连接与结构 |

提交代码前，建议至少运行：

```bash
pnpm lint
pnpm typecheck
pnpm test
```

## 6. 常见问题

### 无法连接数据库

确认 PostgreSQL 已启动、`DATABASE_URL` 的主机和端口可以访问，并检查用户名、密码及数据库名。远程数据库还需要检查防火墙白名单。

### 管理员无法登录

确认登录邮箱与 `ADMIN_EMAIL` 完全一致，并重新生成 `ADMIN_PASSWORD_HASH`。环境变量修改后需要重启开发服务器。

### 项目链接突然失效

确认 `PROJECT_TOKEN_PEPPER` 没有变化。该值变化后，旧项目链接将无法通过校验。
