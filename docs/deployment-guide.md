# 部署指导

本项目使用 Docker 部署 App 和 PostgreSQL。网络入口、反向代理和 HTTPS 由部署环境自行管理，本说明不包含相关配置。

## 准备

- Linux 服务器已安装 Docker、Docker Compose 和 Git。
- 数据库端口 `5432` 不应暴露到公网。
- 获取代码并进入项目目录：

```bash
git clone <YOUR_REPOSITORY_URL> /opt/online-cowork/app
cd /opt/online-cowork/app
```

## 配置

复制示例文件并限制其权限：

```bash
cp .env.production.example .env.production
chmod 600 .env.production
```

环境变量的用途、试用默认值、安全替换方式均写在 `.env.production.example` 的注释中。默认账号为 `trial@example.com`，密码为 `try-cowork-2026`，只可用于本机或内网试用。

`PROJECT_TOKEN_ENCRYPTION_KEY` 必须是 32 字节随机值的标准 base64 编码，并作为长期部署机密备份。它只用于恢复管理员界面中的项目链接，不能与 `PROJECT_TOKEN_PEPPER` 或 `SESSION_SECRET` 共用。轮换该密钥前必须先用旧密钥解密并重新加密已有 token；当前版本不提供自动轮换。若密钥丢失，匿名项目访问仍可通过已有 hash 正常工作，但管理员只能逐个重置链接来重新建立可恢复密文。

`APP_URL` 默认使用服务器内部地址 `http://127.0.0.1:3000`。若需要让同一内网的其他设备访问链接，将其改为服务器实际内网 IP，例如 `http://192.168.1.20:3000`。对外访问地址由你的网络入口决定，若有变化只需更新 `APP_URL` 后重新部署。

## 一键部署（App + PostgreSQL）

适用于单台服务器试用或小规模部署。首次及后续更新均执行：

```bash
sh scripts/quickstart-production.sh
curl -fsS http://127.0.0.1:3000/api/health/ready
```

脚本会启动 PostgreSQL、执行迁移并启动 App。数据保存在 `postgres_data` 卷，正常更新不会删除数据；不要执行 `docker compose -f docker-compose.prod.yml down -v`。

## 分离部署（App 与数据库）

适合需要独立维护数据库的环境。首次初始化数据库：

```bash
docker compose -f docker-compose.db.yml up -d
docker compose -f docker-compose.db.yml ps
```

发布或更新 App：

```bash
cd /opt/online-cowork/app
git pull --ff-only
sh scripts/deploy-production.sh
curl -fsS http://127.0.0.1:3000/api/health/ready
```

发布脚本会校验运行环境、执行迁移、构建镜像并检查就绪状态；不会执行 seed，也不会停止 PostgreSQL。

## 备份与回滚

发布前执行备份：

```bash
set -a; . ./.env.production; set +a
sh scripts/backup-production.sh
```

回滚时先切换到上一稳定 App 版本。若迁移不兼容或数据受损，从发布前备份恢复到隔离数据库验证后，再恢复生产。
