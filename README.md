# <img src="./public/favicon.svg" alt="项目 Logo" width="30" height="30" style="vertical-align: middle; margin-right: 8px;"> GPT Image Playground

一个基于 Web 的 OpenAI GPT 图片模型游乐场，支持使用 `gpt-image-2`、`gpt-image-1.5`、`gpt-image-1` 和 `gpt-image-1-mini` 进行生图与图片编辑。

> **说明：** 当前默认模型为 `gpt-image-2`。除旧版固定尺寸外，还支持最高 4K 的任意分辨率输入，并内置约束校验。

<p align="center">
  <img src="./readme-images/interface.jpg" alt="界面截图" width="600"/>
</p>

## ✨ 功能特性

* **🎨 图片生成模式：** 根据文本提示生成新图片。
* **🖌️ 图片编辑模式：** 基于文本提示和可选蒙版修改已有图片。
* **⚙️ 完整 API 参数控制：** 可直接在 UI 中调整 OpenAI Images API 支持的主要参数，包括尺寸、质量、输出格式、压缩率、背景、审核等级和图片数量。
* **📐 自定义分辨率（`gpt-image-2`）：** 可选择 2K / 4K 预设，也可以直接输入任意宽高，并实时校验模型约束，包括 16 的倍数、单边最大 3840px、长宽比不超过 3:1、总像素范围 655,360 到 8,294,400。
* **🎭 内置蒙版工具：** 可在编辑模式里直接绘制或上传蒙版，精确指定需要修改的区域。

> ⚠️ `gpt-image-1` 的蒙版编辑能力目前不能保证 100% 可控。<br>1. [这是已知且已被确认的模型限制。](https://community.openai.com/t/gpt-image-1-problems-with-mask-edits/1240639/37)<br>2. [OpenAI 计划在后续更新中改进。](https://community.openai.com/t/gpt-image-1-problems-with-mask-edits/1240639/41)

<p align="center">
  <img src="./readme-images/mask-creation.jpg" alt="蒙版编辑界面" width="350"/>
</p>

* **📜 历史记录与成本追踪：**
* 可查看所有生成与编辑历史。
* 可查看每次请求所使用的参数。
* 可查看详细的 token 用量和预估成本（美元）。提示：点击图片上的 `$` 金额即可查看。
* 可查看每条历史使用的完整提示词。
* 可查看历史总成本。
* 可删除历史项。
* **🖼️ 灵活的结果查看方式：** 支持网格查看整批结果，也可切换到单图查看。
* **🚀 发送到编辑：** 可将刚生成的图片或历史记录中的图片一键发送到编辑表单。
* **📋 粘贴到编辑：** 支持从剪贴板直接粘贴图片到编辑模式的源图区域。
* **🔐 运行时 API 设置：** 无需重启应用，可直接在 UI 中修改服务端使用的 OpenAI API Key 和 Base URL，新请求会立即生效。
* **💾 存储模式：** 通过 `NEXT_PUBLIC_IMAGE_STORAGE_MODE` 支持两种模式：
* **文件系统（默认）：** 图片保存在服务端 `./generated-images`。
* **IndexedDB：** 图片直接保存在浏览器的 IndexedDB，适合无持久化磁盘的部署环境。
* 历史记录元数据始终保存在浏览器本地存储中。

<p align="center">
  <img src="./readme-images/history.jpg" alt="历史记录界面" width="1306"/>
</p>

<p align="center">
  <img src="./readme-images/cost-breakdown.jpg" alt="成本明细界面" width="350"/>
</p>

## ▲ 部署到 Vercel

⚠️ 如果你从 `main` 或 `master` 分支部署，Vercel 站点会对任何拿到 URL 的人公开可访问。如果从其他分支部署，通常需要登录到对应 Vercel 团队后才能访问预览环境。

你可以一键部署自己的实例：

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/alasano/gpt-image-1-playground&env=OPENAI_API_KEY,NEXT_PUBLIC_IMAGE_STORAGE_MODE,APP_PASSWORD&envDescription=OpenAI%20API%20Key%20is%20required.%20Set%20storage%20mode%20to%20indexeddb%20for%20Vercel%20deployments.&project-name=gpt-image-playground&repository-name=gpt-image-playground)

部署时会要求填写 `OPENAI_API_KEY` 和 `APP_PASSWORD`。在 Vercel 上必须将 `NEXT_PUBLIC_IMAGE_STORAGE_MODE` 设置为 `indexeddb`。

> **重要：** 运行时 API 设置会将覆盖配置保存到服务器文件系统。这种方式适合 Docker、虚拟机或带持久磁盘的主机，但 **不适合作为 Vercel 等无状态 Serverless 环境的持久配置方案**。在 Vercel 上优先使用环境变量。

说明：如果未设置 `NEXT_PUBLIC_IMAGE_STORAGE_MODE`，应用会自动检测当前是否运行在 Vercel（通过 `VERCEL` 或 `NEXT_PUBLIC_VERCEL_ENV`），如果是则默认使用 `indexeddb`，否则默认使用 `fs`。你也可以显式设置为 `fs` 或 `indexeddb` 覆盖自动判断。

## 🐳 Docker 部署

仓库内已包含一个**不打包项目源码**的轻量基础镜像方案，适合自托管并频繁更新代码。

这套 Docker 方案的职责划分如下：

* 镜像只提供固定的 Node.js 运行环境和启动脚本。
* 项目源码通过 `docker-compose.yml` 里的 bind mount 挂载到容器 `/app`。
* `node_modules`、`.next`、`generated-images`、`data` 分别使用独立 volume 持久化。
* 日常修改代码后，不需要重新构建镜像，只需要重启容器，入口脚本会自动判断是否需要重新安装依赖或重新构建 Next.js。

### 1. 创建 `.env`

`OPENAI_API_KEY` 启动时已经不是必填项。你可以先写在环境变量里，也可以留空，稍后通过界面右上角的 **API 设置** 动态配置。

```dotenv
NEXT_PUBLIC_IMAGE_STORAGE_MODE=fs
APP_PASSWORD=change-me

# 可选默认值
# OPENAI_API_KEY=sk-...
# OPENAI_API_BASE_URL=https://your-openai-compatible-endpoint/v1
```

如果这个界面会暴露到局域网之外，强烈建议设置 `APP_PASSWORD`。

### 2. 启动容器

```bash
docker compose up -d --build
docker compose logs -f
```

首次启动建议带 `--build`，因为需要先构建一次基础镜像。然后访问 `http://localhost:3000`。

后续如果你只是修改了项目源码，通常只需要：

```bash
docker compose restart
```

或者：

```bash
docker compose up -d
```

不需要重新执行 `docker compose build`。

### 3. 在界面中配置或轮换 API Key

1. 点击右上角 **API 设置**。
2. 如果设置了 `APP_PASSWORD`，先输入密码。
3. 将新的 API Key 粘贴到 **新 API Key** 输入框并点击 **保存**。
4. 后续图片请求会立即使用新 Key，无需重启容器。

运行时设置会持久化到 `/app/data/runtime-config.json`，而 `docker-compose.yml` 已将其挂载到 `gpt-image-config` Docker 卷中。

### 运行时覆盖规则

* 已保存的运行时 API Key 会覆盖 `OPENAI_API_KEY`。
* 已保存的运行时 Base URL 会覆盖 `OPENAI_API_BASE_URL`。
* **清除已保存的 API Key** 只会移除运行时 API Key 覆盖，不会影响 Base URL。
* **重置运行时覆盖** 会清除所有运行时覆盖并回退到环境变量。

### 更新机制说明

容器启动时会自动做两件事：

* 如果 `package-lock.json` 发生变化，或者 `node_modules` 不存在，会自动执行 `npm ci --include=dev`。
* 如果源码、`package.json`、`package-lock.json`、`next.config.ts`、`tsconfig.json`、`postcss.config.mjs` 比当前 `.next` 构建产物更新，会自动执行 `npm run build`。

因此：

* 改业务代码后，重启容器即可。
* 改依赖后，重启容器也即可，入口脚本会自动重新安装依赖。
* 只有当你修改了基础镜像本身，例如 `Dockerfile` 或 `docker/entrypoint.sh`，才需要重新执行 `docker compose build`。

## 🚀 本地运行

### 前置要求

* [Node.js](https://nodejs.org/) 20 或更高版本
* [npm](https://www.npmjs.com/)、[yarn](https://yarnpkg.com/)、[pnpm](https://pnpm.io/) 或 [bun](https://bun.sh/)

### 1. 配置环境变量

你可以在启动前先配置 API Key，也可以启动后再从界面里配置。

⚠️ [使用 GPT Image 模型前，你的 OpenAI Organization 需要完成验证](https://help.openai.com/en/articles/10910291-api-organization-verification)

1. 如果还没有 `.env.local`，先创建它。
2. 按需加入以下变量：

```dotenv
# 启动时可选，也可以稍后在 API 设置中填写
OPENAI_API_KEY=your_openai_api_key_here

# 可选，兼容 OpenAI 协议的接口地址
OPENAI_API_BASE_URL=your_compatible_api_endpoint_here

# 建议开启，用于保护界面和运行时配置
APP_PASSWORD=your_password_here
```

`OPENAI_API_KEY` 涉及敏感凭证，`.env.local` 默认已在 `.gitignore` 中，避免误提交。

3. 如果你不想把 Key 放在 `.env.local`，可以留空 `OPENAI_API_KEY`，等应用启动后再通过 **API 设置** 添加。

#### 可选：启用 IndexedDB 模式

如果部署环境的文件系统只读，或者像 Vercel 一样是临时文件系统，可以改为把图片直接存到浏览器 IndexedDB：

```dotenv
NEXT_PUBLIC_IMAGE_STORAGE_MODE=indexeddb
```

设置为 `indexeddb` 后：

* 服务端 `/api/images` 会返回 base64 格式的图片数据 `b64_json`，而不是写入磁盘。
* 前端会将其解码后保存到 IndexedDB。
* 图片通过浏览器本地 Blob URL 提供访问。

如果未设置该变量，或设置成其他值，应用会默认把图片保存到服务端 `./generated-images` 目录。

说明：如果未设置 `NEXT_PUBLIC_IMAGE_STORAGE_MODE`，应用会自动检测当前是否运行在 Vercel（通过 `VERCEL` 或 `NEXT_PUBLIC_VERCEL_ENV`），如果是则默认使用 `indexeddb`，否则默认使用 `fs`。你也可以显式设置为 `fs` 或 `indexeddb` 覆盖自动判断。

#### 可选：使用自定义 API 端点

如果你需要接入兼容 OpenAI 协议的接口，例如本地模型服务或其他供应商，可以通过 `OPENAI_API_BASE_URL` 指定：

```dotenv
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_API_BASE_URL=your_compatible_api_endpoint_here
```

如果未设置 `OPENAI_API_BASE_URL`，应用默认使用 OpenAI 官方 API 端点。

#### 可选：通过界面修改运行时 API 设置

右上角的 **API 设置** 支持在不重启应用的情况下保存运行时 API Key 和 Base URL。

* **新 API Key** 留空时，会保留当前 Key。
* 清空 **Base URL** 后再保存，会回退到 `OPENAI_API_BASE_URL` 或 OpenAI 默认端点。
* **重置运行时覆盖** 会删除保存的运行时配置文件，并重新回退到环境变量。

本地运行时，这些设置会存储在 `./data/runtime-config.json`。

#### 可选：启用密码验证

```dotenv
APP_PASSWORD=your_password_here
```

设置 `APP_PASSWORD` 后，前端会在发起请求和打开运行时 API 设置时要求输入密码。

<p align="center">
  <img src="./readme-images/password-dialog.jpg" alt="密码弹窗" width="460"/>
</p>

### 2. 安装依赖

```bash
npm install
# 或
# yarn install
# 或
# pnpm install
# 或
# bun install
```

### 3. 启动开发服务器

```bash
npm run dev
# 或
# yarn dev
# 或
# pnpm dev
# 或
# bun dev
```

### 4. 打开应用

浏览器访问 [http://localhost:3000](http://localhost:3000)。

如果你没有在 `.env.local` 中配置 `OPENAI_API_KEY`，先点击 **API 设置** 补上，再开始生成图片。

## 🤝 贡献

欢迎提交代码贡献。`issue` 和功能请求也可以提，但作者是否接受要看具体内容。

## 📄 许可证

MIT
