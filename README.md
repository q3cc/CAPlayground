<div align="center">
  <img src="apps/web/public/icon-dark.png" alt="CAPlayground 标志" width="108" />
  <h1>CAPlayground</h1>
  <p>在 Windows、macOS 或浏览器中制作适用于 iOS 与 iPadOS 的 Core Animation 动态壁纸。</p>
  <p><strong>简体中文</strong> · <a href="README_EN.md">English / 原版 README</a></p>
</div>

## 项目简介

CAPlayground 是一款开源 Core Animation 壁纸编辑器。你可以通过可视化画布组合文本、图像、视频、渐变、粒子、复制器、变换和液态玻璃等图层，创建带状态过渡与关键帧动画的 `.ca` 或 `.tendies` 壁纸。

此分支在原版基础上提供：

- 简体中文与英文双语界面，首次启动自动跟随系统语言；
- 导航、账户、登录、项目、壁纸库、法律页面及编辑器工具的完整中文覆盖；
- Windows x64 安装版与便携版；
- macOS Intel 与 Apple Silicon 的 DMG、ZIP 发行包；
- 可重复运行的国际化覆盖审计。

## 下载桌面客户端

请前往 [Releases](https://github.com/q3cc/CAPlayground/releases) 下载最新版本：

- Windows：选择 `Setup.exe` 安装版，或 `Portable.exe` 便携版；
- macOS：按照芯片类型选择 `x64`（Intel）或 `arm64`（Apple Silicon）的 DMG/ZIP。

当前发行包未进行商业代码签名。Windows SmartScreen 或 macOS Gatekeeper 可能显示安全提示，请只从本仓库 Release 页面下载。

## 语言切换

首次打开时会根据操作系统或浏览器语言选择简体中文或英文。之后可以在顶部导航栏，或在“编辑器设置 → 语言”中切换；选择会保存在当前设备。

翻译词条位于 `apps/web/lib/i18n/messages`，旧界面兼容词条位于 `apps/web/lib/i18n/legacy-translations.ts`。提交界面文案前可运行：

```bash
cd apps/web
npm run i18n:audit:strict
```

## 本地运行 Web 版

需要 Node.js 20 或更高版本。

```bash
cd apps/web
npm install
npm run dev
```

打开 <http://localhost:3000>。未配置 Supabase 时，编辑器和本地项目仍可使用，登录、账户与云端功能会显示为不可用。

如需启用身份验证，在 `apps/web/.env.local` 中设置：

```dotenv
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

构建与启动生产版本：

```bash
cd apps/web
npm run build
npm run start
```

## 构建桌面客户端

先安装 Web 与桌面端依赖：

```bash
cd apps/web
npm install
cd ../desktop
npm install
```

Windows：

```bash
npm run dist:win
```

macOS：

```bash
npm run dist:mac
```

桌面客户端内置 Next.js 服务，不依赖线上 CAPlayground 网站。macOS 安装包必须在 macOS 环境构建；仓库中的 `Desktop Builds` GitHub Actions 工作流会分别在原生 Windows 与 macOS 运行器上生成发行制品。

## 参与贡献

请阅读 [贡献指南](.github/CONTRIBUTING.md)。新增用户可见文案应优先加入类型安全的英文词条，并同步提供简体中文译文；提交前请运行国际化审计和生产构建。

## 许可证

源代码采用仓库中的 [Creative Commons License](LICENSE)。使用原项目托管服务时，还需遵守其[服务条款](https://caplayground.vercel.app/tos)。

## 原版资料

- [英文原版 README](README_EN.md)
- [原项目仓库](https://github.com/CAPlayground/CAPlayground)
- [项目路线图](https://caplayground.vercel.app/roadmap)
