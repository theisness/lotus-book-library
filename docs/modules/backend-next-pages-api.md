# 后端模块：Next Pages API（`src/pages/api`）

## 模块定位

`apps/readest-app/src/pages/api` 是项目中保留的 Pages Router API 层，承担：

- 同步相关核心接口（`sync.ts`）
- 文件存储相关接口（`storage/*`）
- 翻译代理与配额管理（`deepl/translate.ts`）
- 兼容桥接接口（`kosync.ts`）
- 用户管理接口（`user/delete.ts`）

该层与 App Router API 共存，承载部分历史与兼容能力。

## 路由总览

```text
src/pages/api/
├─ sync.ts
├─ deepl/translate.ts
├─ kosync.ts
├─ user/delete.ts
└─ storage/
   ├─ upload.ts
   ├─ download.ts
   ├─ delete.ts
   ├─ list.ts
   ├─ stats.ts
   └─ purge.ts
```

## 核心路由说明

### 1) `sync.ts`

同步核心接口，提供 GET/POST：

- GET：按 `since`、`type`、`book`、`meta_hash` 拉取增量数据
- POST：批量上行 books/configs/notes，并处理冲突与权威版本合并

实现特征：

- 通过 `validateUserAndToken` 校验身份
- 使用 Supabase 客户端访问远端数据
- 分批次分页与批量 upsert
- 对读写冲突按更新时间与删除时间进行比较

这是阅读进度、笔记、配置跨端一致性的关键接口。

### 2) `storage/*`

文件云存储相关接口，通常由前端 `libs/storage.ts` 调用：

- `upload`：上传授权与写入
- `download`：下载授权与取回
- `delete`：删除远端对象
- `list`：列举对象
- `stats`：统计空间占用/数量
- `purge`：清理临时或过期对象

接口目标是统一 Web 与 Native 文件云端协同语义。

### 3) `deepl/translate.ts`

- 翻译代理入口
- 包含缓存与配额统计策略
- 对外部翻译服务的请求做统一封装

### 4) `kosync.ts`

- KoSync 相关兼容代理
- 供阅读同步生态互通使用

### 5) `user/delete.ts`

- 用户删除流程后端接口
- 常与鉴权与订阅状态一起使用

## 中间件与跨域

Pages API 常见配套：

- `runMiddleware`
- `corsAllMethods`

对应 `src/utils/cors`，用于处理预检与跨域策略。

## 与 App Router API 的边界建议

- 新能力优先落在 `src/app/api`
- 历史与兼容链路保留在 `src/pages/api`
- 迁移时应确保前端调用方与错误语义保持兼容

## 维护注意事项

- `sync.ts` 逻辑复杂，修改前要明确冲突合并规则
- `storage/*` 涉及配额与权限，需防止越权访问
- 翻译与同步接口对性能敏感，应关注分页、批处理与缓存策略
