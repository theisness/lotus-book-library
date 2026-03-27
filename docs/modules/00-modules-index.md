# Readest 模块化文档索引

本文档作为「模块级说明」总索引，按运行层划分阅读顺序。每个模块均提供独立 Markdown 文档，覆盖职责、目录、关键文件、核心流程、配置依赖与扩展建议。

## 阅读建议

推荐按以下顺序阅读：

1. 前端入口与页面框架
2. 前端核心业务模块（Library / Reader / Auth / User / OPDS）
3. 后端接口层（App Router API + Pages API）
4. 服务层抽象（BaseAppService + Native/Web/Node）
5. Tauri 原生后端（核心命令 + 插件）
6. packages 子仓与基础设施（Docker / Nix / KOReader 插件）

## 模块文档清单

### 前端模块

- [frontend-app-router.md](./frontend-app-router.md)  
  前端入口、布局、路由分层、Provider 装配与渲染边界
- [frontend-library.md](./frontend-library.md)  
  书库模块（导入、分组、同步、展示、批量操作）
- [frontend-reader.md](./frontend-reader.md)  
  阅读器模块（阅读视图、注释、翻译、TTS、同步、快捷交互）
- [frontend-auth-user.md](./frontend-auth-user.md)  
  认证与用户中心（登录回调、订阅、账号管理）
- [frontend-opds.md](./frontend-opds.md)  
  OPDS 浏览与导入（目录、搜索、出版物详情）
- [frontend-shared-ui-state.md](./frontend-shared-ui-state.md)  
  通用组件、UI 原语、Zustand 状态、Context 体系

### Web API 与服务层

- [backend-next-app-api.md](./backend-next-app-api.md)  
  `src/app/api` 接口分组（AI、TTS、支付、元数据、OPDS 代理等）
- [backend-next-pages-api.md](./backend-next-pages-api.md)  
  `src/pages/api` 接口分组（sync、storage、deepl、kosync、user）
- [backend-service-layer.md](./backend-service-layer.md)  
  服务层抽象与平台实现（Base/Native/Web/Node）及子服务职责

### Native 与平台模块

- [native-tauri-core.md](./native-tauri-core.md)  
  Tauri Rust 核心：命令注册、插件装配、窗口生命周期与平台分支
- [native-tauri-plugins.md](./native-tauri-plugins.md)  
  自定义插件：native-bridge、native-tts、turso 的能力边界

### 生态与基础设施模块

- [packages-ecosystem.md](./packages-ecosystem.md)  
  `packages/` 子仓：foliate-js、simplecc-wasm、tauri、tauri-plugins
- [platform-koplugin-and-infra.md](./platform-koplugin-and-infra.md)  
  `apps/readest.koplugin`、`docker/`、`ops/` 的平台支撑作用

## 与总览文档关系

- 总览文档：`docs/project-structure.md`
- 本目录文档：面向模块维护者，强调结构细节与演进边界

## 部署与运维文档

- [../self-hosting-guide.md](../self-hosting-guide.md)  
  自托管部署指南：将 Readest 迁移到自有域名（如 `book.ssbx.site`），涵盖代码修改清单、环境变量配置、OAuth 回调、Docker Compose 部署、Nginx 反代、数据库初始化与常见问题

## 品牌自定义文档

- [../brand-customization.md](../brand-customization.md)  
  品牌改造流程：Readest → 莲花书院，包含已修改文件清单、Logo 资源替换清单、默认中文配置、欢迎页实现说明
