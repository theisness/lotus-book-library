# Readest 自托管部署指南：迁移到 book.ssbx.site

本文档面向将 Readest 开源项目部署到自有域名（如 `book.ssbx.site`）的场景，涵盖：基础设施准备、环境变量配置、代码修改、Supabase 配置、OAuth 回调、存储、Docker 一键部署等全流程。

---

## 一、整体架构概览

```text
用户浏览器
    │
    ▼
book.ssbx.site  （Next.js Web 前端 + API）
    │
    ├── Supabase（认证 + 数据库 + RLS）
    │       ├── GoTrue（Auth / OAuth 回调）
    │       ├── PostgREST（REST API）
    │       └── PostgreSQL（业务数据）
    │
    └── 对象存储（MinIO / S3 / R2）
            └── 书籍文件 + 封面图片
```

**两种部署模式（二选一）：**

| 模式                          | 说明                                 | 适合场景                 |
| ----------------------------- | ------------------------------------ | ------------------------ |
| **Docker Compose（推荐）**    | 全部服务本地运行，含 Supabase 自托管 | 有服务器、想完全自控     |
| **Supabase Cloud + 独立前端** | 使用 Supabase 托管免费套餐           | 快速上线、无需维护数据库 |

---

## 二、前置准备

### 2.1 服务器要求

- OS：Ubuntu 22.04 / Debian 12 或同等 Linux
- CPU：2 核+
- 内存：4 GB+（Supabase 全栈约需 2 GB）
- 磁盘：20 GB+（含书籍文件存储空间）
- 公网 IP + 域名解析：将 `book.ssbx.site` A 记录指向服务器 IP

### 2.2 必要软件

```bash
# Docker & Docker Compose
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt-get install -y nodejs

# pnpm
npm install -g pnpm@10
```

### 2.3 生成必要密钥

```bash
# PostgreSQL 密码（至少 32 字符）
openssl rand -base64 32

# JWT Secret（至少 32 字符）
openssl rand -base64 32

# 生成 ANON_KEY（签名 payload: {"role":"anon"}）
# 生成 SERVICE_ROLE_KEY（签名 payload: {"role":"service_role"}）
# 在线工具：https://jwt.io/  选 HS256 算法，填入 JWT_SECRET
# 或命令行：
npx jsonwebtoken-cli sign '{"role":"anon"}' --secret '<JWT_SECRET>' --algorithm HS256
npx jsonwebtoken-cli sign '{"role":"service_role"}' --secret '<JWT_SECRET>' --algorithm HS256

# MinIO 密码（至少 8 字符）
openssl rand -base64 16
```

---

## 三、代码修改清单

需改动的文件极少，绝大多数配置通过环境变量覆盖。

### 3.1 必改：`apps/readest-app/src/services/constants.ts`

这些常量是环境变量未设置时的硬编码回退值，必须改为自己的域名：

```typescript
// 修改前（原始值）
export const READEST_WEB_BASE_URL = 'https://web.readest.com';
export const READEST_NODE_BASE_URL = 'https://node.readest.com';
export const DOWNLOAD_READEST_URL = 'https://readest.com?utm_source=readest_web';

// 修改后（替换为自己的域名）
export const READEST_WEB_BASE_URL = 'https://book.ssbx.site';
export const READEST_NODE_BASE_URL = 'https://book.ssbx.site';
export const DOWNLOAD_READEST_URL = 'https://book.ssbx.site';
```

> **提示**：Docker Compose 部署时通过 `build.args` 传入 `NEXT_PUBLIC_API_BASE_URL`，会覆盖常量。但修改源码是更保险的做法，避免边缘场景漏用硬编码。

### 3.2 可选：`wrangler.toml`（仅 Cloudflare Workers 部署时修改）

Docker 部署时**跳过此步**。若使用 Cloudflare Workers 部署前端：

```toml
# 修改 routes 为自己的域名
[[routes]]
pattern = "book.ssbx.site"
zone_name = "ssbx.site"
custom_domain = true

# 删除所有 readest.com 相关的 routes
```

### 3.3 无需修改的文件

| 文件                          | 原因                                                        |
| ----------------------------- | ----------------------------------------------------------- |
| `src/services/environment.ts` | `getBaseUrl()` 通过 `NEXT_PUBLIC_API_BASE_URL` 环境变量覆盖 |
| `src/app/auth/page.tsx`       | `WEB_AUTH_CALLBACK` 动态调用 `getBaseUrl()`，跟随环境变量   |
| `src/pages/api/public/*.ts`   | 通过 Supabase 环境变量连接，无硬编码地址                    |
| `docker/compose.yaml`         | 已完全通过 `.env` 参数化                                    |

---

## 四、环境变量配置

### 4.1 Docker Compose 配置文件（`docker/.env`）

```bash
cd /path/to/readest
cp docker/.env.example docker/.env
nano docker/.env
```

填写内容（带 `<>` 的替换为实际值）：

```bash
# ===== 服务器地址 =====
# 客户端浏览器访问后端 API 用（公网域名或 IP，不加协议前缀）
HOST_IP=book.ssbx.site

# ===== PostgreSQL =====
POSTGRES_PASSWORD=<openssl rand -base64 32 生成>
POSTGRES_HOST=db
POSTGRES_PORT=5432
POSTGRES_DB=postgres

# ===== JWT =====
JWT_EXPIRY=3600
JWT_SECRET=<openssl rand -base64 32 生成，32字符+>
ANON_KEY=<JWT_SECRET 签名 {"role":"anon"} 生成的 JWT>
SERVICE_ROLE_KEY=<JWT_SECRET 签名 {"role":"service_role"} 生成的 JWT>

# ===== Kong 网关 =====
KONG_HTTP_PORT=8000

# ===== Auth（GoTrue）=====
API_EXTERNAL_URL=https://book.ssbx.site/supabase
SITE_URL=https://book.ssbx.site
ADDITIONAL_REDIRECT_URLS=https://book.ssbx.site/**

# ===== 注册策略 =====
DISABLE_SIGNUP=false
ENABLE_EMAIL_SIGNUP=true
# 测试阶段用 true（跳过邮箱验证）；生产建议改为 false 并配置 SMTP
ENABLE_EMAIL_AUTOCONFIRM=true
ENABLE_ANONYMOUS_USERS=false

# ===== SMTP（邮件验证，ENABLE_EMAIL_AUTOCONFIRM=false 时必填）=====
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASS=your-smtp-password
SMTP_ADMIN_EMAIL=admin@ssbx.site
SMTP_SENDER_NAME=Book Shelf

# ===== MinIO 对象存储 =====
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=<openssl rand -base64 16 生成>
S3_BUCKET_NAME=readest-files

# ===== 配额（字节数 / 字符数）=====
STORAGE_FIXED_QUOTA=1073741824     # 1 GB，可按需调大
TRANSLATION_FIXED_QUOTA=50000
```

### 4.2 本地开发环境变量（`apps/readest-app/.env.local`）

**仅用于本地 `pnpm dev-web` 调试**，Docker 构建时不使用此文件。

```bash
# 平台标识
NEXT_PUBLIC_APP_PLATFORM=web

# 指向本地 Kong 网关
NEXT_PUBLIC_SUPABASE_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY>

# 对象存储
NEXT_PUBLIC_OBJECT_STORAGE_TYPE=s3
NEXT_PUBLIC_STORAGE_FIXED_QUOTA=1073741824
NEXT_PUBLIC_TRANSLATION_FIXED_QUOTA=50000

# 服务端变量（不暴露给浏览器）
SUPABASE_URL=http://localhost:8000
SUPABASE_ANON_KEY=<ANON_KEY>
SUPABASE_ADMIN_KEY=<SERVICE_ROLE_KEY>

S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_BUCKET_NAME=readest-files
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=<MINIO_ROOT_PASSWORD>
```

---

## 五、OAuth 登录配置

### 5.1 原理说明

OAuth 流程结束后，提供商将用户重定向到回调地址。代码中该地址为：

```typescript
// src/app/auth/page.tsx 第 49 行
const WEB_AUTH_CALLBACK = `${getBaseUrl()}/auth/callback`;
// getBaseUrl() = NEXT_PUBLIC_API_BASE_URL ?? READEST_WEB_BASE_URL
// 设置环境变量后实际值为：https://book.ssbx.site/auth/callback
```

此 URL 需同时注册到：① OAuth 提供商后台 ② Supabase GoTrue 白名单。

### 5.2 Google OAuth 配置步骤

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建项目 → API 和服务 → 凭据 → 创建 OAuth 2.0 客户端 ID
3. 应用类型选「Web 应用」
4. 已获授权的重定向 URI 添加：
   ```
   https://book.ssbx.site/auth/callback
   ```
5. 保存后获得 **Client ID** 和 **Client Secret**
6. Supabase Dashboard → Authentication → Providers → Google → 填入 Client ID / Secret → 启用

### 5.3 GitHub OAuth 配置步骤（可选）

1. GitHub → Settings → Developer settings → OAuth Apps → New OAuth App
2. 填写：
   - Homepage URL: `https://book.ssbx.site`
   - Authorization callback URL: `https://book.ssbx.site/auth/callback`
3. 获得 Client ID / Secret 后填入 Supabase Providers → GitHub

### 5.4 GoTrue 白名单配置（`docker/.env`）

```bash
SITE_URL=https://book.ssbx.site
ADDITIONAL_REDIRECT_URLS=https://book.ssbx.site/**
```

### 5.5 同时支持本地开发登录

```bash
# docker/.env
ADDITIONAL_REDIRECT_URLS=https://book.ssbx.site/**,http://localhost:3002/**
```

在 Google / GitHub 后台同步添加 `http://localhost:3002/auth/callback`。

---

## 六、Docker Compose 部署

### 6.0 ENV 变量与前端构建的关系

Readest 的环境变量分两类，配置位置和作用完全不同：

| 类型           | 变量名前缀      | 写入位置                       | 何时生效                                | 说明                                      |
| -------------- | --------------- | ------------------------------ | --------------------------------------- | ----------------------------------------- |
| **构建时变量** | `NEXT_PUBLIC_*` | `compose.yaml` → `build.args`  | `docker compose build` 时烧入 JS bundle | 浏览器端可读，改了必须重新构建镜像        |
| **运行时变量** | 无前缀          | `compose.yaml` → `environment` | 容器启动时注入                          | 仅 Node.js 服务端可读，改了重启容器即生效 |

**构建时变量**（`docker/.env` → `compose.yaml` build.args → Dockerfile ARG → 编译进 JS）：

```bash
# compose.yaml client.build.args 中已自动从 .env 读取，无需手动改 compose.yaml
NEXT_PUBLIC_SUPABASE_URL=http://${HOST_IP}:7000     # 浏览器访问 Kong 网关的地址
NEXT_PUBLIC_SUPABASE_ANON_KEY=${ANON_KEY}           # Supabase 匿名 key
NEXT_PUBLIC_APP_PLATFORM=web                         # 固定 web
NEXT_PUBLIC_API_BASE_URL=http://${HOST_IP}:3000      # 浏览器访问 Next.js API 的地址
NEXT_PUBLIC_OBJECT_STORAGE_TYPE=s3                   # 对象存储类型（s3 / r2）
NEXT_PUBLIC_STORAGE_FIXED_QUOTA=${STORAGE_FIXED_QUOTA}
NEXT_PUBLIC_TRANSLATION_FIXED_QUOTA=${TRANSLATION_FIXED_QUOTA}
```

**运行时变量**（`docker/.env` → `compose.yaml` environment → 容器环境变量）：

```bash
# Next.js 服务端（API 路由）使用，不暴露给浏览器
SUPABASE_URL=http://kong:8000          # Docker 内部网络访问 Kong（固定，不改）
SUPABASE_ANON_KEY=${ANON_KEY}
SUPABASE_ADMIN_KEY=${SERVICE_ROLE_KEY} # 拥有完全权限，仅服务端使用

S3_ENDPOINT=http://${HOST_IP}:9000     # MinIO S3 接口地址
S3_REGION=us-east-1                    # 固定
S3_BUCKET_NAME=${S3_BUCKET_NAME}
S3_ACCESS_KEY_ID=${MINIO_ROOT_USER}
S3_SECRET_ACCESS_KEY=${MINIO_ROOT_PASSWORD}
```

> ⚠️ **注意端口问题**：`compose.yaml` 中 `NEXT_PUBLIC_SUPABASE_URL` 写的是 `HOST_IP:7000`，但 Kong 实际监听 `KONG_HTTP_PORT`（默认 8000）。README 中暴露端口也显示 Kong 对外是 7000。**需确认 `KONG_HTTP_PORT=7000`**（而非 8000），否则浏览器无法连接 Supabase。

### 6.1 启动服务

```bash
cd /path/to/readest/docker

# 首次启动（含构建前端镜像，约 5-10 分钟）
docker compose up -d --build

# 查看所有服务状态
docker compose ps

# 查看日志
docker compose logs -f client
docker compose logs -f auth

# 停止服务
docker compose down

# 停止并删除数据卷（清空数据库和存储）
docker compose down -v
```

启动后各服务端口（与 `docker/README.md` 一致）：

| 服务          | 端口 | 说明                                         |
| ------------- | ---- | -------------------------------------------- |
| Next.js 前端  | 3000 | 主应用入口，访问 `http://localhost:3000`     |
| Kong API 网关 | 7000 | Supabase API 入口（`KONG_HTTP_PORT` 默认值） |
| MinIO 控制台  | 9001 | 对象存储管理界面                             |
| MinIO S3 API  | 9000 | 书籍文件存储接口                             |
| PostgreSQL    | 5432 | 数据库（仅内部访问）                         |

### 6.2 热重载开发模式

开发时可将 `compose.yaml` 中 `client` 服务的构建 target 改为 `development-stage`，并取消注释 `volumes` 块：

```yaml
# compose.yaml client 服务
build:
  target: development-stage # 改为 development-stage
volumes:
  - ../:/app
  - /app/node_modules
  - /app/apps/readest-app/node_modules
  - /app/apps/readest-app/public/vendor
  - /app/apps/readest-app/.next
  - /app/packages/foliate-js/node_modules
```

### 6.3 独立构建前端镜像（不用 Compose）

如需单独构建前端镜像（例如 CI/CD 场景）：

```bash
# 在仓库根目录执行
docker build \
  --target production-stage \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=http://book.ssbx.site:7000 \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY> \
  --build-arg NEXT_PUBLIC_APP_PLATFORM=web \
  --build-arg NEXT_PUBLIC_API_BASE_URL=https://book.ssbx.site \
  --build-arg NEXT_PUBLIC_OBJECT_STORAGE_TYPE=s3 \
  --build-arg NEXT_PUBLIC_STORAGE_FIXED_QUOTA=1073741824 \
  --build-arg NEXT_PUBLIC_TRANSLATION_FIXED_QUOTA=50000 \
  -t readest-client \
  .

# 运行镜像（注入运行时变量）
docker run -p 3000:3000 \
  -e SUPABASE_URL=http://kong:8000 \
  -e SUPABASE_ANON_KEY=<ANON_KEY> \
  -e SUPABASE_ADMIN_KEY=<SERVICE_ROLE_KEY> \
  -e S3_ENDPOINT=http://book.ssbx.site:9000 \
  -e S3_REGION=us-east-1 \
  -e S3_BUCKET_NAME=readest-files \
  -e S3_ACCESS_KEY_ID=<MINIO_ROOT_USER> \
  -e S3_SECRET_ACCESS_KEY=<MINIO_ROOT_PASSWORD> \
  readest-client
```

### 6.4 Nginx 反向代理配置

```bash
sudo apt install -y nginx certbot python3-certbot-nginx

# 申请 HTTPS 证书
sudo certbot --nginx -d book.ssbx.site
```

创建 `/etc/nginx/sites-available/book.ssbx.site`：

```nginx
server {
    listen 80;
    server_name book.ssbx.site;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name book.ssbx.site;

    ssl_certificate /etc/letsencrypt/live/book.ssbx.site/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/book.ssbx.site/privkey.pem;

    # 主应用（Next.js）
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Supabase API（Kong 网关）
    location /supabase/ {
        rewrite ^/supabase/(.*) /$1 break;
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/book.ssbx.site /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

## 七、备选方案：Supabase Cloud + 独立前端

如果不想自己运维数据库，可以使用 [Supabase Cloud](https://supabase.com) 免费套餐。

### 7.1 Supabase Cloud 配置步骤

1. 注册 [supabase.com](https://supabase.com)，创建新项目
2. 进入 **SQL Editor**，执行 `docker/volumes/db/init/schema.sql` 中的全部建表语句
3. 在 **Authentication → URL Configuration** 中设置：
   - Site URL: `https://book.ssbx.site`
   - Redirect URLs: `https://book.ssbx.site/**`
4. 在 **Authentication → Providers** 中配置 Google / GitHub OAuth
5. 在 **Project Settings → API** 中获取：
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role secret` key → `SUPABASE_ADMIN_KEY`

### 7.2 对象存储选择

| 方案            | 配置变量前缀           | 适合场景                 |
| --------------- | ---------------------- | ------------------------ |
| Cloudflare R2   | `R2_*`                 | 已有 CF 账号，流量费用低 |
| AWS S3          | `S3_*`                 | 已有 AWS 账号            |
| MinIO（自托管） | `S3_*`（兼容 S3 协议） | 完全自控                 |

设置 `NEXT_PUBLIC_OBJECT_STORAGE_TYPE=r2` 或 `=s3` 切换模式。

---

## 八、数据库迁移

### 8.1 初始化（首次部署）

Docker Compose 部署时，`schema.sql` 会在 PostgreSQL 启动时**自动执行**（通过 `docker-entrypoint-initdb.d` 挂载）。

如使用 Supabase Cloud，手动在 SQL Editor 中执行：

```
docker/volumes/db/init/schema.sql
```

该文件包含：

- `books`、`book_configs`、`book_notes`、`files` 表（含 RLS 策略）
- `public_books` 表（公共书架，含匿名只读权限）
- 所有索引和权限授权

### 8.2 后续版本升级

从上游仓库拉取新版本后，检查 `schema.sql` 是否有变更，手动执行增量 SQL：

```bash
git log --oneline docker/volumes/db/init/schema.sql
git diff HEAD~1 docker/volumes/db/init/schema.sql
```

---

## 九、迁移检查清单

部署前逐项核对：

### 代码修改

- [ ] `constants.ts` 中 `READEST_WEB_BASE_URL` 改为 `https://book.ssbx.site`
- [ ] `constants.ts` 中 `READEST_NODE_BASE_URL` 改为 `https://book.ssbx.site`

### 环境变量

- [ ] `docker/.env` 中 `HOST_IP` 设置正确
- [ ] `JWT_SECRET` 已生成（32字符+）
- [ ] `ANON_KEY` / `SERVICE_ROLE_KEY` 已用 JWT_SECRET 正确签名
- [ ] `POSTGRES_PASSWORD` 已设置强密码
- [ ] `MINIO_ROOT_PASSWORD` 已设置
- [ ] `SITE_URL` = `https://book.ssbx.site`
- [ ] `ADDITIONAL_REDIRECT_URLS` 包含 `https://book.ssbx.site/**`

### OAuth 配置

- [ ] Google Cloud Console 添加回调 URI: `https://book.ssbx.site/auth/callback`
- [ ] Supabase Auth Providers 中填入 Google Client ID / Secret
- [ ] （可选）GitHub OAuth App 回调 URL 已更新

### 基础设施

- [ ] 域名 DNS A 记录已指向服务器 IP
- [ ] HTTPS 证书已申请（certbot）
- [ ] Nginx 配置已验证（`nginx -t`）
- [ ] Docker Compose 启动成功（`docker compose ps` 所有服务 running）
- [ ] MinIO bucket `readest-files` 已创建
- [ ] 数据库 `schema.sql` 已执行

### 功能验证

- [ ] 访问 `https://book.ssbx.site` 正常显示
- [ ] 未登录用户可浏览公共书架
- [ ] Google OAuth 登录后正确跳回 `book.ssbx.site`
- [ ] 登录用户可上传书籍
- [ ] 登录用户可发布/取消发布到公共书架

---

## 十、常见问题

### Q1: 登录后跳转到了 `web.readest.com` 而不是 `book.ssbx.site`

**原因**：`NEXT_PUBLIC_API_BASE_URL` 未注入，或 `constants.ts` 硬编码未修改。

**解决**：确认 `docker/compose.yaml` 的 `build.args` 包含 `NEXT_PUBLIC_API_BASE_URL: https://book.ssbx.site`，重新构建：

```bash
docker compose up -d --build --force-recreate client
```

### Q2: OAuth 回调报 `redirect_uri_mismatch` 错误

**原因**：OAuth 提供商后台未添加你的回调地址。

**解决**：到 Google Cloud Console / GitHub OAuth App 后台添加：

```
https://book.ssbx.site/auth/callback
```

### Q3: 书籍上传失败

**原因**：MinIO 未正常启动，或 `S3_*` 环境变量配置错误。

**解决**：

```bash
docker compose logs minio
# 访问 MinIO 控制台确认 bucket 存在：http://<服务器IP>:9001
```

### Q4: 未登录用户查询公共书架失败

**原因**：数据库 schema 未执行，或 `anon` 角色未授权。

**解决**：在 psql / Supabase SQL Editor 中确认：

```sql
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'public_books';
-- 结果应包含 anon 角色的 SELECT 权限
```

### Q5: 本地开发时 Google 登录报错

**原因**：GoTrue 白名单未包含 `localhost`，且 OAuth 提供商未注册本地回调。

**解决**：参考第五节 5.5，同时更新 `docker/.env` 和 OAuth 提供商后台。
