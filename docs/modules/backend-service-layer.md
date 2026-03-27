# 后端模块：服务层（`src/services`）

## 模块定位

`src/services` 是 Readest 的业务核心层，提供平台无关的能力接口与平台相关实现，连接：

- 前端页面与交互层
- 本地文件系统/数据库
- 云存储与远程 API
- 翻译、TTS、AI、元数据等领域能力

## 总体架构

### 抽象基座：`BaseAppService`

`appService.ts` 中定义了统一服务接口与基础实现：

- 文件系统读写、目录操作
- 书籍导入/导出/删除/可用性检查
- 封面、字体、纹理处理
- 云端上传下载与封面同步
- 设置与书籍配置读写
- 迁移任务（如历史文件重命名）

`BaseAppService` 本质上是平台无关业务语义层。

### 平台实现

- `nativeAppService.ts`：Tauri/Native 平台实现
- `webAppService.ts`：浏览器平台实现
- `nodeAppService.ts`：Node 平台实现

由 `services/environment.ts` 根据 `NEXT_PUBLIC_APP_PLATFORM` 动态装配。

## 关键子服务分类

### 1) 核心业务服务

- `bookService.ts`
- `libraryService.ts`
- `settingsService.ts`
- `cloudService.ts`
- `backupService.ts`
- `transferManager.ts`

### 2) 资源与外观服务

- `fontService.ts`
- `imageService.ts`

### 3) 数据库服务

- `database/nativeDatabaseService.ts`
- `database/webDatabaseService.ts`
- `database/nodeDatabaseService.ts`
- `database/migrate.ts`

### 4) 智能能力与文本处理

- `ai/*`（RAG、提示词、日志、类型）
- `translators/*`（翻译预处理、缓存、适配）
- `transformers/*`（标点、空白、语言、注释等文本变换）
- `transformService.ts`

### 5) 阅读生态集成

- `tts/*`（Edge/WebSpeech/Native 客户端 + 控制器）
- `sync/KOSyncClient.ts`
- `readwise/*`
- `annotation/*`
- `metadata/*`

### 6) 基础与支撑

- `environment.ts`：运行时环境与 API base URL 策略
- `constants.ts`、`errors.ts`
- `commandRegistry.ts`
- `persistence.ts`

## 运行时装配链路

1. `EnvProvider` 初始化时调用 `environmentConfig.getAppService`
2. 根据平台返回 `NativeAppService` 或 `WebAppService`
3. 页面通过 `useEnv()` 获取统一 `appService`
4. 业务代码只调用统一语义接口，不直接关心平台底层差异

## 设计收益

- 跨平台业务复用：页面逻辑基本一致
- 平台差异隔离：Native/Web 差异仅在服务实现层体现
- 可测试性更好：可针对 service 层做单元/集成测试

## 典型能力示例

### 书籍导入

- 页面调用 `appService.importBook`
- `BaseAppService` 调用 `bookService` 与 `fs` 抽象
- 平台实现决定文件系统与路径解析方式

### 云端传输

- 页面通过传输队列触发上传下载
- 服务层调用 `cloudService` 与 `libs/storage`/native command
- 统一进度回调语义，保障 UI 一致

## 维护注意事项

- 不要在页面里绕过 `appService` 直接写平台分支
- 新能力优先定义在 `BaseAppService` 接口层，再实现平台版本
- 变更迁移逻辑时需确保向后兼容旧数据布局
