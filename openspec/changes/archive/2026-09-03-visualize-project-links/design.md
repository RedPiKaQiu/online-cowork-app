## Context

当前 `projects` 表只保存 `access_token_hash`，`listActiveProjects()` 也只返回项目元数据；原始 token 仅在创建或重置响应中存在，因此页面刷新后无法重新构造 `/p/[token]`。现有 `ProjectList` 只在创建成功后临时渲染 `ShareLink`，项目条目本身没有链接。需求与安全边界见 proposal.md 和 `administrator-project-management` delta spec。

## Goals / Non-Goals

**Goals:**

- 让新建或重置后的活动项目在每次已认证管理员列表读取中获得当前 `accessUrl`。
- 在项目条目中统一提供可选择的 URL、复制反馈和直接导航。
- 继续使用 token 哈希完成匿名项目鉴权，并避免在数据库中保存明文 token。
- 兼容迁移前项目，不自动轮换或破坏其仍在使用的旧链接。

**Non-Goals:**

- 不改变 `/p/[token]`、项目快照 API 或匿名协作者的访问语义。
- 不恢复迁移前已经丢弃的原始 token，也不批量重置既有链接。
- 不新增项目选择器、链接权限分级、链接过期时间或审计功能。

## Decisions

### 使用独立密钥加密可恢复 token，并继续保留鉴权哈希

在 `projects` 增加可空 `access_token_ciphertext` 字段。创建和重置链接时，继续计算现有 `access_token_hash` 供高频访问校验，同时使用 Node.js `crypto` 的 AES-256-GCM 和新的 `PROJECT_TOKEN_ENCRYPTION_KEY` 加密 token；密文字段包含带版本的 IV、authentication tag 与 ciphertext，以支持格式校验和未来密钥轮换。

采用独立加密密钥而不是直接复用 `PROJECT_TOKEN_PEPPER`，避免哈希 pepper 与可逆加密密钥耦合。替代方案是在数据库保存明文 token，改动较小但扩大数据库读取泄露的影响；只保留哈希则无法满足刷新后展示链接的需求。

### 仅在管理员服务边界解密并返回 `accessUrl`

`listActiveProjects()` 在服务端对非空密文解密，通过 `APP_URL` 和 `createProjectAccessUrl()` 构造 URL，并只向通过 `requireAdminPage` 或 `requireAdminApi` 的调用方返回 `accessUrl: string | null`。DTO 不包含 hash、ciphertext 或原始 token 字段。解密失败按安全配置或数据完整性错误处理，不把密文细节返回客户端。

替代方案是增加单独的“读取链接”接口，但项目列表需要逐项目请求，增加延迟与状态复杂度，而链接本身并没有比已认证列表更高的权限边界。

### 迁移字段保持可空，旧项目由管理员显式重置

数据库迁移只添加可空字段，不尝试从哈希恢复 token，也不自动重置项目。`accessTokenCiphertext = null` 映射为 `accessUrl = null`，项目条目显示链接不可用及进入现有设置页重置链接的入口。这样保留旧链接有效性，并让迁移可无损上线。

### 在项目条目内复用并增强链接交互

调整 `ShareLink`（或抽取等价的可复用组件），使其适用于持续展示场景：URL 使用真实 `<a>` 元素指向所选 `/p/[token]`，同时保留可选择文本与独立复制按钮。复制逻辑捕获 Clipboard API 异常，成功和失败均通过可访问的状态消息反馈；失败时不隐藏 URL，管理员仍可手动选择复制。

创建成功后把返回的 `accessUrl` 合并进新项目的列表项，不再依赖“仅本次显示”的独立临时卡片。设置页重置成功后继续展示新 URL，返回列表后由服务端读取相同加密 token。

## Risks / Trade-offs

- [加密密钥泄露后密文可被解密] → 使用独立的高熵部署机密，不写入日志或客户端；保留 token 重置作为泄露后的撤销机制。
- [密钥丢失或错误导致已有密文不可恢复] → 启动/读取时明确报告配置错误；管理员可在恢复正确密钥后重试，必要时逐项目重置链接。
- [链接进入浏览器历史、剪贴板或肩窥范围] → 这是可复制匿名链接的固有属性；仅向已认证管理员展示，并保持重置立即撤销旧 token。
- [旧项目不能立即显示链接] → 以明确的“链接不可用”状态和重置入口处理，不为便利而静默失效现有链接。

## Migration Plan

1. 添加可空 `access_token_ciphertext` 数据库迁移并更新 Drizzle schema；不回填旧记录。
2. 部署前配置新的 `PROJECT_TOKEN_ENCRYPTION_KEY`，并更新环境变量示例和部署文档。
3. 部署加密工具、管理员项目服务/API 与管理界面；此后新建或重置的项目自动写入密文。
4. 管理员按需重置旧项目链接，使对应项目获得可恢复链接；旧链接在重置前保持有效。
5. 回滚应用代码时保留新增可空字段和密文数据，旧版本仍使用 `access_token_hash` 验证项目访问；不要删除加密密钥，以便重新部署时恢复链接。
