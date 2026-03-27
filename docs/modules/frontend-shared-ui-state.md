# 前端模块：通用组件与状态体系

## 模块定位

该模块覆盖 `src/components`、`src/store`、`src/context` 三个横切层，负责：

- 统一 UI 原语与交互模式
- 管理全局状态与跨页面共享状态
- 注入环境、鉴权、同步、埋点等上下文能力

## 组件体系（`src/components`）

### 基础控件层（primitives）

`src/components/primitives` 提供可复用基础控件：

- button / button-group
- dialog
- dropdown-menu
- select
- input / input-group / textarea
- command
- tooltip
- collapsible / hover-card / separator

该层是业务组件的 UI 基座，提供一致交互语义。

### 业务通用组件

`src/components` 根目录包含大量跨页面组件，例如：

- `Providers.tsx`：全局 Provider 汇聚
- `Toast.tsx`、`Dialog.tsx`、`ModalPortal.tsx`：反馈与弹层
- `BookCover.tsx`、`CachedImage.tsx`：内容展示组件
- `UpdaterWindow.tsx`、`AboutWindow.tsx`：系统级窗口组件

### 子域组件

- `components/settings/*`：设置系统 UI
- `components/command-palette/*`：命令面板
- `components/assistant/*`：助手相关展示
- `components/metadata/*`：元数据编辑与展示

## 状态管理（`src/store`）

Readest 使用 Zustand 管理前端核心状态。

### 主要 store

- `settingsStore`：全局阅读/界面设置
- `themeStore`：主题与系统主题联动
- `libraryStore`：书库集合状态
- `readerStore`：阅读器运行状态
- `sidebarStore`：侧栏与导航状态
- `bookDataStore`：书籍内容与缓存数据
- `transferStore`：上传下载任务队列

### 扩展 store

- `aiChatStore`、`proofreadStore`、`parallelViewStore`
- `customFontStore`、`customTextureStore`
- `deviceStore`、`trafficLightStore`、`notebookStore`

这些 store 以业务域拆分，避免单一超级 store 失控。

## Context 体系（`src/context`）

### 环境与平台

- `EnvContext`：提供 `envConfig` 与 `appService`，是平台能力入口

### 用户与同步

- `AuthContext`：会话、用户信息、鉴权状态
- `SyncContext`：同步客户端与同步调度入口

### 交互与观测

- `DropdownContext`：下拉菜单全局控制
- `PHContext`：PostHog 埋点上下文

## 运行时协作模型

1. RootLayout 挂载 `EnvProvider`
2. `Providers.tsx` 串联 Auth/Sync/Dropdown/CommandPalette 等 Provider
3. 页面组件按需读取 store 与 context
4. 服务能力由 `appService` 统一抽象，避免页面感知平台差异

## 设计原则

- UI 原语优先：业务组件优先复用 primitives
- 状态域分离：按业务边界建 store，减少交叉耦合
- 平台抽象下沉：平台差异尽量在服务层处理，不泄露到组件层
- 全局副作用集中：监听器与全局初始化统一放到 Providers

## 维护建议

- 新增全局状态前先评估是否可局部化
- 新增跨页面能力优先 Context，其次再考虑全局 store
- 对高频更新状态（如阅读进度）避免直接驱动重组件树重渲染
