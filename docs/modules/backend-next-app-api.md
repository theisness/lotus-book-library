# 后端模块：Next App Router API（`src/app/api`）

## 模块定位

`apps/readest-app/src/app/api` 是基于 Next App Router 的路由处理层，主要承载：

- 新式 API Route Handler（`route.ts`）
- 面向前端的聚合能力接口
- 支付、AI、TTS、元数据与代理类接口

## 路由总览

```text
src/app/api/
├─ ai/chat/route.ts
├─ ai/embed/route.ts
├─ tts/edge/route.ts
├─ metadata/search/route.ts
├─ opds/proxy/route.ts
├─ stripe/plans/route.ts
├─ stripe/checkout/route.ts
├─ stripe/check/route.ts
├─ stripe/portal/route.ts
├─ stripe/webhook/route.ts
├─ apple/iap-verify/route.ts
└─ google/iap-verify/route.ts
```

## 分组说明

### 1) AI 组（`ai/*`）

- `ai/chat`：聊天流式输出，使用 `ai` SDK 的 `streamText`
- `ai/embed`：文本向量嵌入能力
- 典型校验：通过 `validateUserAndToken` 校验 Authorization
- API key 策略：优先请求体传入，其次环境变量（如 `AI_GATEWAY_API_KEY`）

### 2) TTS 组（`tts/edge`）

- 提供边缘 TTS 合成能力与语音列表相关能力
- 对前端文本转语音流程提供 Web API 支撑

### 3) OPDS 代理组（`opds/proxy`）

核心能力：

- 代理 GET/HEAD/OPTIONS
- 处理 CORS 响应头
- 支持 Authorization 透传
- 大文件按条件流式返回
- 请求超时控制与错误语义化返回

该路由是 OPDS 前端的关键桥接点。

### 4) 支付组（`stripe/*`）

- `plans`：套餐信息
- `checkout`：创建结算会话
- `check`：检查订阅状态
- `portal`：用户账单门户
- `webhook`：支付事件回调处理

其中 `webhook` 对幂等、签名校验与状态同步一致性要求较高。

### 5) IAP 校验组（`apple/google`）

- `apple/iap-verify`：Apple 内购校验
- `google/iap-verify`：Google Play 内购校验

用于移动端支付完成后的服务端确认与订阅状态写回。

### 6) 元数据组（`metadata/search`）

- 聚合元数据来源（书名、作者等信息查询）
- 对书籍详情补全与编辑场景提供后端支持

## 技术特征

- 使用 `Request/Response` 或 `NextRequest/NextResponse` 风格
- 路由拆分清晰，以能力域命名
- 多数接口具备显式状态码与 JSON 错误结构
- 与 `libs/payment`、`libs/metadata`、`libs/edgeTTS` 等客户端模块一一对应

## 安全与治理要点

- 鉴权接口统一使用 token 校验
- webhook 与支付校验接口应避免日志泄露敏感字段
- 代理接口需防 SSRF 风险（当前已做 URL 基础校验，可进一步加强白名单策略）
- 对外部依赖（AI、支付网关）需具备超时与重试治理

## 与其它后端模块关系

- 与 `src/pages/api` 并存，前者偏新能力与 App Router 风格
- 与 `src/services/*` 协同，API 层负责 I/O 与权限，服务层负责业务逻辑复用
