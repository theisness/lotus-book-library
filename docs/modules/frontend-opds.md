# 前端模块：OPDS

## 模块定位

`src/app/opds` 提供在线书源（OPDS）访问能力，负责：

- OPDS catalog 管理
- 目录导航与检索
- 出版物详情展示
- 从远端书源导入书籍到本地书库

## 目录结构

```text
src/app/opds/
├─ page.tsx
├─ components/
│  ├─ CatelogManager.tsx
│  ├─ Navigation.tsx
│  ├─ NavigationCard.tsx
│  ├─ FeedView.tsx
│  ├─ SearchView.tsx
│  ├─ PublicationView.tsx
│  └─ PublicationCard.tsx
└─ utils/
   ├─ opdsReq.ts
   └─ opdsUtils.ts
```

## 核心职责拆分

### 页面层（`page.tsx`）

- 作为 OPDS 模块控制台，管理导航状态与视图切换
- 串联目录、检索、详情与导入动作
- 与 `library` 模块协同，将远端资源落地到书库

### 组件层

- `CatelogManager`：catalog 源维护（增删改/切换）
- `Navigation` / `NavigationCard`：目录层级浏览
- `FeedView`：feed 内容列表展示
- `SearchView`：OPDS 检索界面
- `PublicationView` / `PublicationCard`：出版物详情与条目展示

### 工具层

- `opdsReq.ts`：请求封装、鉴权头处理、异常处理
- `opdsUtils.ts`：OPDS 数据结构转换与工具函数

## 与后端接口关系

模块依赖 `app/api/opds/proxy`：

- 统一代理跨域请求
- 处理鉴权头与超时
- 支持 HEAD/GET/OPTIONS
- 支持大资源流式透传

这使前端无需直接处理复杂 CORS 与跨域兼容问题。

## 典型业务流程

### 浏览 catalog

1. 用户选择或新增 catalog 地址
2. 前端请求 `/api/opds/proxy?url=...`
3. 后端代理返回 feed
4. 前端解析后渲染导航层级与出版物条目

### 导入出版物

1. 在 Publication 详情页选择下载链接
2. 发起资源请求并获取文件流/文件数据
3. 调用书库导入链路（`appService.importBook`）
4. 导入成功后在 Library 可见新书条目

## 错误与兼容策略

- 对 URL 格式和空地址进行前置校验
- 对认证失败与超时给出可理解反馈
- 对不同 OPDS 版本/扩展字段采用容错解析

## 维护建议

- 新增 OPDS 兼容特性时，优先放在 `utils` 层收敛
- Catalog 持久化策略要与设置系统一致，避免状态割裂
- 导入链路与 Library 共享能力，避免重复实现文件落地逻辑
