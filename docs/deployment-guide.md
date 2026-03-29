# 前后端部署指南

本文档详细说明如何部署 Readest / 莲花书院的前端（Next.js）、后端（Express.js）及基础设施服务，并通过 Nginx 反向代理统一对外提供 HTTPS 访问。

---

## 一、架构总览

```text
                          ┌──────────────┐
                          │   Nginx      │
                          │  :80 → :443  │
                          │  SSL 终端    │
                          └──────┬───────┘
                                 │
          ┌──────────────────────┼──────────────────────┐
          │                      │                      │
          ▼                      ▼                      ▼
  ┌───────────────┐    ┌─────────────────┐    ┌──────────────────┐
  │  Next.js 前端 │    │  Express 后端   │    │  Kong API 网关   │
  │  :3000        │    │  :4000          │    │  :8000           │
  │  (SSR + 静态) │    │  /api/*         │    │  Supabase 路由   │
  └───────────────┘    └────────┬────────┘    └────────┬─────────┘
                                │                      │
                    ┌───────────┼───────────┐          │
                    ▼           ▼           ▼          ▼
              ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌──────────┐
              │  MinIO   │ │ GoTrue  │ │PostgREST │ │PostgreSQL│
              │  :9000   │ │  Auth   │ │  REST    │ │  :5432   │
              │  :9001   │ │  :9999  │ │  :3001   │ │          │
              └─────────┘ └─────────┘ └──────────┘ └──────────┘
```

**服务说明：**

| 服务             | 端口      | 说明                                                                |
| ---------------- | --------- | ------------------------------------------------------------------- |
| **Next.js 前端** | 3000      | SSR 页面渲染 + Pages/App Router API 路由                            |
| **Express 后端** | 4000      | 独立后端服务，提供 `/api/books`、`/api/storage`、`/api/sync` 等接口 |
| **Kong 网关**    | 8000      | Supabase API 网关，转发 Auth / PostgREST 请求                       |
| **MinIO**        | 9000/9001 | S3 兼容对象存储（书籍文件） / 管理控制台                            |
| **PostgreSQL**   | 5432      | 业务数据库（仅内部访问）                                            |

---

## 二、前端部署（Next.js）

### 2.1 Docker 部署（推荐）

项目根目录的 `Dockerfile` 提供多阶段构建：

```bash
# 在仓库根目录执行
docker build \
  --target production-stage \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://your-domain.com/supabase \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY> \
  --build-arg NEXT_PUBLIC_APP_PLATFORM=web \
  --build-arg NEXT_PUBLIC_API_BASE_URL=https://your-domain.com \
  --build-arg NEXT_PUBLIC_OBJECT_STORAGE_TYPE=s3 \
  --build-arg NEXT_PUBLIC_STORAGE_FIXED_QUOTA=1073741824 \
  --build-arg NEXT_PUBLIC_TRANSLATION_FIXED_QUOTA=50000 \
  -t readest-client \
  .
```

运行容器：

```bash
docker run -d --name readest-client \
  --restart unless-stopped \
  -p 3000:3000 \
  -e SUPABASE_URL=http://kong:8000 \
  -e SUPABASE_ANON_KEY=<ANON_KEY> \
  -e SUPABASE_ADMIN_KEY=<SERVICE_ROLE_KEY> \
  -e S3_ENDPOINT=http://<HOST_IP>:9000 \
  -e S3_REGION=us-east-1 \
  -e S3_BUCKET_NAME=readest-files \
  -e S3_ACCESS_KEY_ID=<MINIO_ROOT_USER> \
  -e S3_SECRET_ACCESS_KEY=<MINIO_ROOT_PASSWORD> \
  readest-client
```

> **构建时变量 vs 运行时变量：** `NEXT_PUBLIC_*` 前缀变量在 `docker build` 时烧入 JS bundle，修改后需重新构建镜像。无前缀变量在容器启动时注入，重启即生效。

### 2.2 裸机部署

```bash
# 安装依赖
pnpm install

# 配置环境变量
cp apps/readest-app/.env.example apps/readest-app/.env.local
# 编辑 .env.local 填入实际值（参考下方环境变量说明）

# 构建
pnpm --filter @readest/readest-app build-web

# 启动（监听 3000 端口）
pnpm --filter @readest/readest-app start-web
```

建议使用 PM2 管理进程：

```bash
npm install -g pm2

# 启动
pm2 start pnpm --name "readest-frontend" -- --filter @readest/readest-app start-web

# 开机自启
pm2 startup
pm2 save
```

### 2.3 前端环境变量

| 变量                                  | 必填 | 说明                               | 示例                               |
| ------------------------------------- | ---- | ---------------------------------- | ---------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`            | 是   | 浏览器访问 Supabase 的地址         | `https://your-domain.com/supabase` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`       | 是   | Supabase 匿名公钥                  | `eyJhbGci...`                      |
| `NEXT_PUBLIC_APP_PLATFORM`            | 是   | 固定 `web`                         | `web`                              |
| `NEXT_PUBLIC_API_BASE_URL`            | 是   | 前端自身的公网地址                 | `https://your-domain.com`          |
| `NEXT_PUBLIC_OBJECT_STORAGE_TYPE`     | 是   | 对象存储类型                       | `s3` 或 `r2`                       |
| `NEXT_PUBLIC_STORAGE_FIXED_QUOTA`     | 否   | 存储配额（字节）                   | `1073741824`                       |
| `NEXT_PUBLIC_TRANSLATION_FIXED_QUOTA` | 否   | 翻译配额（字符数）                 | `50000`                            |
| `SUPABASE_URL`                        | 是   | 服务端访问 Supabase（Docker 内网） | `http://kong:8000`                 |
| `SUPABASE_ANON_KEY`                   | 是   | 同上                               | `eyJhbGci...`                      |
| `SUPABASE_ADMIN_KEY`                  | 是   | Service Role Key（仅服务端）       | `eyJhbGci...`                      |
| `S3_ENDPOINT`                         | 是   | MinIO / S3 端点                    | `http://localhost:9000`            |
| `S3_REGION`                           | 否   | 存储区域                           | `us-east-1`                        |
| `S3_BUCKET_NAME`                      | 是   | 存储桶名                           | `readest-files`                    |
| `S3_ACCESS_KEY_ID`                    | 是   | 存储访问密钥                       | `minioadmin`                       |
| `S3_SECRET_ACCESS_KEY`                | 是   | 存储密钥                           | `your-password`                    |

---

## 三、后端部署（Express.js）

后端是独立的 Express.js 服务，位于 `apps/backend/`，监听端口 4000，提供以下 API：

- `/api/books` — 书籍管理
- `/api/storage` — 文件存储操作
- `/api/sync` — 阅读进度同步
- `/api/publicBook` — 公共书架
- `/api/public` — 公开接口

### 3.1 Docker 部署

在 `apps/backend/` 创建 Dockerfile（如项目未提供，手动创建）：

```bash
# 在仓库根目录运行（复用 monorepo 依赖安装）
docker build \
  --target production-stage \
  -t readest-backend \
  -f apps/backend/Dockerfile \
  .
```

或直接在 `docker/compose.yaml` 中添加后端服务（见第五节）。

### 3.2 裸机部署

```bash
# 构建
pnpm --filter @readest/backend build

# 启动（监听 4000 端口）
pnpm --filter @readest/backend start
```

使用 PM2：

```bash
pm2 start pnpm --name "readest-backend" -- --filter @readest/backend start
pm2 save
```

### 3.3 后端环境变量

后端从 `apps/backend/.env` 和 `apps/readest-app/.env.web` 中加载配置：

```bash
# apps/backend/.env
NODE_ENV=production
PORT=4000
BACKEND_HOST=0.0.0.0
CORS_ORIGIN=https://your-domain.com
PROTOCOL=https
HOST=your-domain.com

# Supabase
SUPABASE_URL=http://localhost:8000          # 或 Docker 内网 http://kong:8000
SUPABASE_ANON_KEY=<ANON_KEY>
SUPABASE_ADMIN_KEY=<SERVICE_ROLE_KEY>

# 对象存储（MinIO / S3）
OBJECT_STORAGE_TYPE=s3
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_BUCKET_NAME=readest-files
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=<MINIO_ROOT_PASSWORD>

# 配额
STORAGE_FIXED_QUOTA=1073741824
TRANSLATION_FIXED_QUOTA=50000
```

---

## 四、Docker Compose 全栈部署

推荐使用 `docker/compose.yaml` 一键部署全部基础设施。取消注释 `client` 服务块，并添加 `backend` 服务：

### 4.1 配置环境变量

```bash
cd docker
cp .env.example .env
# 编辑 .env，填入实际密钥和域名
```

关键配置项参考 [self-hosting-guide.md](self-hosting-guide.md) 第四节。

### 4.2 在 compose.yaml 中启用前后端

在 `docker/compose.yaml` 中取消 `client` 服务的注释，并添加 `backend` 服务：

```yaml
client:
  container_name: readest-client
  build:
    context: ..
    target: production-stage
    args:
      NEXT_PUBLIC_SUPABASE_URL: http://${HOST_IP}:${KONG_HTTP_PORT}
      NEXT_PUBLIC_SUPABASE_ANON_KEY: ${ANON_KEY}
      NEXT_PUBLIC_APP_PLATFORM: web
      NEXT_PUBLIC_API_BASE_URL: https://${HOST_IP}
      NEXT_PUBLIC_OBJECT_STORAGE_TYPE: s3
      NEXT_PUBLIC_STORAGE_FIXED_QUOTA: ${STORAGE_FIXED_QUOTA}
      NEXT_PUBLIC_TRANSLATION_FIXED_QUOTA: ${TRANSLATION_FIXED_QUOTA}
  restart: unless-stopped
  ports:
    - '3000:3000'
  environment:
    SUPABASE_URL: http://kong:8000
    SUPABASE_ANON_KEY: ${ANON_KEY}
    SUPABASE_ADMIN_KEY: ${SERVICE_ROLE_KEY}
    S3_ENDPOINT: http://minio:9000
    S3_REGION: us-east-1
    S3_BUCKET_NAME: ${S3_BUCKET_NAME}
    S3_ACCESS_KEY_ID: ${MINIO_ROOT_USER}
    S3_SECRET_ACCESS_KEY: ${MINIO_ROOT_PASSWORD}
  depends_on:
    - kong
    - minio

backend:
  container_name: readest-backend
  build:
    context: ..
    dockerfile: Dockerfile.backend
  restart: unless-stopped
  ports:
    - '4000:4000'
  environment:
    NODE_ENV: production
    PORT: 4000
    BACKEND_HOST: 0.0.0.0
    CORS_ORIGIN: https://${HOST_IP}
    PROTOCOL: https
    HOST: ${HOST_IP}
    SUPABASE_URL: http://kong:8000
    SUPABASE_ANON_KEY: ${ANON_KEY}
    SUPABASE_ADMIN_KEY: ${SERVICE_ROLE_KEY}
    OBJECT_STORAGE_TYPE: s3
    S3_ENDPOINT: http://minio:9000
    S3_REGION: us-east-1
    S3_BUCKET_NAME: ${S3_BUCKET_NAME}
    S3_ACCESS_KEY_ID: ${MINIO_ROOT_USER}
    S3_SECRET_ACCESS_KEY: ${MINIO_ROOT_PASSWORD}
    STORAGE_FIXED_QUOTA: ${STORAGE_FIXED_QUOTA}
    TRANSLATION_FIXED_QUOTA: ${TRANSLATION_FIXED_QUOTA}
  depends_on:
    - kong
    - minio
```

### 4.3 启动全部服务

```bash
cd docker
docker compose up -d --build

# 查看状态
docker compose ps

# 查看日志
docker compose logs -f client backend
```

---

## 五、Nginx 反向代理配置

### 5.1 安装 Nginx 和 Certbot

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

### 5.2 申请 SSL 证书

```bash
# 确保域名 DNS 已指向服务器 IP 且 80 端口可访问
sudo certbot certonly --nginx -d your-domain.com

# 或使用 standalone 模式（Nginx 未启动时）
sudo certbot certonly --standalone -d your-domain.com
```

### 5.3 Nginx 配置文件

创建 `/etc/nginx/sites-available/readest`：

```nginx
# ============================================================
# Readest / 莲花书院 - Nginx 反向代理配置
# ============================================================
# 服务端口映射：
#   - Next.js 前端:   127.0.0.1:3000
#   - Express 后端:   127.0.0.1:4000
#   - Kong 网关:      127.0.0.1:8000  (Supabase API)
#   - MinIO S3 API:   127.0.0.1:9000
#   - MinIO Console:  127.0.0.1:9001
# ============================================================

# 上游服务定义
upstream frontend {
    server 127.0.0.1:3000;
    keepalive 64;
}

upstream backend {
    server 127.0.0.1:4000;
    keepalive 32;
}

upstream supabase {
    server 127.0.0.1:8000;
    keepalive 32;
}

upstream minio_s3 {
    server 127.0.0.1:9000;
    keepalive 32;
}

upstream minio_console {
    server 127.0.0.1:9001;
    keepalive 32;
}

# ------------------------------------------------------------
# HTTP → HTTPS 重定向
# ------------------------------------------------------------
server {
    listen 80;
    listen [::]:80;
    server_name your-domain.com;

    # Let's Encrypt 验证路径（续期用）
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# ------------------------------------------------------------
# 主站 HTTPS 配置
# ------------------------------------------------------------
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name your-domain.com;

    # ----- SSL 证书 -----
    ssl_certificate     /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # ----- SSL 安全参数 -----
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;

    # ----- 安全头 -----
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains" always;

    # ----- 通用代理头 -----
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_http_version 1.1;

    # ----- 文件上传大小限制 -----
    client_max_body_size 100m;

    # ========================================
    # Express 后端 API  (/api/*)
    # ========================================
    location /api/ {
        proxy_pass http://backend;

        # 超时设置（上传大文件可能耗时较长）
        proxy_connect_timeout 60s;
        proxy_send_timeout    120s;
        proxy_read_timeout    120s;
    }

    # ========================================
    # Supabase API（Kong 网关）(/supabase/*)
    # ========================================
    location /supabase/ {
        rewrite ^/supabase/(.*) /$1 break;
        proxy_pass http://supabase;

        # WebSocket 支持（Supabase Realtime）
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_connect_timeout 60s;
        proxy_send_timeout    60s;
        proxy_read_timeout    120s;
    }

    # ========================================
    # MinIO S3 API（/s3/*)
    # 仅当需要通过 Nginx 代理 MinIO 时启用
    # ========================================
    location /s3/ {
        rewrite ^/s3/(.*) /$1 break;
        proxy_pass http://minio_s3;

        # S3 需要原始 Host
        proxy_set_header Host $http_host;

        # 支持大文件上传
        proxy_connect_timeout 300s;
        proxy_send_timeout    300s;
        proxy_read_timeout    300s;

        client_max_body_size 500m;
    }

    # ========================================
    # MinIO 管理控制台（/minio/）
    # 生产环境建议关闭或限制 IP 访问
    # ========================================
    location /minio/ {
        rewrite ^/minio/(.*) /$1 break;
        proxy_pass http://minio_console;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # 限制仅内网 / 管理员访问
        # allow 10.0.0.0/8;
        # allow 192.168.0.0/16;
        # deny all;
    }

    # ========================================
    # Next.js 前端（兜底路由）
    # ========================================
    location / {
        proxy_pass http://frontend;

        # Next.js HMR WebSocket（开发环境）
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # 静态资源缓存
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            proxy_pass http://frontend;
            proxy_cache_valid 200 30d;
            add_header Cache-Control "public, max-age=2592000, immutable";
        }

        # Next.js 静态文件
        location /_next/static/ {
            proxy_pass http://frontend;
            proxy_cache_valid 200 365d;
            add_header Cache-Control "public, max-age=31536000, immutable";
        }
    }
}
```

### 5.4 启用配置

```bash
# 创建软链接
sudo ln -sf /etc/nginx/sites-available/readest /etc/nginx/sites-enabled/readest

# 删除默认配置（可选）
sudo rm -f /etc/nginx/sites-enabled/default

# 测试配置合法性
sudo nginx -t

# 重载 Nginx
sudo systemctl reload nginx
```

### 5.5 自动续期证书

Certbot 安装时会自动添加 systemd timer，可验证：

```bash
sudo systemctl status certbot.timer

# 手动测试续期
sudo certbot renew --dry-run
```

---

## 六、精简版 Nginx 配置（仅前端 + 后端）

如果不通过 Nginx 代理 Supabase 和 MinIO（直接暴露端口或使用云服务），可使用以下精简配置：

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate     /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Strict-Transport-Security "max-age=63072000" always;

    client_max_body_size 100m;

    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_http_version 1.1;

    # Express 后端
    location /api/ {
        proxy_pass http://127.0.0.1:4000;
    }

    # Next.js 前端
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

---

## 七、环境变量与 Nginx 路由的对应关系

使用 Nginx 统一代理后，`NEXT_PUBLIC_*` 构建时变量需与 Nginx location 匹配：

| 环境变量                    | 值（Nginx 代理模式）               | 说明                                  |
| --------------------------- | ---------------------------------- | ------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`  | `https://your-domain.com/supabase` | 浏览器通过 `/supabase/` 路径访问 Kong |
| `NEXT_PUBLIC_API_BASE_URL`  | `https://your-domain.com`          | 前端自身地址                          |
| `API_EXTERNAL_URL` (GoTrue) | `https://your-domain.com/supabase` | OAuth 回调基础 URL                    |
| `SITE_URL` (GoTrue)         | `https://your-domain.com`          | 登录后跳转地址                        |
| `CORS_ORIGIN` (后端)        | `https://your-domain.com`          | 后端 CORS 白名单                      |

> **重要：** 当使用 Nginx 的 `/supabase/` 路径代理 Kong 后，浏览器不再直接访问 `:8000` 端口。构建前端镜像时 `NEXT_PUBLIC_SUPABASE_URL` 应设为 `https://your-domain.com/supabase`，而非 `http://HOST_IP:8000`。

---

## 八、部署方案对比

| 方案                            | 适用场景               | 复杂度 | 端口暴露            |
| ------------------------------- | ---------------------- | ------ | ------------------- |
| **Docker Compose + Nginx**      | 生产环境，单机全栈     | 中     | 仅 80/443           |
| **裸机 + PM2 + Nginx**          | 轻量 VPS，自行管理进程 | 中     | 仅 80/443           |
| **Docker Compose（无 Nginx）**  | 开发 / 内网测试        | 低     | 3000/4000/8000/9000 |
| **Cloudflare Workers + 云服务** | Serverless，无需服务器 | 高     | 无                  |

---

## 九、生产环境检查清单

### 安全

- [ ] 所有服务仅监听 `127.0.0.1`（通过 Nginx 对外），或使用防火墙限制端口
- [ ] MinIO 控制台（9001）不对公网开放
- [ ] PostgreSQL（5432）不对公网开放
- [ ] `SUPABASE_ADMIN_KEY` / `SERVICE_ROLE_KEY` 不出现在前端代码中
- [ ] Nginx 启用 HSTS 和安全头
- [ ] `docker/.env` 文件权限设为 `600`

### 防火墙配置

```bash
# 仅开放必要端口
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP（Certbot 验证 + 重定向）
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### 性能

- [ ] Nginx 启用 `http2`
- [ ] 静态资源设置长期缓存头
- [ ] 启用 Gzip 压缩（在 `nginx.conf` 的 `http` 块中）：

```nginx
# /etc/nginx/nginx.conf 的 http {} 块中添加
gzip on;
gzip_vary on;
gzip_proxied any;
gzip_comp_level 6;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;
gzip_min_length 1000;
```

### 日志

```bash
# Nginx 访问日志
tail -f /var/log/nginx/access.log

# Nginx 错误日志
tail -f /var/log/nginx/error.log

# Docker 服务日志
docker compose logs -f --tail=100
```

---

## 十、常见问题

### Q1: 前端访问 `/api/*` 路由返回 404

**原因：** Express 后端未启动，或 Nginx 未正确代理到 4000 端口。

**排查：**

```bash
# 确认后端运行中
curl http://127.0.0.1:4000/api/books
docker compose ps backend

# 检查 Nginx 错误日志
sudo tail -20 /var/log/nginx/error.log
```

### Q2: 通过 Nginx 访问 Supabase Auth 失败

**原因：** GoTrue 的 `API_EXTERNAL_URL` 与 Nginx 路径不匹配。

**解决：** 确保 `docker/.env` 中：

```bash
API_EXTERNAL_URL=https://your-domain.com/supabase
```

### Q3: 文件上传超时或失败

**原因：** Nginx 的 `client_max_body_size` 太小或 `proxy_send_timeout` 太短。

**解决：** 调大 Nginx 配置中的限制值：

```nginx
client_max_body_size 500m;
proxy_send_timeout 300s;
proxy_read_timeout 300s;
```

### Q4: 前端和后端的 `/api` 路径冲突

Next.js 自带 API 路由（`/pages/api/*` 和 `/app/api/*`），Express 后端也使用 `/api/*`。Nginx 配置中 `/api/` 优先匹配到 Express 后端。

**如需 Next.js API 路由和 Express 后端共存：**

```nginx
# Express 后端专用路径
location /backend-api/ {
    rewrite ^/backend-api/(.*) /api/$1 break;
    proxy_pass http://127.0.0.1:4000;
}

# Next.js（含其自带的 /api 路由）
location / {
    proxy_pass http://127.0.0.1:3000;
}
```

此时 Express 后端通过 `/backend-api/*` 访问，Next.js API 路由通过 `/api/*` 正常工作。

### Q5: 如何同时支持 HTTP 直连（开发）和 HTTPS（生产）

开发环境可直接访问各端口，无需 Nginx：

```
前端: http://localhost:3000
后端: http://localhost:4000/api/
Supabase: http://localhost:8000
MinIO: http://localhost:9001
```

生产环境通过 Nginx 统一入口，所有内部端口通过防火墙屏蔽。
