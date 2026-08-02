# administrator-authentication Specification

## Purpose

为单管理员部署提供安全的登录与会话保护，使项目管理能力只向被授权的管理员开放，而不会要求项目协作者创建账户。

## Requirements

### Requirement: 管理员凭据登录
系统 SHALL 使用部署环境中配置的单管理员凭据验证登录请求。登录失败时系统 MUST 返回通用错误消息，且不得透露账号或密码哪一项不正确。

#### Scenario: 使用有效凭据登录
- **WHEN** 管理员提交有效的账号和密码
- **THEN** 系统建立管理员会话并将其重定向至项目管理后台

#### Scenario: 使用无效凭据登录
- **WHEN** 访客提交无效账号或密码
- **THEN** 系统不建立会话并在登录页显示通用失败提示

### Requirement: 安全管理员会话
系统 SHALL 通过仅服务端可读的安全 Cookie 保存有限时效的管理员会话。会话 Cookie MUST 设置 `HttpOnly`、`SameSite=Lax`，且在 HTTPS 部署时设置 `Secure`。

#### Scenario: 已登录管理员请求后台
- **WHEN** 浏览器携带有效且未过期的管理员会话 Cookie 请求后台页面或接口
- **THEN** 系统允许该请求继续执行

#### Scenario: 会话缺失或无效
- **WHEN** 请求未携带有效管理员会话 Cookie
- **THEN** 系统拒绝管理员 API 请求，或将后台页面请求重定向至登录页

### Requirement: 管理员登出
系统 SHALL 允许管理员主动登出，并使当前浏览器中的管理员会话失效。

#### Scenario: 管理员登出
- **WHEN** 已登录管理员执行登出操作
- **THEN** 系统清除会话 Cookie，后续后台请求要求再次登录

### Requirement: 管理员入口保护
系统 SHALL 保护所有 `/admin` 页面和 `/api/admin` 接口，不得依赖客户端隐藏按钮作为访问控制。

#### Scenario: 未登录访客访问管理员页面
- **WHEN** 未登录访客访问任一 `/admin` 路径
- **THEN** 系统将访客导向登录页并保留安全的后台返回地址

#### Scenario: 未登录访客调用管理员接口
- **WHEN** 未登录访客调用任一 `/api/admin` 路径
- **THEN** 系统返回未授权响应且不改变项目数据
