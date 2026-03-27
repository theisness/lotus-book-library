# 生态模块：`packages/` 子仓说明

## 模块定位

`packages/` 承载 Readest 的共享依赖与底层能力子仓，既包括阅读内核相关包，也包括 Tauri 上游源码与插件源码镜像。

## 目录总览

```text
packages/
├─ foliate-js/
├─ simplecc-wasm/
├─ tauri/
└─ tauri-plugins/
```

## 1) `packages/foliate-js`

### 定位

- 浏览器端电子书渲染库
- Readest 阅读器能力的重要底层依赖之一

### 关键特征（来自其 README）

- 支持 EPUB / MOBI / KF8 / FB2 / CBZ / PDF(实验)
- 模块化设计：解析器、分页器、附加功能分离
- 无硬依赖、面向现代浏览器

### 与 Readest 的关系

- `src/app/reader` 中 `FoliateViewer` 等组件通过该库实现渲染内核能力
- 提供内容定位、分页、目录、搜索等底层能力基础

## 2) `packages/simplecc-wasm`

### 定位

- 基于 opencc 能力的 WASM 文本转换包
- 用于简繁转换等文本处理能力

### 关键特征

- 支持 Node 与 Web 使用
- 提供 `s2t`、`t2s` 等转换配置
- 避免 Node Addon 编译负担

### 与 Readest 的关系

- 可用于翻译/润色/文本标准化链路中的简繁转换场景

## 3) `packages/tauri`

### 定位

- Tauri 上游源码镜像/定制工作区
- 被根级 Cargo workspace patch 引用

### 作用

- 允许项目在特定版本或补丁基础上构建
- 与 `apps/readest-app/src-tauri` 的构建链路深度耦合

## 4) `packages/tauri-plugins`

### 定位

- 官方 Tauri 插件源码仓
- 包含 fs、http、dialog、updater 等大量插件

### 与 Readest 的关系

- Readest 在 Rust 侧使用多个官方插件
- 根级 `Cargo.toml` 对 `tauri-plugin-fs` 做了 path patch

## workspace 层关系

根级 `Cargo.toml` 指定 workspace 成员并使用 patch：

- `apps/readest-app/src-tauri`
- `packages/tauri/crates/tauri`
- `packages/tauri-plugins/plugins/fs`

这保证了 Readest 可以在单仓中统一管理 Rust 依赖链。

## 维护建议

- 将 `packages/tauri*` 视为上游镜像，不建议随意业务化改动
- 若需要补丁，建议记录变更原因、版本影响与回滚策略
- 阅读器能力迭代优先在应用层封装，避免直接侵入 foliate-js 内核
