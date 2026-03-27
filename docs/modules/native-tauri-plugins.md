# 原生模块：Tauri 自定义插件（`src-tauri/plugins`）

## 模块定位

Readest 在 `apps/readest-app/src-tauri/plugins` 下维护了 3 个自定义插件，用于封装业务特定原生能力：

- `tauri-plugin-native-bridge`
- `tauri-plugin-native-tts`
- `tauri-plugin-turso`

这些插件与官方插件共同构成 Native 能力层。

## 目录结构

```text
src-tauri/plugins/
├─ tauri-plugin-native-bridge/
│  ├─ src/{lib.rs,commands.rs,desktop.rs,mobile.rs,models.rs,error.rs}
│  ├─ android/
│  ├─ ios/
│  └─ permissions/default.toml
├─ tauri-plugin-native-tts/
│  ├─ src/{lib.rs,commands.rs,desktop.rs,mobile.rs,models.rs,error.rs}
│  ├─ android/
│  ├─ ios/
│  └─ permissions/default.toml
└─ tauri-plugin-turso/
   ├─ src/{lib.rs,commands.rs,desktop.rs,mobile.rs,wrapper.rs,decode.rs,...}
   ├─ guest-js/
   ├─ android/
   ├─ ios/
   └─ permissions/default.toml
```

## 插件 1：native-bridge

### 职责

- 提供通用原生桥接能力
- 覆盖认证、系统交互、外链、权限、目录选择等场景

### 典型结构

- `commands.rs`：对外命令
- `desktop.rs` / `mobile.rs`：平台实现分支
- `models.rs`：请求/响应模型
- `permissions/default.toml`：默认权限模型

### 使用价值

- 将前端业务从平台 API 细节中解耦
- 统一 Web 与 Native 行为语义（通过服务层分发）

## 插件 2：native-tts

### 职责

- 提供原生 TTS 能力入口
- 覆盖语音初始化、播放控制、状态回调等能力

### 结构模式

与 native-bridge 一致：`commands + desktop/mobile + models + permissions`

### 协作关系

- 前端 `NativeTTSClient` 调用该插件
- 与 `EdgeTTSClient`、`WebSpeechClient` 一起形成多实现 TTS 体系

## 插件 3：turso

### 职责

- 提供 Turso/SQLite 相关数据库能力桥接
- 对前端暴露查询、执行、批量操作等数据库命令

### 关键文件

- `src/lib.rs`：插件入口
- `src/commands.rs`：数据库命令实现
- `src/wrapper.rs`、`src/decode.rs`：封装与解码处理
- `guest-js/*`：JS 侧封装与迁移脚本

### 价值

- 在 Tauri 端统一数据库能力入口
- 降低前端直接依赖原生数据库细节的复杂度

## 通用插件设计特征

- Rust + 平台目录（android/ios）双栈组织
- 明确 permissions 声明
- 命令模型显式化，便于类型约束与错误治理
- 与前端客户端模块一一映射，形成稳定调用边界

## 维护建议

- 新增命令需同步完善 models 与错误类型
- 桌面与移动差异要在插件内部消化，不向上泄漏
- 保持 permissions 最小授权，避免过度暴露原生能力
