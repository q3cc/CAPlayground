<table width="100%">
  <tr>
    <td align="right" width="120">
      <img src="apps/web/public/icon-dark.png" alt="CAPlayground Logo" width="100" />
    </td>
    <td align="left">
      <h1>CAPlayground</span></h1>
      <h3 style="margin-top: -10px;">Create beautiful animated wallpapers for iOS and iPadOS on any desktop computer.</h3>
    </td>
  </tr>
</table>

## Overview

CAPlayground is a web-based Core Animation editor for making stunning wallpapers for your iOS Devices. Check out the [roadmap](https://caplayground.vercel.app/roadmap) to see progress.

## Getting Started

### Prerequisites

- Node.js 20+
- Bun

### Install
Install project dependencies:
```bash
bun install
```

### Development
To start the dev server:
```bash
bun run dev
```

Open http://localhost:3000 in your browser.

### Environment variables (optional for auth)

Authentication is powered by Supabase. If you don't provide auth keys, the site still runs, but account features are disabled and protected routes will show a message.

Create a `.env.local` in the project root with:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
# Only required for server-side account deletion API
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

When these are missing:

- `app/signin/page.tsx` displays "Sign in disabled" and disables auth actions.
- `app/forgot-password/page.tsx` and `app/reset-password/page.tsx` show a notice and disable actions.
- `app/api/account/delete/route.ts` returns 501 with a clear message.

### Build & Start

```bash
bun run build && bun run start
```

## Internationalization

CAPlayground currently ships in English and Simplified Chinese. The first visit follows the operating-system language; users can switch languages from the main navigation or **Editor Settings → Language**. The choice is saved for later sessions.

Translation messages live in `apps/web/lib/i18n/messages`. Add new user-facing copy to the English catalog first, then provide the same typed key in every other locale.

## Desktop clients

The Electron client bundles the Next.js standalone server, so dynamic editor routes and API handlers continue to work without loading the hosted CAPlayground website.

### Development

Install dependencies in both apps, then launch the desktop client:

```bash
cd apps/web && npm install
cd ../desktop && npm install
npm run dev
```

### Windows packages

```bash
cd apps/desktop
npm run dist:win
```

This creates an NSIS installer and a portable x64 executable in `apps/desktop/dist`.

### macOS packages

```bash
cd apps/desktop
npm run dist:mac
```

This creates DMG and ZIP packages for Intel and Apple Silicon. macOS packages must be built on macOS. The `Desktop Builds` GitHub Actions workflow builds both Windows and macOS artifacts on their native runners and can also be started manually.

## MCP: control the complete editor with AI

The Windows and macOS clients include a local MCP server. Keep CAPlayground running, choose **AI Control → Copy MCP Configuration**, and paste the copied JSON into Codex, Claude Desktop, Cursor, VS Code, or another MCP host.

The MCP server can manage projects and files, read or patch the complete editor document, control every layer type and view, edit states and overrides, manipulate animations, filters, particles, video frames and parallax settings, run undo/redo, and persist the result to CAML.

The bridge only listens on `127.0.0.1` and creates a new random access token for every app launch. Destructive project and file operations are marked as destructive MCP tools.

## Contributing

Read [CONTRIBUTING.md](.github/CONTRIBUTING.md)

## License

[Creative Commons License](LICENSE)

**Note:** The Creative Commons License applies to the source code. Use of the hosted service at caplayground.vercel.app is subject to our [Terms of Service](https://caplayground.vercel.app/tos), which includes attribution requirements for shared content.

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=caplayground/caplayground&type=Date)](https://www.star-history.com/#caplayground/caplayground&Date)
