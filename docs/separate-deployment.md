# 分离部署指南

本文适用于需要分别维护 Online Cowork App 与 PostgreSQL 的环境。数据库和 App 可以独立启动、更新和停止，但仍通过同一个 Docker 内部网络通信。

如果只想在单台机器快速试用，请直接使用 [README 中的 Docker 快速试用](../README.md#docker-快速试用)。

## 1. 部署前准备

- Linux 服务器
- Git、Docker 与 Docker Compose
- Node.js 20+（发布脚本会运行配置校验、测试和生产构建）
- 服务器上的 `/opt/online-cowork/app` 目录

获取代码：

```bash
git clone <YOUR_REPOSITORY_URL> /opt/online-cowork/app
cd /opt/online-cowork/app
```

本指南不包含域名、反向代理和 HTTPS 配置。PostgreSQL 不应暴露到公网。

## 2. 配置生产环境

复制配置模板并限制读取权限：

```bash
cp .env.production.example .env.production
chmod 600 .env.production
```

按照文件中的注释替换以下配置：

- PostgreSQL 数据库名、用户和密码
- `DATABASE_URL` 中对应的连接信息
- 管理员邮箱和密码哈希
- `SESSION_SECRET` 与 `PROJECT_TOKEN_PEPPER`
- 最终访问地址 `APP_URL`

管理员密码哈希可以这样生成：

```bash
npx --yes pnpm@10.32.1 admin:hash-password '你的管理员密码'
```

两个应用密钥应分别生成，不要复用：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

如果密码含有 URL 特殊字符，写入 `DATABASE_URL` 前需要进行 URL 编码。不要提交 `.env.production`。

## 3. 启动 PostgreSQL

```bash
docker compose -f docker-compose.db.yml up -d
docker compose -f docker-compose.db.yml ps
```

这会创建名为 `cowork_internal` 的 Docker 网络和 `postgres_data` 数据卷。数据库不映射宿主机端口，只允许同一 Docker 网络中的服务访问。

检查数据库状态：

```bash
docker compose -f docker-compose.db.yml exec postgres pg_isready -U cowork -d cowork_trial
```

如果修改过默认数据库用户或数据库名，请同步替换命令参数。

## 4. 发布 App

```bash
sh scripts/deploy-production.sh
```

发布脚本会依次：

1. 校验生产环境配置。
2. 安装锁定版本的依赖。
3. 运行 lint、类型检查和单元测试。
4. 创建生产构建。
5. 执行数据库迁移。
6. 构建并启动 App 容器。
7. 检查应用就绪状态。

App 默认只监听服务器回环地址 `127.0.0.1:3000`。应由同机反向代理提供局域网或公网入口。

手动检查服务：

```bash
curl -fsS http://127.0.0.1:3000/api/health/ready
```

## 5. 后续更新

发布新版本前先备份数据库，然后更新代码并重新运行发布脚本：

```bash
set -a; . ./.env.production; set +a
sh scripts/backup-production.sh
git pull --ff-only
sh scripts/deploy-production.sh
```

发布脚本不会执行 seed，也不会停止 PostgreSQL。

## 6. 备份与恢复

创建备份：

```bash
set -a; . ./.env.production; set +a
sh scripts/backup-production.sh
```

备份保存在仓库根目录的 `backups/` 中，并使用 PostgreSQL 自定义归档格式。请将备份同步到受限的外部存储，并定期验证它可以恢复。

恢复前，先停止写入并把备份恢复到隔离数据库进行验证。确认备份和目标版本兼容后，再按 PostgreSQL 的 `pg_restore` 流程恢复生产数据。

## 7. 回滚

1. 切换到上一个稳定的 App 版本。
2. 重新运行 `sh scripts/deploy-production.sh`。
3. 检查就绪接口和核心操作。
4. 只有在迁移不兼容或数据受损时，才使用发布前备份恢复数据库。

应用回滚与数据库恢复是两项独立操作。不要在未验证备份的情况下直接覆盖生产数据库。

## 8. 数据与安全提醒

- 不要执行 `docker compose -f docker-compose.db.yml down -v`，`-v` 会删除数据库卷。
- 不要把 PostgreSQL 的 `5432` 端口映射到公网。
- 正式环境必须替换模板中的试用账号、密码和全部密钥。
- 修改 `SESSION_SECRET` 会让所有管理员重新登录。
- 修改 `PROJECT_TOKEN_PEPPER` 会让已有项目访问链接失效。
- 对外提供服务时，应通过 HTTPS 访问，确保管理员 Cookie 使用安全传输。
