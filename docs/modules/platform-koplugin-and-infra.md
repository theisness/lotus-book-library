# 平台模块：KOReader 插件与基础设施

## 模块定位

本模块说明以下平台支撑目录：

- `apps/readest.koplugin`：KOReader 插件
- `docker/`：自托管与本地联调基础设施
- `ops/`：Nix 开发环境定义

这些目录不直接承载主前端页面，但决定项目的跨平台部署与开发体验。

## 1) `apps/readest.koplugin`

### 目录文件

```text
apps/readest.koplugin/
├─ _meta.lua
├─ main.lua
├─ readestsync.lua
├─ syncannotations.lua
├─ syncauth.lua
├─ syncconfig.lua
├─ supabaseauth.lua
├─ selfupdate.lua
├─ readest-sync-api.json
└─ supabase-auth-api.json
```

### 功能角色

- 提供 KOReader 与 Readest 同步生态之间的桥接
- 处理认证、注释同步、配置同步、更新等能力
- 使用 Lua 脚本与 API 描述文件组织插件逻辑

### 与主应用关系

- 与 `src/pages/api/sync.ts`、`kosync.ts` 等接口形成生态互通
- 在多阅读终端场景中扩展 Readest 的数据同步覆盖范围

## 2) `docker/`

### 目录文件

```text
docker/
├─ README.md
├─ .env.example
├─ compose.yaml
└─ volumes/
   ├─ api/kong.yml
   └─ db/{jwt.sql,roles.sql}
```

### 栈说明（来自 docker/README）

- client：Readest Web 前端容器
- db：Supabase Postgres
- kong：API Gateway
- auth：GoTrue 认证服务
- rest：PostgREST
- minio：对象存储
- minio-setup：桶初始化辅助

### 使用价值

- 提供开箱即用的本地自托管联调环境
- 支撑存储、认证、网关等后端依赖的一体化启动

## 3) `ops/`

### 目录文件

```text
ops/
├─ flake.nix
└─ flake.lock
```

### 功能角色

- 基于 Nix Flake 定义统一开发环境
- 提供 web / ios / android 三套 dev shell
- 统一 Node、pnpm、Rust toolchain、Android SDK 等依赖

### 配置亮点

- 固定 Rust 组件（cargo/clippy/rustfmt/rust-src）
- 区分 Darwin 与 Linux 的系统库路径
- 为 Android shell 注入 `ANDROID_HOME`、`NDK_HOME`、`JAVA_HOME`

## 跨模块协作关系

- `docker/` 解决运行时依赖编排
- `ops/` 解决开发环境一致性
- `readest.koplugin` 解决生态端扩展覆盖

三者共同保证 Readest 不仅能构建主应用，也能在多环境、多终端中稳定运行。

## 维护建议

- `docker/.env` 中密钥与密码必须本地化，不应入库
- `compose.yaml` 变更后应同步更新 README 与端口说明
- Nix 依赖升级建议与 CI/本地构建链联动验证
