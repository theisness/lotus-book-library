# 前端模块：Reader（阅读器）

## 模块定位

`src/app/reader` 是 Readest 最复杂的前端模块，负责完整阅读体验：

- 文档渲染（EPUB/PDF 等）
- 阅读位置与进度管理
- 标注、笔记、书签、目录导航
- 翻译、润色、TTS、AI 辅助阅读
- 同步（KOSync、Readwise、笔记与进度）

## 目录结构

```text
src/app/reader/
├─ page.tsx
├─ components/
│  ├─ Reader.tsx
│  ├─ ReaderContent.tsx
│  ├─ FoliateViewer.tsx
│  ├─ HeaderBar.tsx
│  ├─ ProgressBar.tsx
│  ├─ FootnotePopup.tsx
│  ├─ TableViewer.tsx
│  ├─ KOSyncSettings.tsx
│  ├─ ReadwiseSettings.tsx
│  ├─ TranslationToggler.tsx
│  ├─ SettingsToggler.tsx
│  └─ ...
├─ hooks/
│  ├─ useFoliateEvents.ts
│  ├─ useBookShortcuts.ts
│  ├─ useProgressAutoSave.ts
│  ├─ useTextTranslation.ts
│  ├─ useTTSControl.ts
│  ├─ useKOSync.ts
│  ├─ useReadwiseSync.ts
│  └─ ...
└─ utils/
   ├─ annotatorUtil.ts
   └─ iframeEventHandlers.ts
```

## 组件架构

### 核心容器

- `Reader.tsx`：阅读页面总调度中心
- `ReaderContent.tsx`：内容区布局管理
- `FoliateViewer.tsx`：底层阅读内核接入与渲染桥接

### 工具条与导航

- `HeaderBar.tsx`：顶部信息与操作入口
- `PageNavigationButtons.tsx`：翻页控制
- `ProgressBar.tsx`：进度定位
- `SectionInfo.tsx` / `StatusInfo.tsx`：章节与状态信息展示

### 阅读辅助

- `BookmarkToggler.tsx`：书签状态切换
- `NotebookToggler.tsx`：笔记面板切换
- `TranslationToggler.tsx`：翻译入口
- `SettingsToggler.tsx`：阅读设置入口
- `SidebarToggler.tsx`：侧边栏入口
- `ZoomControls.tsx`：缩放控制（尤其适配固定版式内容）

### 内容增强

- `FootnotePopup.tsx`：脚注弹窗
- `ImageViewer.tsx` / `TableViewer.tsx`：图像与表格增强查看
- `ProofreadRules.tsx`：润色规则相关 UI
- `ReadingRuler.tsx`：阅读尺/聚焦辅助

## Hooks 体系（流程拆分）

### 交互与事件

- `useFoliateEvents`：阅读器内核事件接入
- `useIframeEvents`：iframe 内容事件桥接
- `useBookShortcuts`：快捷键映射
- `useTextSelector`：文本选区捕获

### 进度与同步

- `useProgressAutoSave`：自动保存阅读进度
- `useProgressSync`：进度云同步
- `useNotesSync`：注释与笔记同步
- `useKOSync`：KOReader 同步通道
- `useReadwiseSync`：Readwise 同步通道

### AI / 翻译 / TTS

- `useTextTranslation`：翻译管线
- `useOpenAIInNotebook`：笔记区 AI 辅助
- `useTTSControl`：TTS 播放控制
- `useTTSMediaSession`：系统媒体会话对接

## 与状态层关系

阅读器主要依赖：

- `readerStore`：阅读配置、渲染状态、当前书籍状态
- `sidebarStore`：目录/笔记/书签侧栏状态
- `bookDataStore`：书籍元数据与进度缓存
- `notebookStore`：笔记与高亮状态
- `proofreadStore` / `parallelViewStore`：增强阅读能力状态

## 与服务层关系

通过 `appService` 与相关 service/libs 实现：

- 文档加载与资源读取（本地/远端）
- 书籍配置读写（每本书独立阅读设置）
- 翻译、TTS、元数据、同步能力调用
- 平台相关能力（例如原生 TTS、系统 API）抽象

## 典型链路

### 打开书籍

1. 进入 `/reader`
2. 读取当前书籍上下文与配置
3. `FoliateViewer` 加载内容并建立事件桥
4. 初始化进度、主题、版式、快捷键
5. 启动自动保存与同步监听

### 文本选中到翻译/TTS

1. 选区事件进入 `useTextSelector`
2. 调用翻译或 TTS hooks
3. 翻译通过 translator 服务处理，TTS 通过对应客户端播放
4. 结果写入 UI 层或笔记面板

## 性能与复杂度关注点

- 阅读器 hooks 数量多，新增能力应优先最小侵入地挂载
- 事件监听要在卸载时及时清理，避免重复绑定
- 大文档场景需关注渲染抖动、进度保存频率与网络同步节流
