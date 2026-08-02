# 远程 PostgreSQL 部署与本地开发

本文用于阶段 1：在远程 Linux 服务器部署开发数据库，本地运行 Next.js 并通过受防火墙限制的局域网 IP 访问数据库。应用代码完成后，Next.js 将部署到同一服务器。

本文以 Ubuntu 22.04/24.04、拥有 `sudo` 权限的 SSH 用户为例。将 `<SERVER_HOST>`、`<SSH_USER>`、`<SERVER_IP>` 替换成实际值；其他发行版请采用其官方 Docker 安装方式。

本地没有全局安装 pnpm 时，本文中的每条 `pnpm` 命令均可替换为 `npx --yes pnpm@10.32.1`，无需安装 Docker 或全局 pnpm。

## 1. 安全目标

- PostgreSQL 不直接暴露给公网；端口仅绑定服务器指定的局域网 IP。
- 服务器防火墙仅允许开发机的固定局域网 IP 访问 TCP 5432，不开放云安全组的 5432 端口。
- 数据保存于 Docker 命名卷；备份文件保存于服务器受限目录。
- `.env.local` 和服务器 `.env` 均为机密，不提交 Git。

## 2. 服务器准备

先使用 SSH 密钥登录服务器，并确认防火墙仅开放 SSH（以及未来 Web 所需的 80/443）：

```bash
ssh <SSH_USER>@<SERVER_HOST>
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
```

按 Docker 官方 Ubuntu 安装步骤安装 Docker Engine 与 Compose 插件。安装完成后验证：

```bash
docker --version
docker compose version
```

创建仅供本项目使用的目录与备份目录：

```bash
sudo install -d -m 750 -o "$USER" -g "$USER" /opt/online-cowork/backups
cd /opt/online-cowork
```

## 3. 创建服务器机密与 Compose 文件

在服务器 `/opt/online-cowork/.env` 写入下列内容。请使用密码管理器生成强随机密码；不要复用 SSH 或管理员密码。

```dotenv
POSTGRES_DB=cowork_dev
POSTGRES_USER=cowork
POSTGRES_PASSWORD=替换为至少32字符的随机密码
```

限制机密文件权限：

```bash
chmod 600 /opt/online-cowork/.env
```

创建 `/opt/online-cowork/docker-compose.yml`：

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: cowork-postgres
    restart: unless-stopped
    env_file: .env
    ports:
      - "<SERVER_LAN_IP>:5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $$POSTGRES_USER -d $$POSTGRES_DB"]
      interval: 5s
      timeout: 5s
      retries: 12

volumes:
  postgres_data:
```

将 `<SERVER_LAN_IP>` 替换为服务器的固定局域网 IP，例如 `192.168.1.20`。**不要**改成 `0.0.0.0:5432:5432`，也不要在云防火墙开放 5432。即使端口绑定在 LAN IP，仍必须在服务器防火墙限制唯一允许访问的开发机 IP：

```bash
sudo ufw allow from <DEVELOPER_LAN_IP> to <SERVER_LAN_IP> port 5432 proto tcp
sudo ufw deny 5432/tcp
sudo ufw status numbered
```

若服务器未使用 UFW，请在其现有防火墙（例如 nftables、firewalld 或云安全组）实现同等规则：仅 `<DEVELOPER_LAN_IP>` 可访问 `<SERVER_LAN_IP>:5432`。

## 4. 启动与健康检查

```bash
cd /opt/online-cowork
docker compose up -d
docker compose ps
docker compose logs --tail=50 postgres
docker compose exec postgres pg_isready -U cowork -d cowork_dev
```

最后一条命令返回 `accepting connections` 即表示数据库可用。可验证端口仅绑定在预期 LAN 地址：

```bash
sudo ss -ltnp | grep 5432
```

预期地址为 `<SERVER_LAN_IP>:5432`，而非 `0.0.0.0:5432` 或服务器公网 IP。

## 5. 本地局域网连接与环境配置

确认开发机 IP 已被服务器防火墙列入白名单后，复制仓库 `.env.example` 为 `.env.local`，填写与远程 `.env` 一致的密码和服务器局域网 IP：

```dotenv
DATABASE_URL=postgresql://cowork:实际数据库密码@<SERVER_LAN_IP>:5432/cowork_dev
PROJECT_TOKEN_PEPPER=本地开发随机长字符串
```

若数据库密码包含 `@`、`:`、`/`、`?`、`#`、`%`、`$` 或空格，必须在 `DATABASE_URL` 中进行 URL 编码；例如密码 `a@b#c` 应写为 `a%40b%23c`，`$` 应写为 `%24`。这也可避免 Next.js 对 `.env.local` 中 `$` 的变量展开。可在本地运行以下命令生成编码值，输出内容仅用于 `.env.local`：

```bash
node -p 'encodeURIComponent(process.argv[1])' '你的数据库密码'
```

在项目根目录加载变量并执行：

```bash
set -a; source .env.local; set +a
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm db:verify
```

`db:seed` 仅能在非生产环境显式运行；`db:verify` 会在一个自动回滚的事务中检查复合外键和软删除查询，不保留验证数据。

## 6. 常见问题

| 现象 | 排查方式 |
|---|---|
| 本地连接被拒绝 | 确认开发机与服务器位于可路由局域网，检查服务器防火墙白名单及 `nc -vz <SERVER_LAN_IP> 5432`。 |
| 局域网可达但无法连接 | 在服务器执行 `docker compose ps` 与 `docker compose logs postgres`；确认健康检查通过，并检查 Compose 绑定的 LAN IP。 |
| 密码认证失败 | 比对本地 `.env.local` 与远程 `.env` 的账号、密码、数据库名；确认连接串中的特殊字符已 URL 编码；修改服务器密码后重启容器。 |
| 迁移失败 | 先执行备份，再检查 `DATABASE_URL` 指向 `cowork_dev` 而非生产数据库。 |
| 数据库从公网或其他 LAN 设备可访问 | 立即停止容器，检查 Compose 是否绑定了指定 LAN IP，并收紧云安全组和服务器防火墙白名单。 |

## 7. 备份、恢复与持久化演练

在服务器创建压缩备份：

```bash
cd /opt/online-cowork
docker compose exec -T postgres pg_dump -U cowork -Fc cowork_dev > "backups/cowork_dev-$(date +%F-%H%M%S).dump"
chmod 600 backups/*.dump
```

恢复演练应始终先恢复到新数据库，避免覆盖开发库：

```bash
docker compose exec postgres createdb -U cowork cowork_restore_check
docker compose exec -T postgres pg_restore -U cowork -d cowork_restore_check < backups/你的备份文件.dump
docker compose exec postgres psql -U cowork -d cowork_restore_check -c '\\dt'
docker compose exec postgres dropdb -U cowork cowork_restore_check
```

验证 Docker 卷持久化时，先完成备份，然后仅重建容器而**不**删除卷：

```bash
docker compose down
docker compose up -d
docker compose exec postgres psql -U cowork -d cowork_dev -c '\\dt'
```

不要执行 `docker compose down -v`；该命令会删除数据库卷及数据。

## 8. 后续同机部署 Next.js

部署应用时，为 `app` 与 `postgres` 放入同一 Compose 文件和默认内部网络。应用使用服务名而非宿主机端口连接：

```dotenv
DATABASE_URL=postgresql://cowork:实际数据库密码@postgres:5432/cowork_prod
```

此时删除 PostgreSQL 的 `ports:` 配置，让数据库完全不再暴露给宿主机；应用仅通过 Docker 内部网络连接。部署前分别准备 `cowork_dev` 与 `cowork_prod`，严禁让本地 seed 指向生产数据库。

## 9. 管理员机密配置

部署 Next.js 前，在应用容器或服务器机密文件中配置以下变量，且文件权限设为仅部署用户可读：

```dotenv
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD_HASH=由 pnpm admin:hash-password 生成的 scrypt 哈希
SESSION_SECRET=至少32字节的随机 base64url 字符串
APP_URL=https://你的正式域名
```

生产环境必须以 HTTPS 提供服务，管理员 Cookie 才会携带 `Secure` 属性。泄露管理员密码时，重新生成密码哈希；怀疑会话密钥泄露时轮换 `SESSION_SECRET`，这会使全部已登录管理员重新登录。
