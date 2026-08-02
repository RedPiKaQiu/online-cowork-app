# online-cowork-app
轻量在线项目合作看板

## 管理员后台

配置 `.env.local` 后启动应用，通过 `/login` 进入管理员后台。

```dotenv
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD_HASH=使用下方命令生成
SESSION_SECRET=至少 32 字节的随机字符串
APP_URL=http://localhost:3000
```

生成管理员密码哈希：

```bash
pnpm admin:hash-password "你的管理员密码"
```

生产环境必须使用 HTTPS，并将 `APP_URL` 配置为正式 HTTPS 地址。轮换 `SESSION_SECRET` 会使全部管理员会话失效；重置项目访问链接会使对应旧链接失效。

部署、回滚与服务器待办见 [部署指导](docs/deployment-guide.md)。
