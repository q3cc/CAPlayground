const { app, BrowserWindow, Menu, shell } = require("electron")
const { spawn } = require("node:child_process")
const fs = require("node:fs")
const http = require("node:http")
const net = require("node:net")
const path = require("node:path")

const isDev = process.argv.includes("--dev") || !app.isPackaged
let mainWindow = null
let webServer = null
let quitting = false
let appUrlPromise = null

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
    { label: "Edit", submenu: [{ role: "undo" }, { role: "redo" }, { type: "separator" }, { role: "cut" }, { role: "copy" }, { role: "paste" }, { role: "selectAll" }] },
    { label: "View", submenu: [{ role: "reload" }, { role: "forceReload" }, { type: "separator" }, { role: "resetZoom" }, { role: "zoomIn" }, { role: "zoomOut" }, { type: "separator" }, { role: "togglefullscreen" }] },
    { label: "Window", submenu: [{ role: "minimize" }, { role: "close" }] },
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
  if (webServer && !webServer.killed) webServer.kill()
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit()
})
