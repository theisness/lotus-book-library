# 前端模块：Auth 与 User

## 模块定位

`src/app/auth` 与 `src/app/user` 构成账户体系前端层，职责包括：

- 登录、回调、密码恢复与错误处理
- 用户信息展示与账户操作
- 订阅与支付流程入口
- 存储配额与使用统计展示

## 目录结构

```text
src/app/auth/
├─ page.tsx
├─ callback/page.tsx
├─ recovery/page.tsx
├─ update/page.tsx
├─ error/page.tsx
└─ utils/
   ├─ nativeAuth.ts
   └─ appleIdAuth.ts

src/app/user/
├─ layout.tsx
├─ page.tsx
├─ subscription/success/page.tsx
├─ components/
│  ├─ UserInfo.tsx
│  ├─ AccountActions.tsx
│  ├─ UsageStats.tsx
│  ├─ StorageManager.tsx
│  ├─ PlanCard.tsx
│  ├─ Checkout.tsx
│  └─ ...
└─ utils/
   └─ plan.ts
```

## Auth 子模块细节

### 页面职责

- `auth/page.tsx`：登录入口页（邮箱/第三方登录等入口编排）
- `auth/callback/page.tsx`：第三方认证回调处理
- `auth/recovery/page.tsx`：找回密码流程
- `auth/update/page.tsx`：密码更新流程
- `auth/error/page.tsx`：统一认证错误展示

### 平台适配

- `nativeAuth.ts`：原生平台认证桥接
- `appleIdAuth.ts`：Apple ID 登录相关流程

认证流程会结合平台能力决定走 Web 路径还是 Native 路径。

## User 子模块细节

### 页面职责

- `user/page.tsx`：用户中心聚合页面
- `user/subscription/success/page.tsx`：支付后状态确认页面

### 关键组件

- `UserInfo.tsx`：用户基础信息展示
- `AccountActions.tsx`：账户动作（退出、删除等）
- `UsageStats.tsx`：用量统计（翻译、存储等）
- `StorageManager.tsx`：存储空间管理
- `PlanCard.tsx` / `PlansComparison.tsx`：套餐展示与对比
- `Checkout.tsx` / `PlanActionButton.tsx`：订阅动作发起

### 套餐模型

`user/utils/plan.ts` 维护套餐视图模型与展示策略，作为 UI 与支付后端之间的中间语义层。

## 与后端接口关系

### Web API

- Stripe 路由：`/api/stripe/*`
- IAP 校验：`/api/apple/iap-verify`、`/api/google/iap-verify`
- 用户删除：`/api/user/delete`
- 用量/存储：通过 `libs/storage`、`libs/payment` 等 client 发起 API 请求

### Native 能力

在 Tauri/移动端，支付与授权部分流程通过 native bridge 与插件完成，再回传到前端进行状态同步。

## 典型流程

### 登录流程

1. 在 `auth/page.tsx` 发起登录
2. 外部认证完成后进入 `auth/callback`
3. `AuthContext` 更新会话状态
4. 页面重定向回业务入口并刷新用户信息

### 订阅流程

1. `user/page.tsx` 选择套餐与支付入口
2. Web 走 Stripe Checkout，Native 走 IAP 客户端
3. 完成后回调 `subscription/success`
4. 前端调用校验 API 更新订阅状态与权限

## 维护注意事项

- Auth 与支付属于高风险模块，新增功能应先明确平台分支
- 用户状态应以 `AuthContext` 与服务端校验结果为准，避免仅依赖本地缓存
- 订阅成功页面需具备幂等处理能力，防止重复回调导致状态错乱
