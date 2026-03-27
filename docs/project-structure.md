# Readest 项目结构说明

## 1. 仓库整体结构（Monorepo）

```text
readest/
├─ apps/
│  ├─ readest-app/                # 主应用（Next.js + Tauri）
│  │  ├─ src/app/                 # 前端页面（App Router）+ app/api 路由
│  │  ├─ src/components/          # 通用组件（含 primitives 基础控件）
│  │  ├─ src/context/             # React Context（环境/鉴权/同步等）
│  │  ├─ src/store/               # Zustand 状态管理
│  │  ├─ src/services/            # 应用服务层（Native/Web/Node）
│  │  ├─ src/pages/api/           # Pages Router API（兼容/遗留）
│  │  └─ src-tauri/               # Rust/Tauri 原生后端
│  └─ readest.koplugin/           # KOReader 插件（Lua）
├─ packages/                      # 共享库与底层能力（foliate-js/wasm/tauri插件等）
├─ docker/                        # 本地依赖服务与部署相关配置
└─ ops/                           # 开发运维环境配置（Nix 等）
```

---

## 2. 前端结构

### 2.1 页面路由（`apps/readest-app/src/app`）

主要页面路由如下：

- `/`：主页（复用书库入口）
- `/library`：书库主页面
- `/reader`：阅读器页面
- `/opds`：OPDS 浏览与导入
- `/auth`、`/auth/callback`、`/auth/recovery`、`/auth/update`、`/auth/error`：认证流程页面
- `/user`、`/user/subscription/success`：用户中心与订阅结果页
- `/updater`：更新窗口页
- `/offline`：离线提示页

### 2.2 前端业务模块目录

- `src/app/library/`：书库模块（书架、导入、同步、设置入口）
- `src/app/reader/`：阅读器模块（阅读视图、目录、批注、TTS、快捷操作）
- `src/app/opds/`：在线书源浏览与导入
- `src/app/auth/`：登录、回调、恢复与更新密码流程
- `src/app/user/`：用户账户与订阅相关界面

### 2.3 核心控件与 UI 体系

- `src/components/primitives/`：基础 UI 控件层（按钮、弹窗、下拉、选择器、提示等）
- `src/components/settings/`：设置对话框与分面板设置项
- `src/components/command-palette/`：命令面板（快捷命令入口）
- 其它通用组件：`toast`、`dialog`、`modal`、`window` 等全局交互组件

### 2.4 全局状态与上下文

- `src/store/`：Zustand 状态管理，包含设置、主题、书库、阅读器、侧边栏、传输等状态
- `src/context/`：
  - `EnvContext`：运行环境与 `appService` 注入
  - `AuthContext`：用户会话与鉴权状态
  - `SyncContext`：同步客户端上下文
  - `DropdownContext` / `PHContext`：全局交互与埋点上下文
- Provider 由根布局统一装配，保证页面共享统一环境能力

---

## 3. 后端结构（Web API + Native API）

Readest 后端能力由两部分组成：

1. **Next.js API 路由**（运行在 Web/Node 侧）
2. **Tauri Rust 命令与插件**（运行在桌面/移动原生侧）

### 3.1 Next App Router API（`src/app/api/**/route.ts`）

主要路由分组：

- `ai/*`：AI 聊天、Embedding 能力
- `opds/proxy`：OPDS 资源代理（含流式处理）
- `tts/edge`：TTS 合成与语音列表
- `stripe/*`：订阅与账单（plans/checkout/check/portal/webhook）
- `apple/iap-verify`、`google/iap-verify`：应用内购校验
- `metadata/search`：元数据搜索聚合接口

### 3.2 Next Pages Router API（`src/pages/api/**/*.ts`）

主要路由：

- `sync.ts`：阅读数据同步
- `storage/*`：文件存储相关接口（上传/下载/删除/列表/统计/清理）
- `deepl/translate.ts`：翻译代理与配额控制
- `kosync.ts`：KoSync 兼容代理
- `user/delete.ts`：账户删除

### 3.3 服务层（`src/services`）

核心模式：以 `BaseAppService` 作为抽象服务底座，根据运行平台切换具体实现。

- `BaseAppService`：统一定义文件系统、数据库、书库/设置等能力入口
- `NativeAppService`：Tauri 原生平台实现（调用 Rust 命令、系统能力、原生存储）
- `WebAppService`：Web 平台实现（浏览器文件与 wasm 数据库能力）
- `NodeAppService`：Node 场景实现（用于服务端/脚本场景）

### 3.4 Tauri Rust 原生后端（`src-tauri`）

核心结构：

- `src-tauri/src/main.rs`：原生入口（调用 `readestlib::run`）
- `src-tauri/src/lib.rs`：命令注册、插件注册、平台初始化
- `src-tauri/src/*.rs`：核心模块（目录扫描、文件传输、Discord RPC、平台适配）
- `src-tauri/plugins/`：自定义插件（native-bridge、native-tts、turso）

Rust 侧通过 `tauri::generate_handler!` 暴露命令，前端通过 `invoke`/插件 API 访问原生功能。

---

## 4. 前后端协作关系

- 前端通过 `EnvContext + appService` 获取统一能力入口
- 在 Web 场景，优先调用 Next API（`/api/*`）与浏览器实现能力
- 在 Tauri 场景，优先调用 Rust 命令与本地插件能力
- 同一业务（如存储/同步/支付）在不同平台复用同一业务接口语义，由服务层分发到底层实现

---

## 5. 建议阅读顺序（快速上手）

1. `apps/readest-app/src/app/layout.tsx`：理解全局 Provider 装配
2. `apps/readest-app/src/app/library/page.tsx`：理解核心业务页组织方式
3. `apps/readest-app/src/services/appService.ts`：理解平台抽象层
4. `apps/readest-app/src/app/api/` 与 `src/pages/api/`：理解 Web API 能力边界
5. `apps/readest-app/src-tauri/src/lib.rs`：理解原生命令与插件装配

---

## 6. 模块级详细文档

如需深入到每个子模块，可继续阅读 `docs/modules/` 下的独立文档：

- `docs/modules/00-modules-index.md`
- `docs/modules/frontend-app-router.md`
- `docs/modules/frontend-library.md`
- `docs/modules/frontend-reader.md`
- `docs/modules/frontend-auth-user.md`
- `docs/modules/frontend-opds.md`
- `docs/modules/frontend-shared-ui-state.md`
- `docs/modules/backend-next-app-api.md`
- `docs/modules/backend-next-pages-api.md`
- `docs/modules/backend-service-layer.md`
- `docs/modules/native-tauri-core.md`
- `docs/modules/native-tauri-plugins.md`
- `docs/modules/packages-ecosystem.md`
- `docs/modules/platform-koplugin-and-infra.md`
