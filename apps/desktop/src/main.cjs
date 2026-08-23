const { app, BrowserWindow, Menu, shell, ipcMain, clipboard, dialog } = require("electron")
const { spawn } = require("node:child_process")
const fs = require("node:fs")
const http = require("node:http")
const net = require("node:net")
const path = require("node:path")
const { startMcpBridge } = require("./mcp-bridge.cjs")

const isDev = process.argv.includes("--dev") || !app.isPackaged
let mainWindow = null
let webServer = null
let quitting = false
let appUrlPromise = null
let mcpBridge = null

function debugStartup(message) {
  if (process.env.CAPLAYGROUND_DEBUG_STARTUP !== "1") return
  try {
    const logPath = path.join(app.getPath("userData"), "startup.log")
    fs.mkdirSync(path.dirname(logPath), { recursive: true })
    fs.appendFileSync(logPath, `${new Date().toISOString()} ${message}\n`)
  } catch {}
}

debugStartup(`main loaded; packaged=${app.isPackaged}; argv=${JSON.stringify(process.argv)}`)

function getOpenPort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.unref()
    server.on("error", reject)
    server.listen(0, "127.0.0.1", () => {
      const address = server.address()
      const port = typeof address === "object" && address ? address.port : 3000
      server.close(() => resolve(port))
    })
  })
}

function waitForServer(url, timeoutMs = 45_000) {
  const deadline = Date.now() + timeoutMs

  return new Promise((resolve, reject) => {
    const poll = () => {
      const request = http.get(url, (response) => {
        response.resume()
        if (response.statusCode && response.statusCode < 500) {
          resolve()
          return
        }
        retry()
      })
      request.on("error", retry)
      request.setTimeout(2_000, () => request.destroy())
    }

    const retry = () => {
      if (Date.now() >= deadline) {
        reject(new Error("CAPlayground web service did not start in time."))
        return
      }
      setTimeout(poll, 250)
    }

    poll()
  })
}

async function startWebServer() {
  debugStartup("starting web service")
  if (process.env.CAPLAYGROUND_DESKTOP_URL) {
    return process.env.CAPLAYGROUND_DESKTOP_URL
  }

  const port = await getOpenPort()
  const url = `http://127.0.0.1:${port}`

  if (isDev) {
    const webRoot = path.resolve(__dirname, "../../web")
    const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm"
    webServer = spawn(npmCommand, ["run", "dev", "--", "--hostname", "127.0.0.1", "--port", String(port)], {
      cwd: webRoot,
      env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
      stdio: "inherit",
      windowsHide: true,
    })
  } else {
    const webRoot = path.join(process.resourcesPath, "web")
    const serverEntry = path.join(webRoot, "server.js")
    webServer = spawn(process.execPath, [serverEntry], {
      cwd: webRoot,
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: "1",
        HOSTNAME: "127.0.0.1",
        PORT: String(port),
        NEXT_TELEMETRY_DISABLED: "1",
      },
      stdio: "pipe",
      windowsHide: true,
    })
    webServer.stdout?.on("data", (chunk) => console.log(`[web] ${chunk.toString().trimEnd()}`))
    webServer.stderr?.on("data", (chunk) => console.error(`[web] ${chunk.toString().trimEnd()}`))
  }

  webServer.once("exit", (code) => {
    debugStartup(`web service exited; code=${code}`)
    if (!quitting && code !== 0) {
      console.error(`CAPlayground web service exited with code ${code}`)
      app.quit()
    }
  })

  await waitForServer(url)
  debugStartup(`web service ready; url=${url}`)
  return url
}

function installApplicationMenu() {
  const zh = app.getLocale().toLowerCase().startsWith("zh")
  const label = (english, chinese) => zh ? chinese : english
  const template = [
    ...(process.platform === "darwin"
      ? [{
          label: app.name,
          submenu: [
            { role: "about" },
            { type: "separator" },
            { role: "services" },
            { type: "separator" },
            { role: "hide" },
            { role: "hideOthers" },
            { role: "unhide" },
            { type: "separator" },
            { role: "quit" },
          ],
        }]
      : []),
    {
      label: label("Edit", "编辑"),
      submenu: [
        { role: "undo", label: label("Undo", "撤销") },
        { role: "redo", label: label("Redo", "重做") },
        { type: "separator" },
        { role: "cut", label: label("Cut", "剪切") },
        { role: "copy", label: label("Copy", "复制") },
        { role: "paste", label: label("Paste", "粘贴") },
        { role: "selectAll", label: label("Select All", "全选") },
      ],
    },
    {
      label: label("View", "视图"),
      submenu: [
        { role: "reload", label: label("Reload", "重新加载") },
        { role: "forceReload", label: label("Force Reload", "强制重新加载") },
        { type: "separator" },
        { role: "resetZoom", label: label("Actual Size", "实际大小") },
        { role: "zoomIn", label: label("Zoom In", "放大") },
        { role: "zoomOut", label: label("Zoom Out", "缩小") },
        { type: "separator" },
        { role: "togglefullscreen", label: label("Toggle Full Screen", "切换全屏") },
      ],
    },
    {
      label: label("Window", "窗口"),
      submenu: [
        { role: "minimize", label: label("Minimize", "最小化") },
        { role: "close", label: label("Close", "关闭") },
      ],
    },
    {
      label: label("AI Control", "AI 控制"),
      submenu: [
        {
          label: label("Copy MCP Configuration", "复制 MCP 配置"),
          click: () => {
            const args = app.isPackaged ? ["--mcp"] : [path.join(__dirname, "launcher.cjs"), "--mcp"]
            const config = {
              mcpServers: {
                caplayground: {
                  command: process.execPath,
                  args,
                },
              },
            }
            clipboard.writeText(JSON.stringify(config, null, 2))
            dialog.showMessageBox(mainWindow, {
              type: "info",
              title: "CAPlayground MCP",
              message: label("MCP configuration copied", "MCP 配置已复制"),
              detail: label(
                "Paste it into your AI client's MCP configuration. Keep CAPlayground open while the AI is connected.",
                "请粘贴到 AI 客户端的 MCP 配置中，并在 AI 连接期间保持 CAPlayground 运行。",
              ),
            })
          },
        },
      ],
    },
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

async function createWindow() {
  debugStartup("creating main window")
  appUrlPromise ??= startWebServer()
  const appUrl = await appUrlPromise
  const appOrigin = new URL(appUrl).origin

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 960,
    minHeight: 640,
    show: false,
    title: "CAPlayground",
    backgroundColor: "#0a0a0a",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, "preload.cjs"),
    },
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(appOrigin)) return { action: "allow" }
    shell.openExternal(url)
    return { action: "deny" }
  })

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (new URL(url).origin !== appOrigin) {
      event.preventDefault()
      shell.openExternal(url)
    }
  })

  mainWindow.once("ready-to-show", () => mainWindow?.show())
  mainWindow.on("closed", () => {
    mainWindow = null
  })

  await mainWindow.loadURL(appUrl)
  debugStartup("main window loaded")
}

const singleInstance = app.requestSingleInstanceLock()
debugStartup(`single-instance lock=${singleInstance}`)
if (!singleInstance) {
  app.quit()
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(async () => {
    debugStartup("Electron ready")
    app.setAboutPanelOptions({
      applicationName: "CAPlayground",
      applicationVersion: app.getVersion(),
      copyright: "CAPlayground contributors",
    })
    installApplicationMenu()
    mcpBridge = startMcpBridge({ app, ipcMain, getMainWindow: () => mainWindow })
    await createWindow()

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  }).catch((error) => {
    debugStartup(`startup failed: ${error?.stack || error}`)
    console.error(error)
    app.quit()
  })
}

app.on("before-quit", () => {
  quitting = true
  mcpBridge?.close()
  mcpBridge = null
  if (webServer && !webServer.killed) webServer.kill()
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit()
})
