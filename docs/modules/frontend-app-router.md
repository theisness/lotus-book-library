# 前端模块：App Router 与入口框架

## 模块定位

`apps/readest-app/src/app` 是 Readest 前端的核心入口，承担以下职责：

- 提供 Next.js App Router 页面路由
- 提供全局布局与元信息（SEO、PWA、Viewport）
- 承担部分 API 路由（`src/app/api`）
- 通过根级 Provider 将平台环境、鉴权、同步、命令面板等能力注入页面

## 目录与关键文件

### 入口与布局

- `src/app/layout.tsx`  
  根布局，定义 HTML 结构、meta、manifest、OG/Twitter 信息，并挂载 `EnvProvider + Providers`
- `src/app/page.tsx`  
  根路由页面，重定向/复用到 library 页面
- `src/app/error.tsx`  
  全局错误页面

### 主要页面路由

- `src/app/library/page.tsx`：书库主页
- `src/app/reader/page.tsx`：阅读器页
- `src/app/opds/page.tsx`：OPDS 目录浏览
- `src/app/auth/*`：认证流程页面（登录、回调、找回、更新、错误）
- `src/app/user/page.tsx`：用户中心
- `src/app/user/subscription/success/page.tsx`：订阅成功页
- `src/app/updater/page.tsx`：更新窗口
- `src/app/offline/page.tsx`：离线页面

## 运行时装配机制

### 1) RootLayout 装配

`layout.tsx` 中将页面树包裹为：

- `ViewTransitions`：页面过渡效果
- `EnvProvider`：注入平台环境与 `appService`
- `Providers`：业务级 Provider 组合（鉴权、同步、命令面板等）

### 2) Providers 组合

`src/components/Providers.tsx` 装配顺序：

1. `CSPostHogProvider`
2. `AuthProvider`
3. `IconContext.Provider`
4. `SyncProvider`
5. `DropdownProvider`
6. `CommandPaletteProvider`（并挂载 `CommandPalette`）

该文件还负责：

- 初始化 i18n 语言与 RTL/LTR 文档类
- 初始化主题与系统主题监听
- 从 `appService.loadSettings()` 拉取全局视图配置
- 初始化安全区 inset、电子墨水模式、背景纹理

## 页面架构约定

### 页面内部组织模式

业务路由通常按以下结构组织：

```text
src/app/<module>/
├─ page.tsx
├─ components/
├─ hooks/
└─ utils/
```

这一模式在 `library`、`reader`、`opds` 等模块中一致，便于按业务聚合 UI、交互和业务逻辑。

### 客户端与服务端边界

- 绝大多数业务页使用 `use client`
- 页面内部通过 Context + Zustand 组合管理状态
- API 访问通过 `libs/*` 或直接请求 `/api/*`

## 路由与平台关系

- Web 模式：走 Next 页面与 `/api` 接口
- Tauri 模式：同样渲染前端页面，但更多能力由 Native 插件/命令提供
- 页面通过 `EnvContext` 感知平台能力差异，不改变高层业务语义

## 常见扩展点

### 新增业务页面

建议遵循：

1. 在 `src/app/<new-module>/page.tsx` 建立页面入口
2. 将页面组件、hooks、utils 收敛在同目录
3. 复用 `src/components/primitives` 基础控件
4. 必要状态放入 `src/store`，跨页面能力放入 `src/context`

### 新增全局能力

若需全局注入（如埋点、快捷键、实验开关）：

- 优先新增 Provider
- 在 `src/components/Providers.tsx` 中统一挂载
- 避免在单页面里重复初始化全局监听器

## 维护风险与注意事项

- `layout.tsx` 是全局入口，任何异常会影响所有页面
- `Providers.tsx` 中副作用较多，新增逻辑时需注意执行顺序与依赖
- `src/app` 同时含页面与 API，目录职责要严格命名区分，防止混淆
