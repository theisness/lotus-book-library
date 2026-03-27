# 品牌自定义改造文档：Readest → 莲花书院

本文档记录将 Readest 开源项目深度自定义为「莲花书院」的完整改造流程，包括品牌文字替换、默认语言设置、欢迎页实现，以及需要手动替换的图片资源清单。

---

## 一、改造目标

| 项目     | 原始值                                 | 目标值                 |
| -------- | -------------------------------------- | ---------------------- |
| 品牌名称 | Readest                                | 莲花书院               |
| 副标题   | Where You Read, Digest and Get Insight | 阅读·沉思·洞见         |
| 默认语言 | 英语（en）                             | 简体中文（zh-CN）      |
| 站点 URL | web.readest.com                        | book.ssbx.site         |
| 欢迎页   | 无                                     | 首次进入显示动画欢迎页 |

---

## 二、已修改的代码文件

### 2.1 `apps/readest-app/src/app/layout.tsx`

**修改内容：**

- `title` → `莲花书院 — 阅读、沉思与洞见`
- `description` → 中文描述
- `url` → `https://book.ssbx.site/`
- `previewImage` → `https://book.ssbx.site/icon.png`
- `apple-mobile-web-app-title` → `莲花书院`
- `twitter:domain` → `book.ssbx.site`
- `html lang` 属性 → `zh-CN`

### 2.2 `apps/readest-app/public/manifest.json`

**修改内容：**

- `name` → `莲花书院`
- `short_name` → `莲花书院`
- `description` → 中文描述

### 2.3 `apps/readest-app/src/i18n/i18n.ts`

**修改内容：**

- `fallbackLng.default` → `['zh-CN']`（默认语言改为简体中文）
- 其他语言回退链也指向 `zh-CN`

### 2.4 `apps/readest-app/src/components/AboutWindow.tsx`

**修改内容：**

- 对话框标题 `About Readest` → `关于莲花书院`
- 应用名称 `<h2>Readest</h2>` → `<h2>莲花书院</h2>`

### 2.5 `apps/readest-app/src/app/offline/page.tsx`

**修改内容：**

- 页面标题 `Readest` → `莲花书院`
- 离线提示文字改为中文

### 2.6 `apps/readest-app/src/app/library/components/SettingsMenu.tsx`

**修改内容：**

- 菜单项 `Download Readest` → `下载莲花书院`

### 2.7 `apps/readest-app/src/services/constants.ts`

**修改内容：**

- `READEST_WEB_BASE_URL` → `https://book.ssbx.site`
- `READEST_NODE_BASE_URL` → `https://book.ssbx.site`
- `DOWNLOAD_READEST_URL` → `https://book.ssbx.site`

### 2.8 新增：`apps/readest-app/src/components/WelcomeSplash.tsx`

**功能：**

- 首次进入 Web 端显示「欢迎来到莲花书院」动画欢迎页
- 使用 `sessionStorage` 控制只显示一次（刷新后不再显示；清除浏览器存储可再次显示）
- 背景使用公共 Unsplash 莲花图片占位，待替换为自有图片
- 纯 CSS 动画，无外部依赖
- 点击任意处进入

**挂载位置：**
`apps/readest-app/src/components/Providers.tsx` 中，在 `CommandPaletteProvider` 内最顶层渲染：

```tsx
<CommandPaletteProvider>
  <WelcomeSplash /> {/* ← 新增 */}
  {children}
  <CommandPalette />
</CommandPaletteProvider>
```

**sessionStorage key：** `lotus_welcome_shown`

---

## 三、需要手动替换的图片资源清单

以下图片资源包含 Readest 原始 Logo，需替换为莲花书院自有设计：

### Web 端（`apps/readest-app/public/`）

| 文件路径                      | 用途                      | 尺寸建议           |
| ----------------------------- | ------------------------- | ------------------ |
| `public/favicon.ico`          | 浏览器标签页图标          | 32×32 / 多尺寸 ICO |
| `public/icon.png`             | PWA 图标、About 页面 Logo | 512×512 PNG        |
| `public/apple-touch-icon.png` | iOS 桌面图标              | 180×180 PNG        |

### 欢迎页背景图（`WelcomeSplash.tsx`）

当前使用 Unsplash 公共图片作为背景占位：

```
https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1600&q=80
```

替换方式：

1. 将自有莲花/水墨风格图片放入 `public/images/welcome-bg.jpg`
2. 修改 `WelcomeSplash.tsx` 中 `backgroundImage` 为 `url('/images/welcome-bg.jpg')`

### Tauri 桌面端图标（如需桌面端部署）

| 文件路径                         | 用途               |
| -------------------------------- | ------------------ |
| `src-tauri/icons/icon.png`       | 桌面应用图标源文件 |
| `src-tauri/icons/icon.icns`      | macOS 图标         |
| `src-tauri/icons/icon.ico`       | Windows 图标       |
| `src-tauri/icons/32x32.png`      | 任务栏图标         |
| `src-tauri/icons/128x128.png`    | 应用图标           |
| `src-tauri/icons/128x128@2x.png` | Retina 应用图标    |

> **提示**：Tauri 图标可通过官方工具从单张 1024×1024 PNG 自动生成所有尺寸：
>
> ```bash
> pnpm tauri icon /path/to/your-logo-1024.png
> ```

---

## 四、默认语言实现原理

`i18n.ts` 使用 `i18next-browser-languagedetector` 检测用户语言，优先级为：

1. URL querystring（`?lng=zh-CN`）
2. localStorage
3. 浏览器语言（`navigator.language`）
4. fallbackLng（已改为 `zh-CN`）

中国用户浏览器语言通常为 `zh-CN`，会直接命中第 3 步。其他语言用户如无对应翻译，回退到 `zh-CN`。

**若需强制所有用户默认中文**（忽略浏览器语言），可在 `i18n.ts` 中修改 detection 顺序，去掉 `navigator`：

```typescript
detection: {
  order: ['querystring', 'localStorage'],  // 去掉 'navigator'
  caches: ['localStorage'],
},
```

---

## 五、欢迎页自定义说明

### 5.1 修改背景图片

```tsx
// WelcomeSplash.tsx
backgroundImage: 'url("/images/welcome-bg.jpg")',
```

### 5.2 修改背景渐变色

```tsx
background: 'radial-gradient(ellipse at 60% 40%, #e8f5e9 0%, #c8e6c9 30%, #1b4332 100%)',
```

当前为墨绿色调（适合莲花/书院主题），可根据品牌色调整。

### 5.3 修改欢迎文字

```tsx
// 主标题
欢迎来到莲花书院;

// 副标题
阅读·沉思·洞见;

// 提示文字
点击任意处进入;
```

### 5.4 sessionStorage 行为

| 操作           | 欢迎页是否显示                   |
| -------------- | -------------------------------- |
| 首次访问       | ✅ 显示                          |
| 刷新页面       | ❌ 不显示（sessionStorage 保留） |
| 关闭标签重开   | ✅ 显示（新 session）            |
| 清除浏览器存储 | ✅ 显示                          |
| 无痕/隐私模式  | ✅ 每次显示                      |

---

## 六、后续待处理事项

- [ ] 设计并制作莲花书院 Logo（建议 1024×1024 PNG，圆形/方形均可）
- [ ] 替换 `public/favicon.ico`
- [ ] 替换 `public/icon.png`
- [ ] 替换 `public/apple-touch-icon.png`
- [ ] 替换欢迎页背景图（放入 `public/images/welcome-bg.jpg`）
- [ ] 在 `zh-CN/translation.json` 中添加「关于莲花书院」等新增 key 的中文翻译
- [ ] （可选）修改 `AboutWindow.tsx` 中的版权信息和 GitHub 链接
- [ ] （可选）检查 `SupportLinks.tsx`、`LegalLinks.tsx` 中的外链是否需要替换
