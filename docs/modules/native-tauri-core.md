# 原生模块：Tauri Core（`src-tauri/src`）

## 模块定位

`apps/readest-app/src-tauri/src` 是 Readest 的 Rust 原生核心，负责：

- Tauri 应用初始化与生命周期管理
- 命令注册（供前端 `invoke` 调用）
- 插件注册与平台能力注入
- 桌面/移动平台差异化行为处理

## 目录结构

```text
src-tauri/src/
├─ main.rs
├─ lib.rs
├─ transfer_file.rs
├─ dir_scanner.rs
├─ discord_rpc.rs
├─ macos/
│  ├─ mod.rs
│  ├─ menu.rs
│  ├─ traffic_light.rs
│  ├─ safari_auth.rs
│  └─ apple_auth.rs
├─ windows/mod.rs
└─ android/
   ├─ mod.rs
   └─ eink.rs
```

## 入口链路

- `main.rs`：调用 `readestlib::run()`
- `lib.rs`：实际构建 `tauri::Builder`，完成命令与插件注册

## `run()` 核心职责（`lib.rs`）

### 1) 命令注册（`generate_handler!`）

主要命令包括：

- `start_server`（OAuth 本地服务）
- `download_file` / `upload_file`
- `get_environment_variable`
- `get_executable_dir`
- `dir_scanner::read_dir`
- macOS 特定命令（Safari 认证、Apple 登录、traffic light）
- 桌面 Discord Rich Presence 命令

### 2) 插件注册

注册了大量官方与自定义插件，例如：

- `tauri_plugin_fs`、`http`、`dialog`、`shell`、`opener`、`process`
- `tauri_plugin_turso`
- `tauri_plugin_native_bridge`
- `tauri_plugin_native_tts`
- 桌面 `single-instance`、`updater`、`window-state`
- 平台插件（`sign-in-with-apple`、`haptics`、`deep-link`）

### 3) setup 阶段行为

- WebDriver 测试场景能力注入
- 桌面单例实例与文件打开参数接管
- 运行时 scope 授权（文件/目录）
- Android 目录选择回调注册
- Linux AppImage 检测、updater 开关注入
- 构建初始化脚本写入 WebView（安全区、EInk、CLI 标识等）

### 4) 窗口构建与平台差异

- 桌面默认窗口大小与可调整策略
- macOS 采用 overlay title bar 相关行为
- Windows/Linux 采用自定义装饰窗口策略
- 注册导航拦截处理（如 `alipay` 外部打开）

## 核心子模块

### `transfer_file.rs`

- 文件上传下载实现
- 进度上报、分片/流式处理
- 与前端传输队列协同

### `dir_scanner.rs`

- 目录读取与文件枚举
- scope/权限控制配合

### `discord_rpc.rs`

- 桌面端阅读状态同步到 Discord Rich Presence

### 平台模块

- `macos/*`：菜单、交通灯、Safari/Apple 认证
- `android/eink.rs`：电子墨水设备检测
- `windows/mod.rs`：Windows 平台特定能力入口

## 与前端交互模型

- 前端通过 `@tauri-apps/api/core` 的 `invoke` 调用命令
- 前端通过插件 JS API 调用插件能力
- 前端通过窗口事件（如 `window-ready`）协调初始化流程

## 维护建议

- 新增原生命令时优先定义清晰输入输出结构
- 平台特化逻辑尽量收敛在 `macos/windows/android` 子模块
- setup 阶段逻辑较密集，新增逻辑时要注意顺序与副作用范围
