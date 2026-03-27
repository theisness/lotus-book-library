# 前端模块：Library（书库）

## 模块定位

`src/app/library` 是 Readest 的核心业务入口，负责：

- 本地与云端书籍集合展示
- 图书导入（文件、拖拽、目录、OPDS）
- 书籍分组与状态管理
- 同步触发、传输队列与设置入口

## 目录结构

```text
src/app/library/
├─ page.tsx
├─ components/
│  ├─ Bookshelf.tsx
│  ├─ BookItem.tsx
│  ├─ LibraryHeader.tsx
│  ├─ ImportMenu.tsx
│  ├─ GroupingModal.tsx
│  ├─ TransferQueuePanel.tsx
│  ├─ SettingsMenu.tsx
│  └─ ...
├─ hooks/
│  ├─ useBooksSync.ts
│  ├─ useDemoBooks.ts
│  └─ useDragDropImport.ts
└─ utils/
   └─ libraryUtils.ts
```

## 核心页面职责（`page.tsx`）

`library/page.tsx` 是高复杂页面，承担聚合编排职责：

- 初始化与读取书库数据
- 连接 `libraryStore`、`settingsStore`、`transferStore`
- 组合头部、书架、分组、筛选、批量操作、弹窗
- 处理导入/删除/标记状态/跳转阅读器等跨组件动作
- 对接同步能力（手动与自动）

## 关键组件分工

### 展示层

- `Bookshelf.tsx`：书架主容器，承接分组后渲染
- `BookItem.tsx` / `BookshelfItem.tsx`：单书项卡片与布局细节
- `GroupHeader.tsx` / `GroupItem.tsx`：分组头与分组项
- `ReadingProgress.tsx` / `StatusBadge.tsx`：阅读进度与状态徽标

### 操作层

- `LibraryHeader.tsx`：搜索、筛选、视图切换、操作入口
- `ImportMenu.tsx`：导入来源入口聚合
- `SelectModeActions.tsx`：批量选择后的动作条
- `SetStatusAlert.tsx`：批量状态变更确认
- `TransferQueuePanel.tsx`：上传下载任务队列

### 对话与设置层

- `GroupingModal.tsx`：分组管理
- `OPDSDialog.tsx`：进入 OPDS 订阅/导入流程
- `BackupWindow.tsx` / `MigrateDataWindow.tsx`：备份与数据迁移
- `SettingsMenu.tsx` / `ViewMenu.tsx`：显示与行为配置入口

## Hooks 与业务逻辑

- `useBooksSync.ts`：同步触发、状态汇聚、错误处理
- `useDragDropImport.ts`：拖拽导入流与文件过滤
- `useDemoBooks.ts`：演示数据注入场景

该模块遵循「页面编排 + hooks 提炼流程 + 组件专注视图」模式。

## 与数据层的关系

### 状态层

主要依赖：

- `useLibraryStore`
- `useTransferStore`
- `useSettingsStore`

### 服务层

通过 `appService` 调用：

- 书籍导入/导出
- 元数据与封面处理
- 本地文件可用性检查
- 云端传输与缓存

### API 层

在 Web 侧可间接调用：

- `/api/storage/*`（上传、下载、列表、删除）
- `/api/sync`（书库元数据同步）
- `/api/metadata/search`（外部元数据查询）

## 典型业务流程

### 图书导入

1. 用户通过菜单或拖拽触发导入
2. 页面调用 `appService.importBook`
3. 生成/更新封面、基础元数据与本地文件索引
4. 更新 `libraryStore` 与界面渲染
5. 需要时推送云端传输队列

### 同步与一致性

1. 书库状态变化产生本地更新
2. 同步层将本地变更推送到远端（`/api/sync`）
3. 拉取远端增量并进行冲突处理
4. 页面刷新展示最终一致状态

## 维护建议

- `page.tsx` 体量较大，新增逻辑优先提取到 hooks
- 批量操作涉及多 store 变更，需保持操作原子性与可回滚感知
- 导入链路要注意大文件、重复导入、封面生成失败等异常分支
