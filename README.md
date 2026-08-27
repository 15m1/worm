# Java 面试冲刺

一个**纯前端、数据本地存储**的 Java 后端面试刷题记录与间隔复习工具（PWA，可安装到桌面/手机，离线可用）。

内置 50 道 Java 后端高频面试八股题，支持智能间隔重复复习（SM-2 算法，Anki 同款思路）、错题本自动收集、AI 批量生成题库、学习数据看板。

## ✨ 功能特性

- **📚 题库管理**：50 道内置高频题（并发 / JVM / MySQL / Redis / Spring / Spring MVC / Spring Cloud / RabbitMQ / 网络 / 分布式 / 算法等 15 个分类），支持增删改、搜索、分类/状态筛选、收藏
- **🧠 智能复习**：SM-2 间隔重复算法，每天生成待复习队列；「忘了 / 模糊 / 记住了 / 很熟」自动调整下次复习间隔；支持按分类/专题复习
- **❌ 错题本**：复习时选「忘了 / 模糊」自动归入错题本，答对自动移出；看板一键「复习错题」
- **🤖 AI 生成题库**：接入 OpenAI 兼容接口（默认 DeepSeek），选分类+数量一键生成高频题，预览校对后入库
- **📊 数据看板**：GitHub 风格学习热力图、分类/难度分布、连续学习天数、复习进度
- **🎨 视觉**：暗色 / 亮色 / 跟随系统三套主题，桌面侧边栏 + 移动端底部导航自适应
- **🔒 隐私**：全部数据 100% 本地存储（IndexedDB），不上传任何云端；导出备份自动剔除 API Key

## 🚀 本地运行

```bash
npm install
npm run dev      # 开发模式 http://localhost:5173
npm run build    # 生产构建（输出 dist/）
npm run preview  # 预览构建产物
```

## 🌍 部署到 GitHub Pages

构建产物已使用**相对路径 base**（`base: './'`），可直接部署到子路径 `用户名.github.io/仓库名/`，无需额外改配置。

在 GitHub 仓库的 **Settings → Pages** 中配置部署 `dist` 目录即可（如选择 GitHub Actions 工作流构建 `npm run build`，或手动推送到 gh-pages 分支）。

部署后的站点是纯静态前端，每个访问者的数据独立保存在各自浏览器本地，互不干扰。

## 🔑 AI 生成功能（可选）

AI 生成需要你自己的 API Key（OpenAI 兼容接口，默认 DeepSeek）：

1. 进入「设置」→「AI 接口」
2. 填入 Base URL（默认 `https://api.deepseek.com`）、API Key、模型（如 `deepseek-chat`）
3. Key **只保存在你自己浏览器的本地**，不会上传云端

> 注意：部分接口不允许浏览器跨域直连（CORS），若生成时报跨域错误，需使用支持浏览器调用的服务或本地代理。

## 🛠 技术栈

- Vite 8 + React 19 + TypeScript
- Zustand（状态管理）+ IndexedDB（idb，本地持久化）
- react-markdown（参考答案渲染）
- vite-plugin-pwa（PWA / Service Worker / 离线缓存）

## 📄 数据与隐私

- 数据存储于浏览器 IndexedDB（数据库 `java-review-db`），不经过任何服务器
- 「设置」支持 JSON 导出 / 导入备份，方便跨设备迁移（备份不含 API Key）
- 首次启动自动导入内置预设题库，可随时「更新预设题库」补全

## 📦 目录结构

```
src/
  pages/       # 看板 / 题库 / 复习 / AI 生成 / 设置
  components/  # 图表、表单、Markdown、Toast 等组件
  lib/         # SM-2 算法、AI 客户端、预设题库、统计
  store/       # Zustand 状态 + IndexedDB 持久化
  types.ts     # 数据模型与分类定义
```
