# 部署指导

## Nginx + Docker 生产部署

服务器安装 Docker、Compose、Git 与 Nginx，云防火墙仅开放 22、80、443，**不得**开放 5432。将仓库放至 `/opt/online-cowork/app`，复制 `.env.example` 为 `.env.production`，并填写 `POSTGRES_DB`、`POSTGRES_USER`、`POSTGRES_PASSWORD`、`DATABASE_URL`、管理员配置、`PROJECT_TOKEN_PEPPER`、HTTPS `APP_URL` 与 `APP_RELEASE`；执行 `chmod 600 .env.production`。

`.env.production` 不会被复制进 Docker 构建上下文；镜像构建使用无权限的占位 `DATABASE_URL`，运行时才由 Compose 注入真实连接串。

首次初始化数据库（仅一次；后续发布不要停止它）：

```bash
docker compose -f docker-compose.db.yml up -d
docker compose -f docker-compose.db.yml ps
```

将 `deploy/nginx-online-cowork.conf` 复制到 Nginx 站点目录，替换 `YOUR_DOMAIN`，配置已有的 Let's Encrypt 证书路径，然后执行 `sudo nginx -t && sudo systemctl reload nginx`。Nginx 反代 `127.0.0.1:3000`；Compose 不暴露数据库端口。

首次或每次发布：

```bash
cd /opt/online-cowork/app
git pull --ff-only
sh scripts/deploy-production.sh
curl -fsS https://YOUR_DOMAIN/api/health/ready
```

脚本执行质量门禁、在 Docker 内部网络运行生产迁移、镜像构建、App 容器替换和就绪检查，且不会执行 seed；不会停止 PostgreSQL。发布前执行 `set -a; . ./.env.production; set +a; sh scripts/backup-production.sh` 创建备份。

## 发布前

设置生产 `DATABASE_URL`、`ADMIN_EMAIL`、`ADMIN_PASSWORD_HASH`、`SESSION_SECRET`、`PROJECT_TOKEN_PEPPER`、HTTPS `APP_URL` 与可选 `APP_RELEASE`。不得提交真实值。依次运行 `pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build`；生产仅执行 `pnpm db:migrate`，不得执行 `pnpm db:seed`。

## 发布与验证

保存上一稳定构建，迁移前创建数据库备份；迁移成功且 `/api/health/ready` 返回 200 后切换流量。用 `E2E_ADMIN_EMAIL`、`E2E_ADMIN_PASSWORD` 和可选 `E2E_BASE_URL` 运行 `pnpm test:e2e`，验证登录、项目链接、任务写入与刷新读取。

## 服务器待办

部署平台必须配置 HTTPS、日志采集、`/api/health/live` 与 `/api/health/ready` 健康检查告警、数据库定期备份与隔离恢复演练。告警应覆盖就绪失败、5xx、延迟和备份失败。

## 回滚

先将流量切回上一稳定应用版本。若迁移不向后兼容或数据受损，从发布前备份恢复到隔离数据库验证后再恢复生产。记录版本、迁移、验证、告警和项目删除/链接重置审计事件。
