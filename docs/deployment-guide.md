# 部署指南

Online Cowork 提供两种 Docker 部署方式：

- **App 与 PostgreSQL 一体部署**：适合单机试用和小规模使用，请按照 [README 中的 Docker 快速试用](../README.md#docker-快速试用) 操作。
- **App 与 PostgreSQL 分离部署**：适合需要独立维护数据库的环境，请阅读 [分离部署指南](separate-deployment.md)。

本页作为原部署文档的兼容入口保留。生产环境变量的用途和生成方式请查看 `.env.production.example` 中的注释。
