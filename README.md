<div align="center">
  <h1>莲花书院</h1>
  <p>Lotus Book Library</p>
</div>

本项目 fork 自开源电子书阅读器 [Readest](https://github.com/readest/readest)，在其基础上改造为个人书城项目。

## 自定义修改

### 独立后端服务

将原项目内嵌的 Next.js API Routes 拆分为独立的 Express 后端服务 (`apps/backend`)，包括：

- 图书管理、存储、同步、翻译等 API
- Supabase 认证与数据库集成
- S3/R2 对象存储支持

### 公共书城

新增公共书城功能，支持未登录用户浏览和下载书籍：

- 公共书籍列表 API (`public.routes.ts`)
- 前端公共书架展示组件 (`PublicBookshelfSection`)
- 公共书籍数据获取与展示逻辑

### 前端适配

- 前端 API 调用从 Next.js API Routes 迁移至独立后端
- 书库页面重构，集成公共书架模块

## 部署

Web 端部署在 [book.ssbx.site](https://book.ssbx.site)。

## 原项目

基于 [Next.js](https://github.com/vercel/next.js) + [Tauri v2](https://github.com/tauri-apps/tauri)，支持 EPUB、PDF 等多格式阅读，跨平台（macOS、Windows、Linux、Android、iOS、Web）。

详见原项目：[readest/readest](https://github.com/readest/readest)

## License

沿用原项目 [AGPL-3.0](LICENSE) 协议。
